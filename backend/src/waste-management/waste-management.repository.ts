import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { QueryWasteManagementDto } from "./dto/query-waste-management.dto";
import { UpdateWasteManagementDto } from "./dto/update-waste-management.dto";
import { buildOrderBy, buildSearchFilter } from "../common/utils/pagination.helper";
import { PaginatedResponse, buildPaginatedResponse } from "../common/dto/pagination.dto";
import { CreateWasteManagementData } from "./utils/interfaces";

export const WASTE_MANAGEMENT_INCLUDE = {
  product: {
    select: {
      id: true,
      name: true,
      code: true,
      uom: { select: { id: true, name: true, symbol: true } },
    },
  },
  rawMaterial: {
    select: {
      id: true,
      name: true,
      code: true,
      uom: { select: { id: true, name: true, symbol: true } },
    },
  },
  site: {
    select: { id: true, name: true, code: true },
  },
} as const;

@Injectable()
export class WasteManagementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async generateWasteNumber(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const prefix = `WASTE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-`;

    const existingCount = await tx.wasteManagement.count({
      where: { wasteNumber: { startsWith: prefix } },
    });

    let seq = existingCount + 1;
    let wasteNumber = `${prefix}${String(seq).padStart(4, "0")}`;

    while (await tx.wasteManagement.findUnique({ where: { wasteNumber } })) {
      seq++;
      wasteNumber = `${prefix}${String(seq).padStart(4, "0")}`;
    }

    return wasteNumber;
  }

  async create(
    tx: Prisma.TransactionClient,
    data: CreateWasteManagementData,
  ): Promise<Prisma.WasteManagementGetPayload<{ include: typeof WASTE_MANAGEMENT_INCLUDE }>> {
    return tx.wasteManagement.create({
      data: {
        wasteNumber: data.wasteNumber,
        wasteType: data.wasteType,
        itemType: data.itemType,
        productId: data.productId,
        rawMaterialId: data.rawMaterialId,
        quantity: data.quantity,
        cost: data.cost,
        reason: data.reason,
        remarks: data.remarks,
        siteId: data.siteId,
        createdById: data.createdById,
      },
      include: WASTE_MANAGEMENT_INCLUDE,
    });
  }

  async findAll(
    query: QueryWasteManagementDto,
  ): Promise<
    PaginatedResponse<
      Prisma.WasteManagementGetPayload<{ include: typeof WASTE_MANAGEMENT_INCLUDE }>
    >
  > {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy,
      sortOrder,
      wasteType,
      itemType,
      status,
      productId,
      rawMaterialId,
      siteId,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.WasteManagementWhereInput = { deletedAt: null };

    if (wasteType) where.wasteType = wasteType;
    if (itemType) where.itemType = itemType;
    if (status) where.status = status;
    if (productId) where.productId = productId;
    if (rawMaterialId) where.rawMaterialId = rawMaterialId;
    if (siteId) where.siteId = siteId;

    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    if (search) where.OR = buildSearchFilter(search, ["wasteNumber", "reason"]);

    const orderBy = sortBy ? buildOrderBy(sortBy, sortOrder) : { createdAt: "desc" };

    const [data, total] = await Promise.all([
      this.prisma.wasteManagement.findMany({
        where,
        include: WASTE_MANAGEMENT_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.wasteManagement.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(
    wasteId: string,
  ): Promise<Prisma.WasteManagementGetPayload<{ include: typeof WASTE_MANAGEMENT_INCLUDE }>> {
    const waste = await this.prisma.wasteManagement.findFirst({
      where: { id: wasteId, deletedAt: null },
      include: WASTE_MANAGEMENT_INCLUDE,
    });

    if (!waste) throw new NotFoundException(`Waste record ${wasteId} not found`);

    return waste;
  }

  async update(
    wasteId: string,
    data: UpdateWasteManagementDto,
  ): Promise<Prisma.WasteManagementGetPayload<{ include: typeof WASTE_MANAGEMENT_INCLUDE }>> {
    return this.prisma.wasteManagement.update({
      where: { id: wasteId },
      data: {
        ...data,
        ...(data.status ? { resolvedAt: new Date() } : {}),
      },
      include: WASTE_MANAGEMENT_INCLUDE,
    });
  }

  async remove(wasteId: string): Promise<void> {
    await this.prisma.wasteManagement.update({
      where: { id: wasteId },
      data: { deletedAt: new Date() },
    });
  }
}
