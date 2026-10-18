/**
 * Local HR-integration bootstrap — seeds a working admin login into the
 * fresh tenant DB after adopting the new Role-table RBAC.
 * Run: DATABASE_URL="postgresql://postgres:***@localhost:5434/inventory_8549" \
 *      npx ts-node scripts/hr-local-bootstrap.ts
 */
import { PrismaClient } from "@prisma/tenant-client";
import * as bcrypt from "bcrypt";
import { PERMISSIONS } from "../src/users/permissions/permission.definitions";
import { requireSeedPassword } from "./lib/require-seed-password";

async function main() {
  const prisma = new PrismaClient();

  // 1. Seed every permission defined in code (idempotent).
  const permEntries = Object.entries(PERMISSIONS) as [
    string,
    { module: string; action: string; description?: string },
  ][];
  for (const [name, def] of permEntries) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name, module: def.module, action: def.action, description: def.description ?? null },
    });
  }
  const allPerms = await prisma.permission.findMany({ select: { id: true } });

  // 2. Super Admin system role.
  const role = await prisma.role.upsert({
    where: { name: "Super Admin" },
    update: { isSystem: true, isActive: true },
    create: { name: "Super Admin", description: "Full system access", isSystem: true, isActive: true },
  });

  // 3. Link every permission to the role.
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
      update: {},
      create: { roleId: role.id, permissionId: p.id },
    });
  }

  // 4. Admin user (bcrypt password, login enabled).
  const password = await bcrypt.hash(requireSeedPassword(), 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { password, roleId: role.id, loginAccess: "ENABLED", firstName: "Admin", lastName: "User" },
    create: {
      email: "admin@example.com",
      password,
      firstName: "Admin",
      lastName: "User",
      roleId: role.id,
      loginAccess: "ENABLED",
    },
  });

  console.log(
    `Seeded ${permEntries.length} permissions, role "${role.name}" with ${allPerms.length} perms, admin ${admin.email}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
