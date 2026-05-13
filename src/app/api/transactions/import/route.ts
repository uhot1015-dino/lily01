import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getYearMonth, getWeekLabel } from "@/lib/utils";
import * as XLSX from "xlsx";

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    // Excel serial date
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });

    // Try to find the right sheet
    const targetSheets = ["彙整總表(勿編輯)", "彙整總表", "收支明細", "記帳表（請款零用金）(勿編輯)"];
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
      // Try first sheet
      ws = wb.Sheets[wb.SheetNames[0]];
      sheetName = wb.SheetNames[0];
    }

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];

    // Find header row
    let headerRow = 0;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i] as string[];
      if (row.some(c => String(c).includes("日期") || String(c).includes("金額") || String(c).includes("科目"))) {
        headerRow = i;
        break;
      }
    }
    const headers = (rows[headerRow] as string[]).map(h => String(h).trim());

    // Find column indices
    const colIdx = {
      date: headers.findIndex(h => h === "日期"),
      paymentMethod: headers.findIndex(h => h.includes("收付款方式") || h.includes("付款方式")),
      needsReimburse: headers.findIndex(h => h.includes("是否請款") || h.includes("請款")),
      category: headers.findIndex(h => h === "項目" || h === "收支"),
      subject: headers.findIndex(h => h === "科目"),
      item: headers.findIndex(h => h === "細項"),
      amount: headers.findIndex(h => h === "金額" && !h.includes("+/-")),
      receiptType: headers.findIndex(h => h.includes("憑證種類") || h.includes("憑證")),
      receiptNumber: headers.findIndex(h => h.includes("收據") || h.includes("發票編號")),
      notes: headers.findIndex(h => h === "備註"),
      approvedBy: headers.findIndex(h => h.includes("簽核")),
    };

    // Fallback column positions for 彙整總表 format
    if (colIdx.date === -1) colIdx.date = 3;
    if (colIdx.paymentMethod === -1) colIdx.paymentMethod = 6;
    if (colIdx.needsReimburse === -1) colIdx.needsReimburse = 7;
    if (colIdx.category === -1) colIdx.category = 8;
    if (colIdx.subject === -1) colIdx.subject = 9;
    if (colIdx.item === -1) colIdx.item = 10;
    if (colIdx.amount === -1) colIdx.amount = 11;
    if (colIdx.receiptType === -1) colIdx.receiptType = 13;
    if (colIdx.receiptNumber === -1) colIdx.receiptNumber = 14;
    if (colIdx.notes === -1) colIdx.notes = 15;
    if (colIdx.approvedBy === -1) colIdx.approvedBy = 16;

    let imported = 0;
    let skipped = 0;

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

      try {
        await prisma.transaction.create({
          data: {
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
          },
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({ imported, skipped, sheet: sheetName });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
