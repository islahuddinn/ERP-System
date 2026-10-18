import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { PermissionsService } from "../permissions/permissions.service";
import { CacheService } from "../../common/services/cache.service";
import { PrismaService } from "../../prisma/prisma.service";
import { TenantRequest } from "../../common/middleware/tenant-context.middleware";

const PERMISSIONS_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
    private cacheService: CacheService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    if (await this.isAdmin(user.roleId)) {
      return true;
    }

    const userPermissions = await this.getPermissions(user.roleId);

    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permissions: ${requiredPermissions.join(", ")}`,
      );
    }

    return true;
  }

  private async isAdmin(roleId: string): Promise<boolean> {
    const cacheKey = this.cacheService.generateKey("role", roleId, "is_admin");

    const cached = await this.cacheService.get<boolean>(cacheKey);
    if (cached !== undefined) return cached;

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { name: true },
    });

    const isAdmin = role?.name === "Admin" || role?.name === "Super Admin";
    await this.cacheService.set(cacheKey, isAdmin, PERMISSIONS_CACHE_TTL);

    return isAdmin;
  }

  private async getPermissions(roleId: string): Promise<string[]> {
    const cacheKey = this.cacheService.generateKey("role", roleId, "permissions");

    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) return cached;

    const permissions = await this.permissionsService.getPermissionsByRoleId(roleId);
    await this.cacheService.set(cacheKey, permissions, PERMISSIONS_CACHE_TTL);

    return permissions;
  }
}
