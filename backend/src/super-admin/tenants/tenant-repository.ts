import { Injectable } from "@nestjs/common";
import { Prisma, Tenant } from "@prisma/master-client";
import { MasterPrismaService } from "src/master-prisma/master-prisma.service";
import { TenantQueryDto } from "./dto/find-all-tenants-query.dto";
import { buildOrderBy } from "src/common/utils/pagination.helper";

@Injectable()
export class TenantsRepository {
  constructor(private readonly masterPrisma: MasterPrismaService) {}

  // ── Reads ──────────────────────────────────────────────────────────────────

  async findAll(query: TenantQueryDto) {
    const { page = 1, limit = 20, search, includeDeleted, status, sortBy, sortOrder } = query;

    const where: Prisma.TenantWhereInput = {
      deletedAt: includeDeleted ? { not: null } : null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { subdomain: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    return this.masterPrisma.$transaction([
      this.masterPrisma.tenant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: buildOrderBy(sortBy, sortOrder),
        include: {
          subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { subscriptions: true, tenantMigrations: true } },
        },
      }),
      this.masterPrisma.tenant.count({ where }),
    ]);
  }

  async findOne(where: Prisma.TenantWhereInput): Promise<Tenant | null> {
    return this.masterPrisma.tenant.findFirst({ where });
  }

  async findById(id: string) {
    return this.masterPrisma.tenant.findUnique({
      where: { id },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: { payments: { orderBy: { paymentDate: "desc" } } },
        },
        tenantMigrations: { orderBy: { createdAt: "desc" }, take: 10 },
        _count: { select: { subscriptions: true, tenantMigrations: true } },
      },
    });
  }

  async findBranding(id: string) {
    return this.masterPrisma.tenant.findUnique({
      where: { id },
      select: { name: true, brandingName: true, brandingLogoUrl: true, brandingLogoId: true },
    });
  }

  // ── Conflict checks ────────────────────────────────────────────────────────

  async existsByEmail(email: string, excludeId: string): Promise<boolean> {
    return (await this.masterPrisma.tenant.count({ where: { email, id: { not: excludeId } } })) > 0;
  }

  async existsBySubdomain(subdomain: string, excludeId: string): Promise<boolean> {
    return (
      (await this.masterPrisma.tenant.count({ where: { subdomain, id: { not: excludeId } } })) > 0
    );
  }

  async existsByShortTenantId(shortTenantId: string): Promise<boolean> {
    return (await this.masterPrisma.tenant.count({ where: { shortTenantId } })) > 0;
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  async create(data: Prisma.TenantCreateInput): Promise<Tenant> {
    return this.masterPrisma.tenant.create({ data });
  }

  async update(id: string, data: Prisma.TenantUpdateInput) {
    return this.masterPrisma.tenant.update({
      where: { id },
      data,
      include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
  }

  async updateBranding(
    id: string,
    data: {
      brandingName: string | null;
      brandingLogoUrl: string | null;
      brandingLogoId: string | null;
    },
  ) {
    return this.masterPrisma.tenant.update({
      where: { id },
      data,
      select: { name: true, brandingName: true, brandingLogoUrl: true, brandingLogoId: true },
    });
  }
}
