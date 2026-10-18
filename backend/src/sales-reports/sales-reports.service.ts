import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/tenant-client";

@Injectable()
export class SalesReportsService {
  private readonly logger = new Logger(SalesReportsService.name);

  async getDailyReport(tenantClient: PrismaClient, date: string) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    return this.getSalesReport(tenantClient, startDate, endDate);
  }

  async getMonthlyReport(tenantClient: PrismaClient, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return this.getSalesReport(tenantClient, startDate, endDate);
  }

  async getHourlyReport(tenantClient: PrismaClient, date: string) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const where: Prisma.SaleWhereInput = {
      status: "COMPLETED",
      saleDate: { gte: startDate, lte: endDate },
    };

    const sales = await tenantClient.sale.findMany({
      where,
      include: {
        saleItems: { include: { product: true } },
      },
    });

    const hourlyMap = new Map<number, any>();

    for (const sale of sales) {
      const hour = sale.saleDate.getHours();
      if (!hourlyMap.has(hour)) {
        hourlyMap.set(hour, { hour, totalSales: 0, transactionCount: 0, quantity: 0 });
      }
      const stats = hourlyMap.get(hour)!;
      stats.totalSales += Number(sale.totalAmount);
      stats.transactionCount += 1;
      stats.quantity += sale.saleItems.reduce((sum, item) => sum + Number(item.quantity), 0);
    }

    return Array.from(hourlyMap.values())
      .sort((a, b) => a.hour - b.hour)
      .map((stats) => ({
        ...stats,
        averageTransactionValue:
          stats.transactionCount > 0 ? stats.totalSales / stats.transactionCount : 0,
      }));
  }

  async getByProduct(
    tenantClient: PrismaClient,
    startDate?: string,
    endDate?: string,
    productId?: string,
  ) {
    const where: Prisma.SaleWhereInput = { status: "COMPLETED" };

    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) where.saleDate.lte = new Date(endDate);
    }

    const sales = await tenantClient.sale.findMany({
      where,
      include: {
        saleItems: {
          include: { product: true },
          ...(productId ? { where: { productId } } : {}),
        },
      },
    });

    const productMap = new Map<string, any>();

    for (const sale of sales) {
      for (const item of sale.saleItems) {
        if (!item.productId) continue;
        const pid = item.productId;
        if (!productMap.has(pid)) {
          productMap.set(pid, {
            productId: pid,
            product: item.product,
            totalSales: 0,
            totalQuantity: 0,
            transactionCount: 0,
          });
        }
        const stats = productMap.get(pid)!;
        stats.totalSales += Number(item.lineTotal);
        stats.totalQuantity += Number(item.quantity);
        stats.transactionCount += 1;
      }
    }

    return Array.from(productMap.values()).map((stats) => ({
      ...stats,
      averagePrice: stats.totalQuantity > 0 ? stats.totalSales / stats.totalQuantity : 0,
    }));
  }

  async getByLocation(tenantClient: PrismaClient, startDate?: string, endDate?: string) {
    return this.getSalesReport(
      tenantClient,
      startDate ? new Date(startDate) : new Date(0),
      endDate ? new Date(endDate) : new Date(),
    );
  }

  async getByPlant(tenantClient: PrismaClient, startDate?: string, endDate?: string) {
    return this.getSalesReport(
      tenantClient,
      startDate ? new Date(startDate) : new Date(0),
      endDate ? new Date(endDate) : new Date(),
    );
  }

  private async getSalesReport(tenantClient: PrismaClient, startDate: Date, endDate: Date) {
    const where: Prisma.SaleWhereInput = {
      status: "COMPLETED",
      saleDate: { gte: startDate, lte: endDate },
    };

    const [sales, aggregate] = await Promise.all([
      tenantClient.sale.findMany({
        where,
        include: { saleItems: { include: { product: true } } },
      }),
      tenantClient.sale.aggregate({
        where,
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
    ]);

    const totalSales = Number(aggregate._sum.totalAmount || 0);
    const transactionCount = aggregate._count.id;
    const totalQuantity = sales.reduce(
      (sum, sale) => sum + sale.saleItems.reduce((s, item) => s + Number(item.quantity), 0),
      0,
    );

    return {
      totalSales,
      transactionCount,
      totalQuantity,
      averageTransactionValue: transactionCount > 0 ? totalSales / transactionCount : 0,
      period: { startDate, endDate },
    };
  }
}
