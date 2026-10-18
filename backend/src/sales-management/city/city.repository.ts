import { Injectable } from "@nestjs/common";
import { Prisma, TerritoryStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { CityFiltersDto } from "./dto/city-filters.dto";
import { CITY_DETAIL_INCLUDE, CITY_LIST_INCLUDE, CITY_TREE } from "./utils/constants";
import { CityDetail, CityListItem, CityTree } from "./utils/types";

const CITY_SORTABLE_FIELDS = ["name", "status", "createdAt", "updatedAt", "zone.name"];

@Injectable()
export class CityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(cityFiltersDto: CityFiltersDto): Promise<PaginatedResponse<CityListItem>> {
    const { search, status, zoneId, sortBy, sortOrder, page = 1, limit = 10 } = cityFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.CityWhereInput = {};

    if (search) where.OR = buildSearchFilter(search, ["name"]);
    if (status) where.status = status;
    if (zoneId) where.zoneId = zoneId;

    const orderBy =
      sortBy && CITY_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { name: "asc" as const };

    const [data, total] = await Promise.all([
      this.prisma.city.findMany({ where, skip, take, orderBy, include: CITY_LIST_INCLUDE }),
      this.prisma.city.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async dropdown(zoneId?: string): Promise<{ id: string; name: string; zoneId: string }[]> {
    return this.prisma.city.findMany({
      where: { status: TerritoryStatus.ACTIVE, ...(zoneId && { zoneId }) },
      select: { id: true, name: true, zoneId: true },
      orderBy: { name: "asc" },
    });
  }

  async findById(cityId: string): Promise<CityDetail | null> {
    return this.prisma.city.findUnique({
      where: { id: cityId },
      include: CITY_DETAIL_INCLUDE,
    });
  }

  async create(data: Prisma.CityCreateInput): Promise<CityDetail> {
    return this.prisma.city.create({ data, include: CITY_DETAIL_INCLUDE });
  }

  async update(cityId: string, data: Prisma.CityUpdateInput): Promise<CityDetail> {
    return this.prisma.city.update({
      where: { id: cityId },
      data,
      include: CITY_DETAIL_INCLUDE,
    });
  }

  async delete(cityId: string): Promise<void> {
    await this.prisma.city.delete({ where: { id: cityId } });
  }

  async hasBranches(cityId: string): Promise<boolean> {
    const count = await this.prisma.branch.count({ where: { cityId } });
    return count > 0;
  }

  async findTreeById(cityId: string): Promise<CityTree | null> {
    return this.prisma.city.findUnique({
      where: { id: cityId },
      select: CITY_TREE.select,
    });
  }
}
