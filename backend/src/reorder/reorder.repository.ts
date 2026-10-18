import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";

const REORDER_ALERT_INCLUDE = {
  product: {
    select: {
      id: true,
      name: true,
      code: true,
      reorderLevel: true,
      uom: {
        select: {
          symbol: true,
        },
      },
    },
  },
  location: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.StockBalanceInclude;

const REORDER_PRODUCT_INCLUDE = {
  uom: {
    select: {
      symbol: true,
    },
  },
  stockBalances: {
    include: {
      location: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;

export type ReorderAlertBalance = Prisma.StockBalanceGetPayload<{ include: typeof REORDER_ALERT_INCLUDE }>;
export type ReorderProductStock = Prisma.ProductGetPayload<{ include: typeof REORDER_PRODUCT_INCLUDE }>;

@Injectable()
export class ReorderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findStockBalancesWithReorder(): Promise<ReorderAlertBalance[]> {
    return this.prisma.stockBalance.findMany({
      where: {
        product: {
          isActive: true,
          deletedAt: null,
          reorderLevel: { gt: 0 },
        },
      },
      include: REORDER_ALERT_INCLUDE,
      orderBy: [{ product: { name: "asc" } }, { location: { name: "asc" } }],
    });
  }

  async findProductStock(productId: string): Promise<ReorderProductStock | null> {
    return this.prisma.product.findUnique({
      where: { id: productId },
      include: REORDER_PRODUCT_INCLUDE,
    });
  }
}
