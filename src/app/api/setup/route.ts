import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (key !== "goodlily-setup-2024") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: "admin@goodlily.com" },
    });

    if (existing) {
      const hash = await bcrypt.hash("goodlily2024", 10);
      await prisma.user.update({
        where: { email: "admin@goodlily.com" },
        data: { passwordHash: hash },
      });
      return NextResponse.json({ message: "Admin password reset successfully" });
    }

    const hash = await bcrypt.hash("goodlily2024", 10);
    await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@goodlily.com",
        passwordHash: hash,
        role: "ADMIN",
      },
    });

    return NextResponse.json({ message: "Admin user created successfully" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
