// Test Prisma connection with exact same URL format as backend
const { PrismaClient } = require("@prisma/tenant-client");

const databaseUrl =
  "postgresql://postgres:password@127.0.0.1:5434/inventory?schema=public&connect_timeout=30&pool_timeout=30&statement_timeout=30000";

console.log("Testing Prisma connection with URL:");
console.log(databaseUrl.replace(/:[^:@]+@/, ":****@"));
console.log("");

const client = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function test() {
  try {
    console.log("Attempting to connect...");
    await client.$connect();
    console.log("✅ Connected successfully!");

    console.log("Testing query...");
    const result = await client.$queryRaw`SELECT 1 as test`;
    console.log("✅ Query successful:", result);

    console.log("Testing user count...");
    const userCount = await client.user.count();
    console.log(`✅ Found ${userCount} users`);

    if (userCount > 0) {
      const users = await client.user.findMany({ take: 1 });
      console.log("✅ Sample user:", users[0].email);
    }

    await client.$disconnect();
    console.log("\n✅✅✅ All tests passed!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Connection failed:");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error name:", error.name);
    if (error.meta) {
      console.error("Error meta:", JSON.stringify(error.meta, null, 2));
    }
    process.exit(1);
  }
}

test();
