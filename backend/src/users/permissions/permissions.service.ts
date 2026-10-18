import { Injectable, NotFoundException } from "@nestjs/common";
import { getAllPermissionNames, getPermissionsByModule } from "./permission.definitions";
import { isHiddenPermissionKey, isHiddenPermissionModule } from "./permission-visibility";
import { PrismaService } from "../../prisma/prisma.service";
import { CacheService } from "../../common/services/cache.service";

const ROLE_PERMISSIONS_CACHE_TTL_SECONDS = 300;

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getAllPermissions(): Promise<Record<string, any[]>> {
    const permissions = await this.prisma.permission.findMany({
      where: { name: { in: getAllPermissionNames() } },
      orderBy: [{ module: "asc" }, { name: "asc" }],
    });

    const grouped = getPermissionsByModule();
    const result: Record<string, any[]> = {};

    // Only surface modules/keys that are considered implemented — this endpoint
    // is the single source of truth for what the Add/Edit Role screen can assign.
    for (const [module] of Object.entries(grouped)) {
      if (isHiddenPermissionModule(module)) continue;

      const modulePermissions = permissions
        .filter((p) => p.module === module && !isHiddenPermissionKey(p.name))
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          module: p.module,
          action: p.action,
        }));

      if (modulePermissions.length > 0) result[module] = modulePermissions;
    }

    return result;
  }

  async getModules(): Promise<string[]> {
    const modules = await this.prisma.permission.findMany({
      select: { module: true },
      distinct: ["module"],
      orderBy: { module: "asc" },
    });

    return modules.map((m) => m.module).filter((module) => !isHiddenPermissionModule(module));
  }

  async getPermissionsByRoleId(roleId: string): Promise<string[]> {
    const cacheKey = this.cacheService.generateKey("role", roleId, "permissions");
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) return cached;

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });

    const names = rolePermissions.map((rp) => rp.permission.name);
    await this.cacheService.set(cacheKey, names, ROLE_PERMISSIONS_CACHE_TTL_SECONDS);
    return names;
  }

  async getPermissionsByRoleIdGroupedByModule(roleId: string): Promise<Record<string, string[]>> {
    const cacheKey = this.cacheService.generateKey("role", roleId, "permissions_grouped");
    const cached = await this.cacheService.get<Record<string, string[]>>(cacheKey);
    if (cached) return cached;

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: { select: { name: true, module: true } } },
    });

    const grouped: Record<string, string[]> = {};

    for (const { permission } of rolePermissions) {
      if (!grouped[permission.module]) {
        grouped[permission.module] = [];
      }
      grouped[permission.module].push(permission.name);
    }

    await this.cacheService.set(cacheKey, grouped, ROLE_PERMISSIONS_CACHE_TTL_SECONDS);
    return grouped;
  }

  async invalidateRolePermissions(roleId: string): Promise<void> {
    await Promise.all([
      this.cacheService.del(this.cacheService.generateKey("role", roleId, "permissions")),
      this.cacheService.del(this.cacheService.generateKey("role", roleId, "permissions_grouped")),
    ]);
  }

  /**
   * Same as getPermissionsByRoleIdGroupedByModule but with the non-implemented
   * modules/keys removed — for display surfaces (e.g. the "My Permissions" tab)
   * that should mirror the assignable-permissions list. NOT used for the
   * login/sidebar payload, which must keep every permission the user holds.
   */
  async getVisiblePermissionsByRoleIdGroupedByModule(
    roleId: string,
  ): Promise<Record<string, string[]>> {
    const grouped = await this.getPermissionsByRoleIdGroupedByModule(roleId);
    const visible: Record<string, string[]> = {};

    for (const [module, names] of Object.entries(grouped)) {
      if (isHiddenPermissionModule(module)) continue;
      const visibleNames = names.filter((name) => !isHiddenPermissionKey(name));
      if (visibleNames.length > 0) visible[module] = visibleNames;
    }

    return visible;
  }

  async getUserEffectivePermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });

    if (!user) throw new NotFoundException("User not found");

    return this.getPermissionsByRoleId(user.roleId);
  }

  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const permissions = await this.getUserEffectivePermissions(userId);
    return permissions.includes(permissionName);
  }
}
