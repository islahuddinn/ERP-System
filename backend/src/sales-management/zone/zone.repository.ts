import { Injectable } from "@nestjs/common";
import { Prisma, TerritoryStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { ZoneFiltersDto } from "./dto/zone-filters.dto";
import { ZONE_DETAIL_INCLUDE, ZONE_LIST_INCLUDE, ZONE_TREE } from "./utils/constants";
import { ZoneDetail, ZoneListItem, ZoneTree } from "./utils/types";

const ZONE_SORTABLE_FIELDS = ["name", "status", "createdAt", "updatedAt", "region.name"];

@Injectable()
export class ZoneRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(zoneFiltersDto: ZoneFiltersDto): Promise<PaginatedResponse<ZoneListItem>> {
    const { search, status, regionId, sortBy, sortOrder, page = 1, limit = 10 } = zoneFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.ZoneWhereInput = {};

    if (search) where.OR = buildSearchFilter(search, ["name"]);
    if (status) where.status = status;
    if (regionId) where.regionId = regionId;

    const orderBy =
      sortBy && ZONE_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { name: "asc" as const };

    const [data, total] = await Promise.all([
      this.prisma.zone.findMany({ where, skip, take, orderBy, include: ZONE_LIST_INCLUDE }),
      this.prisma.zone.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async dropdown(regionId?: string): Promise<{ id: string; name: string; regionId: string }[]> {
    return this.prisma.zone.findMany({
      where: { status: TerritoryStatus.ACTIVE, ...(regionId && { regionId }) },
      select: { id: true, name: true, regionId: true },
      orderBy: { name: "asc" },
    });
  }

  async findById(zoneId: string): Promise<ZoneDetail | null> {
    return this.prisma.zone.findUnique({
      where: { id: zoneId },
      include: ZONE_DETAIL_INCLUDE,
    });
  }

  async create(data: Prisma.ZoneCreateInput): Promise<ZoneDetail> {
    return this.prisma.zone.create({ data, include: ZONE_DETAIL_INCLUDE });
  }

  async update(zoneId: string, data: Prisma.ZoneUpdateInput): Promise<ZoneDetail> {
    return this.prisma.zone.update({
      where: { id: zoneId },
      data,
      include: ZONE_DETAIL_INCLUDE,
    });
  }

  async delete(zoneId: string): Promise<void> {
    await this.prisma.zone.delete({ where: { id: zoneId } });
  }

  async hasCities(zoneId: string): Promise<boolean> {
    const count = await this.prisma.city.count({ where: { zoneId } });
    return count > 0;
  }

  async findTreeById(zoneId: string): Promise<ZoneTree | null> {
    return this.prisma.zone.findUnique({
      where: { id: zoneId },
      select: ZONE_TREE.select,
    });
  }
}
