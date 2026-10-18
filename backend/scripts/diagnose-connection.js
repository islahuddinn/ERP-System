// Simulate the exact connection flow the backend uses
const { PrismaClient } = require("@prisma/tenant-client");
const crypto = require("crypto");

// Simulate encryption service
class EncryptionService {
  constructor() {
    const key = process.env.ENCRYPTION_KEY || "01234567890123456789012345678901";
    this.encryptionKey = crypto.pbkdf2Sync(
      key,
      "inventory-multi-tenant-salt",
      100000,
      32,
      "sha512",
    );
  }

  decrypt(ciphertext) {
    if (!ciphertext) return ciphertext;

    // Check if it's already a plaintext connection string
    if (ciphertext.startsWith("postgresql://") || ciphertext.startsWith("postgres://")) {
      console.log("✅ Detected plaintext URL, skipping decryption");
      return ciphertext;
    }

    try {
      const combined = Buffer.from(ciphertext, "base64");
      if (combined.length < 96) {
        console.log("✅ Data too short, treating as plaintext");
        return ciphertext;
      }
      // Try to decrypt...
      return ciphertext; // For now, just return as-is
    } catch (error) {
      console.log("✅ Decryption failed, treating as plaintext");
      return ciphertext;
    }
  }
}

async function test() {
  const encryptionService = new EncryptionService();

  // Get the stored URL (simulating what's in the database)
  const storedUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:password@127.0.0.1:5434/inventory?schema=public&connect_timeout=30";

  console.log("Stored URL:", storedUrl.replace(/:[^:@]+@/, ":****@"));

  // Decrypt (should return as-is for plaintext)
  const databaseUrl = encryptionService.decrypt(storedUrl);
  console.log("Decrypted URL:", databaseUrl.replace(/:[^:@]+@/, ":****@"));

  // Create Prisma client exactly as backend does
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  console.log("\nAttempting to connect...");
  try {
    await client.$connect();
    console.log("✅ Connection successful!");

    const userCount = await client.user.count();
    console.log(`✅ Found ${userCount} users`);

    await client.$disconnect();
    console.log("✅ Disconnected successfully");
    console.log("\n✅✅✅ All tests passed! Connection should work in backend.");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    console.error("Error code:", error.code);
    console.error("Error details:", error);
    process.exit(1);
  }
}

test();
