import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getYearMonth, getWeekLabel } from "@/lib/utils";
import * as XLSX from "xlsx";
import type { Prisma } from "@/generated/prisma/client";

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

function mapPaymentMethod(val: string): string {
  const map: Record<string, string> = {
    "現金": "現金",
    "信用卡": "信用卡",
    "Line Pay": "Line Pay",
    "LINE Pay": "Line Pay",
    "銀行轉帳-玉山": "銀行轉帳-玉山",
    "銀行轉帳-台新": "銀行轉帳-台新",
    "銀行轉帳-元大": "銀行轉帳-元大",
    "銀行轉帳-Line Bank": "銀行轉帳-Line Bank",
    "零用金": "零用金",
    "月結": "銀行轉帳-玉山",
  };
  return map[val] || val || "現金";
}

function mapReceiptType(val: string): string {
  if (!val) return "無憑證";
  if (val.includes("發票")) return "發票";
  if (val.includes("收據")) return "收據";
  return "無憑證";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
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
      if (!file) {
        send({ error: "No file" });
        await writer.close();
        return;
      }

      send({ stage: "reading", message: "讀取 Excel 中…" });

      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: false });

      const targetSheets = ["彙整總表(勿編輯)", "彙整總表", "收支明細", "記帳表（請款零用金）(勿編輯)", "記帳表"];
      let ws: XLSX.WorkSheet | null = null;
      let sheetName = "";
      for (const name of targetSheets) {
        if (wb.SheetNames.includes(name)) {
          ws = wb.Sheets[name];
          sheetName = name;
          break;
        }
      }
      if (!ws) {
        ws = wb.Sheets[wb.SheetNames[0]];
        sheetName = wb.SheetNames[0];
      }

      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];

      const colIdx = {
        sourceKey: -1,
        date: 3,
        paymentMethod: 6,
        needsReimburse: 7,
        category: 8,
        subject: 9,
        item: 10,
        amount: 11,
        receiptType: 13,
        receiptNumber: 14,
        notes: 15,
        approvedBy: 16,
      };

      let headerRow = 0;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const row = rows[i] as string[];
        if (row.some(c => String(c).includes("日期") || String(c).includes("金額") || String(c).includes("科目"))) {
          headerRow = i;
          const headers = row.map(h => String(h).trim());
          const skIdx = headers.findIndex(h => h.includes("月份-筆數") || h.includes("月份筆數"));
          const dateIdx = headers.findIndex(h => h === "日期");
          const pmIdx = headers.findIndex(h => h.includes("收付款方式") || h.includes("付款方式"));
          const nrIdx = headers.findIndex(h => h.includes("是否請款") || h.includes("請款"));
          const catIdx = headers.findIndex(h => h === "項目" || h === "收支");
          const subIdx = headers.findIndex(h => h === "科目");
          const itemIdx = headers.findIndex(h => h === "細項");
          const amtIdx = headers.findIndex(h => h === "金額" && !h.includes("+/-"));
          const rtIdx = headers.findIndex(h => h.includes("憑證種類") || h.includes("憑證"));
          const rnIdx = headers.findIndex(h => h.includes("收據") || h.includes("發票編號"));
          const notesIdx = headers.findIndex(h => h === "備註");
          const apIdx = headers.findIndex(h => h.includes("簽核"));
          if (skIdx !== -1) colIdx.sourceKey = skIdx;
          if (dateIdx !== -1) colIdx.date = dateIdx;
          if (pmIdx !== -1) colIdx.paymentMethod = pmIdx;
          if (nrIdx !== -1) colIdx.needsReimburse = nrIdx;
          if (catIdx !== -1) colIdx.category = catIdx;
          if (subIdx !== -1) colIdx.subject = subIdx;
          if (itemIdx !== -1) colIdx.item = itemIdx;
          if (amtIdx !== -1) colIdx.amount = amtIdx;
          if (rtIdx !== -1) colIdx.receiptType = rtIdx;
          if (rnIdx !== -1) colIdx.receiptNumber = rnIdx;
          if (notesIdx !== -1) colIdx.notes = notesIdx;
          if (apIdx !== -1) colIdx.approvedBy = apIdx;
          break;
        }
      }

      send({ stage: "parsing", message: "解析資料中…" });

      let skipped = 0;
      const records: Prisma.TransactionCreateManyInput[] = [];

      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i] as unknown[];
        const category = String(row[colIdx.category] ?? "").trim();
        if (!category || !["收入", "支出"].includes(category)) { skipped++; continue; }

        const date = parseDate(row[colIdx.date]);
        if (!date) { skipped++; continue; }

        const amountRaw = row[colIdx.amount];
        const amount = typeof amountRaw === "number" ? Math.abs(amountRaw) : parseFloat(String(amountRaw).replace(/,/g, ""));
        if (!amount || isNaN(amount) || amount <= 0) { skipped++; continue; }

        const subject = String(row[colIdx.subject] ?? "").trim() || "＊其他";
        const item = String(row[colIdx.item] ?? "").trim() || "＊其他";
        const paymentMethod = mapPaymentMethod(String(row[colIdx.paymentMethod] ?? "").trim());
        const needsReimburseRaw = String(row[colIdx.needsReimburse] ?? "").trim().toUpperCase();
        const needsReimburse = needsReimburseRaw === "O" || needsReimburseRaw === "TRUE" || needsReimburseRaw === "Y";
        const receiptType = mapReceiptType(String(row[colIdx.receiptType] ?? ""));
        const receiptNumber = String(row[colIdx.receiptNumber] ?? "").trim() || null;
        const notes = String(row[colIdx.notes] ?? "").trim() || null;
        const approvedBy = String(row[colIdx.approvedBy] ?? "").trim() || null;
        const sourceKeyRaw = colIdx.sourceKey !== -1 ? String(row[colIdx.sourceKey] ?? "").trim() : "";
        const sourceKey = sourceKeyRaw || null;

        records.push({
          sourceKey,
          date,
          yearMonth: getYearMonth(date),
          weekLabel: getWeekLabel(date),
          paymentMethod,
          needsReimburse,
          category,
          subject,
          item,
          amount,
          receiptType,
          receiptNumber,
          notes,
          approvedBy,
          recorderId: session.user.id,
        });
      }

      const total = records.length;
      send({ stage: "importing", message: "寫入資料庫中…", imported: 0, total });

      let imported = 0;
      const withKey = records.filter(r => r.sourceKey);
      const withoutKey = records.filter(r => !r.sourceKey);
      const CHUNK = 500;

      if (withKey.length > 0) {
        try {
          const keys = withKey.map(r => r.sourceKey!);
          await prisma.transaction.deleteMany({ where: { sourceKey: { in: keys } } });
          for (let i = 0; i < withKey.length; i += CHUNK) {
            const result = await prisma.transaction.createMany({
              data: withKey.slice(i, i + CHUNK) as Prisma.TransactionCreateManyInput[],
            });
            imported += result.count;
            send({ stage: "importing", imported, total, message: `寫入中… ${imported} / ${total}` });
          }
        } catch (e: unknown) {
          if (String(e).includes("sourceKey") || String(e).includes("column")) {
            withoutKey.push(...withKey);
          } else {
            throw e;
          }
        }
      }

      for (let i = 0; i < withoutKey.length; i += CHUNK) {
        const chunk = (withoutKey.slice(i, i + CHUNK) as Record<string, unknown>[]).map(
          ({ sourceKey: _sk, ...rest }) => rest
        );
        const result = await prisma.transaction.createMany({
          data: chunk as Prisma.TransactionCreateManyInput[],
          skipDuplicates: false,
        });
        imported += result.count;
        send({ stage: "importing", imported, total, message: `寫入中… ${imported} / ${total}` });
      }

      send({ stage: "done", imported, skipped, total, sheet: sheetName });
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
