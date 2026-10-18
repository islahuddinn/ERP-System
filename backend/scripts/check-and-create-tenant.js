#!/usr/bin/env node
/**
 * Script to check and create tenant in master database
 * Usage: node scripts/check-and-create-tenant.js
 *
 * This script:
 * 1. Checks if tenant with short_tenant_id '8549' exists
 * 2. Creates tenant if it doesn't exist
 * 3. Shows tenant details
 */

const { PrismaClient } = require("@prisma/master-client");

async function main() {
  const masterPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  });

  try {
    console.log("🔍 Checking for tenant with short_tenant_id: 8549...\n");

    // Check if tenant exists
    const existingTenant = await masterPrisma.tenant.findFirst({
      where: {
        OR: [{ shortTenantId: "8549" }, { id: "8549" }],
      },
    });

    if (existingTenant) {
      console.log("✅ Tenant found!");
      console.log("📋 Tenant Details:");
      console.log(`   ID: ${existingTenant.id}`);
      console.log(`   Name: ${existingTenant.name}`);
      console.log(`   Email: ${existingTenant.email}`);
      console.log(`   Short Tenant ID: ${existingTenant.shortTenantId}`);
      console.log(`   Active: ${existingTenant.isActive}`);
      console.log(`   Suspended: ${existingTenant.isSuspended}`);
      console.log(`   Database: ${existingTenant.databaseName}`);
      return;
    }

    console.log("❌ Tenant not found. Creating new tenant...\n");

    // Get database URL (use same as master for now, or set TENANT_DATABASE_URL)
    const tenantDatabaseUrl = process.env.TENANT_DATABASE_URL || process.env.DATABASE_URL;
    const databaseName = "tenant_8549";

    // Create tenant
    const newTenant = await masterPrisma.tenant.create({
      data: {
        name: "Default Tenant",
        email: "admin@tenant.com",
        shortTenantId: "8549",
        databaseName: databaseName,
        databaseUrl: tenantDatabaseUrl, // Will be encrypted by the service
        subscriptionType: "PERMANENT",
        subscriptionStartDate: new Date(),
        isActive: true,
        isSuspended: false,
      },
    });

    console.log("✅ Tenant created successfully!");
    console.log("📋 Tenant Details:");
    console.log(`   ID: ${newTenant.id}`);
    console.log(`   Name: ${newTenant.name}`);
    console.log(`   Short Tenant ID: ${newTenant.shortTenantId}`);
    console.log(`   Database: ${newTenant.databaseName}`);
    console.log("\n⚠️  Note: You still need to:");
    console.log("   1. Create user in tenant database");
    console.log("   2. Run migrations on tenant database (if using separate database)");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.code === "P2002") {
      console.error("   Tenant with this short_tenant_id or email already exists");
    }
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }
}

main();
