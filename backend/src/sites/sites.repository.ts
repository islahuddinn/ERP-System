import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { TenantPrismaContextService } from "../prisma/tenant-prisma-context.service";
import { buildOrderBy, buildSearchFilter } from "src/common/utils/pagination.helper";
import { buildPaginatedResponse } from "src/common/dto/pagination.dto";
import { SitesQueryDto } from "./dto/sites-query.dto";
import { SiteType } from "./enums/site-type.enum";
import { SiteCategory } from "./enums/site-category.enum";
import { SiteStatus } from "./enums/site-status.enum";

const LOCATION_SELECT = {
  id: true,
  name: true,
  address: true,
  city: true,
  state: true,
  country: true,
  lat: true,
  lng: true,
  phone: true,
  email: true,
} as const;

const SITE_SELECT = {
  id: true,
  name: true,
  code: true,
  type: true,
  category: true,
  status: true,
  parentId: true,
  locationId: true,
  managerId: true,
  totalCapacity: true,
  capacityUnit: true,
  temperature: true,
  humidity: true,
  description: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  location: { select: LOCATION_SELECT },
  parent: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
} as const;

const SITE_SELECT_WITH_DETAIL = {
  id: true,
  name: true,
  code: true,
  type: true,
  category: true,
  status: true,
  parentId: true,
  locationId: true,
  managerId: true,
  totalCapacity: true,
  capacityUnit: true,
  temperature: true,
  humidity: true,
  description: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  location: { select: LOCATION_SELECT },
  parent: {
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      category: true,
      location: { select: LOCATION_SELECT },
    },
  },
  children: {
    where: { status: { not: "INACTIVE" as const } },
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      category: true,
      status: true,
    },
    orderBy: { name: "asc" as const },
  },
} as const;

// Basic site snapshot shape (SITE_SELECT). Used for the audit oldValue/newValue.
type SiteBasic = Prisma.SiteGetPayload<{ select: typeof SITE_SELECT }>;

// `managerId` is a bare scalar FK (no Prisma relation on Site → User), so we
// resolve it to a lightweight object under the `manager` key. The audit diff
// util (buildDiff) then skips the raw `managerId` UUID and diffs `manager`
// instead — showing the manager NAME, exactly like parent/location.
type SiteManagerRef = { id: string; name: string } | null;
type SiteBasicWithManager = SiteBasic & { manager: SiteManagerRef };

export type SiteCreateData = {
  name: string;
  code: string;
  type: SiteType;
  category?: SiteCategory;
  status?: SiteStatus;
  parentId?: string | null;
  locationId?: string | null;
  managerId?: string | null;
  totalCapacity?: number | null;
  capacityUnit?: string | null;
  temperature?: number | null;
  humidity?: number | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdById?: string | null;
};

export type SiteUpdateData = {
  name?: string;
  code?: string;
  type?: SiteType;
  category?: SiteCategory;
  status?: SiteStatus;
  parentId?: string | null;
  locationId?: string | null;
  managerId?: string | null;
  totalCapacity?: number | null;
  capacityUnit?: string | null;
  temperature?: number | null;
  humidity?: number | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class SitesRepository {
  constructor(private readonly tenantPrismaContext: TenantPrismaContextService) {}

  private get prisma() {
    const client = this.tenantPrismaContext.getTenantClient();
    if (!client) throw new BadRequestException("Tenant context is missing");
    return client;
  }

  /**
   * Resolves the scalar `managerId` FK to a `{ id, name }` object under the
   * `manager` key. Keeps the audit snapshot symmetric between the old value
   * (findByIdBasic) and the update return, so the diff util collapses the raw
   * `managerId` UUID and renders the manager NAME instead.
   */
  private async attachManager<T extends { managerId: string | null }>(
    site: T,
  ): Promise<T & { manager: SiteManagerRef }> {
    const managerUser = site.managerId
      ? await this.prisma.user.findUnique({
          where: { id: site.managerId },
          select: { id: true, firstName: true, lastName: true },
        })
      : null;
    // User has no single `name` column (firstName/lastName) — compose it so the
    // audit diff renders the manager NAME, matching parent/location behaviour.
    const manager: SiteManagerRef = managerUser
      ? { id: managerUser.id, name: `${managerUser.firstName} ${managerUser.lastName}`.trim() }
      : null;
    return { ...site, manager };
  }

  async create(data: SiteCreateData) {
    return this.prisma.site.create({
      data: data as unknown as Prisma.SiteUncheckedCreateInput,
      select: SITE_SELECT,
    });
  }

  async findAll(sitesQueryDto: SitesQueryDto) {
    const {
      search,
      type,
      category,
      status,
      page = 1,
      limit = 10,
      sortBy,
      sortOrder,
    } = sitesQueryDto;

    const where: Prisma.SiteWhereInput = {};

    if (type) where.type = type;
    if (category) where.category = category;
    if (status) where.status = status;
    if (search) {
      where.OR = buildSearchFilter(search, ["name", "code", "description"]);
    }

    const orderBy = buildOrderBy(sortBy, sortOrder);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.site.findMany({ where, select: SITE_SELECT, orderBy, skip, take: limit }),
      this.prisma.site.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findAllForTree() {
    return this.prisma.site.findMany({
      where: { status: { not: SiteStatus.INACTIVE } },
      select: SITE_SELECT,
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string) {
    return this.prisma.site.findUnique({
      where: { id },
      select: SITE_SELECT_WITH_DETAIL,
    });
  }

  /**
   * Snapshot used for the audit `oldValue` on UPDATE. Uses the SAME select shape
   * (SITE_SELECT) that `update()` returns — and both resolve `managerId` into a
   * `manager` object via attachManager — so the interceptor diff stays symmetric,
   * renders the manager NAME (not the UUID), and unchanged relations
   * (parent/location/manager) — and the `children` relation — never leak into the
   * diff as noise. Editing just the name logs only the name change.
   */
  async findByIdBasic(id: string): Promise<SiteBasicWithManager | null> {
    const site = await this.prisma.site.findUnique({
      where: { id },
      select: SITE_SELECT,
    });
    return site ? this.attachManager(site) : null;
  }

  async checkExistence(id: string): Promise<boolean> {
    const hit = await this.prisma.site.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!hit;
  }

  async findChildren(siteId: string) {
    return this.prisma.site.findMany({
      where: { parentId: siteId, status: { not: SiteStatus.INACTIVE } },
      select: SITE_SELECT,
      orderBy: { name: "asc" },
    });
  }

  async findAncestors(siteId: string) {
    const ancestors: Array<{
      id: string;
      name: string;
      code: string;
      type: unknown;
      parentId: string | null;
      location: unknown;
    }> = [];

    const seed = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { parentId: true },
    });

    let currentId = seed?.parentId ?? null;

    while (currentId) {
      const node = await this.prisma.site.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          parentId: true,
          location: { select: LOCATION_SELECT },
        },
      });
      if (!node) break;
      ancestors.unshift(node);
      currentId = node.parentId;
    }

    return ancestors;
  }

  async findAllIdParentPairs() {
    return this.prisma.site.findMany({
      select: { id: true, parentId: true },
    });
  }

  async update(id: string, data: SiteUpdateData): Promise<SiteBasicWithManager> {
    const site = await this.prisma.site.update({
      where: { id },
      data: data as unknown as Prisma.SiteUncheckedUpdateInput,
      select: SITE_SELECT,
    });
    return this.attachManager(site);
  }

  async updateStatus(id: string, status: SiteStatus) {
    return this.prisma.site.update({
      where: { id },
      data: { status },
      select: SITE_SELECT,
    });
  }

  async dropdown() {
    return this.prisma.site.findMany({
      where: { status: SiteStatus.ACTIVE },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, type: true, status: true, parentId: true },
    });
  }
}
