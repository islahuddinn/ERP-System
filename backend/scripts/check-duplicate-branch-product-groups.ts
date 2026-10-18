/**
 * Read-only check: finds sales_branches rows whose product_group_ids array
 * already contains duplicate UUIDs (possible before @ArrayUnique validation
 * was added to CreateBranchDto/UpdateBranchDto).
 *
 * Does NOT modify any data. Run with:
 *   npx ts-node scripts/check-duplicate-branch-product-groups.ts
 */

import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import { PrismaClient as TenantPrismaClient } from "@prisma/tenant-client";

function buildTenantDatabaseUrl(schemaName: string): string {
  const rawBase = process.env.DATABASE_URL?.split("?")[0];
  if (!rawBase) throw new Error("DATABASE_URL is not defined");
  const urlObj = new URL(rawBase);
  urlObj.pathname = `/${schemaName}`;
  return `${urlObj.toString()}?schema=public`;
}

async function checkTenant(tenant: { id: string; name: string; schemaName: string }) {
  const tenantClient = new TenantPrismaClient({
    datasources: { db: { url: buildTenantDatabaseUrl(tenant.schemaName) } },
  });

  try {
    await tenantClient.$connect();

    const branches = await tenantClient.branch.findMany({
      select: { id: true, name: true, productGroupIds: true },
    });

    for (const branch of branches) {
      const uniqueCount = new Set(branch.productGroupIds).size;
      if (uniqueCount !== branch.productGroupIds.length) {
        console.log(
          `⚠️  Tenant "${tenant.name}" (${tenant.id}) — branch "${branch.name}" (${branch.id}): ` +
            `${branch.productGroupIds.length} entries, ${uniqueCount} unique`,
        );
        console.log(`    productGroupIds: ${JSON.stringify(branch.productGroupIds)}`);
      }
    }
  } catch (error) {
    console.error(`   ❌ Tenant "${tenant.name}" (${tenant.id}) failed:`, (error as Error).message);
  } finally {
    await tenantClient.$disconnect();
  }
}

async function main() {
  const masterClient = new MasterPrismaClient();

  const tenants = await masterClient.tenant.findMany({
    select: { id: true, name: true, schemaName: true },
  });

  console.log(`Checking ${tenants.length} tenant(s) for duplicate branch.productGroupIds...\n`);

  for (const tenant of tenants) {
    await checkTenant(tenant);
  }

  console.log("\nDone.");
  await masterClient.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
