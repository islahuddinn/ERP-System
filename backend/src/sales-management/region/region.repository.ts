import { Injectable } from "@nestjs/common";
import { Prisma, TerritoryStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { RegionFiltersDto } from "./dto/region-filters.dto";
import { REGION_DETAIL_INCLUDE, REGION_LIST_INCLUDE, REGION_TREE_SELECT } from "./utils/constants";
import { RegionDetail, RegionListItem, RegionTree } from "./utils/types";

const REGION_SORTABLE_FIELDS = ["name", "countryName", "status", "createdAt", "updatedAt"];

@Injectable()
export class RegionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(regionFiltersDto: RegionFiltersDto): Promise<PaginatedResponse<RegionListItem>> {
    const { search, status, sortBy, sortOrder, page = 1, limit = 10 } = regionFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.RegionWhereInput = {};

    if (search) where.OR = buildSearchFilter(search, ["name", "countryName"]);
    if (status) where.status = status;

    const orderBy =
      sortBy && REGION_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { name: "asc" as const };

    const [data, total] = await Promise.all([
      this.prisma.region.findMany({ where, skip, take, orderBy, include: REGION_LIST_INCLUDE }),
      this.prisma.region.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async dropdown(): Promise<{ id: string; name: string }[]> {
    return this.prisma.region.findMany({
      where: { status: TerritoryStatus.ACTIVE },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async findById(regionId: string): Promise<RegionDetail | null> {
    return this.prisma.region.findUnique({
      where: { id: regionId },
      include: REGION_DETAIL_INCLUDE,
    });
  }

  async create(data: Prisma.RegionCreateInput): Promise<RegionDetail> {
    return this.prisma.region.create({ data, include: REGION_DETAIL_INCLUDE });
  }

  async update(regionId: string, data: Prisma.RegionUpdateInput): Promise<RegionDetail> {
    return this.prisma.region.update({
      where: { id: regionId },
      data,
      include: REGION_DETAIL_INCLUDE,
    });
  }

  async delete(regionId: string): Promise<void> {
    await this.prisma.region.delete({ where: { id: regionId } });
  }

  async hasZones(regionId: string): Promise<boolean> {
    const count = await this.prisma.zone.count({ where: { regionId } });
    return count > 0;
  }

  async findTreeById(regionId: string): Promise<RegionTree | null> {
    return this.prisma.region.findUnique({
      where: { id: regionId },
      select: REGION_TREE_SELECT,
    });
  }
}
