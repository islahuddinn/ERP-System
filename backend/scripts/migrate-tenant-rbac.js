/* Pure-JS RBAC migration for running INSIDE the prod backend image (no ts-node).
 * Requires the compiled permission definitions from dist/ + the tenant client.
 * Usage (in the new backend image container):
 *   DATABASE_URL="postgresql://user:pw@db:5432/<tenant_db>" node migrate-tenant-rbac.js
 * Policy: each distinct old role -> a Role with ALL permissions (refine later). No lockout.
 */
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/tenant-client");
const { PERMISSIONS } = require("/app/dist/users/permissions/permission.definitions");

const SCHEMA = "prisma/tenant/schema.prisma";
const TENANT_ENUM_RENAMES = [["EPaymentStatus", "PaymentStatus"]];

const toRoleName = (r) => r.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
const toLoginAccess = (status, isActive) =>
  !isActive ? "DISABLED" : status === "ACTIVE" ? "ENABLED" : status === "SUSPENDED" ? "SUSPENDED" : "DISABLED";

async function main() {
  const capture = new PrismaClient();
  const already = await capture.$queryRawUnsafe(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role_id') AS exists`,
  );
  if (already[0] && already[0].exists) {
    console.log("users already RBAC-shaped — nothing to migrate.");
    await capture.$disconnect();
    return;
  }

  const oldUsers = await capture.$queryRawUnsafe(
    `SELECT id, email, password, name, role::text AS role, status::text AS status,
            "isActive" AS is_active, "createdById" AS created_by_id, "createdAt" AS created_at
     FROM users`,
  );
  console.log(`Captured ${oldUsers.length} existing users.`);

  for (const [from, to] of TENANT_ENUM_RENAMES) {
    await capture.$executeRawUnsafe(
      `DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname='${from}')
         AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='${to}')
       THEN ALTER TYPE "${from}" RENAME TO "${to}"; END IF; END $$;`,
    );
  }
  await capture.$executeRawUnsafe(`DELETE FROM users`);
  await capture.$disconnect();

  console.log("Running prisma db push (new schema)…");
  execSync(`npx prisma db push --schema=${SCHEMA} --accept-data-loss --skip-generate`, {
    stdio: "inherit",
    env: process.env,
  });

  const prisma = new PrismaClient();
  const permEntries = Object.entries(PERMISSIONS);
  for (const [name, def] of permEntries) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name, module: def.module, action: def.action, description: def.description ?? null },
    });
  }
  const allPerms = await prisma.permission.findMany({ select: { id: true } });
  console.log(`Seeded ${permEntries.length} permissions.`);

  const distinctRoles = [...new Set(oldUsers.map((u) => u.role))];
  const roleIdByOld = {};
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
  console.log(`Created ${distinctRoles.length} roles (${distinctRoles.map(toRoleName).join(", ")}).`);

  for (const u of oldUsers) {
    const parts = (u.name || "").trim().split(/\s+/).filter(Boolean);
    await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        password: u.password,
        firstName: parts[0] || u.email,
        lastName: parts.slice(1).join(" ") || "",
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
