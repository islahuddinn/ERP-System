import { Injectable } from "@nestjs/common";
import { Prisma, TerritoryStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { AreaFiltersDto } from "./dto/area-filters.dto";
import { AREA_DETAIL_INCLUDE, AREA_LIST_INCLUDE, AREA_TREE } from "./utils/constants";
import { AreaDetail, AreaListItem, AreaTree } from "./utils/types";

const AREA_SORTABLE_FIELDS = ["name", "status", "createdAt", "updatedAt", "branch.name"];

@Injectable()
export class AreaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(areaFiltersDto: AreaFiltersDto): Promise<PaginatedResponse<AreaListItem>> {
    const { search, status, branchId, sortBy, sortOrder, page = 1, limit = 10 } = areaFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.AreaWhereInput = {};

    if (search) where.OR = buildSearchFilter(search, ["name"]);
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;

    const orderBy =
      sortBy && AREA_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { name: "asc" as const };

    const [data, total] = await Promise.all([
      this.prisma.area.findMany({ where, skip, take, orderBy, include: AREA_LIST_INCLUDE }),
      this.prisma.area.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async dropdown(branchId?: string): Promise<{ id: string; name: string; branchId: string }[]> {
    return this.prisma.area.findMany({
      where: { status: TerritoryStatus.ACTIVE, ...(branchId && { branchId }) },
      select: { id: true, name: true, branchId: true },
      orderBy: { name: "asc" },
    });
  }

  async findById(areaId: string): Promise<AreaDetail | null> {
    return this.prisma.area.findUnique({
      where: { id: areaId },
      include: AREA_DETAIL_INCLUDE,
    });
  }

  async create(data: Prisma.AreaCreateInput): Promise<AreaDetail> {
    return this.prisma.area.create({ data, include: AREA_DETAIL_INCLUDE });
  }

  async update(areaId: string, data: Prisma.AreaUpdateInput): Promise<AreaDetail> {
    return this.prisma.area.update({
      where: { id: areaId },
      data,
      include: AREA_DETAIL_INCLUDE,
    });
  }

  async delete(areaId: string): Promise<void> {
    await this.prisma.area.delete({ where: { id: areaId } });
  }

  async findTreeById(areaId: string): Promise<AreaTree | null> {
    return this.prisma.area.findUnique({
      where: { id: areaId },
      select: AREA_TREE.select,
    });
  }
}
