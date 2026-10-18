/**
 * Default role permission templates for distribution ERP tenants.
 * Run: npm run seed:default-roles
 *
 * Creates or updates non-admin roles with curated permission sets.
 * Admin / Super Admin still receive all permissions via seed:permissions.
 */

import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import { PrismaClient as TenantPrismaClient } from "@prisma/tenant-client";
import type { PermissionName } from "../src/users/permissions/permission.definitions";

const masterPrisma = new MasterPrismaClient();

const SHARED_EVERYONE: PermissionName[] = ["dashboard.view"];

const SALES_EMPLOYEE_PERMISSIONS: PermissionName[] = [
  ...SHARED_EVERYONE,
  "customers.read",
  "customer-order.view",
  "customer-order.create",
  "customer-delivery.view",
  "customer-delivery.deliver",
  "customer-ledger.view",
  "customer-return.view",
  "customer-return.create",
  "customer-recovery.view",
  "customer-recovery.create",
  "employee-cash-ledger.view",
  "employee-cash-transfer.view",
  "employee-cash-transfer.create",
  "employee-cash-transfer.respond",
  "branch-stock.view",
];

const SALES_MANAGER_PERMISSIONS: PermissionName[] = [
  ...SALES_EMPLOYEE_PERMISSIONS,
  "sales-region.view",
  "sales-person-assignment.view",
  "sales-person-assignment.manage",
  "customer-category.view",
  "customer-category.manage",
  "product-bonus-group.view",
  "product-bonus-group.manage",
  "product-bonus-scheme.view",
  "product-bonus-scheme.manage",
  "transporter.view",
  "transporter.manage",
  "customer-return.approve",
  "customer-ledger-adjustment.view",
  "customer-ledger-adjustment.create",
  "product-adjustment.view",
  "product-adjustment.create",
  "branch-stock-request.view",
  "branch-stock-request.create",
  "branch-stock-request.approve",
  "branch-stock-transfer.view",
  "branch-stock-transfer.confirm-receipt",
  "branch-stock-return.view",
  "branch-stock-return.create",
  "branch-stock-return.approve",
  "branch-ledger.view",
  "branch-product-price.view",
  "branch-product-price.manage",
  "price-list.view",
  "employee-cash-ledger.view-all",
];

const FACTORY_STOCK_MANAGER_PERMISSIONS: PermissionName[] = [
  ...SHARED_EVERYONE,
  "reports.view",
  "factory-stock.view",
  "factory-stock.manage",
  "branch-stock-request.view",
  "branch-stock-request.approve-factory",
  "branch-stock-transfer.view",
  "branch-stock-return.view",
  "branch-stock-return.approve-factory",
  "warehouses.view",
  "stock.read",
  "stock.transfer",
  "grn.read",
];

const HR_MANAGER_PERMISSIONS: PermissionName[] = [
  ...SHARED_EVERYONE,
  "hr.view",
  "hr.manage_employees",
  "hr.manage_attendance",
  "hr.manage_payroll",
  "hr.approve_payroll",
  "attendance.view_all",
  "shifts.view",
  "payroll.view",
  "leave-requests.view",
  "leave-requests.approve",
  "loan-requests.view",
  "loan-requests.approve",
  "holidays.view",
  "hr.view_recruitment",
];

const ROLE_TEMPLATES: {
  name: string;
  description: string;
  permissions: PermissionName[];
}[] = [
  {
    name: "Sales Employee",
    description: "Field sales — shop orders, deliveries, returns, recoveries, own cash ledger",
    permissions: SALES_EMPLOYEE_PERMISSIONS,
  },
  {
    name: "Sales Manager",
    description: "Branch distributor ops — approvals, master data, branch stock, adjustments",
    permissions: SALES_MANAGER_PERMISSIONS,
  },
  {
    name: "Factory Stock Manager",
    description: "Factory stock approval and warehouse transfers",
    permissions: FACTORY_STOCK_MANAGER_PERMISSIONS,
  },
  {
    name: "HR Manager",
    description: "HR core, attendance, payroll, leave and loans",
    permissions: HR_MANAGER_PERMISSIONS,
  },
];

function buildTenantClient(schemaName: string): TenantPrismaClient {
  const base = process.env.DATABASE_URL?.split("?")[0];
  if (!base) throw new Error("DATABASE_URL is not set in .env");

  const url = new URL(base);
  url.pathname = `/${schemaName}`;

  return new TenantPrismaClient({ datasources: { db: { url: url.toString() } } });
}

async function syncRolePermissions(
  prisma: TenantPrismaClient,
  roleId: string,
  permissionNames: PermissionName[],
): Promise<number> {
  const permissions = await prisma.permission.findMany({
    where: { name: { in: permissionNames } },
    select: { id: true, name: true },
  });

  const foundNames = new Set(permissions.map((permission) => permission.name));
  const missing = permissionNames.filter((name) => !foundNames.has(name));
  if (missing.length) {
    console.warn(`  ⚠ Missing permissions (run seed:permissions first): ${missing.join(", ")}`);
  }

  await prisma.rolePermission.deleteMany({ where: { roleId } });

  for (const permission of permissions) {
    await prisma.rolePermission.create({
      data: { roleId, permissionId: permission.id },
    });
  }

  return permissions.length;
}

async function seedTenantRoles(schemaName: string): Promise<void> {
  const prisma = buildTenantClient(schemaName);

  try {
    console.log(`\nTenant: ${schemaName}`);

    for (const template of ROLE_TEMPLATES) {
      const role = await prisma.role.upsert({
        where: { name: template.name },
        update: { description: template.description, isActive: true },
        create: {
          name: template.name,
          description: template.description,
          isSystem: true,
          isActive: true,
        },
      });

      const assigned = await syncRolePermissions(prisma, role.id, template.permissions);
      console.log(`  ✅ ${template.name}: ${assigned} permissions`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const tenants = await masterPrisma.tenant.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: { schemaName: true },
  });

  if (!tenants.length) {
    console.log("No active tenants found.");
    return;
  }

  for (const tenant of tenants) {
    await seedTenantRoles(tenant.schemaName);
  }

  console.log("\nDone. Assign users to roles at Settings → Roles & Permissions.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await masterPrisma.$disconnect();
  });
