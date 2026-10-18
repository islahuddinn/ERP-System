import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";
import { PERMISSIONS, getAllPermissionNames } from "./permission.definitions";

@Injectable()
export class PermissionsSeedService {
  private readonly logger = new Logger(PermissionsSeedService.name);

  async seedPermissions(tenantClient: PrismaClient): Promise<void> {
    this.logger.log("Starting permissions seed...");

    try {
      await this.seedAllPermissions(tenantClient);
      await this.seedSystemRoles(tenantClient);
      await this.assignAllPermissionsToAdmin(tenantClient);

      this.logger.log("✅ Permissions seed completed");
    } catch (error: any) {
      this.logger.error(`❌ Permissions seed failed: ${error.message}`);
      throw new Error(`Failed to seed permissions: ${error.message}`);
    }
  }

  private async seedAllPermissions(tenantClient: PrismaClient): Promise<void> {
    this.logger.log("Seeding permissions...");

    const permissionNames = getAllPermissionNames();
    let created = 0;
    let updated = 0;

    for (const permissionName of permissionNames) {
      const def = PERMISSIONS[permissionName];

      await tenantClient.permission.upsert({
        where: { name: permissionName },
        update: { description: def.description, module: def.module, action: def.action },
        create: {
          name: permissionName,
          description: def.description,
          module: def.module,
          action: def.action,
        },
      });

      const existing = await tenantClient.permission.findUnique({
        where: { name: permissionName },
      });
      existing ? updated++ : created++;
    }

    this.logger.log(`✅ Permissions: ${created} created, ${updated} updated`);
  }

  private async seedSystemRoles(tenantClient: PrismaClient): Promise<void> {
    this.logger.log("Seeding system roles...");

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

    for (const role of systemRoles) {
      await tenantClient.role.upsert({
        where: { name: role.name },
        update: { isActive: true },
        create: {
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          isActive: true,
        },
      });
    }

    this.logger.log(`✅ Seeded ${systemRoles.length} system roles`);
  }

  async ensureAdminHasAllPermissions(tenantClient: PrismaClient): Promise<void> {
    await this.assignAllPermissionsToAdmin(tenantClient);
  }

  private async assignAllPermissionsToAdmin(tenantClient: PrismaClient): Promise<void> {
    this.logger.log("Assigning all permissions to Admin role...");

    const adminRole = await tenantClient.role.findUnique({ where: { name: "Admin" } });

    if (!adminRole) {
      this.logger.warn("Admin role not found — skipping permission assignment");
      return;
    }

    const allPermissions = await tenantClient.permission.findMany();
    let assigned = 0;

    for (const permission of allPermissions) {
      await tenantClient.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: permission.id },
      });
      assigned++;
    }

    this.logger.log(`✅ Assigned ${assigned} permissions to Admin role`);
  }
}
