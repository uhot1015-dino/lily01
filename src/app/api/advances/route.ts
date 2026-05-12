import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  try {
    const advances = await prisma.advance.findMany({
      where: status ? { status: status as "PENDING" | "REIMBURSED" } : undefined,
      include: { submitter: { select: { name: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(advances);
  } catch (err) {
    console.error("advances GET error:", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const advance = await prisma.advance.create({
      data: {
        date: new Date(body.date),
        person: body.person,
        amount: parseFloat(body.amount),
        purpose: body.purpose,
        subject: body.subject || null,
        item: body.item || null,
        notes: body.notes || null,
        submitterId: session.user.id,
      },
    });
    return NextResponse.json(advance, { status: 201 });
  } catch (err) {
    console.error("advances POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
