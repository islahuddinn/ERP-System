import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { TenantLifecycleService } from "../services/tenant-lifecycle.service";

@Injectable()
export class TenantValidationGuard implements CanActivate {
  private readonly excludedPrefixes = [
    "/api/super-admin",
    "/super-admin",
    "/api/docs",
    "/api/health",
    "/api/auth",
    "/auth",
    "/api/public",
  ];

  constructor(private readonly tenantLifecycle: TenantLifecycleService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const path = String(req.originalUrl || req.url || "").toLowerCase();
    if (this.excludedPrefixes.some((prefix) => path.startsWith(prefix))) {
      return true;
    }

    const userTenantId = req.user?.tenantId as string | undefined;
    const headerTenantId = (req.headers?.["x-tenant-id"] as string | undefined)?.trim();
    const tenantId = userTenantId || headerTenantId;

    if (!tenantId) {
      return true;
    }

    await this.tenantLifecycle.validateOrThrow(tenantId);
    return true;
  }
}
