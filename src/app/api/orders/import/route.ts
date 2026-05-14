import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { OrderStatus, PaymentStatus } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return null;
    return new Date(d.y, d.m - 1, d.d);
  }
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

function getOrderYearMonth(date: Date | null): string | null {
  if (!date) return null;
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function mapStatus(val: string): OrderStatus {
  const s = val.trim();
  if (s.includes("取消")) return OrderStatus.CANCELLED;
  if (s.includes("完成")) return OrderStatus.COMPLETED;
  if (s.includes("出貨")) return OrderStatus.SHIPPED;
  if (s.includes("確認")) return OrderStatus.CONFIRMED;
  return OrderStatus.PENDING;
}

function mapPayment(val: string): PaymentStatus {
  const s = val.trim();
  if (
    s === "已付款" ||
    s.includes("Apple Pay") ||
    s.includes("LINE Pay") ||
    s.includes("Line Pay") ||
    s === "贈送" ||
    s.includes("信用卡") ||
    s.includes("已付")
  ) return PaymentStatus.PAID;
  return PaymentStatus.UNPAID;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  function send(data: object) {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  }

  (async () => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) { send({ error: "No file" }); await writer.close(); return; }

      send({ stage: "reading", message: "讀取 Excel 中…" });

      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: false });

      send({ stage: "parsing", message: "解析工作表中…" });

      // Collect rows from all sheets that look like order data
      const allRows: Record<string, unknown>[] = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        if (data.length > 0 && ("通路" in data[0] || "商品" in data[0])) {
          allRows.push(...data);
        }
      }

      if (allRows.length === 0) {
        send({ error: "找不到訂單資料（需包含「通路」或「商品」欄位）" });
        await writer.close();
        return;
      }

      send({ stage: "parsing", message: `解析 ${allRows.length} 筆資料中…` });

      // Cross-import dedup: fetch existing order fingerprints from DB
      const existingOrders = await prisma.order.findMany({
        select: { orderNumber: true, orderDate: true, productName: true, buyerName: true, totalAmount: true },
      });
      const existingFPs = new Set<string>();
      for (const o of existingOrders) {
        if (o.orderNumber) {
          existingFPs.add(`order:${o.orderNumber}`);
        } else {
          const dateStr = o.orderDate ? o.orderDate.toISOString().slice(0, 10) : "nodate";
          existingFPs.add(`fp:${dateStr}__${o.productName}__${o.buyerName ?? ""}__${o.totalAmount ?? ""}`);
        }
      }

      const seenKeys = new Set<string>(); // in-file dedup
      let skipped = 0;
      const records: Prisma.OrderCreateManyInput[] = [];

      for (const row of allRows) {
        const productName = String(row["商品"] ?? "").trim();
        if (!productName) { skipped++; continue; }

        const orderNumber = String(row["訂單編號"] ?? "").replace(/#VALUE!/g, "").trim() || null;
        const orderDate = parseDate(row["訂購日期"] ?? row["訂購日"]);
        const buyerName = String(row["購買人"] ?? "").trim() || null;
        const totalAmountRaw = row["總金額"];
        const totalAmount = totalAmountRaw !== "" && totalAmountRaw !== null
          ? parseFloat(String(totalAmountRaw).replace(/,/g, ""))
          : null;

        // Build fingerprint for dedup
        const dateStr = orderDate ? orderDate.toISOString().slice(0, 10) : "nodate";
        const fingerprint = orderNumber
          ? `order:${orderNumber}`
          : `fp:${dateStr}__${productName}__${buyerName ?? ""}__${totalAmount ?? ""}`;

        if (seenKeys.has(fingerprint)) { skipped++; continue; }
        seenKeys.add(fingerprint);
        if (existingFPs.has(fingerprint)) { skipped++; continue; }

        records.push({
          channel: String(row["通路"] ?? "").trim(),
          status: mapStatus(String(row["進度"] ?? "")),
          orderNumber,
          categoryZh: String(row["中文分類"] ?? "").trim() || null,
          productName,
          spec: String(row["規格"] ?? "").trim() || null,
          productCode: String(row["商品代碼"] ?? "").trim() || null,
          quantity: parseInt(String(row["數量"] ?? "1")) || 1,
          totalAmount: totalAmount && !isNaN(totalAmount) ? totalAmount : null,
          paymentStatus: mapPayment(String(row["付款狀態"] ?? "")),
          orderDate,
          orderYearMonth: getOrderYearMonth(orderDate),
          shippingDate: parseDate(row["出貨日期/上課時間"] ?? row["出貨日期"]),
          deliveryMethod: String(row["配送方式"] ?? "").trim() || null,
          buyerName,
          buyerPhone: String(row["購買人電話"] ?? "").trim() || null,
          email: String(row["電子郵件"] ?? "").trim() || null,
          recipientName: String(row["收件人姓名"] ?? "").trim() || null,
          recipientPhone: String(row["收件人聯絡電話"] ?? "").trim() || null,
          address: String(row["配送地址"] ?? "").trim() || null,
          notes: String(row["備註"] ?? "").trim() || null,
        });
      }

      const total = records.length;
      send({ stage: "importing", message: "寫入資料庫中…", imported: 0, total });

      let imported = 0;
      const CHUNK = 100;
      for (let i = 0; i < records.length; i += CHUNK) {
        const result = await prisma.order.createMany({
          data: records.slice(i, i + CHUNK),
          skipDuplicates: false,
        });
        imported += result.count;
        send({ stage: "importing", imported, total, message: `寫入中… ${imported} / ${total}` });
      }

      send({ stage: "done", imported, skipped, total });
    } catch (err) {
      send({ error: String(err) });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
