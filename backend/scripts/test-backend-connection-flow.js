// Simulate the exact backend connection flow
const { PrismaClient } = require("@prisma/tenant-client");
const crypto = require("crypto");

// Simulate encryption service
function decrypt(ciphertext, key) {
  if (!ciphertext) return ciphertext;

  // Check if it's already a plaintext connection string
  if (ciphertext.startsWith("postgresql://") || ciphertext.startsWith("postgres://")) {
    console.log("✅ Detected plaintext URL, skipping decryption");
    return ciphertext;
  }

  try {
    const combined = Buffer.from(ciphertext, "base64");
    if (combined.length < 96) {
      return ciphertext;
    }
    return ciphertext; // For plaintext, just return
  } catch (error) {
    return ciphertext;
  }
}

async function testBackendFlow() {
  console.log("Testing backend connection flow...\n");

  // Simulate getting tenant from master DB
  const tenantDbUrl =
    "postgresql://postgres:password@127.0.0.1:5434/inventory?schema=public&connect_timeout=30";

  // Decrypt (should return as-is for plaintext)
  const databaseUrl = decrypt(tenantDbUrl, "key");
  console.log("Database URL:", databaseUrl.replace(/:[^:@]+@/, ":****@"));

  // Add connection parameters if missing
  let finalUrl = databaseUrl;
  if (!finalUrl.includes("connect_timeout")) {
    const separator = finalUrl.includes("?") ? "&" : "?";
    finalUrl = `${finalUrl}${separator}connect_timeout=30`;
  }
  if (!finalUrl.includes("pool_timeout")) {
    finalUrl = `${finalUrl}&pool_timeout=30`;
  }

  console.log("Final URL:", finalUrl.replace(/:[^:@]+@/, ":****@"));
  console.log("");

  // Create Prisma client exactly as backend does
  const client = new PrismaClient({
    datasources: {
      db: {
        url: finalUrl,
      },
    },
  });

  console.log("Attempting connection...");
  try {
    // Test with timeout
    const connectPromise = client.$connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout")), 30000),
    );

    await Promise.race([connectPromise, timeoutPromise]);
    console.log("✅ Connected!");

    // Test query
    const queryPromise = client.$queryRaw`SELECT 1 as test`;
    const queryTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Query timeout")), 10000),
    );

    const result = await Promise.race([queryPromise, queryTimeout]);
    console.log("✅ Query successful:", result);

    // Test user query
    const userCount = await client.user.count();
    console.log(`✅ Found ${userCount} users`);

    await client.$disconnect();
    console.log("\n✅✅✅ Backend flow test PASSED!");
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

testBackendFlow();
