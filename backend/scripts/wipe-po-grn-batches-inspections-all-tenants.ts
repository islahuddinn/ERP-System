/**
 * Wipe Purchase Orders, GRNs, Raw Material Batches, and Inspections (All Tenants)
 *
 * This script:
 *  - Iterates over ALL active tenants in the master database
 *  - For each tenant, connects to its dedicated database (named after schema_name)
 *  - DELETES all data from:
 *      - raw_material_batch_inspections
 *      - quality_control
 *      - raw_material_batch_consumptions
 *      - waste_management (rows linked to a raw material batch)
 *      - warehouse_stock_balances (rows linked to a raw material batch)
 *      - stock_ledgers (rows linked to a raw material batch)
 *      - purchase_return_items (rows linked to a batch / GRN item / purchase item)
 *      - stock_transactions (rows linked to a purchase order)
 *      - raw_material_batches
 *      - grn_items
 *      - grn
 *      - purchase_orders (cascades to purchase_items, purchase_payments)
 *
 *  - purchase_returns rows that referenced a deleted purchase order / GRN have
 *    those references nulled out (the return record itself is preserved).
 *
 *  - THIS SCRIPT IS DESTRUCTIVE AND IRREVERSIBLE. Run only against
 *    dev/test tenant databases.
 *
 * Usage:
 *   From backend directory:
 *     npx ts-node scripts/wipe-po-grn-batches-inspections-all-tenants.ts
 */

import { PrismaClient } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";

async function tableExists(tx: any, tableName: string): Promise<boolean> {
  const rows: Array<{ exists: boolean }> = await tx.$queryRawUnsafe(
    `SELECT to_regclass('public."${tableName}"') IS NOT NULL AS exists`,
  );
  return rows[0]?.exists === true;
}

async function wipeTenantData(prisma: PrismaClient): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  await prisma.$transaction(async (tx) => {
    if (await tableExists(tx, "raw_material_batch_inspections")) {
      counts.raw_material_batch_inspections = await tx.$executeRawUnsafe(
        `DELETE FROM "raw_material_batch_inspections"`,
      );
    } else {
      counts.raw_material_batch_inspections = 0;
    }

    counts.quality_control = await tx.$executeRawUnsafe(`DELETE FROM "quality_control"`);

    counts.raw_material_batch_consumptions = await tx.$executeRawUnsafe(
      `DELETE FROM "raw_material_batch_consumptions"`,
    );

    counts.waste_management = await tx.$executeRawUnsafe(
      `DELETE FROM "waste_management" WHERE "batch_id" IS NOT NULL`,
    );

    counts.warehouse_stock_balances = await tx.$executeRawUnsafe(
      `DELETE FROM "warehouse_stock_balances" WHERE "batch_id" IS NOT NULL`,
    );

    counts.stock_ledgers = await tx.$executeRawUnsafe(
      `DELETE FROM "stock_ledgers" WHERE "batch_id" IS NOT NULL`,
    );

    counts.purchase_return_items = await tx.$executeRawUnsafe(
      `DELETE FROM "purchase_return_items"
       WHERE "batch_id" IS NOT NULL
          OR "grn_item_id" IS NOT NULL
          OR "purchase_item_id" IS NOT NULL`,
    );

    counts.purchase_returns_cleared = await tx.$executeRawUnsafe(
      `UPDATE "purchase_returns"
       SET "purchase_order_id" = NULL, "grn_id" = NULL
       WHERE "purchase_order_id" IS NOT NULL OR "grn_id" IS NOT NULL`,
    );

    counts.stock_transactions = await tx.$executeRawUnsafe(
      `DELETE FROM "stock_transactions" WHERE "purchase_order_id" IS NOT NULL`,
    );

    counts.raw_material_batches = await tx.$executeRawUnsafe(`DELETE FROM "raw_material_batches"`);

    counts.grn_items = await tx.$executeRawUnsafe(`DELETE FROM "grn_items"`);

    counts.grn = await tx.$executeRawUnsafe(`DELETE FROM "grn"`);

    counts.purchase_orders = await tx.$executeRawUnsafe(`DELETE FROM "purchase_orders"`);
  });

  return counts;
}

function buildTenantDatabaseUrl(baseUrl: string, schemaName: string): string {
  const urlObj = new URL(baseUrl.split("?")[0]);
  urlObj.pathname = `/${schemaName}`;
  return `${urlObj.toString()}?schema=public`;
}

async function processTenant(
  tenant: { id: string; name: string; schemaName: string },
  baseUrl: string,
): Promise<{
  tenantId: string;
  tenantName: string;
  success: boolean;
  error?: string;
  counts?: Record<string, number>;
}> {
  console.log(`\n📊 Processing tenant: ${tenant.name} (${tenant.id}, schema=${tenant.schemaName})`);

  const tenantDbUrl = buildTenantDatabaseUrl(baseUrl, tenant.schemaName);
  const tenantClient = new PrismaClient({
    datasources: { db: { url: tenantDbUrl } },
    log: ["error"],
  });

  try {
    console.log(`   🔌 Connecting to tenant database "${tenant.schemaName}"...`);
    await tenantClient.$connect();
    console.log("   ✅ Connected to tenant database");

    const counts = await wipeTenantData(tenantClient);

    console.log(`   🎉 Wipe complete for ${tenant.name}`);
    for (const [table, count] of Object.entries(counts)) {
      console.log(`      - ${table}: ${count} row(s) affected`);
    }

    return { tenantId: tenant.id, tenantName: tenant.name, success: true, counts };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`   ❌ Wipe failed for tenant ${tenant.name}: ${errorMessage}`);
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
  console.log("🔧 Wipe PO / GRN / Raw Material Batches / Inspections (All Tenants)");
  console.log("====================================================================\n");

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
      const result = await processTenant(tenant, baseUrl);
      results.push(result);
    }

    console.log("\n====================================================================");
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

    console.log("--------------------------------------------------------------------");
    console.log(`Total tenants: ${results.length}`);
    console.log(`Succeeded:     ${successCount}`);
    console.log(`Failed:        ${failureCount}`);
    console.log("====================================================================");

    if (failureCount > 0) {
      process.exitCode = 1;
    }
  } catch (error: any) {
    console.error("\n❌ Global wipe failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Fatal error in wipe script:", error);
  process.exit(1);
});
