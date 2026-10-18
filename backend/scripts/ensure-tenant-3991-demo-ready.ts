/**
 * Idempotent demo bootstrap for tenant 3991 — no DB recreate.
 * Run from backend/: npx ts-node scripts/ensure-tenant-3991-demo-ready.ts
 */
import { readFileSync } from "fs";
import path from "path";
import { URL } from "url";
import * as bcrypt from "bcrypt";
import { PrismaClient as TenantPrismaClient, DistributionPricingMode, PriceListTier } from "@prisma/tenant-client";
import { PERMISSIONS, getAllPermissionNames } from "../src/users/permissions/permission.definitions";
import { reconcileAllProductBatchDerivedStatuses } from "../src/product-management/product-batches/utils/batch-status.util";
import { requireSeedPassword } from "./lib/require-seed-password";

const TENANT_SHORT_ID = "3991";
const ADMIN_EMAIL = "islahuddin.malindtech@gmail.com";
const ADMIN_PASSWORD = requireSeedPassword();
const ADMIN_FIRST_NAME = "Islahuddin";
const ADMIN_LAST_NAME = "Malindtech";
const FACTORY_MANAGER_EMAIL = "factory.manager@malindtech.com";
const FACTORY_MANAGER_PASSWORD = process.env.SEED_FACTORY_MANAGER_PASSWORD?.trim() || ADMIN_PASSWORD;
const FACTORY_MANAGER_FIRST_NAME = "Factory";
const FACTORY_MANAGER_LAST_NAME = "Manager";

const FACTORY_STOCK_MANAGER_PERMISSIONS = [
  "branch-stock-request.view",
  "branch-stock-request.approve-factory",
  "branch-stock-transfer.view",
  "factory-stock.view",
  "factory-stock.manage",
  "employee-cash-ledger.view",
  "employee-cash-transfer.view",
  "employee-cash-transfer.respond",
] as const;

function loadEnvFile(envPath: string): Record<string, string> {
  const env: Record<string, string> = {};
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!key) continue;
    const value = rest.join("=").trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
    env[key] = value;
  }
  return env;
}

function buildTenantDatabaseUrl(baseUrl: string, tenantShortId: string): string {
  const url = new URL(baseUrl);
  url.search = "";
  url.pathname = `/${tenantShortId}`;
  url.searchParams.set("schema", "public");
  return url.toString();
}

async function main() {
  const envPath = path.resolve(__dirname, "../.env");
  if (!process.env.DATABASE_URL) {
    const env = loadEnvFile(envPath);
    for (const [key, value] of Object.entries(env)) {
      if (!process.env[key]) process.env[key] = value;
    }
  }

  const tenantDatabaseUrl = buildTenantDatabaseUrl(process.env.DATABASE_URL!, TENANT_SHORT_ID);
  const tenantPrisma = new TenantPrismaClient({
    datasources: { db: { url: tenantDatabaseUrl } },
  });

  try {
    console.log("Seeding permissions...");

    // Ensure schema is up to date (creates customer_ledger_adjustments, product_adjustments, etc.)
    const { execSync } = await import("child_process");
    console.log("Syncing tenant schema...");
    execSync("npx ts-node scripts/ensure-tenant-schema-sync.ts", {
      stdio: "inherit",
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, TENANT_SHORT_ID },
    });
    for (const permissionName of getAllPermissionNames()) {
      const definition = PERMISSIONS[permissionName];
      await tenantPrisma.permission.upsert({
        where: { name: permissionName },
        update: {
          module: definition.module,
          action: definition.action,
          description: definition.description,
        },
        create: {
          name: permissionName,
          module: definition.module,
          action: definition.action,
          description: definition.description,
        },
      });
    }

    const permissions = await tenantPrisma.permission.findMany();

    const superAdminRole = await tenantPrisma.role.upsert({
      where: { name: "Super Admin" },
      update: { isActive: true, isSystem: true },
      create: {
        name: "Super Admin",
        description: "Full system access",
        isSystem: true,
        isActive: true,
      },
    });

    for (const permission of permissions) {
      await tenantPrisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: superAdminRole.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: superAdminRole.id, permissionId: permission.id },
      });
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const adminUser = await tenantPrisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        password: passwordHash,
        roleId: superAdminRole.id,
        loginAccess: "ENABLED",
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
      },
      create: {
        email: ADMIN_EMAIL,
        password: passwordHash,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        roleId: superAdminRole.id,
        loginAccess: "ENABLED",
      },
    });

    const existingEmployee = await tenantPrisma.employee.findFirst({
      where: { userId: adminUser.id },
    });

    if (!existingEmployee) {
      await tenantPrisma.employee.create({
        data: {
          userId: adminUser.id,
          employeeCode: "EMP-3991-ADMIN",
          dateOfJoining: new Date(),
          status: "ACTIVE",
        },
      });
      console.log("✅ Created employee EMP-3991-ADMIN");
    } else {
      await tenantPrisma.employee.update({
        where: { id: existingEmployee.id },
        data: { status: "ACTIVE", userId: adminUser.id },
      });
      console.log(`✅ Employee ready: ${existingEmployee.employeeCode}`);
    }

    const settings = await tenantPrisma.settings.findFirst();
    if (settings) {
      await tenantPrisma.settings.update({
        where: { id: settings.id },
        data: { distributionPricingMode: DistributionPricingMode.FIXED_PRICE },
      });
      console.log("✅ Pricing mode set to FIXED_PRICE (uses Trade Price Lists)");
    }

    const branchesMissingTier = await tenantPrisma.branch.findMany({
      where: { priceTier: null },
      select: { id: true, name: true, type: true },
    });
    for (const branch of branchesMissingTier) {
      const priceTier =
        branch.type === "PRIMARY" ? PriceListTier.DISTRIBUTOR_PRICE : PriceListTier.TRADE_PRICE;
      await tenantPrisma.branch.update({
        where: { id: branch.id },
        data: { priceTier },
      });
      console.log(`✅ Branch "${branch.name}" → priceTier ${priceTier}`);
    }

    const factoryStockManagerRole = await tenantPrisma.role.upsert({
      where: { name: "Factory Stock Manager" },
      update: { isActive: true, isSystem: false },
      create: {
        name: "Factory Stock Manager",
        description: "Approves factory-bound branch stock requests and manages factory stock",
        isSystem: false,
        isActive: true,
      },
    });

    const factoryPermissions = await tenantPrisma.permission.findMany({
      where: { name: { in: [...FACTORY_STOCK_MANAGER_PERMISSIONS] } },
    });

    for (const permission of factoryPermissions) {
      await tenantPrisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: factoryStockManagerRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: factoryStockManagerRole.id, permissionId: permission.id },
      });
    }

    const factoryManagerHash = await bcrypt.hash(FACTORY_MANAGER_PASSWORD, 10);
    const factoryManagerUser = await tenantPrisma.user.upsert({
      where: { email: FACTORY_MANAGER_EMAIL },
      update: {
        password: factoryManagerHash,
        roleId: factoryStockManagerRole.id,
        loginAccess: "ENABLED",
        firstName: FACTORY_MANAGER_FIRST_NAME,
        lastName: FACTORY_MANAGER_LAST_NAME,
      },
      create: {
        email: FACTORY_MANAGER_EMAIL,
        password: factoryManagerHash,
        firstName: FACTORY_MANAGER_FIRST_NAME,
        lastName: FACTORY_MANAGER_LAST_NAME,
        roleId: factoryStockManagerRole.id,
        loginAccess: "ENABLED",
      },
    });

    const existingFactoryEmployee = await tenantPrisma.employee.findFirst({
      where: { userId: factoryManagerUser.id },
    });

    if (!existingFactoryEmployee) {
      await tenantPrisma.employee.create({
        data: {
          userId: factoryManagerUser.id,
          employeeCode: "EMP-FACTORY-MGR",
          dateOfJoining: new Date(),
          status: "ACTIVE",
        },
      });
      console.log("✅ Created employee EMP-FACTORY-MGR (Factory Stock Manager)");
    } else {
      await tenantPrisma.employee.update({
        where: { id: existingFactoryEmployee.id },
        data: { status: "ACTIVE", userId: factoryManagerUser.id },
      });
      console.log("✅ Factory manager employee ready: EMP-FACTORY-MGR");
    }

    const reconciledBatches = await reconcileAllProductBatchDerivedStatuses(tenantPrisma);
    if (reconciledBatches > 0) {
      console.log(`✅ Reconciled product batch statuses: ${reconciledBatches}`);
    }

    console.log("\n✅ Tenant 3991 demo bootstrap complete.");
    console.log(`   Admin: ${ADMIN_EMAIL} (Super Admin)`);
    console.log(`   Factory approver: ${FACTORY_MANAGER_EMAIL} (Factory Stock Manager)`);
    console.log(`   Role: Super Admin (${permissions.length} permissions)`);
    console.log("   Log out and log back in to refresh your session.");
  } finally {
    await tenantPrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Bootstrap failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
