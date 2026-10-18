import { Injectable, Logger } from "@nestjs/common";
import { isUUID } from "class-validator";
import { MasterPrismaService } from "../../master-prisma/master-prisma.service";

/**
 * Resolve any tenant identifier (UUID, short code, subdomain) to the canonical UUID.
 */
@Injectable()
export class TenantResolverService {
  private readonly logger = new Logger(TenantResolverService.name);

  constructor(private readonly masterPrisma: MasterPrismaService) {}

  /**
   * Translates arbitrary tenant identifiers to the canonical UUID.
   * Returns null when no tenant can be resolved.
   */
  async resolveToId(identifier: string | null | undefined): Promise<string | null> {
    if (!identifier) {
      return null;
    }

    const raw = identifier.trim();
    if (!raw) {
      return null;
    }

    // If it's a UUID, ensure it exists and return early.
    if (isUUID(raw)) {
      const tenant = await this.masterPrisma.tenant.findUnique({
        where: { id: raw },
        select: { id: true },
      });

      if (tenant) {
        return tenant.id;
      }

      this.logger.debug(`UUID looked like tenant ID but was not found: ${raw}`);
      return null;
    }

    const normalized = raw.toLowerCase();

    // First try to find by shortTenantId
    let tenant = await this.masterPrisma.tenant.findFirst({
      where: {
        OR: [{ shortTenantId: raw }, { shortTenantId: normalized }],
      },
      select: { id: true },
    });

    if (tenant) {
      return tenant.id;
    }

    // Subdomain (e.g. silk-production-factory) — case-insensitive
    tenant = await this.masterPrisma.tenant.findFirst({
      where: {
        subdomain: {
          equals: raw,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (tenant) {
      return tenant.id;
    }

    // If not found by shortTenantId, try to find by id (for direct ID lookups)
    tenant = await this.masterPrisma.tenant.findUnique({
      where: { id: raw },
      select: { id: true },
    });

    if (tenant) {
      return tenant.id;
    }

    this.logger.debug(`Tenant not found for identifier: ${raw}`);
    return null;
  }
}
