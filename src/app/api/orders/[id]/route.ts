import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getYearMonth, getWeekLabel } from "@/lib/utils";

async function createIncomeTransaction(order: { id: string; productName: string; totalAmount: number | null; channel: string }, userId: string) {
  const now = new Date();
  await prisma.transaction.create({
    data: {
      date: now,
      yearMonth: getYearMonth(now),
      weekLabel: getWeekLabel(now),
      paymentMethod: "銀行轉帳-玉山",
      needsReimburse: false,
      category: "收入",
      subject: "商品銷售",
      item: order.channel,
      amount: order.totalAmount ?? 0,
      receiptType: "無憑證",
      notes: `訂單自動記入：${order.productName}（訂單ID: ${order.id}）`,
      recorderId: userId,
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = (await params).id;
  const body = await req.json();

  try {
    // Handle special actions
    if (body.action === "account") {
      // Manually record unpaid order into accounting
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      if (order.accountedAt) return NextResponse.json({ error: "Already accounted" }, { status: 400 });

      await createIncomeTransaction(order, session.user.id);
      const updated = await prisma.order.update({
        where: { id },
        data: { accountedAt: new Date() },
      });
      return NextResponse.json(updated);
    }

    if (body.action === "refund") {
      // Refund: create a negative transaction to offset the income, mark as CANCELLED
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

      if (order.accountedAt) {
        // Create offsetting negative transaction
        const now = new Date();
        await prisma.transaction.create({
          data: {
            date: now,
            yearMonth: getYearMonth(now),
            weekLabel: getWeekLabel(now),
            paymentMethod: "銀行轉帳-玉山",
            needsReimburse: false,
            category: "支出",
            subject: "＊其他",
            item: "＊其他",
            amount: order.totalAmount ?? 0,
            receiptType: "無憑證",
            notes: `退貨沖銷：${order.productName}（訂單ID: ${order.id}）`,
            recorderId: session.user.id,
          },
        });
      }

      const updated = await prisma.order.update({
        where: { id },
        data: { status: "CANCELLED", accountedAt: null },
      });
      return NextResponse.json(updated);
    }

    // Normal order update
    const prevOrder = await prisma.order.findUnique({ where: { id } });
    const newPaymentStatus = body.paymentStatus;
    const wasNotPaid = prevOrder?.paymentStatus !== "PAID";
    const isNowPaid = newPaymentStatus === "PAID";
    const notYetAccounted = !prevOrder?.accountedAt;

    const order = await prisma.order.update({
      where: { id },
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

    // Auto-account when payment status changes to PAID
    if (wasNotPaid && isNowPaid && notYetAccounted && order.totalAmount) {
      await createIncomeTransaction(order, session.user.id);
      await prisma.order.update({ where: { id }, data: { accountedAt: new Date() } });
      order.accountedAt = new Date();
    }

    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.order.delete({ where: { id: (await params).id } });
  return NextResponse.json({ ok: true });
}
