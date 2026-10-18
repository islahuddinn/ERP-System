import { Injectable } from "@nestjs/common";
import { Prisma, PurchaseStatus } from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { ProductionOrderCounts, QualityInspectionCounts } from "./utils/interfaces";

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getTotalRevenue(): Promise<number> {
    const result = await this.prisma.sale.aggregate({
      where: { status: "COMPLETED" },
      _sum: { totalAmount: true },
    });
    return Number(result._sum.totalAmount || 0);
  }

  async getPurchaseCost(): Promise<number> {
    const result = await this.prisma.purchaseOrder.aggregate({
      where: { status: PurchaseStatus.RECEIVED },
      _sum: { totalAmount: true },
    });
    return Number(result._sum.totalAmount || 0);
  }

  async getProductionCost(): Promise<number> {
    const result = await this.prisma.financialEvent.aggregate({
      where: { type: "COST_PRODUCTION" },
      _sum: { amount: true },
    });
    return Number(result._sum.amount || 0);
  }

  async getWasteCost(): Promise<number> {
    const result = await this.prisma.financialEvent.aggregate({
      where: { type: "COST_WASTE" },
      _sum: { amount: true },
    });
    return Number(result._sum.amount || 0);
  }

  async getTotalActiveProducts(): Promise<number> {
    return this.prisma.product.count({
      where: { deletedAt: null, isActive: true },
    });
  }

  async getTotalStockQuantity(): Promise<number> {
    const result = await this.prisma.stockBalance.aggregate({
      _sum: { quantity: true },
    });
    return Number(result._sum.quantity || 0);
  }

  async getStockValuationLedger(): Promise<
    Prisma.StockLedgerGetPayload<{ include: { product: true } }>[]
  > {
    return this.prisma.stockLedger.findMany({
      where: { closingQty: { gt: 0 } },
      include: { product: true },
    });
  }

  async getPendingPurchaseCount(): Promise<number> {
    return this.prisma.purchaseOrder.count({
      where: { status: { in: [PurchaseStatus.DRAFT, PurchaseStatus.CONFIRMED] } },
    });
  }

  async getCompletedPurchaseCount(): Promise<number> {
    return this.prisma.purchaseOrder.count({
      where: { status: PurchaseStatus.RECEIVED },
    });
  }

  async getActiveSupplierCount(): Promise<number> {
    return this.prisma.supplier.count({ where: { isActive: true } });
  }

  async getActiveProductsWithStock(): Promise<
    Prisma.ProductGetPayload<{ include: { stockBalances: true } }>[]
  > {
    return this.prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      include: { stockBalances: true },
    });
  }

  async getTotalWasteQuantity(): Promise<number> {
    const result = await this.prisma.wasteManagement.aggregate({
      where: { deletedAt: null },
      _sum: { quantity: true },
    });
    return Number(result._sum.quantity || 0);
  }

  async getProductionOrderCounts(siteId?: string): Promise<ProductionOrderCounts> {
    const where: Prisma.ProductionOrderWhereInput = siteId ? { siteId } : {};

    const [total, inProgress, completed, producedAggregate] = await Promise.all([
      this.prisma.productionOrder.count({ where }),
      this.prisma.productionOrder.count({ where: { ...where, status: "IN_PROGRESS" } }),
      this.prisma.productionOrder.count({ where: { ...where, status: "COMPLETED" } }),
      this.prisma.productionOrder.aggregate({
        where: { ...where, status: "COMPLETED" },
        _sum: { producedQuantity: true },
      }),
    ]);

    return {
      total,
      inProgress,
      completed,
      totalProducedQuantity: Number(producedAggregate._sum.producedQuantity || 0),
    };
  }

  async getQualityInspectionCounts(siteId?: string): Promise<QualityInspectionCounts> {
    const siteFilter: Prisma.QualityControlWhereInput = siteId
      ? { product: { productionOrders: { some: { siteId } } } }
      : {};

    const [total, passed, failed] = await Promise.all([
      this.prisma.qualityControl.count({ where: siteFilter }),
      this.prisma.qualityControl.count({
        where: { ...siteFilter, qualityStatus: "PASSED" },
      }),
      this.prisma.qualityControl.count({
        where: { ...siteFilter, qualityStatus: "FAILED" },
      }),
    ]);

    return { total, passed, failed };
  }
}
