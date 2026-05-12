import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getYearMonth, getWeekLabel } from "@/lib/utils";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const date = new Date(body.date);

  const transaction = await prisma.transaction.update({
    where: { id: (await params).id },
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
      approvedBy: body.approvedBy || null,
    },
  });

  return NextResponse.json(transaction);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.transaction.delete({ where: { id: (await params).id } });
  return NextResponse.json({ ok: true });
}
