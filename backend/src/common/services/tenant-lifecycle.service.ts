import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { MasterPrismaService } from "../../master-prisma/master-prisma.service";
import { TenantStatus } from "@prisma/master-client";

export type TenantMeta = {
  id: string;
  shortTenantId: string;
  schemaName: string;
  status: TenantStatus;
  cachedAt: number;
};

@Injectable()
export class TenantLifecycleService {
  private readonly byId = new Map<string, TenantMeta>();
  private readonly byShortId = new Map<string, TenantMeta>();
  private readonly cacheTtlMs = Number(process.env.TENANT_META_CACHE_TTL_MS || 30000);

  constructor(private readonly masterPrisma: MasterPrismaService) {}

  async validateOrThrow(tenantId: string): Promise<{ id: string; cachedAt: number }> {
    const meta = await this.getActiveOrThrow(tenantId);
    return { id: meta.id, cachedAt: meta.cachedAt };
  }

  async getActiveOrThrow(tenantIdOrShort: string): Promise<TenantMeta> {
    const meta = await this.getTenantMeta(tenantIdOrShort);
    if (!meta) {
      throw new NotFoundException("Tenant not found");
    }

    if (meta.status !== TenantStatus.ACTIVE) {
      throw new BadRequestException("Tenant inactive");
    }

    return meta;
  }

  invalidate(tenantIdOrShort: string) {
    const meta = this.byId.get(tenantIdOrShort) ?? this.byShortId.get(tenantIdOrShort);
    if (!meta) {
      this.byId.delete(tenantIdOrShort);
      this.byShortId.delete(tenantIdOrShort);
      return;
    }

    this.byId.delete(meta.id);
    this.byShortId.delete(meta.shortTenantId);
  }

  private async getTenantMeta(tenantIdOrShort: string): Promise<TenantMeta | null> {
    const cached = this.byId.get(tenantIdOrShort) ?? this.byShortId.get(tenantIdOrShort);
    if (cached && Date.now() - cached.cachedAt < this.cacheTtlMs) {
      return cached;
    }

    const tenant = await this.masterPrisma.tenant.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: tenantIdOrShort }, { shortTenantId: tenantIdOrShort }],
      },
      select: { id: true, shortTenantId: true, schemaName: true, status: true },
    });

    if (!tenant) {
      return null;
    }

    const meta: TenantMeta = {
      id: tenant.id,
      shortTenantId: tenant.shortTenantId,
      schemaName: tenant.schemaName,
      status: tenant.status,
      cachedAt: Date.now(),
    };
    this.byId.set(meta.id, meta);
    this.byShortId.set(meta.shortTenantId, meta);
    return meta;
  }
}
