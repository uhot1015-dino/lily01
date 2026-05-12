import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ?? new Date().getFullYear().toString();

  // Monthly P&L
  const transactions = await prisma.transaction.findMany({
    where: { yearMonth: { startsWith: year } },
    select: { yearMonth: true, category: true, amount: true, subject: true, item: true },
  });

  const monthlyMap: Record<string, { income: number; expense: number }> = {};
  for (let m = 1; m <= 12; m++) {
    const key = `${year}/${String(m).padStart(2, "0")}`;
    monthlyMap[key] = { income: 0, expense: 0 };
  }

  for (const t of transactions) {
    if (!monthlyMap[t.yearMonth]) continue;
    if (t.category === "收入") monthlyMap[t.yearMonth].income += t.amount;
    else monthlyMap[t.yearMonth].expense += t.amount;
  }

  const monthly = Object.entries(monthlyMap).map(([month, { income, expense }]) => ({
    month,
    income,
    expense,
    profit: income - expense,
  }));

  // Channel breakdown (orders this year)
  const orders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${parseInt(year) + 1}-01-01`),
      },
    },
    select: { channel: true, totalAmount: true },
  });

  const channelMap: Record<string, number> = {};
  for (const o of orders) {
    if (!channelMap[o.channel]) channelMap[o.channel] = 0;
    channelMap[o.channel] += o.totalAmount ?? 0;
  }

  const channelBreakdown = Object.entries(channelMap)
    .map(([channel, amount]) => ({ channel, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Subject breakdown
  const subjectMap: Record<string, number> = {};
  for (const t of transactions.filter((t) => t.category === "支出")) {
    if (!subjectMap[t.subject]) subjectMap[t.subject] = 0;
    subjectMap[t.subject] += t.amount;
  }

  const expenseBreakdown = Object.entries(subjectMap)
    .map(([subject, amount]) => ({ subject, amount }))
    .sort((a, b) => b.amount - a.amount);

  return NextResponse.json({ monthly, channelBreakdown, expenseBreakdown });
}
