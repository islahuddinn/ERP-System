import { PrismaClient } from "@prisma/tenant-client";
import * as bcrypt from "bcrypt";
import { requireSeedPassword } from "./lib/require-seed-password";

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Creating admin user...");

  const email = "admin@inventory.com";
  const password = requireSeedPassword();

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 10);

  // Upsert user (create or update if exists)
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "ADMIN",
    },
    create: {
      name: "Admin User",
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created/updated successfully!");
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`👤 Role: ${user.role}`);
  console.log(`🆔 User ID: ${user.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Failed to create user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
