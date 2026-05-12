import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (key !== "goodlily-setup-2024") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Record<string, string> = {};

  const tables = ["User", "Order", "Advance", "Transaction", "ShippingSlip", "Product", "DropdownOption"];

  for (const table of tables) {
    try {
      const count = await (prisma as unknown as Record<string, { count: () => Promise<number> }>)[table.toLowerCase()].count();
      results[table] = `OK (${count} rows)`;
    } catch (err) {
      results[table] = `ERROR: ${String(err).slice(0, 100)}`;
    }
  }

  // Try to create/update admin user
  try {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("goodlily2024", 10);
    const existing = await prisma.user.findUnique({ where: { email: "admin@goodlily.com" } });
    if (existing) {
      await prisma.user.update({ where: { email: "admin@goodlily.com" }, data: { passwordHash: hash } });
      results["adminUser"] = "Updated password";
    } else {
      await prisma.user.create({
        data: { name: "Admin", email: "admin@goodlily.com", passwordHash: hash, role: "ADMIN" },
      });
      results["adminUser"] = "Created";
    }
  } catch (err) {
    results["adminUser"] = `ERROR: ${String(err).slice(0, 100)}`;
  }

  return NextResponse.json(results);
}
