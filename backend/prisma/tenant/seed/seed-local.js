/**
 * Minimal local seed for Docker environment.
 * - Ensures a tenant exists in master DB (tenantId: 8549)
 * - Ensures an admin user exists in tenant DB
 *
 * Safe to run multiple times (uses upserts).
 */

const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/tenant-client");
const { PrismaClient: MasterPrismaClient } = require("@prisma/master-client);

async function main() {
  const tenantId = process.env.LOCAL_TENANT_ID || "8549";
  const tenantDbUrl =
    process.env.LOCAL_TENANT_DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || "postgres"}:${process.env.POSTGRES_PASSWORD || "postgres"}@db:5432/${process.env.POSTGRES_DB || "inventory"}?schema=public`;

  const adminEmail = process.env.LOCAL_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.LOCAL_ADMIN_PASSWORD || "Admin@123";

  const master = new MasterPrismaClient();
  await master.$connect();

  // Ensure tenant exists (plaintext databaseUrl is supported by MultiTenantPrismaService)
  await master.tenant.upsert({
    where: { id: tenantId },
    create: {
      id: tenantId,
      name: "Local Tenant",
      email: process.env.LOCAL_TENANT_EMAIL || "tenant@example.com",
      shortTenantId: tenantId,
      databaseName: process.env.POSTGRES_DB || "inventory",
      databaseUrl: tenantDbUrl,
      subscriptionType: "PERMANENT",
      subscriptionStartDate: new Date(),
      updatedAt: new Date(),
    },
    update: {
      databaseUrl: tenantDbUrl,
      updatedAt: new Date(),
    },
  });

  await master.$disconnect();

  // Now seed tenant DB user
  const tenantPrisma = new PrismaClient({
    datasources: { db: { url: tenantDbUrl } },
  });
  await tenantPrisma.$connect();

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await tenantPrisma.user.upsert({
    where: { email: adminEmail },
    create: {
      name: "Local Admin",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    },
    update: {
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  await tenantPrisma.$disconnect();
  console.log(`[seed-local] Seeded tenant=${tenantId}, admin=${adminEmail}`);
}

main().catch((e) => {
  console.error("[seed-local] Failed:", e);
  process.exit(1);
});
