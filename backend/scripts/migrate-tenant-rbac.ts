/**
 * Migrate an OLD-schema tenant DB (User.role enum + name/status) to the new
 * Role-table RBAC schema — WITHOUT losing users or their passwords.
 *
 * Policy (per the go-live decision): every distinct old role becomes a Role with
 * ALL permissions (refine later in the Roles UI). Nobody is locked out.
 *
 * Usage:
 *   DATABASE_URL="postgresql://user:pw@host:port/<tenant_db>" \
 *     npx ts-node scripts/migrate-tenant-rbac.ts
 *
 * Idempotent-ish: if the users table is already RBAC-shaped (has role_id), it exits.
 */
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/tenant-client";
import { PERMISSIONS } from "../src/users/permissions/permission.definitions";

const SCHEMA = "prisma/tenant/schema.prisma";

// Enum renames his branch made on the TENANT schema (E-prefix dropped).
const TENANT_ENUM_RENAMES: [string, string][] = [["EPaymentStatus", "PaymentStatus"]];

interface OldUser {
  id: string;
  email: string;
  password: string;
  name: string | null;
  role: string;
  status: string;
  is_active: boolean;
  created_by_id: string | null;
  created_at: Date;
}

function toRoleName(role: string): string {
  // ADMIN -> Admin, SALES_PERSON -> Sales Person
  return role
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function toLoginAccess(status: string, isActive: boolean): "ENABLED" | "DISABLED" | "SUSPENDED" {
  if (!isActive) return "DISABLED";
  if (status === "ACTIVE") return "ENABLED";
  if (status === "SUSPENDED") return "SUSPENDED";
  return "DISABLED"; // INACTIVE / PENDING
}

async function alreadyMigrated(prisma: PrismaClient): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role_id') AS exists`,
  );
  return rows[0]?.exists === true;
}

async function main() {
  const capture = new PrismaClient();

  if (await alreadyMigrated(capture)) {
    console.log("users table already RBAC-shaped (role_id present) — nothing to migrate.");
    await capture.$disconnect();
    return;
  }

  // 1. Capture existing users via raw SQL (still on the old schema).
  const oldUsers = await capture.$queryRawUnsafe<OldUser[]>(`
    SELECT id, email, password, name,
           role::text  AS role,
           status::text AS status,
           "isActive"   AS is_active,
           "createdById" AS created_by_id,
           "createdAt"  AS created_at
    FROM users`);
  console.log(`Captured ${oldUsers.length} existing users.`);

  // 2. Rename tenant enums (preserves column data — only the type name changes).
  for (const [from, to] of TENANT_ENUM_RENAMES) {
    await capture.$executeRawUnsafe(
      `DO $$ BEGIN
         IF EXISTS (SELECT 1 FROM pg_type WHERE typname='${from}')
            AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='${to}')
         THEN ALTER TYPE "${from}" RENAME TO "${to}"; END IF;
       END $$;`,
    );
  }

  // 3. Empty the users table so db push can restructure it (add required role_id,
  //    drop name/role/status) without a NOT-NULL / cast failure. Data is in memory.
  await capture.$executeRawUnsafe(`DELETE FROM users`);
  await capture.$disconnect();

  // 4. Apply the new schema (creates RBAC + HR tables, restructures users).
  console.log("Running prisma db push (new schema)…");
  execSync(`npx prisma db push --schema=${SCHEMA} --accept-data-loss --skip-generate`, {
    stdio: "inherit",
    env: process.env,
  });

  // 5. Seed all permissions.
  const prisma = new PrismaClient();
  const permEntries = Object.entries(PERMISSIONS) as [string, { module: string; action: string; description?: string }][];
  for (const [name, def] of permEntries) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name, module: def.module, action: def.action, description: def.description ?? null },
    });
  }
  const allPerms = await prisma.permission.findMany({ select: { id: true } });
  console.log(`Seeded ${permEntries.length} permissions.`);

  // 6. Create a Role per distinct old role, each with ALL permissions.
  const distinctRoles = [...new Set(oldUsers.map((u) => u.role))];
  const roleIdByOld: Record<string, string> = {};
  for (const oldRole of distinctRoles) {
    const name = toRoleName(oldRole);
    const role = await prisma.role.upsert({
      where: { name },
      update: { isActive: true, isSystem: oldRole === "ADMIN" },
      create: { name, description: `Migrated from ${oldRole}`, isSystem: oldRole === "ADMIN", isActive: true },
    });
    for (const p of allPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
        update: {},
        create: { roleId: role.id, permissionId: p.id },
      });
    }
    roleIdByOld[oldRole] = role.id;
  }
  console.log(`Created ${distinctRoles.length} roles (${distinctRoles.map(toRoleName).join(", ")}) with all permissions.`);

  // 7. Re-insert users mapped to the new shape (passwords preserved).
  for (const u of oldUsers) {
    const parts = (u.name || "").trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || u.email;
    const lastName = parts.slice(1).join(" ") || "";
    await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        password: u.password,
        firstName,
        lastName,
        roleId: roleIdByOld[u.role],
        loginAccess: toLoginAccess(u.status, u.is_active),
        createdById: u.created_by_id,
        createdAt: u.created_at,
      },
    });
  }
  console.log(`Re-inserted ${oldUsers.length} users. Migration complete.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
