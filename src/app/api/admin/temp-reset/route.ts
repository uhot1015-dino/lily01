import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const SECRET = "028d29ad094eb4cdae1079fc31ba69b85bce70b58d150a3e";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-reset-secret");
  if (auth !== SECRET) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  const { email, password } = await req.json();
  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Missing email or password" }), { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { email }, data: { passwordHash } });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
