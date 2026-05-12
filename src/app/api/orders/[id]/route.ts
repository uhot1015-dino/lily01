import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const order = await prisma.order.update({
    where: { id: (await params).id },
    data: {
      channel: body.channel,
      status: body.status,
      orderNumber: body.orderNumber || null,
      categoryZh: body.categoryZh || null,
      productName: body.productName,
      spec: body.spec || null,
      productCode: body.productCode || null,
      quantity: parseInt(body.quantity) || 1,
      totalAmount: body.totalAmount ? parseFloat(body.totalAmount) : null,
      paymentStatus: body.paymentStatus,
      orderDate: body.orderDate ? new Date(body.orderDate) : null,
      shippingDate: body.shippingDate ? new Date(body.shippingDate) : null,
      deliveryMethod: body.deliveryMethod || null,
      buyerName: body.buyerName || null,
      buyerPhone: body.buyerPhone || null,
      email: body.email || null,
      recipientName: body.recipientName || null,
      recipientPhone: body.recipientPhone || null,
      address: body.address || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(order);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.order.delete({ where: { id: (await params).id } });
  return NextResponse.json({ ok: true });
}
