import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getYearMonth, getWeekLabel } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const yearMonth = searchParams.get("yearMonth");
  const category = searchParams.get("category");

  const where: Record<string, unknown> = {};
  if (yearMonth) where.yearMonth = yearMonth;
  if (category) where.category = category;

  const transactions = await prisma.transaction.findMany({
    where,
    include: { recorder: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const date = new Date(body.date);

  const transaction = await prisma.transaction.create({
    data: {
      date,
      yearMonth: getYearMonth(date),
      weekLabel: getWeekLabel(date),
      paymentMethod: body.paymentMethod,
      needsReimburse: body.needsReimburse ?? false,
      category: body.category,
      subject: body.subject,
      item: body.item,
      amount: parseFloat(body.amount),
      receiptType: body.receiptType ?? "無憑證",
      receiptNumber: body.receiptNumber || null,
      notes: body.notes || null,
      recorderId: session.user.id,
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
