/**
 * Dedupes sales_branches.product_group_ids arrays that contain the same
 * product-group UUID more than once (possible before @ArrayUnique validation
 * was added to CreateBranchDto/UpdateBranchDto). Order of first occurrence
 * is preserved; only exact duplicate entries are removed, nothing else on
 * the row is touched.
 *
 * Run with:
 *   npx ts-node scripts/fix-duplicate-branch-product-groups.ts
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

async function fixTenant(tenant: { id: string; name: string; schemaName: string }) {
  const tenantClient = new TenantPrismaClient({
    datasources: { db: { url: buildTenantDatabaseUrl(tenant.schemaName) } },
  });

  try {
    await tenantClient.$connect();

    const branches = await tenantClient.branch.findMany({
      select: { id: true, name: true, productGroupIds: true },
    });

    for (const branch of branches) {
      const uniqueIds = [...new Set(branch.productGroupIds)];
      if (uniqueIds.length === branch.productGroupIds.length) continue;

      await tenantClient.branch.update({
        where: { id: branch.id },
        data: { productGroupIds: uniqueIds },
      });

      console.log(
        `✅ Tenant "${tenant.name}" — branch "${branch.name}" (${branch.id}): ` +
          `${branch.productGroupIds.length} entries → ${uniqueIds.length} unique`,
      );
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

  console.log(`Fixing ${tenants.length} tenant(s) for duplicate branch.productGroupIds...\n`);

  for (const tenant of tenants) {
    await fixTenant(tenant);
  }

  console.log("\nDone.");
  await masterClient.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
