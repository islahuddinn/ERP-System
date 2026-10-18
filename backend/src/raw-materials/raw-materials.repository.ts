import { BadRequestException, Injectable } from "@nestjs/common";
import { TenantPrismaContextService } from "../prisma/tenant-prisma-context.service";

import { RawMaterialQueryDto } from "./dto/raw-material-query.dto";
import { getTotalPages } from "../common/reuseable-functions/getTotalPages";
import { buildOrderBy, buildSearchFilter } from "../common/utils/pagination.helper";
import { Prisma } from "@prisma/tenant-client";
import { RawMaterialDashboardStats } from "./utils/interfaces";

const RAW_MATERIAL_INCLUDE = {
  uom: { select: { id: true, name: true, symbol: true } },
};

@Injectable()
export class RawMaterialsRepository {
  constructor(private readonly tenantPrismaContext: TenantPrismaContextService) {}

  private get prisma() {
    const client = this.tenantPrismaContext.getTenantClient();
    if (!client) {
      throw new BadRequestException("Tenant context is missing");
    }
    return client;
  }

  private serialize<T extends { lastPurchasePrice: Prisma.Decimal }>(rawMaterial: T) {
    return { ...rawMaterial, lastPurchasePrice: Number(rawMaterial.lastPurchasePrice) };
  }

  async create(data: Prisma.RawMaterialCreateInput) {
    const rawMaterial = await this.prisma.rawMaterial.create({
      data,
      include: RAW_MATERIAL_INCLUDE,
    });
    return this.serialize(rawMaterial);
  }

  async findAll(rawMaterialQueryDto: RawMaterialQueryDto) {
    const { search, uomId, page = 1, limit = 20, sortBy, sortOrder } = rawMaterialQueryDto;

    const skip = (page - 1) * limit;

    const where: Prisma.RawMaterialWhereInput = {};

    if (search) {
      where.OR = buildSearchFilter(search, ["name", "code", "description"]);
    }

    if (uomId) {
      where.uomId = uomId;
    }

    const orderBy = buildOrderBy(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.rawMaterial.findMany({
        where,
        include: RAW_MATERIAL_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.rawMaterial.count({ where }),
    ]);

    return {
      data: data.map((rawMaterial) => this.serialize(rawMaterial)),
      meta: {
        total,
        page,
        limit,
        totalPages: getTotalPages(total, limit),
      },
    };
  }

  async findById(id: string) {
    const rawMaterial = await this.prisma.rawMaterial.findFirst({
      where: { id },
      include: RAW_MATERIAL_INCLUDE,
    });
    return rawMaterial ? this.serialize(rawMaterial) : rawMaterial;
  }

  async findByCode(code: string, excludeId?: string) {
    return this.prisma.rawMaterial.findFirst({
      where: {
        code,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async findByName(name: string, excludeId?: string) {
    return this.prisma.rawMaterial.findFirst({
      where: {
        name,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async update(id: string, data: Prisma.RawMaterialUpdateInput) {
    const rawMaterial = await this.prisma.rawMaterial.update({
      where: { id },
      data,
      include: RAW_MATERIAL_INCLUDE,
    });

    return this.serialize(rawMaterial);
  }

  /**
   * Checks whether the raw material is referenced by any linked records.
   * Returns a human-readable reason string if it is, or null if safe to delete.
   */
  async checkReferences(id: string): Promise<string | null> {
    const [po, grn, batches, bom, prodMaterials, prodWastes, waste] = await Promise.all([
      this.prisma.purchaseItem.count({ where: { rawMaterialId: id } }),
      this.prisma.gRNItem.count({ where: { rawMaterialId: id } }),
      this.prisma.rawMaterialBatch.count({ where: { rawMaterialId: id } }),
      this.prisma.bOMItem.count({ where: { rawMaterialId: id } }),
      this.prisma.productionOrderMaterial.count({ where: { rawMaterialId: id } }),
      this.prisma.productionOrderWaste.count({ where: { rawMaterialId: id } }),
      this.prisma.wasteManagement.count({ where: { rawMaterialId: id } }),
    ]);

    const parts: string[] = [];
    if (po) parts.push(`${po} purchase order item(s)`);
    if (grn) parts.push(`${grn} GRN item(s)`);
    if (batches) parts.push(`${batches} raw material batch(es)`);
    if (bom) parts.push(`${bom} BOM item(s)`);
    if (prodMaterials) parts.push(`${prodMaterials} production order material(s)`);
    if (prodWastes) parts.push(`${prodWastes} production order waste(s)`);
    if (waste) parts.push(`${waste} waste management record(s)`);

    return parts.length ? `Cannot delete: referenced in ${parts.join(", ")}` : null;
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.rawMaterial.delete({ where: { id } });
  }

  async dropdown() {
    return this.prisma.rawMaterial.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        lastPurchasePrice: true,
        uom: { select: { id: true, name: true, symbol: true, code: true } },
      },
    });
  }

  //–––––––––––––––––––––––––––––––– Dashboard APIs ––––––––––––––––––––––––––––––––

  async getDashboardStats(): Promise<RawMaterialDashboardStats> {
    const now = new Date();
    const expiryThreshold = new Date(now);
    expiryThreshold.setDate(expiryThreshold.getDate() + 30);

    const [rawMaterials, expiringBatchesCount] = await Promise.all([
      this.prisma.rawMaterial.findMany({
        select: { currentStock: true, reorderLevel: true, lastPurchasePrice: true },
      }),
      this.prisma.rawMaterialBatch.count({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          availableQuantity: { gt: 0 },
          expiryDate: { gte: now, lte: expiryThreshold },
        },
      }),
    ]);

    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const rawMaterial of rawMaterials) {
      const currentStock = Number(rawMaterial.currentStock);
      const reorderLevel = Number(rawMaterial.reorderLevel);
      const lastPurchasePrice = Number(rawMaterial.lastPurchasePrice);

      totalStockValue += currentStock * lastPurchasePrice;

      if (currentStock <= 0) {
        outOfStockCount++;
      } else if (currentStock <= reorderLevel) {
        lowStockCount++;
      }
    }

    return {
      totalRawMaterials: rawMaterials.length,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      expiringBatchesCount,
    };
  }
}
