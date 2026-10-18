/**
 * Phase 1 Test Data Setup Script
 *
 * Creates test tenant and user for Phase 1 testing
 *
 * Usage: ts-node scripts/setup-phase1-test-data.ts
 */

import { PrismaClient } from "@prisma/master-client";
import { PrismaClient as TenantPrismaClient } from "@prisma/tenant-client";
import { requireSeedPassword } from "./lib/require-seed-password";

const masterPrisma = new PrismaClient();

async function main() {
  console.log("🚀 Phase 1 Test Data Setup");
  console.log("============================\n");

  try {
    // Step 1: Check if master database is accessible
    console.log("[1/5] Checking master database connection...");
    await masterPrisma.$connect();
    console.log("✅ Master database connected\n");

    // Step 2: Check if test tenant exists
    console.log("[2/5] Checking for test tenant...");
    let tenant = await masterPrisma.tenant.findFirst({
      where: {
        OR: [
          { shortTenantId: "8549" },
          { id: "8549" },
          { name: { contains: "Test", mode: "insensitive" } },
        ],
      },
    });

    if (!tenant) {
      console.log("   Test tenant not found. Creating...");

      // Encrypt database URL (using simple approach for dev)
      const encryptionService = {
        encrypt: (text: string): string => {
          // For development, we'll use a simple base64 encoding
          // In production, use proper encryption
          return Buffer.from(text).toString("base64");
        },
      };

      const tenantDbUrl =
        process.env.DATABASE_URL ||
        "postgresql://postgres:password@localhost:5434/inventory?schema=public";
      const encryptedDbUrl = encryptionService.encrypt(tenantDbUrl);

      tenant = await masterPrisma.tenant.create({
        data: {
          id: "8549", // Use short ID as UUID for testing
          name: "Test Tenant",
          email: "test@example.com",
          shortTenantId: "8549",
          databaseName: "inventory",
          databaseUrl: encryptedDbUrl,
          subscriptionType: "PERMANENT",
          subscriptionStartDate: new Date(),
          isActive: true,
          isSuspended: false,
        },
      });
      console.log("✅ Test tenant created");
      console.log(`   Tenant ID: ${tenant.id}`);
      console.log(`   Short Tenant ID: ${tenant.shortTenantId || "N/A"}\n`);
    } else {
      console.log("✅ Test tenant already exists");
      console.log(`   Tenant ID: ${tenant.id}`);
      console.log(`   Short Tenant ID: ${tenant.shortTenantId || "N/A"}\n`);
    }

    // Step 3: Connect to tenant database
    console.log("[3/5] Connecting to tenant database...");
    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    await tenantPrisma.$connect();
    console.log("✅ Tenant database connected\n");

    // Step 4: Check if test user exists
    console.log("[4/5] Checking for test user (john@example.com)...");
    let user = await tenantPrisma.user.findUnique({
      where: { email: "john@example.com" },
    });

    if (!user) {
      console.log("   Test user not found. Creating...");
      const passwordHash = await bcrypt.hash(requireSeedPassword(), 10);

      user = await tenantPrisma.user.create({
        data: {
          name: "John Doe",
          email: "john@example.com",
          passwordHash,
          role: "ADMIN",
          status: "ACTIVE",
          emailVerified: true,
        },
      });
      console.log("✅ Test user created");
      console.log(`   Email: ${user.email}`);
      console.log("   Password: (SEED_ADMIN_PASSWORD)");
      console.log(`   Role: ${user.role}\n`);
    } else {
      console.log("✅ Test user already exists");
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}\n`);
    }

    // Step 5: Verify permissions are seeded
    console.log("[5/5] Verifying permissions...");
    const permissionCount = await tenantPrisma.permission.count();
    if (permissionCount === 0) {
      console.log("⚠️  No permissions found. Permissions should be seeded separately.");
      console.log("   Run: npm run prisma:seed (if available)\n");
    } else {
      console.log(`✅ Found ${permissionCount} permissions\n`);
    }

    console.log("🎉 Phase 1 Test Data Setup Complete!");
    console.log("\n📋 Test Credentials:");
    console.log("   Tenant ID: 8549");
    console.log("   Email: john@example.com");
    console.log("   Password: (SEED_ADMIN_PASSWORD)");
    console.log("\n✅ Ready for Phase 1 testing!");
  } catch (error: any) {
    console.error("\n❌ Setup failed:", error.message);
    console.error("\n💡 Troubleshooting:");
    console.error("   - Ensure master database exists and migrations are run");
    console.error("   - Ensure tenant database exists");
    console.error("   - Check DATABASE_URL and MASTER_DATABASE_URL in .env");
    throw error;
  } finally {
    await masterPrisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
