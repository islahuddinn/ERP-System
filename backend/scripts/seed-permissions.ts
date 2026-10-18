/**
 * Standalone permissions seeder — seeds ALL active tenants.
 * Run: npm run seed:permissions
 *
 * - Reads all active tenants from master DB (MASTER_DATABASE_URL).
 * - Connects to each tenant DB and creates any missing permission.
 * - Ensures the Admin role exists and holds every permission (including newly added ones).
 * - Prints a Phase A distribution-sales verification report for the Admin role.
 * - Never updates or deletes existing permissions (safe to run at any time).
 */

import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import { PrismaClient as TenantPrismaClient } from "@prisma/tenant-client";
import {
  getAllPermissionNames,
  PERMISSIONS,
} from "../src/users/permissions/permission.definitions";

const masterPrisma = new MasterPrismaClient();

/** Distribution sales permissions required for Phase A operational UAT on Admin. */
const PHASE_A_ADMIN_VERIFICATION_PERMISSIONS = [
  "sales-region.view",
  "sales-person-assignment.view",
  "sales-person-assignment.manage",
  "customer-category.view",
  "customer-category.manage",
  "customers.read",
  "customers.create",
  "customer-order.view",
  "customer-order.create",
  "customer-delivery.view",
  "customer-delivery.deliver",
  "customer-ledger.view",
  "customer-return.view",
  "customer-return.create",
  "customer-return.approve",
  "customer-recovery.view",
  "customer-recovery.create",
  "branch-stock.view",
  "branch-ledger.view",
  "branch-stock-request.view",
  "branch-stock-request.create",
  "branch-stock-request.approve",
  "branch-stock-request.approve-factory",
  "branch-stock-transfer.view",
  "branch-stock-transfer.confirm-receipt",
  "branch-stock-transfer.cancel",
  "branch-stock-return.view",
  "branch-stock-return.create",
  "branch-stock-return.approve",
  "branch-stock-return.approve-factory",
  "factory-stock.view",
  "factory-stock.manage",
  "price-list.view",
  "price-list.manage",
  "branch-product-price.view",
  "branch-product-price.manage",
  "branch-product-price.manage-factory",
  "employee-cash-ledger.view",
  "employee-cash-ledger.view-all",
  "employee-cash-transfer.view",
  "employee-cash-transfer.create",
  "employee-cash-transfer.respond",
  "customer-ledger-adjustment.view",
  "customer-ledger-adjustment.create",
  "product-bonus-group.view",
  "product-bonus-group.manage",
  "product-bonus-scheme.view",
  "product-bonus-scheme.manage",
  "transporter.view",
  "transporter.manage",
  "product-adjustment.view",
  "product-adjustment.create",
  "hr.view",
] as const;

function buildTenantClient(schemaName: string): TenantPrismaClient {
  const base = process.env.DATABASE_URL?.split("?")[0];
  if (!base) throw new Error("DATABASE_URL is not set in .env");

  const url = new URL(base);
  url.pathname = `/${schemaName}`;

  return new TenantPrismaClient({ datasources: { db: { url: url.toString() } } });
}

async function ensureAdminRole(prisma: TenantPrismaClient) {
  return prisma.role.upsert({
    where: { name: "Admin" },
    update: { isActive: true },
    create: {
      name: "Admin",
      description: "Full system access",
      isSystem: true,
      isActive: true,
    },
  });
}

async function assignAllPermissionsToAdmin(prisma: TenantPrismaClient): Promise<number> {
  const adminRole = await ensureAdminRole(prisma);
  const allPermissions = await prisma.permission.findMany();
  let assigned = 0;

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
    assigned++;
  }

  return assigned;
}

async function verifyAdminPhaseAPermissions(
  prisma: TenantPrismaClient,
): Promise<{ ok: string[]; missing: string[] }> {
  const adminRole = await prisma.role.findUnique({ where: { name: "Admin" } });

  if (!adminRole) {
    return { ok: [], missing: [...PHASE_A_ADMIN_VERIFICATION_PERMISSIONS] };
  }

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId: adminRole.id },
    include: { permission: { select: { name: true } } },
  });

  const assignedNames = new Set(rolePermissions.map((entry) => entry.permission.name));
  const ok: string[] = [];
  const missing: string[] = [];

  for (const permissionName of PHASE_A_ADMIN_VERIFICATION_PERMISSIONS) {
    if (assignedNames.has(permissionName)) {
      ok.push(permissionName);
    } else {
      missing.push(permissionName);
    }
  }

  return { ok, missing };
}

async function seedTenant(
  schemaName: string,
): Promise<{ created: number; skipped: number; adminAssigned: number; phaseA: { ok: string[]; missing: string[] } }> {
  const prisma = buildTenantClient(schemaName);
  const names = getAllPermissionNames();
  let created = 0;
  let skipped = 0;

  try {
    for (const name of names) {
      const existing = await prisma.permission.findUnique({ where: { name } });

      if (existing) {
        skipped++;
        continue;
      }

      const def = PERMISSIONS[name];
      await prisma.permission.create({
        data: { name, module: def.module, action: def.action, description: def.description },
      });

      console.log(`    ✅  Created: ${name}`);
      created++;
    }

    const adminAssigned = await assignAllPermissionsToAdmin(prisma);
    const phaseA = await verifyAdminPhaseAPermissions(prisma);

    return { created, skipped, adminAssigned, phaseA };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  // Raw query — bypasses Prisma multiSchema mismatch (tables live in `master` schema)
  const tenants = await masterPrisma.$queryRaw<{ name: string; schema_name: string }[]>`
    SELECT name, schema_name
    FROM   tenants
    WHERE  status = 'ACTIVE' AND deleted_at IS NULL
    ORDER  BY name
  `;

  if (tenants.length === 0) {
    console.log("No active tenants found.");
    return;
  }

  console.log(`🌱  Seeding permissions for ${tenants.length} tenant(s)...\n`);

  let totalCreated = 0;
  let totalSkipped = 0;
  let tenantsWithPhaseAGaps = 0;

  for (const tenant of tenants) {
    console.log(`  📦  ${tenant.name} (${tenant.schema_name})`);

    const { created, skipped, adminAssigned, phaseA } = await seedTenant(tenant.schema_name);
    totalCreated += created;
    totalSkipped += skipped;

    console.log(`       → ${created} created, ${skipped} already existed`);
    console.log(`       → Admin role synced with ${adminAssigned} permission(s)`);

    if (phaseA.missing.length === 0) {
      console.log(`       → Phase A Admin verification: ✅ all ${phaseA.ok.length} required permissions present\n`);
    } else {
      tenantsWithPhaseAGaps++;
      console.log(`       → Phase A Admin verification: ⚠️  missing ${phaseA.missing.length} permission(s):`);
      for (const missing of phaseA.missing) {
        console.log(`          - ${missing}`);
      }
      console.log("");
    }
  }

  console.log(
    `Done — ${totalCreated} created, ${totalSkipped} already existed across all tenants.`,
  );

  if (tenantsWithPhaseAGaps > 0) {
    console.log(
      `⚠️  ${tenantsWithPhaseAGaps} tenant(s) still missing Phase A permissions on Admin — re-run after fixing permission definitions.`,
    );
    process.exitCode = 1;
  } else {
    console.log("✅  All active tenants passed Phase A Admin permission verification.");
  }
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e.message);
    process.exit(1);
  })
  .finally(() => masterPrisma.$disconnect());
