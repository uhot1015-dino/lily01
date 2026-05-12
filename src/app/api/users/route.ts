import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.email || !body.password || !body.name) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) return NextResponse.json({ error: "Email 已存在" }, { status: 409 });

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: { name: body.name, email: body.email, passwordHash, role: body.role ?? "EMPLOYEE" },
    select: { id: true, name: true, email: true, role: true },
  });
  return NextResponse.json(user, { status: 201 });
}
