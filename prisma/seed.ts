import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminExists = await prisma.user.findUnique({ where: { email: "admin@goodlily.com" } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@goodlily.com",
        passwordHash: await bcrypt.hash("goodlily2024", 10),
        role: "ADMIN",
      },
    });
    console.log("✅ Admin user created: admin@goodlily.com / goodlily2024");
  }
  console.log("✅ Seed complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
