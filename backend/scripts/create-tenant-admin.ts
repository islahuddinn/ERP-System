import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { URL } from "url";
import { Client } from "pg";
import * as bcrypt from "bcrypt";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import { PrismaClient as TenantPrismaClient } from "@prisma/tenant-client";
import { PERMISSIONS, getAllPermissionNames } from "../src/users/permissions/permission.definitions";
import { requireSeedPassword } from "./lib/require-seed-password";

const TENANT_SHORT_ID = "3991";
const ADMIN_EMAIL = "islahuddin.malindtech@gmail.com";
const ADMIN_PASSWORD = requireSeedPassword();
const ADMIN_FIRST_NAME = "Islahuddin";
const ADMIN_LAST_NAME = "Malindtech";
const ADMIN_ROLE_NAME = "Admin";
const TENANT_NAME = "Malind Tech Tenant 3991";
const TENANT_EMAIL = "islahuddin.malindtech@gmail.com";

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

function resolveUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.searchParams.delete("schema");
  return url.toString();
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
  if (!process.env.MASTER_DATABASE_URL || !process.env.DATABASE_URL) {
    const env = loadEnvFile(envPath);
    for (const [key, value] of Object.entries(env)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }

  const masterDatabaseUrl = process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL;
  const tenantDatabaseBaseUrl = process.env.DATABASE_URL;

  if (!masterDatabaseUrl || !tenantDatabaseBaseUrl) {
    throw new Error("MASTER_DATABASE_URL and DATABASE_URL must be set in backend/.env or the shell environment.");
  }

  const masterDatabaseUrlForPg = resolveUrl(masterDatabaseUrl);
  const tenantDatabaseUrl = buildTenantDatabaseUrl(tenantDatabaseBaseUrl, TENANT_SHORT_ID);

  console.log(`Using master DB URL: ${masterDatabaseUrlForPg}`);
  console.log(`Using tenant DB URL: ${tenantDatabaseUrl}`);

  const pgClient = new Client({ connectionString: masterDatabaseUrlForPg });

  try {
    await pgClient.connect();
    console.log(`Connected to master DB for tenant provisioning.`);

    try {
      await pgClient.query(`CREATE DATABASE "${TENANT_SHORT_ID}"`);
      console.log(`Created tenant database: ${TENANT_SHORT_ID}`);
    } catch (error: any) {
      if (error.code === "42P04") {
        console.log(`Tenant database already exists: ${TENANT_SHORT_ID}`);
      } else {
        throw error;
      }
    }
  } finally {
    await pgClient.end();
  }

  console.log("Applying tenant schema to new database...");
  execSync(
    `npx prisma db push --schema=prisma/tenant/schema.prisma --accept-data-loss --skip-generate`,
    {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: tenantDatabaseUrl },
    },
  );

  const masterPrisma = new MasterPrismaClient({
    datasources: { db: { url: masterDatabaseUrl } },
  });
  const tenantPrisma = new TenantPrismaClient({
    datasources: { db: { url: tenantDatabaseUrl } },
  });

  try {
    const tenant = await masterPrisma.tenant.upsert({
      where: { shortTenantId: TENANT_SHORT_ID },
      update: {
        name: TENANT_NAME,
        email: TENANT_EMAIL,
        schemaName: TENANT_SHORT_ID,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
      create: {
        name: TENANT_NAME,
        email: TENANT_EMAIL,
        shortTenantId: TENANT_SHORT_ID,
        schemaName: TENANT_SHORT_ID,
        status: "ACTIVE",
      },
    });

    console.log(`Master tenant row created or updated: ${tenant.id}`);

    const systemRoles = [
      { name: "Admin", description: "Full system access", isSystem: true },
      { name: "Manager", description: "Management access", isSystem: false },
      { name: "Supervisor", description: "Supervisory access", isSystem: false },
      { name: "Accountant", description: "Financial records and reporting", isSystem: false },
      { name: "Sales Person", description: "Sales and POS operations", isSystem: false },
      { name: "Cashier", description: "Cash handling and transactions", isSystem: false },
      { name: "HR Officer", description: "HR and people management", isSystem: false },
      { name: "Staff", description: "Basic operational access", isSystem: false },
      { name: "Viewer", description: "Read-only access", isSystem: false },
    ];

    console.log("Seeding system roles...");
    for (const role of systemRoles) {
      await tenantPrisma.role.upsert({
        where: { name: role.name },
        update: { isActive: true, description: role.description },
        create: {
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          isActive: true,
        },
      });
    }

    console.log("Seeding permissions...");
    const permissionNames = getAllPermissionNames();
    for (const permissionName of permissionNames) {
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

    const adminRole = await tenantPrisma.role.findUnique({ where: { name: ADMIN_ROLE_NAME } });
    if (!adminRole) {
      throw new Error(`Admin role was not created`);
    }

    console.log("Assigning all permissions to Admin role...");
    const permissions = await tenantPrisma.permission.findMany();
    for (const permission of permissions) {
      await tenantPrisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: permission.id },
      });
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const superAdminRole = await tenantPrisma.role.upsert({
      where: { name: "Super Admin" },
      update: { isActive: true, isSystem: true, description: "Full system access (demo / owner)" },
      create: {
        name: "Super Admin",
        description: "Full system access (demo / owner)",
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
      console.log("Created employee EMP-3991-ADMIN linked to admin user (for branch distributor).");
    } else {
      console.log(`Employee already exists for admin: ${existingEmployee.employeeCode}`);
    }

    console.log(`Admin user created or updated: ${ADMIN_EMAIL} (role: Super Admin)`);
    console.log("\n✅ Tenant and admin user provisioning complete.");
    console.log(`   Tenant Short ID: ${TENANT_SHORT_ID}`);
    console.log(`   Admin Email: ${ADMIN_EMAIL}`);
    console.log(`   Admin Password: ${ADMIN_PASSWORD}`);
    console.log(`   Login URL: http://localhost:3001/auth/login`);
  } finally {
    await masterPrisma.$disconnect().catch(() => {});
    await tenantPrisma.$disconnect().catch(() => {});
  }
}

main().catch((error) => {
  console.error("❌ Provisioning failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
