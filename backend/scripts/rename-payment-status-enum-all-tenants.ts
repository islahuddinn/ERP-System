/**
 * Rename PaymentStatus Enum Type (All Tenants)
 *
 * The tenant schema's "EPaymentStatus" Postgres enum type was renamed to
 * "PaymentStatus" for naming consistency with the rest of the codebase.
 * This script applies the equivalent `ALTER TYPE ... RENAME TO ...` to every
 * active tenant's dedicated database. It is idempotent and non-destructive -
 * it only renames the type, it never touches rows or values.
 *
 * Usage:
 *   From backend directory:
 *     npx ts-node scripts/rename-payment-status-enum-all-tenants.ts
 */

import { PrismaClient } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";

function buildTenantDatabaseUrl(baseUrl: string, schemaName: string): string {
  const urlObj = new URL(baseUrl.split("?")[0]);
  urlObj.pathname = `/${schemaName}`;
  return `${urlObj.toString()}?schema=public`;
}

async function renameEnumForTenant(
  tenant: { id: string; name: string; schemaName: string },
  baseUrl: string,
): Promise<{ tenantId: string; tenantName: string; success: boolean; error?: string }> {
  console.log(`\n📊 Processing tenant: ${tenant.name} (${tenant.id}, schema=${tenant.schemaName})`);

  const tenantDbUrl = buildTenantDatabaseUrl(baseUrl, tenant.schemaName);
  const tenantClient = new PrismaClient({
    datasources: { db: { url: tenantDbUrl } },
    log: ["error"],
  });

  try {
    console.log(`   🔌 Connecting to tenant database "${tenant.schemaName}"...`);
    await tenantClient.$connect();

    const existing: Array<{ typname: string }> = await tenantClient.$queryRawUnsafe(
      `SELECT typname FROM pg_type WHERE typname IN ('EPaymentStatus', 'PaymentStatus')`,
    );
    const hasOldType = existing.some((row) => row.typname === "EPaymentStatus");
    const hasNewType = existing.some((row) => row.typname === "PaymentStatus");

    if (!hasOldType && hasNewType) {
      console.log(`   ✅ Already renamed. Skipping...`);
      return { tenantId: tenant.id, tenantName: tenant.name, success: true };
    }

    if (!hasOldType) {
      console.log(`   ⚠️  "EPaymentStatus" type not found. Skipping...`);
      return { tenantId: tenant.id, tenantName: tenant.name, success: true };
    }

    await tenantClient.$executeRawUnsafe(`ALTER TYPE "EPaymentStatus" RENAME TO "PaymentStatus";`);
    console.log(`   🎉 Renamed "EPaymentStatus" to "PaymentStatus"`);

    return { tenantId: tenant.id, tenantName: tenant.name, success: true };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`   ❌ Rename failed for tenant ${tenant.name}: ${errorMessage}`);
    return { tenantId: tenant.id, tenantName: tenant.name, success: false, error: errorMessage };
  } finally {
    try {
      await tenantClient.$disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
  }
}

async function main() {
  console.log("🔧 Rename PaymentStatus Enum Type (All Tenants)");
  console.log("================================================\n");

  const baseUrl = process.env.TENANT_DATABASE_URL || process.env.DATABASE_URL;
  if (!baseUrl) {
    console.error("❌ TENANT_DATABASE_URL or DATABASE_URL is not set in environment");
    process.exit(1);
  }

  if (!process.env.MASTER_DATABASE_URL) {
    console.error("❌ MASTER_DATABASE_URL is not set in environment");
    process.exit(1);
  }

  const masterPrisma = new MasterPrismaClient();

  try {
    console.log("🔌 Connecting to master database...");
    await masterPrisma.$connect();
    console.log("✅ Connected to master database\n");

    const tenants = await masterPrisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, schemaName: true },
    });

    if (!tenants || tenants.length === 0) {
      console.log("⚠️  No active tenants found. Nothing to do.");
      return;
    }

    console.log(`Found ${tenants.length} active tenant(s).\n`);

    const results = [];
    for (const tenant of tenants) {
      const result = await renameEnumForTenant(tenant, baseUrl);
      results.push(result);
    }

    console.log("\n================================================");
    console.log("Summary:");
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    for (const r of results) {
      if (r.success) {
        console.log(`  ✅ ${r.tenantName} (${r.tenantId})`);
      } else {
        console.log(`  ❌ ${r.tenantName} (${r.tenantId}) - ${r.error}`);
      }
    }

    console.log("------------------------------------------------");
    console.log(`Total tenants: ${results.length}`);
    console.log(`Succeeded:     ${successCount}`);
    console.log(`Failed:        ${failureCount}`);
    console.log("================================================");

    if (failureCount > 0) {
      process.exitCode = 1;
    }
  } catch (error: any) {
    console.error("\n❌ Global rename failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Fatal error in rename script:", error);
  process.exit(1);
});
