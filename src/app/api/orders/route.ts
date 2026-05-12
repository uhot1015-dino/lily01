import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (channel) where.channel = channel;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { buyerName: { contains: q } },
      { recipientName: { contains: q } },
      { orderNumber: { contains: q } },
      { productName: { contains: q } },
    ];
  }

  try {
    const orders = await prisma.order.findMany({
      where,
      orderBy: { orderDate: "desc" },
    });
    return NextResponse.json(orders);
  } catch (err) {
    console.error("orders GET error:", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
  const body = await req.json();

  const order = await prisma.order.create({
    data: {
      channel: body.channel,
      status: body.status ?? "PENDING",
      orderNumber: body.orderNumber || null,
      categoryZh: body.categoryZh || null,
      productName: body.productName,
      spec: body.spec || null,
      productCode: body.productCode || null,
      quantity: parseInt(body.quantity) || 1,
      totalAmount: body.totalAmount ? parseFloat(body.totalAmount) : null,
      paymentStatus: body.paymentStatus ?? "UNPAID",
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

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    console.error("orders POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
