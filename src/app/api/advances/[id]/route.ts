import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const advance = await prisma.advance.update({
    where: { id: (await params).id },
    data: {
      date: new Date(body.date),
      person: body.person,
      amount: parseFloat(body.amount),
      purpose: body.purpose,
      subject: body.subject || null,
      item: body.item || null,
      status: body.status,
      reimburseAt: body.status === "REIMBURSED" ? (body.reimburseAt ? new Date(body.reimburseAt) : new Date()) : null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(advance);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.advance.delete({ where: { id: (await params).id } });
  return NextResponse.json({ ok: true });
}
