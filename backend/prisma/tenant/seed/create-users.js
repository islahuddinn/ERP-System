const { PrismaClient } = require("@prisma/tenant-client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting user seed...");

  try {
    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const staffPassword = await bcrypt.hash("staff123", 10);

    const admin = await prisma.user.upsert({
      where: { email: "admin@inventory.com" },
      update: {},
      create: {
        name: "Admin User",
        email: "admin@inventory.com",
        passwordHash: adminPassword,
        role: "ADMIN",
      },
    });

    const staff = await prisma.user.upsert({
      where: { email: "staff@inventory.com" },
      update: {},
      create: {
        name: "Staff User",
        email: "staff@inventory.com",
        passwordHash: staffPassword,
        role: "STAFF",
      },
    });

    console.log("✅ Users created successfully!");
    console.log(`   - Admin: ${admin.email} (${admin.role})`);
    console.log(`   - Staff: ${staff.email} (${staff.role})`);

    // Verify users exist
    const users = await prisma.user.findMany({
      select: { email: true, name: true, role: true },
    });

    console.log(`✅ Total users in database: ${users.length}`);
    users.forEach((user) => {
      console.log(`   - ${user.email} (${user.role})`);
    });
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🔌 Disconnected from database");
  });
