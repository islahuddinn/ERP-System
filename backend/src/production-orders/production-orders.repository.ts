import { Injectable } from "@nestjs/common";
import {
  Prisma,
  ProductionCostType,
  ProductionOrderStatus,
  RawMaterialBatch,
  RawMaterialBatchStatus,
  WasteStatus,
} from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { buildOrderBy, buildSearchFilter } from "../common/utils/pagination.helper";
import { getTotalPages } from "../common/reuseable-functions/getTotalPages";
import { ProductionOrderQueryDto } from "./dto/production-order-query.dto";
import { BatchAllocation, ProductionOrderDashboardStats } from "./utils/interfaces";

export const PRODUCTION_ORDER_INCLUDE = {
  product: { select: { id: true, name: true, code: true } },
  bom: { select: { id: true, bomNumber: true, name: true } },
  site: { select: { id: true, name: true, code: true } },
  materials: {
    include: {
      rawMaterial: { select: { id: true, name: true, code: true } },
      uom: { select: { id: true, name: true, symbol: true } },
      batchAllocations: {
        include: {
          rawMaterialBatch: { select: { id: true, batchNumber: true, unitCost: true } },
        },
      },
    },
  },
  costs: true,
  wastes: {
    include: {
      rawMaterial: { select: { id: true, name: true, code: true } },
      uom: { select: { id: true, name: true, symbol: true } },
    },
  },
} as const;

export type ProductionOrderWithRelations = Prisma.ProductionOrderGetPayload<{
  include: typeof PRODUCTION_ORDER_INCLUDE;
}>;

@Injectable()
export class ProductionOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async generateOrderNumber(): Promise<string> {
    const latest = await this.prisma.productionOrder.findFirst({
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true },
    });

    const next = latest ? parseInt(latest.orderNumber.replace("PROD-", ""), 10) + 1 : 1;
    return `PROD-${String(next).padStart(6, "0")}`;
  }

  async findActiveBomWithItems(
    bomId: string,
    productId: string,
  ): Promise<Prisma.BOMGetPayload<{
    include: { items: { include: { rawMaterial: true; uom: true } } };
  }> | null> {
    return this.prisma.bOM.findFirst({
      where: { id: bomId, productId, status: "ACTIVE", deletedAt: null },
      include: { items: { include: { rawMaterial: true, uom: true } } },
    });
  }

  async findAllocatableBatches(rawMaterialId: string): Promise<RawMaterialBatch[]> {
    return this.prisma.rawMaterialBatch.findMany({
      where: {
        rawMaterialId,
        deletedAt: null,
        status: { in: [RawMaterialBatchStatus.ACTIVE, RawMaterialBatchStatus.PARTIAL] },
        OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
      },
      orderBy: [{ expiryDate: "asc" }, { receivedDate: "asc" }, { createdAt: "asc" }],
    });
  }

  async findAll(
    productionOrderQueryDto: ProductionOrderQueryDto,
  ): Promise<PaginatedResponse<ProductionOrderWithRelations>> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      productId,
      siteId,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = productionOrderQueryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductionOrderWhereInput = { deletedAt: null };
    if (status) where.status = status;
    if (productId) where.productId = productId;
    if (siteId) where.siteId = siteId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }
    if (search) where.OR = buildSearchFilter(search, ["orderNumber"]);

    const orderBy = buildOrderBy(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.productionOrder.findMany({
        where,
        include: PRODUCTION_ORDER_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.productionOrder.count({ where }),
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

  async findById(productionOrderId: string): Promise<ProductionOrderWithRelations | null> {
    return this.prisma.productionOrder.findFirst({
      where: { id: productionOrderId, deletedAt: null },
      include: PRODUCTION_ORDER_INCLUDE,
    });
  }

  async createOrder(
    tx: Prisma.TransactionClient,
    data: {
      orderNumber: string;
      productId: string;
      bomId: string;
      siteId?: string;
      plannedQuantity: number;
      rawMaterialCost: number;
      totalCost: number;
      costPerUnit: number | null;
      notes?: string;
      createdById: string;
    },
  ): Promise<{ id: string }> {
    return tx.productionOrder.create({ data, select: { id: true } });
  }

  async createMaterial(
    tx: Prisma.TransactionClient,
    data: {
      productionOrderId: string;
      rawMaterialId: string;
      uomId: string;
      requiredQuantity: number;
      estimatedCost: number;
    },
  ): Promise<{ id: string }> {
    return tx.productionOrderMaterial.create({ data, select: { id: true } });
  }

  async createMaterialBatch(
    tx: Prisma.TransactionClient,
    productionOrderMaterialId: string,
    allocation: BatchAllocation,
  ): Promise<void> {
    await tx.productionOrderMaterialBatch.create({
      data: {
        productionOrderMaterialId,
        rawMaterialBatchId: allocation.rawMaterialBatchId,
        allocatedQuantity: allocation.allocatedQuantity,
        unitCost: allocation.unitCost,
        totalCost: allocation.totalCost,
      },
    });
  }

  async reserveBatch(
    tx: Prisma.TransactionClient,
    batchId: string,
    rawMaterialId: string,
    quantity: number,
  ): Promise<void> {
    await tx.rawMaterialBatch.update({
      where: { id: batchId },
      data: { reservedQuantity: { increment: quantity } },
    });

    await tx.rawMaterial.update({
      where: { id: rawMaterialId },
      data: { reservedStock: { increment: quantity } },
    });
  }

  async releaseBatchReservation(
    tx: Prisma.TransactionClient,
    batchId: string,
    rawMaterialId: string,
    quantity: number,
  ): Promise<void> {
    await tx.rawMaterialBatch.update({
      where: { id: batchId },
      data: { reservedQuantity: { decrement: quantity } },
    });

    await tx.rawMaterial.update({
      where: { id: rawMaterialId },
      data: { reservedStock: { decrement: quantity } },
    });
  }

  async findBatchById(tx: Prisma.TransactionClient, batchId: string): Promise<RawMaterialBatch> {
    return tx.rawMaterialBatch.findUniqueOrThrow({ where: { id: batchId } });
  }

  async consumeBatchAllocation(
    tx: Prisma.TransactionClient,
    batch: RawMaterialBatch,
    allocation: { id: string; allocatedQuantity: number },
  ): Promise<void> {
    const newAvailable = batch.availableQuantity - allocation.allocatedQuantity;

    const newStatus =
      newAvailable <= 0 ? RawMaterialBatchStatus.CONSUMED : RawMaterialBatchStatus.PARTIAL;

    await tx.rawMaterialBatch.update({
      where: { id: batch.id },
      data: {
        availableQuantity: newAvailable,
        consumedQuantity: { increment: allocation.allocatedQuantity },
        reservedQuantity: { decrement: allocation.allocatedQuantity },
        status: newStatus,
      },
    });

    await tx.rawMaterial.update({
      where: { id: batch.rawMaterialId },
      data: {
        currentStock: { decrement: allocation.allocatedQuantity },
        reservedStock: { decrement: allocation.allocatedQuantity },
      },
    });

    await tx.productionOrderMaterialBatch.update({
      where: { id: allocation.id },
      data: { consumedAt: new Date() },
    });
  }

  async reverseBatchConsumption(
    tx: Prisma.TransactionClient,
    batch: RawMaterialBatch,
    allocation: { id: string; allocatedQuantity: number },
  ): Promise<void> {
    const newAvailable = batch.availableQuantity + allocation.allocatedQuantity;
    const newStatus =
      newAvailable >= batch.receivedQuantity
        ? RawMaterialBatchStatus.ACTIVE
        : RawMaterialBatchStatus.PARTIAL;

    await tx.rawMaterialBatch.update({
      where: { id: batch.id },
      data: {
        availableQuantity: newAvailable,
        consumedQuantity: { decrement: allocation.allocatedQuantity },
        status: newStatus,
      },
    });

    await tx.rawMaterial.update({
      where: { id: batch.rawMaterialId },
      data: { currentStock: { increment: allocation.allocatedQuantity } },
    });

    await tx.productionOrderMaterialBatch.update({
      where: { id: allocation.id },
      data: { consumedAt: null },
    });
  }

  async updateMaterialConsumption(
    tx: Prisma.TransactionClient,
    productionOrderMaterialId: string,
    consumedQuantity: number,
    actualCost: number,
  ): Promise<void> {
    await tx.productionOrderMaterial.update({
      where: { id: productionOrderMaterialId },
      data: { consumedQuantity, actualCost },
    });
  }

  async updateOrder(
    tx: Prisma.TransactionClient,
    productionOrderId: string,
    data: Prisma.ProductionOrderUpdateInput,
  ): Promise<void> {
    await tx.productionOrder.update({ where: { id: productionOrderId }, data });
  }

  async createCost(
    tx: Prisma.TransactionClient,
    data: {
      productionOrderId: string;
      costType: ProductionCostType;
      description?: string;
      amount: number;
      createdById: string;
    },
  ): Promise<void> {
    await tx.productionOrderCost.create({ data });
  }

  async createWaste(
    tx: Prisma.TransactionClient,
    data: {
      productionOrderId: string;
      rawMaterialId: string;
      uomId: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
      notes?: string;
      createdById: string;
    },
  ): Promise<void> {
    await tx.productionOrderWaste.create({ data });
  }

  async findReusableWasteManagement(
    tx: Prisma.TransactionClient,
    wasteManagementId: string,
  ): Promise<Prisma.WasteManagementGetPayload<{
    include: { rawMaterial: { select: { id: true; uomId: true } } };
  }> | null> {
    return tx.wasteManagement.findFirst({
      where: { id: wasteManagementId, deletedAt: null },
      include: { rawMaterial: { select: { id: true, uomId: true } } },
    });
  }

  async markWasteManagementReused(
    tx: Prisma.TransactionClient,
    wasteManagementId: string,
  ): Promise<void> {
    await tx.wasteManagement.update({
      where: { id: wasteManagementId },
      data: { status: WasteStatus.REUSED, resolvedAt: new Date() },
    });
  }

  async sumCosts(tx: Prisma.TransactionClient, productionOrderId: string): Promise<number> {
    const result = await tx.productionOrderCost.aggregate({
      where: { productionOrderId },
      _sum: { amount: true },
    });

    return Number(result._sum.amount ?? 0);
  }

  async sumWastes(tx: Prisma.TransactionClient, productionOrderId: string): Promise<number> {
    const result = await tx.productionOrderWaste.aggregate({
      where: { productionOrderId },
      _sum: { totalCost: true },
    });

    return Number(result._sum.totalCost ?? 0);
  }

  //–––––––––––––––––––––––––––––––– Dashboard APIs ––––––––––––––––––––––––––––––––

  async getDashboardStats(): Promise<ProductionOrderDashboardStats> {
    const where: Prisma.ProductionOrderWhereInput = { deletedAt: null };

    const [statusCounts, costAggregate, wasteAggregate] = await Promise.all([
      this.prisma.productionOrder.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      this.prisma.productionOrder.aggregate({
        where: { ...where, status: ProductionOrderStatus.COMPLETED },
        _sum: { totalCost: true },
      }),
      this.prisma.productionOrderWaste.aggregate({
        _sum: { totalCost: true },
      }),
    ]);

    const countByStatus = (status: ProductionOrderStatus): number =>
      statusCounts.find((entry) => entry.status === status)?._count._all ?? 0;

    return {
      totalProductionOrders: statusCounts.reduce((sum, entry) => sum + entry._count._all, 0),
      draftProductionOrders: countByStatus(ProductionOrderStatus.DRAFT),
      inProgressProductionOrders: countByStatus(ProductionOrderStatus.IN_PROGRESS),
      completedProductionOrders: countByStatus(ProductionOrderStatus.COMPLETED),
      cancelledProductionOrders: countByStatus(ProductionOrderStatus.CANCELLED),
      totalProductionCost: Number(costAggregate._sum.totalCost || 0),
      totalWasteCost: Number(wasteAggregate._sum.totalCost || 0),
    };
  }
}
