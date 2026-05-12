import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@/generated/prisma/client";
import * as XLSX from "xlsx";

const STATUS_MAP: Record<string, OrderStatus> = {
  "已出貨": OrderStatus.SHIPPED,
  "已完成": OrderStatus.COMPLETED,
  "已確認": OrderStatus.CONFIRMED,
  "已取消": OrderStatus.CANCELLED,
};

const PAYMENT_MAP: Record<string, PaymentStatus> = {
  "已付款": PaymentStatus.PAID,
  "未付款": PaymentStatus.UNPAID,
};

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

  let rows: Record<string, unknown>[] = [];

  // Try to find a sheet with order data (has 通路 column)
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
    if (data.length > 0 && "通路" in data[0]) {
      rows = data;
      break;
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "找不到有效的訂單資料（需包含「通路」欄位）" }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const productName = String(row["商品"] ?? "").trim();
    if (!productName) { skipped++; continue; }

    await prisma.order.create({
      data: {
        channel: String(row["通路"] ?? ""),
        status: STATUS_MAP[String(row["進度"] ?? "")] ?? "PENDING",
        orderNumber: String(row["訂單編號"] ?? "").replace("#VALUE!", "").trim() || null,
        categoryZh: String(row["中文分類"] ?? "") || null,
        productName,
        spec: String(row["規格"] ?? "") || null,
        productCode: String(row["商品代碼"] ?? "") || null,
        quantity: parseInt(String(row["數量"] ?? "1")) || 1,
        totalAmount: row["總金額"] ? parseFloat(String(row["總金額"])) : null,
        paymentStatus: PAYMENT_MAP[String(row["付款狀態"] ?? "")] ?? "UNPAID",
        orderDate: parseDate(row["訂購日期"]),
        shippingDate: parseDate(row["出貨日期/上課時間"]),
        deliveryMethod: String(row["配送方式"] ?? "") || null,
        buyerName: String(row["購買人"] ?? "") || null,
        buyerPhone: String(row["購買人電話"] ?? "") || null,
        email: String(row["電子郵件"] ?? "") || null,
        recipientName: String(row["收件人姓名"] ?? "") || null,
        recipientPhone: String(row["收件人聯絡電話"] ?? "") || null,
        address: String(row["配送地址"] ?? "") || null,
        notes: String(row["備註"] ?? "") || null,
      },
    });
    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
