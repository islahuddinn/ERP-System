const { PrismaClient } = require("@prisma/tenant-client");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

async function setup() {
  // Create Prisma clients with direct connection strings
  const masterPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.MASTER_DATABASE_URL,
      },
    },
  });

  const tenantPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    console.log("🌱 Seeding Phase-1 test data...\n");

    // Encryption service
    const key = process.env.ENCRYPTION_KEY || "01234567890123456789012345678901";
    const encryptionKey = crypto.pbkdf2Sync(
      key,
      "inventory-multi-tenant-salt",
      100000,
      32,
      "sha512",
    );

    function encrypt(plaintext) {
      const algorithm = "aes-256-gcm";
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
      let encrypted = cipher.update(plaintext, "utf8", "base64");
      encrypted += cipher.final("base64");
      const tag = cipher.getAuthTag();
      const combined = Buffer.concat([
        Buffer.alloc(64), // salt placeholder
        iv,
        tag,
        Buffer.from(encrypted, "base64"),
      ]);
      return combined.toString("base64");
    }

    const tenantDbUrl = process.env.DATABASE_URL;
    const encryptedUrl = encrypt(tenantDbUrl);

    // Create/update tenant
    console.log("📦 Creating/updating test tenant (ID: 8549)...");
    let tenant = await masterPrisma.tenant.findUnique({ where: { id: "8549" } });
    if (!tenant) {
      tenant = await masterPrisma.tenant.create({
        data: {
          id: "8549",
          name: "Test Tenant",
          email: "test@example.com",
          databaseName: "inventory",
          databaseUrl: encryptedUrl,
          subscriptionType: "PERMANENT",
          subscriptionStartDate: new Date(),
          isActive: true,
          isSuspended: false,
        },
      });
      console.log("✅ Test tenant created");
    } else {
      await masterPrisma.tenant.update({
        where: { id: "8549" },
        data: {
          databaseUrl: encryptedUrl,
          isActive: true,
          isSuspended: false,
        },
      });
      console.log("✅ Test tenant updated");
    }

    // Create/update test user
    console.log("\n📦 Creating/updating test admin user...");
    const hashedPassword = await bcrypt.hash("password123", 10);
    const testEmail = "john@example.com";

    let user = await tenantPrisma.user.findUnique({ where: { email: testEmail } });
    if (!user) {
      user = await tenantPrisma.user.create({
        data: {
          email: testEmail,
          name: "John Doe",
          passwordHash: hashedPassword,
          role: "ADMIN",
          status: "ACTIVE",
          emailVerified: true,
        },
      });
      console.log("✅ Test user created");
    } else {
      await tenantPrisma.user.update({
        where: { email: testEmail },
        data: {
          passwordHash: hashedPassword,
          status: "ACTIVE",
        },
      });
      console.log("✅ Test user updated");
    }

    console.log("\n✅ Seeding completed successfully!");
    console.log("\n📝 Test Credentials:");
    console.log("   Email: john@example.com");
    console.log("   Password: password123");
  } catch (error) {
    console.error("\n❌ Seeding failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
    await tenantPrisma.$disconnect();
  }
}

setup();
