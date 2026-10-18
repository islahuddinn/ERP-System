import { PrismaClient } from "@prisma/master-client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting master database seed...");

  // Create super admin user
  const superAdminPassword = await bcrypt.hash("superadmin123", 10);

  const superAdmin = await prisma.superAdminUser.upsert({
    where: { email: "superadmin@malindtech.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@malindtech.com",
      password: superAdminPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Super admin user created successfully!");
  console.log("🎉 Master database seed completed!");
  console.log("\n📋 Super Admin Credentials:");
  console.log("Email: superadmin@malindtech.com");
  console.log("Password: superadmin123");
  console.log("\n⚠️  IMPORTANT: Change this password after first login!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
