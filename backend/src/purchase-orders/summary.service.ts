import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/tenant-client";
import { SummaryQueryDto } from "./dto/summary-query.dto";

@Injectable()
export class PurchaseSummaryService {
  private getPrisma(tenantClient?: PrismaClient): PrismaClient {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for purchase summary");
    }

    return tenantClient;
  }

  async getSummary(tenantClient: PrismaClient, queryDto: SummaryQueryDto) {
    const prisma = this.getPrisma(tenantClient);
    const { startDate, endDate } = queryDto;

    const whereClause: Prisma.PurchaseOrderWhereInput = {};
    if (startDate || endDate) {
      whereClause.orderDate = {};
      if (startDate) whereClause.orderDate.gte = new Date(startDate);
      if (endDate) whereClause.orderDate.lte = new Date(endDate);
    }

    // Get current month and year for comparison
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentYear = new Date(now.getFullYear(), 0, 1);

    // Total orders
    const totalOrders = await prisma.purchaseOrder.count({
      where: whereClause,
    });

    // Pending orders
    const pendingOrders = await prisma.purchaseOrder.count({
      where: {
        ...whereClause,
        status: { in: ["DRAFT", "CONFIRMED"] },
      },
    });

    // Completed orders
    const completedOrders = await prisma.purchaseOrder.count({
      where: {
        ...whereClause,
        status: "RECEIVED",
      },
    });

    // Total value
    const totalValueResult = await prisma.purchaseOrder.aggregate({
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
    });

    // This month's value
    const monthlyValueResult = await prisma.purchaseOrder.aggregate({
      where: {
        ...whereClause,
        orderDate: {
          gte: currentMonth,
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    // This year's value
    const yearlyValueResult = await prisma.purchaseOrder.aggregate({
      where: {
        ...whereClause,
        orderDate: {
          gte: currentYear,
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    // Top suppliers
    const topSuppliers = await prisma.purchaseOrder.groupBy({
      by: ["supplierId"],
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalAmount: "desc",
        },
      },
      take: 5,
    });

    // Get supplier details
    const supplierIds = topSuppliers.map((s) => s.supplierId).filter(Boolean);
    const suppliers = supplierIds.length
      ? await prisma.supplier.findMany({
          where: {
            id: { in: supplierIds as string[] },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

    const topSuppliersWithNames = topSuppliers.map((supplier) => {
      const supplierInfo = suppliers.find((s) => s.id === supplier.supplierId);
      return {
        id: supplier.supplierId,
        name: supplierInfo?.name || "Unknown Supplier",
        totalValue: Number(supplier._sum.totalAmount || 0),
        orderCount: supplier._count.id,
      };
    });

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalValue: Number(totalValueResult._sum.totalAmount || 0),
      totalValueMonth: Number(monthlyValueResult._sum.totalAmount || 0),
      totalValueYear: Number(yearlyValueResult._sum.totalAmount || 0),
      topSuppliers: topSuppliersWithNames,
    };
  }

  async getMonthlyTrends(tenantClient: PrismaClient, queryDto: SummaryQueryDto) {
    const prisma = this.getPrisma(tenantClient);
    const { startDate, endDate } = queryDto;

    try {
      // Default to last 12 months if no date range provided
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(end.getFullYear() - 1, end.getMonth(), 1);

      const trendsRaw = await prisma.$queryRaw<
        Array<{
          month: Date;
          total_orders: bigint;
          total_value: Prisma.Decimal | number | null;
        }>
      >(Prisma.sql`
        SELECT
          DATE_TRUNC('month', "order_date") AS month,
          COUNT(*)::INTEGER AS total_orders,
          COALESCE(SUM("total_amount"), 0)::DOUBLE PRECISION AS total_value
        FROM purchase_orders
        WHERE "order_date" >= ${start} AND "order_date" <= ${end}
        GROUP BY DATE_TRUNC('month', "order_date")
        ORDER BY month ASC
      `);

      // Transform the results to ensure proper types
      const trends = trendsRaw.map((row) => ({
        month: row.month,
        total_orders: Number(row.total_orders),
        total_value: Number(row.total_value ?? 0),
      }));

      return trends;
    } catch (error) {
      console.error("Error fetching monthly trends:", error);
      throw new BadRequestException("Failed to fetch monthly purchase trends");
    }
  }

  async getTopSuppliers(tenantClient: PrismaClient, queryDto: SummaryQueryDto) {
    const prisma = this.getPrisma(tenantClient);
    const { startDate, endDate, limit = 10 } = queryDto;

    const whereClause: any = {};
    if (startDate || endDate) {
      whereClause.orderDate = {};
      if (startDate) whereClause.orderDate.gte = new Date(startDate);
      if (endDate) whereClause.orderDate.lte = new Date(endDate);
    }

    const topSuppliers = await prisma.purchaseOrder.groupBy({
      by: ["supplierId"],
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalAmount: "desc",
        },
      },
      take: limit,
    });

    // Get supplier details
    const supplierIds = topSuppliers.map((s) => s.supplierId).filter(Boolean);
    const suppliers = supplierIds.length
      ? await prisma.supplier.findMany({
          where: {
            id: { in: supplierIds as string[] },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    return topSuppliers.map((supplier) => {
      const supplierInfo = suppliers.find((s) => s.id === supplier.supplierId);
      return {
        id: supplier.supplierId,
        name: supplierInfo?.name || "Unknown Supplier",
        email: supplierInfo?.email,
        totalValue: Number(supplier._sum.totalAmount || 0),
        orderCount: supplier._count.id,
        averageOrderValue: Number(supplier._sum.totalAmount || 0) / supplier._count.id,
      };
    });
  }
}
