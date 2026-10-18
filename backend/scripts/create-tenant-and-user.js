#!/usr/bin/env node
/**
 * Complete script to create tenant and user
 * Usage: node scripts/create-tenant-and-user.js
 *
 * This script:
 * 1. Creates tenant in master database (if doesn't exist)
 * 2. Creates user in tenant database (if doesn't exist)
 * 3. Uses proper password hashing
 */

const { PrismaClient } = require("@prisma/master-client");
const { PrismaClient: TenantPrismaClient } = require("@prisma/tenant-client");
const bcrypt = require("bcrypt");

async function main() {
  // Set database URL for Prisma
  const databaseUrl = process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ Error: MASTER_DATABASE_URL or DATABASE_URL must be set");
    console.log("\n💡 Set it with:");
    console.log('   $env:MASTER_DATABASE_URL="your-connection-string"');
    process.exit(1);
  }

  // Set environment variable for Prisma
  process.env.DATABASE_URL = databaseUrl;

  const masterPrisma = new PrismaClient();

  // Tenant details
  const tenantShortId = "8549";
  const tenantName = "Main Tenant";
  const tenantEmail = "admin@tenant.com";
  const databaseName = "tenant_8549";

  // User details
  const userEmail = "mubeenwaris2003@gmail.com";
  const userPassword = "Mubeen@123";
  const userName = "Mubeen Waris";

  try {
    console.log("🚀 Starting tenant and user creation...\n");

    // Step 1: Check if tenant exists
    console.log(`🔍 Checking for tenant with short_tenant_id: ${tenantShortId}...`);
    let tenant = await masterPrisma.tenant.findFirst({
      where: {
        OR: [{ shortTenantId: tenantShortId }, { id: tenantShortId }],
      },
    });

    if (tenant) {
      console.log("✅ Tenant already exists!");
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Name: ${tenant.name}`);
      console.log(`   Short Tenant ID: ${tenant.shortTenantId}\n`);
    } else {
      console.log("📝 Creating new tenant...");

      // Create tenant
      tenant = await masterPrisma.tenant.create({
        data: {
          name: tenantName,
          email: tenantEmail,
          shortTenantId: tenantShortId,
          databaseName: databaseName,
          databaseUrl: databaseUrl, // Will be encrypted by encryption service if needed
          subscriptionType: "PERMANENT",
          subscriptionStartDate: new Date(),
          isActive: true,
          isSuspended: false,
        },
      });

      console.log("✅ Tenant created successfully!");
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Name: ${tenant.name}`);
      console.log(`   Short Tenant ID: ${tenant.shortTenantId}\n`);
    }

    // Step 2: Create user in tenant database
    console.log(`🔍 Checking for user: ${userEmail} in tenant database...`);

    // Connect to tenant database (using same database for now)
    // Note: For now, we'll use the same database URL
    // In production, you'd use the tenant's specific database URL
    const tenantPrisma = new TenantPrismaClient();

    // Check if user exists
    let user = await tenantPrisma.user.findUnique({
      where: { email: userEmail },
    });

    if (user) {
      console.log("✅ User already exists!");
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}\n`);

      // Update password to ensure it's correct
      console.log("🔄 Updating password...");
      const passwordHash = await bcrypt.hash(userPassword, 10);
      await tenantPrisma.user.update({
        where: { email: userEmail },
        data: {
          passwordHash: passwordHash,
          status: "ACTIVE",
        },
      });
      console.log("✅ Password updated!\n");
    } else {
      console.log("📝 Creating new user...");

      // Hash password
      const passwordHash = await bcrypt.hash(userPassword, 10);

      // Create user
      user = await tenantPrisma.user.create({
        data: {
          name: userName,
          email: userEmail,
          passwordHash: passwordHash,
          role: "ADMIN",
          status: "ACTIVE",
          emailVerified: true,
        },
      });

      console.log("✅ User created successfully!");
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}\n`);
    }

    console.log("🎉 Setup complete!");
    console.log("\n📋 Summary:");
    console.log(`   Tenant ID: ${tenant.id}`);
    console.log(`   Tenant Short ID: ${tenant.shortTenantId}`);
    console.log(`   User Email: ${userEmail}`);
    console.log(`   User Password: ${userPassword}`);
    console.log("\n✅ You can now login with:");
    console.log(`   Email: ${userEmail}`);
    console.log(`   Password: ${userPassword}`);
    console.log(`   Tenant ID: ${tenantShortId}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.code === "P2002") {
      console.error("   Duplicate entry - tenant or user already exists");
    }
    console.error(error.stack);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
    if (tenantPrisma) {
      await tenantPrisma.$disconnect();
    }
  }
}

main();
