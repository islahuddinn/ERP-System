// Test the EXACT flow the backend uses
const { PrismaClient } = require("@prisma/tenant-client");

// Simulate what happens in multi-tenant-prisma.service.ts
async function test() {
  console.log("Testing exact backend flow...\n");

  // Step 1: Get database URL (simulating from master DB)
  const databaseUrl =
    "postgresql://postgres:password@127.0.0.1:5434/inventory?schema=public&connect_timeout=30&pool_timeout=30&statement_timeout=30000";

  console.log("Step 1: Database URL:", databaseUrl.replace(/:[^:@]+@/, ":****@"));

  // Step 2: Save original DATABASE_URL
  const originalDatabaseUrl = process.env.DATABASE_URL;
  console.log(
    "Step 2: Original DATABASE_URL:",
    originalDatabaseUrl ? originalDatabaseUrl.replace(/:[^:@]+@/, ":****@") : "undefined",
  );

  // Step 3: Override DATABASE_URL
  process.env.DATABASE_URL = databaseUrl;
  console.log(
    "Step 3: Overridden DATABASE_URL:",
    process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@"),
  );

  // Step 4: Create PrismaClient (exactly as backend does)
  console.log("Step 4: Creating PrismaClient...");
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  // Step 5: Restore original
  if (originalDatabaseUrl) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }
  console.log("Step 5: Restored DATABASE_URL");

  // Step 6: Try to connect
  console.log("Step 6: Attempting connection...");
  try {
    await client.$connect();
    console.log("✅ Connected!");

    const count = await client.user.count();
    console.log(`✅ Found ${count} users`);

    await client.$disconnect();
    console.log("\n✅✅✅ EXACT BACKEND FLOW TEST PASSED!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Connection failed:");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Name:", error.name);
    if (error.meta) {
      console.error("Meta:", JSON.stringify(error.meta, null, 2));
    }
    process.exit(1);
  }
}

test();
