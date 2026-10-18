import { Injectable } from "@nestjs/common";
import { BOM, BOMStatus, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { buildOrderBy, buildSearchFilter } from "../common/utils/pagination.helper";
import { getTotalPages } from "../common/reuseable-functions/getTotalPages";
import { handlePrismaUniqueError } from "../common/reuseable-functions/handlePrismaUniqueError";
import { BomQueryDto } from "./dto/bom-query.dto";
import { CreateBomItemDto } from "./dto/create-bom.dto";
import { BomDashboardStats } from "./utils/interfaces";

const BOM_INCLUDE = {
  product: { select: { id: true, name: true, code: true } },
  items: {
    include: {
      rawMaterial: {
        select: {
          id: true,
          name: true,
          code: true,
          uom: { select: { id: true, name: true, symbol: true } },
        },
      },
      uom: { select: { id: true, name: true, symbol: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export type BomWithRelations = Prisma.BOMGetPayload<{ include: typeof BOM_INCLUDE }>;
export type BomLean = Pick<BOM, "id" | "status" | "bomNumber">;

@Injectable()
export class BomRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByName(name: string): Promise<BomLean | null> {
    return this.prisma.bOM.findFirst({
      where: { name, deletedAt: null },
      select: { id: true, status: true, bomNumber: true },
    });
  }

  async generateBomNumber(): Promise<string> {
    const latest = await this.prisma.bOM.findFirst({
      orderBy: { bomNumber: "desc" },
      select: { bomNumber: true },
    });
    const next = latest ? parseInt(latest.bomNumber.replace("BOM-", ""), 10) + 1 : 1;
    return `BOM-${String(next).padStart(6, "0")}`;
  }

  async create(data: {
    bomNumber: string;
    productId: string;
    name: string;
    description?: string;
    createdById: string;
    items: CreateBomItemDto[];
  }): Promise<BomWithRelations> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Release the unique name held by any soft-deleted BOM so the new BOM
        // can reuse it. The DB-level unique index on `name` does not account for
        // `deletedAt`, so a deleted BOM would otherwise block re-creation (#22).
        await tx.bOM.updateMany({
          where: { name: data.name, deletedAt: { not: null } },
          data: { name: `${data.name}__deleted__${Date.now()}` },
        });

        const bom = await tx.bOM.create({
          data: {
            bomNumber: data.bomNumber,
            productId: data.productId,
            name: data.name,
            description: data.description,
            status: BOMStatus.DRAFT,
            createdById: data.createdById,
          },
        });

        await tx.bOMItem.createMany({
          data: data.items.map((item) => ({
            bomId: bom.id,
            rawMaterialId: item.rawMaterialId,
            uomId: item.uomId,
            quantityPerUnit: item.quantityPerUnit,
            wastagePercent: item.wastagePercent ?? 0,
            notes: item.notes ?? null,
          })),
        });

        return tx.bOM.findUniqueOrThrow({
          where: { id: bom.id },
          include: BOM_INCLUDE,
        });
      });
    } catch (error) {
      handlePrismaUniqueError(error, `A BOM with the name "${data.name}" already exists`);
    }
  }

  async findAll(bomQueryDto: BomQueryDto): Promise<PaginatedResponse<BomWithRelations>> {
    const { page = 1, limit = 10, search, productId, status, startDate, endDate, sortBy, sortOrder } =
      bomQueryDto;

    const skip = (page - 1) * limit;
    const where: Prisma.BOMWhereInput = { deletedAt: null };

    if (search) {
      where.OR = buildSearchFilter(search, ["bomNumber", "name"]);
    }

    if (productId) where.productId = productId;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    const orderBy = buildOrderBy(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.bOM.findMany({ where, include: BOM_INCLUDE, orderBy, skip, take: limit }),
      this.prisma.bOM.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: getTotalPages(total, limit),
        hasNext: page < getTotalPages(total, limit),
        hasPrev: page > 1,
      },
    };
  }

  async findById(bomId: string): Promise<BomWithRelations | null> {
    return this.prisma.bOM.findFirst({
      where: { id: bomId, deletedAt: null },
      include: BOM_INCLUDE,
    });
  }

  async findByIdLean(bomId: string): Promise<BomLean | null> {
    return this.prisma.bOM.findFirst({
      where: { id: bomId, deletedAt: null },
      select: { id: true, status: true, bomNumber: true },
    });
  }

  async findActiveByProduct(productId: string): Promise<BomWithRelations | null> {
    return this.prisma.bOM.findFirst({
      where: { productId, status: BOMStatus.ACTIVE, deletedAt: null },
      include: BOM_INCLUDE,
    });
  }

  async update(
    bomId: string,
    data: { name?: string; description?: string | null; updatedById: string },
    items?: CreateBomItemDto[],
  ): Promise<BomWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      if (items !== undefined) {
        await tx.bOMItem.deleteMany({ where: { bomId } });
        if (items.length) {
          await tx.bOMItem.createMany({
            data: items.map((item) => ({
              bomId,
              rawMaterialId: item.rawMaterialId,
              uomId: item.uomId,
              quantityPerUnit: item.quantityPerUnit,
              wastagePercent: item.wastagePercent ?? 0,
              notes: item.notes ?? null,
            })),
          });
        }
      }

      return tx.bOM.update({
        where: { id: bomId },
        data: { ...data },
        include: BOM_INCLUDE,
      });
    });
  }

  async updateStatus(
    bomId: string,
    status: BOMStatus,
    updatedById: string,
  ): Promise<BomWithRelations> {
    return this.prisma.bOM.update({
      where: { id: bomId },
      data: { status, updatedById },
      include: BOM_INCLUDE,
    });
  }

  //–––––––––––––––––––––––––––––––– Dashboard APIs ––––––––––––––––––––––––––––––––

  async getDashboardStats(): Promise<BomDashboardStats> {
    const statusCounts = await this.prisma.bOM.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    const countByStatus = (status: BOMStatus): number =>
      statusCounts.find((entry) => entry.status === status)?._count._all ?? 0;

    return {
      totalBoms: statusCounts.reduce((sum, entry) => sum + entry._count._all, 0),
      draftBoms: countByStatus(BOMStatus.DRAFT),
      activeBoms: countByStatus(BOMStatus.ACTIVE),
      inactiveBoms: countByStatus(BOMStatus.INACTIVE),
    };
  }

  async softDelete(bomId: string): Promise<void> {
    // Release the unique `name` (and `bomNumber`) so a new BOM can reuse them.
    // The DB unique indexes on these columns ignore `deletedAt`, so we tombstone
    // the values on delete to avoid blocking re-creation (#22).
    const existing = await this.prisma.bOM.findUnique({
      where: { id: bomId },
      select: { name: true, bomNumber: true },
    });

    await this.prisma.bOM.update({
      where: { id: bomId },
      data: {
        deletedAt: new Date(),
        ...(existing && {
          name: `${existing.name}__deleted__${bomId}`,
          bomNumber: `${existing.bomNumber}__deleted__${bomId}`,
        }),
      },
    });
  }
}
