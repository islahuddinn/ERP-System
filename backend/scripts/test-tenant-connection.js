const { PrismaClient } = require("@prisma/tenant-client");

async function testConnection() {
  const dbUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:password@localhost:5434/inventory?schema=public";

  console.log("Testing connection to:", dbUrl.replace(/:[^:@]+@/, ":****@"));

  const client = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  try {
    await client.$connect();
    console.log("✅ Connection successful!");

    const userCount = await client.user.count();
    console.log(`✅ Found ${userCount} users in database`);

    const users = await client.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
      take: 5,
    });

    console.log("\nUsers in database:");
    users.forEach((user) => {
      console.log(`  - ${user.email} (${user.name}) - ${user.role} - ${user.status}`);
    });

    await client.$disconnect();
    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    console.error("Error details:", error);
    process.exit(1);
  }
}

testConnection();
