import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient, Prisma, FinancialEventType } from "@prisma/tenant-client";
import {
  CostDashboardQueryDto,
  CostReportQueryDto,
  ProfitabilityQueryDto,
  CostPeriod,
} from "./dto/costing.dto";
// Date utilities
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
const startOfQuarter = (date: Date) => {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3, 1);
};
const endOfQuarter = (date: Date) => {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
};
const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);
const endOfYear = (date: Date) => new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
const subMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
};
const format = (date: Date, formatStr: string) => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (formatStr === "MMM") {
    return months[date.getMonth()];
  }
  if (formatStr === "MMM dd") {
    const day = date.getDate().toString().padStart(2, "0");
    return `${months[date.getMonth()]} ${day}`;
  }
  if (formatStr === "yyyy-MM-dd") {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (formatStr === "yyyy-MM") {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${year}-${month}`;
  }
  return date.toISOString();
};
const eachMonthOfInterval = ({ start, end }: { start: Date; end: Date }) => {
  const months: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
};
const eachDayOfInterval = ({ start, end }: { start: Date; end: Date }) => {
  const days: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};
const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};
const endOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

@Injectable()
export class CostingService {
  private readonly logger = new Logger(CostingService.name);

  /**
   * Get cost dashboard data
   */
  async getCostDashboard(
    tenantClient: PrismaClient,
    tenantId: string,
    query: CostDashboardQueryDto,
  ) {
    const { startDate, endDate } = this.getDateRange(query.period, query.startDate, query.endDate);

    const where: Prisma.FinancialEventWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Filter by site if provided (through production orders)
    if (query.siteId) {
      // Get production order IDs for this site
      const productionOrders = await tenantClient.productionOrder.findMany({
        where: {
          siteId: query.siteId,
        },
        select: { id: true },
      });
      const productionOrderIds = productionOrders.map((po) => po.id);

      where.OR = [
        {
          referenceType: "PRODUCTION_ORDER",
          referenceId: { in: productionOrderIds },
        },
        { referenceType: "WASTE", productId: { not: null } }, // Waste costs
        { referenceType: "EXPENSE" }, // Expenses
      ];
    }

    // Filter by product if provided
    if (query.productId) {
      where.productId = query.productId;
    }

    // Get all cost events
    const [productionCosts, wasteCosts, purchaseCosts, adjustmentCosts, expenses] =
      await Promise.all([
        // Production costs
        tenantClient.financialEvent.aggregate({
          where: {
            ...where,
            type: FinancialEventType.COST_PRODUCTION,
          },
          _sum: { amount: true },
          _count: true,
        }),
        // Waste costs
        tenantClient.financialEvent.aggregate({
          where: {
            ...where,
            type: FinancialEventType.COST_WASTE,
          },
          _sum: { amount: true },
          _count: true,
        }),
        // Purchase costs
        tenantClient.financialEvent.aggregate({
          where: {
            ...where,
            type: FinancialEventType.COST_PURCHASE,
          },
          _sum: { amount: true },
          _count: true,
        }),
        // Adjustment costs
        tenantClient.financialEvent.aggregate({
          where: {
            ...where,
            type: FinancialEventType.COST_ADJUSTMENT,
          },
          _sum: { amount: true },
          _count: true,
        }),
        // Expenses (from expenses table, not financial events)
        tenantClient.expense.aggregate({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
            status: "APPROVED",
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

    const totalProductionCost = Number(productionCosts._sum.amount || 0);
    const totalWasteCost = Number(wasteCosts._sum.amount || 0);
    const totalPurchaseCost = Number(purchaseCosts._sum.amount || 0);
    const totalAdjustmentCost = Number(adjustmentCosts._sum.amount || 0);
    const totalExpenseCost = Number(expenses._sum.amount || 0);

    // Material cost = Purchase costs (raw materials)
    const totalMaterialCost = totalPurchaseCost;

    // Overhead = Expenses + Waste + Adjustments
    const overheadCost = totalExpenseCost + totalWasteCost + totalAdjustmentCost;

    // Total production cost = Production + Material + Overhead
    const totalCost = totalProductionCost + totalMaterialCost + overheadCost;

    // Calculate cost per unit from completed production orders
    const completedOrders = await tenantClient.productionOrder.findMany({
      where: {
        status: "COMPLETED",
        producedQuantity: { gt: 0 },
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(query.siteId ? { siteId: query.siteId } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
      },
      select: {
        producedQuantity: true,
      },
    });

    const totalUnitsProduced = completedOrders.reduce(
      (sum, order) => sum + Number(order.producedQuantity || 0),
      0,
    );
    const costPerUnit = totalUnitsProduced > 0 ? totalCost / totalUnitsProduced : 0;

    // Monthly trend (last 6 months)
    const monthlyTrend = await this.getMonthlyTrend(
      tenantClient,
      tenantId,
      query.siteId,
      query.productId,
    );

    // Category breakdown
    const categoryBreakdown = [
      {
        category: "Raw Materials",
        value: totalMaterialCost > 0 ? (totalMaterialCost / totalCost) * 100 : 0,
      },
      {
        category: "Production",
        value: totalProductionCost > 0 ? (totalProductionCost / totalCost) * 100 : 0,
      },
      {
        category: "Overhead",
        value: overheadCost > 0 ? (overheadCost / totalCost) * 100 : 0,
      },
    ].filter((item) => item.value > 0);

    return {
      totalProductionCost: totalCost,
      totalMaterialCost,
      overheadCost,
      costPerUnit,
      monthlyTrend,
      categoryBreakdown,
    };
  }

  /**
   * Get monthly cost trend
   */
  private async getMonthlyTrend(
    tenantClient: PrismaClient,
    tenantId: string,
    siteId?: string,
    productId?: string,
  ) {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

    const trend = await Promise.all(
      months.map(async (monthStart) => {
        const monthEnd = endOfMonth(monthStart);

        const where: Prisma.FinancialEventWhereInput = {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
          type: {
            in: [
              FinancialEventType.COST_PRODUCTION,
              FinancialEventType.COST_PURCHASE,
              FinancialEventType.COST_WASTE,
              FinancialEventType.COST_ADJUSTMENT,
            ],
          },
        };

        if (siteId) {
          const productionOrders = await tenantClient.productionOrder.findMany({
            where: { siteId },
            select: { id: true },
          });
          const productionOrderIds = productionOrders.map((po) => po.id);
          where.OR = [
            {
              referenceType: "PRODUCTION_ORDER",
              referenceId: { in: productionOrderIds },
            },
            { referenceType: "WASTE" },
            { referenceType: "EXPENSE" },
          ];
        }

        if (productId) {
          where.productId = productId;
        }

        const costEvents = await tenantClient.financialEvent.aggregate({
          where,
          _sum: { amount: true },
        });

        const expenses = await tenantClient.expense.aggregate({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd },
            status: "APPROVED",
          },
          _sum: { amount: true },
        });

        const cost = Number(costEvents._sum.amount || 0) + Number(expenses._sum.amount || 0);

        return {
          month: format(monthStart, "MMM"),
          cost,
        };
      }),
    );

    return trend;
  }

  /**
   * Get cost reports
   */
  async getCostReports(tenantClient: PrismaClient, tenantId: string, query: CostReportQueryDto) {
    const { startDate, endDate } = this.getDateRange(
      query.startDate && query.endDate ? CostPeriod.CUSTOM : CostPeriod.THIS_MONTH,
      query.startDate,
      query.endDate,
    );

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Get completed production orders with costs
    const where: Prisma.ProductionOrderWhereInput = {
      status: "COMPLETED",
      producedQuantity: { gt: 0 },
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(query.siteId ? { siteId: query.siteId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
    };

    const [orders, total] = await Promise.all([
      tenantClient.productionOrder.findMany({
        where,
        include: {
          product: {
            select: {
              name: true,
              code: true,
            },
          },
          site: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { completedAt: "desc" },
        skip,
        take: limit,
      }),
      tenantClient.productionOrder.count({ where }),
    ]);

    // Calculate costs for each order
    const reports = await Promise.all(
      orders.map(async (order) => {
        // Get production costs for this order
        const productionCosts = await tenantClient.financialEvent.aggregate({
          where: {
            referenceType: "PRODUCTION_ORDER",
            referenceId: order.id,
            type: FinancialEventType.COST_PRODUCTION,
          },
          _sum: { amount: true },
        });

        // Get material costs (from purchase costs linked to materials)
        const materialCosts = await tenantClient.financialEvent.aggregate({
          where: {
            referenceType: "PURCHASE",
            productId: order.productId,
            type: FinancialEventType.COST_PURCHASE,
            createdAt: {
              gte: order.createdAt,
              lte: order.completedAt || new Date(),
            },
          },
          _sum: { amount: true },
        });

        const totalCost =
          Number(productionCosts._sum.amount || 0) + Number(materialCosts._sum.amount || 0);
        const unitCost =
          order.producedQuantity > 0 ? totalCost / Number(order.producedQuantity) : 0;

        return {
          id: order.id,
          reportDate: order.completedAt || order.createdAt,
          batchNumber: order.orderNumber,
          productName: order.product.name,
          productSku: order.product.code,
          siteName: order.site?.name,
          producedQty: Number(order.producedQuantity),
          totalCost,
          unitCost,
        };
      }),
    );

    return {
      data: reports,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get profitability data
   */
  async getProfitability(
    tenantClient: PrismaClient,
    tenantId: string,
    query: ProfitabilityQueryDto,
  ) {
    const { startDate, endDate } = this.getDateRange(query.period, query.startDate, query.endDate);

    const where: Prisma.FinancialEventWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (query.siteId) {
      const productionOrders = await tenantClient.productionOrder.findMany({
        where: { siteId: query.siteId },
        select: { id: true },
      });
      const productionOrderIds = productionOrders.map((po) => po.id);
      where.OR = [
        {
          referenceType: "PRODUCTION_ORDER",
          referenceId: { in: productionOrderIds },
        },
        { referenceType: "SALE" },
        { referenceType: "WASTE" },
        { referenceType: "EXPENSE" },
      ];
    }

    // Get revenue
    const revenue = await tenantClient.financialEvent.aggregate({
      where: {
        ...where,
        type: FinancialEventType.REVENUE,
      },
      _sum: { amount: true },
    });

    // Get all costs
    const costs = await tenantClient.financialEvent.aggregate({
      where: {
        ...where,
        type: {
          in: [
            FinancialEventType.COST_PRODUCTION,
            FinancialEventType.COST_PURCHASE,
            FinancialEventType.COST_WASTE,
            FinancialEventType.COST_ADJUSTMENT,
          ],
        },
      },
      _sum: { amount: true },
    });

    // Get expenses
    const expenses = await tenantClient.expense.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: "APPROVED",
      },
      _sum: { amount: true },
    });

    const totalRevenue = Number(revenue._sum.amount || 0);
    const totalCosts = Number(costs._sum.amount || 0) + Number(expenses._sum.amount || 0);
    const grossProfit = totalRevenue - totalCosts;
    const netProfit = grossProfit; // Assuming no other deductions for now
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Monthly comparison
    const monthlyComparison = await this.getMonthlyComparison(
      tenantClient,
      tenantId,
      startDate,
      endDate,
      query.siteId,
    );

    // Product margins (top 5)
    const productMargins = await this.getProductMargins(
      tenantClient,
      tenantId,
      startDate,
      endDate,
      query.siteId,
    );

    return {
      totalRevenue,
      grossProfit,
      netProfit,
      margin,
      monthlyComparison,
      productMargins,
    };
  }

  /**
   * Get monthly sales vs costs comparison
   */
  private async getMonthlyComparison(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate: Date,
    endDate: Date,
    siteId?: string,
  ) {
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    return Promise.all(
      months.map(async (monthStart) => {
        const monthEnd = endOfMonth(monthStart);

        const where: Prisma.FinancialEventWhereInput = {
          createdAt: { gte: monthStart, lte: monthEnd },
        };

        if (siteId) {
          const productionOrders = await tenantClient.productionOrder.findMany({
            where: { siteId },
            select: { id: true },
          });
          const productionOrderIds = productionOrders.map((po) => po.id);
          where.OR = [
            {
              referenceType: "PRODUCTION_ORDER",
              referenceId: { in: productionOrderIds },
            },
            { referenceType: "SALE" },
            { referenceType: "WASTE" },
            { referenceType: "EXPENSE" },
          ];
        }

        const [sales, costs] = await Promise.all([
          tenantClient.financialEvent.aggregate({
            where: { ...where, type: FinancialEventType.REVENUE },
            _sum: { amount: true },
          }),
          tenantClient.financialEvent.aggregate({
            where: {
              ...where,
              type: {
                in: [
                  FinancialEventType.COST_PRODUCTION,
                  FinancialEventType.COST_PURCHASE,
                  FinancialEventType.COST_WASTE,
                  FinancialEventType.COST_ADJUSTMENT,
                ],
              },
            },
            _sum: { amount: true },
          }),
        ]);

        const expenses = await tenantClient.expense.aggregate({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd },
            status: "APPROVED",
          },
          _sum: { amount: true },
        });

        return {
          month: format(monthStart, "MMM"),
          sales: Number(sales._sum.amount || 0),
          cost: Number(costs._sum.amount || 0) + Number(expenses._sum.amount || 0),
        };
      }),
    );
  }

  /**
   * Get product margins
   */
  private async getProductMargins(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate: Date,
    endDate: Date,
    siteId?: string,
  ) {
    // Get products with sales and costs
    const salesByProduct = await tenantClient.financialEvent.groupBy({
      by: ["productId"],
      where: {
        type: FinancialEventType.REVENUE,
        createdAt: { gte: startDate, lte: endDate },
        productId: { not: null },
      },
      _sum: { amount: true },
    });

    const productMargins = await Promise.all(
      salesByProduct.slice(0, 5).map(async (sale) => {
        if (!sale.productId) return null;

        const [product, costs] = await Promise.all([
          tenantClient.product.findUnique({
            where: { id: sale.productId },
            select: { name: true, sellingPrice: true },
          }),
          tenantClient.financialEvent.aggregate({
            where: {
              productId: sale.productId,
              type: {
                in: [
                  FinancialEventType.COST_PRODUCTION,
                  FinancialEventType.COST_PURCHASE,
                  FinancialEventType.COST_WASTE,
                ],
              },
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
          }),
        ]);

        if (!product) return null;

        const revenue = Number(sale._sum.amount || 0);
        const cost = Number(costs._sum.amount || 0) || Number(product.sellingPrice || 0);
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        return {
          name: product.name,
          cost,
          price: revenue, // Average price from sales
          profit,
          margin,
        };
      }),
    );

    return productMargins.filter(Boolean).sort((a, b) => (b?.margin || 0) - (a?.margin || 0));
  }

  /**
   * Get daily profit data
   */
  async getDailyProfit(tenantClient: PrismaClient, tenantId: string, query: ProfitabilityQueryDto) {
    const { startDate, endDate } = this.getDateRange(
      query.period || CostPeriod.THIS_MONTH,
      query.startDate,
      query.endDate,
    );
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const dailyData = await Promise.all(
      days.map(async (day) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);

        const where: Prisma.FinancialEventWhereInput = {
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        };

        if (query.siteId) {
          const productionOrders = await tenantClient.productionOrder.findMany({
            where: { siteId: query.siteId },
            select: { id: true },
          });
          const productionOrderIds = productionOrders.map((po) => po.id);
          where.OR = [
            {
              referenceType: "PRODUCTION_ORDER",
              referenceId: { in: productionOrderIds },
            },
            { referenceType: "SALE" },
            { referenceType: "WASTE" },
            { referenceType: "EXPENSE" },
          ];
        }

        const [revenue, costs] = await Promise.all([
          tenantClient.financialEvent.aggregate({
            where: { ...where, type: FinancialEventType.REVENUE },
            _sum: { amount: true },
          }),
          tenantClient.financialEvent.aggregate({
            where: {
              ...where,
              type: {
                in: [
                  FinancialEventType.COST_PRODUCTION,
                  FinancialEventType.COST_PURCHASE,
                  FinancialEventType.COST_WASTE,
                  FinancialEventType.COST_ADJUSTMENT,
                ],
              },
            },
            _sum: { amount: true },
          }),
        ]);

        const expenses = await tenantClient.expense.aggregate({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
            status: "APPROVED",
          },
          _sum: { amount: true },
        });

        const totalRevenue = Number(revenue._sum.amount || 0);
        const totalCosts = Number(costs._sum.amount || 0) + Number(expenses._sum.amount || 0);
        const profit = totalRevenue - totalCosts;
        const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        return {
          date: format(day, "yyyy-MM-dd"),
          day: format(day, "MMM dd"),
          revenue: totalRevenue,
          cost: totalCosts,
          profit,
          margin,
        };
      }),
    );

    return dailyData;
  }

  /**
   * Get monthly profit data
   */
  async getMonthlyProfit(
    tenantClient: PrismaClient,
    tenantId: string,
    query: ProfitabilityQueryDto,
  ) {
    const { startDate, endDate } = this.getDateRange(
      query.period || CostPeriod.THIS_YEAR,
      query.startDate,
      query.endDate,
    );
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const monthlyData = await Promise.all(
      months.map(async (monthStart) => {
        const monthEnd = endOfMonth(monthStart);

        const where: Prisma.FinancialEventWhereInput = {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        };

        if (query.siteId) {
          const productionOrders = await tenantClient.productionOrder.findMany({
            where: { siteId: query.siteId },
            select: { id: true },
          });
          const productionOrderIds = productionOrders.map((po) => po.id);
          where.OR = [
            {
              referenceType: "PRODUCTION_ORDER",
              referenceId: { in: productionOrderIds },
            },
            { referenceType: "SALE" },
            { referenceType: "WASTE" },
            { referenceType: "EXPENSE" },
          ];
        }

        const [revenue, costs] = await Promise.all([
          tenantClient.financialEvent.aggregate({
            where: { ...where, type: FinancialEventType.REVENUE },
            _sum: { amount: true },
          }),
          tenantClient.financialEvent.aggregate({
            where: {
              ...where,
              type: {
                in: [
                  FinancialEventType.COST_PRODUCTION,
                  FinancialEventType.COST_PURCHASE,
                  FinancialEventType.COST_WASTE,
                  FinancialEventType.COST_ADJUSTMENT,
                ],
              },
            },
            _sum: { amount: true },
          }),
        ]);

        const expenses = await tenantClient.expense.aggregate({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd },
            status: "APPROVED",
          },
          _sum: { amount: true },
        });

        const totalRevenue = Number(revenue._sum.amount || 0);
        const totalCosts = Number(costs._sum.amount || 0) + Number(expenses._sum.amount || 0);
        const profit = totalRevenue - totalCosts;
        const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        return {
          month: format(monthStart, "MMM"),
          monthFull: format(monthStart, "yyyy-MM"),
          revenue: totalRevenue,
          cost: totalCosts,
          profit,
          margin,
        };
      }),
    );

    return monthlyData;
  }

  /**
   * Get product profit data
   */
  async getProductProfit(
    tenantClient: PrismaClient,
    tenantId: string,
    query: ProfitabilityQueryDto,
  ) {
    const { startDate, endDate } = this.getDateRange(
      query.period || CostPeriod.THIS_MONTH,
      query.startDate,
      query.endDate,
    );

    // Get products with sales
    const salesByProduct = await tenantClient.financialEvent.groupBy({
      by: ["productId"],
      where: {
        type: FinancialEventType.REVENUE,
        createdAt: { gte: startDate, lte: endDate },
        productId: { not: null },
      },
      _sum: { amount: true },
      _count: true,
    });

    const productProfits = await Promise.all(
      salesByProduct.map(async (sale) => {
        if (!sale.productId) return null;

        const [product, costs] = await Promise.all([
          tenantClient.product.findUnique({
            where: { id: sale.productId },
            select: { id: true, name: true, code: true, sellingPrice: true },
          }),
          tenantClient.financialEvent.aggregate({
            where: {
              productId: sale.productId,
              type: {
                in: [
                  FinancialEventType.COST_PRODUCTION,
                  FinancialEventType.COST_PURCHASE,
                  FinancialEventType.COST_WASTE,
                ],
              },
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
          }),
        ]);

        if (!product) return null;

        const revenue = Number(sale._sum.amount || 0);
        const cost = Number(costs._sum.amount || 0) || Number(product.sellingPrice || 0);
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        const quantity = sale._count || 0;

        return {
          productId: product.id,
          productName: product.name,
          productSku: product.code,
          revenue,
          cost,
          profit,
          margin,
          quantity,
        };
      }),
    );

    return productProfits.filter(Boolean).sort((a, b) => (b?.profit || 0) - (a?.profit || 0));
  }

  /**
   * Get plant profit data
   */
  async getPlantProfit(tenantClient: PrismaClient, tenantId: string, query: ProfitabilityQueryDto) {
    const { startDate, endDate } = this.getDateRange(
      query.period || CostPeriod.THIS_MONTH,
      query.startDate,
      query.endDate,
    );

    // Get all plants (tenantId is handled by multi-tenant client)
    const sites = await tenantClient.site.findMany({
      select: { id: true, name: true, code: true, locationId: true },
    });

    const siteProfits = await Promise.all(
      sites.map(async (site) => {
        // Get production orders for this site
        const productionOrders = await tenantClient.productionOrder.findMany({
          where: {
            siteId: site.id,
            completedAt: { gte: startDate, lte: endDate },
          },
          select: { id: true, productId: true },
        });
        const productionOrderIds = productionOrders.map((po) => po.id);

        if (productionOrderIds.length === 0) {
          return {
            siteId: site.id,
            siteName: site.name,
            siteCode: site.code,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
            orderCount: 0,
          };
        }

        // Get revenue from sales of products produced at this site
        const productIds = productionOrders.map((po) => po.productId).filter(Boolean) as string[];
        const revenue = await tenantClient.financialEvent.aggregate({
          where: {
            type: FinancialEventType.REVENUE,
            productId: { in: productIds },
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        });

        // Get costs (production, waste, expenses)
        const [productionCosts, wasteCosts] = await Promise.all([
          tenantClient.financialEvent.aggregate({
            where: {
              type: FinancialEventType.COST_PRODUCTION,
              referenceType: "PRODUCTION_ORDER",
              referenceId: { in: productionOrderIds },
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
          }),
          tenantClient.financialEvent.aggregate({
            where: {
              type: FinancialEventType.COST_WASTE,
              referenceType: "WASTE",
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
          }),
        ]);

        // Get expenses for this site's location
        const expenses = await tenantClient.expense.aggregate({
          where: {
            locationId: site.locationId ?? undefined,
            createdAt: { gte: startDate, lte: endDate },
            status: "APPROVED",
          },
          _sum: { amount: true },
        });

        const totalRevenue = Number(revenue._sum.amount || 0);
        const totalCosts =
          Number(productionCosts._sum.amount || 0) +
          Number(wasteCosts._sum.amount || 0) +
          Number(expenses._sum.amount || 0);
        const profit = totalRevenue - totalCosts;
        const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        return {
          siteId: site.id,
          siteName: site.name,
          siteCode: site.code,
          revenue: totalRevenue,
          cost: totalCosts,
          profit,
          margin,
          orderCount: productionOrderIds.length,
        };
      }),
    );

    return siteProfits.sort((a, b) => (b?.profit || 0) - (a?.profit || 0));
  }

  /**
   * Get date range based on period
   */
  private getDateRange(
    period?: CostPeriod,
    startDate?: string,
    endDate?: string,
  ): { startDate: Date; endDate: Date } {
    const now = new Date();

    if (period === CostPeriod.CUSTOM && startDate && endDate) {
      return {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    }

    switch (period) {
      case CostPeriod.LAST_MONTH:
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
        return { startDate: lastMonthStart, endDate: lastMonthEnd };

      case CostPeriod.THIS_QUARTER:
        return { startDate: startOfQuarter(now), endDate: endOfQuarter(now) };

      case CostPeriod.THIS_YEAR:
        return { startDate: startOfYear(now), endDate: endOfYear(now) };

      case CostPeriod.THIS_MONTH:
      default:
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    }
  }

  async getFactoryProfit(
    tenantClient: PrismaClient,
    siteId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const site = await tenantClient.site.findUnique({
      where: { id: siteId },
      select: { id: true, name: true, code: true, locationId: true },
    });

    if (!site) {
      return {
        siteId,
        totalRevenue: 0,
        totalCost: 0,
        netProfit: 0,
        profitMargin: 0,
        totalQuantity: 0,
      };
    }

    // Get production orders
    const productionOrders = await tenantClient.productionOrder.findMany({
      where: {
        siteId,
        completedAt: { gte: start, lte: end },
      },
      select: { id: true, productId: true, producedQuantity: true },
    });
    const poIds = productionOrders.map((po) => po.id);
    const productIds = [
      ...new Set(productionOrders.map((po) => po.productId).filter(Boolean) as string[]),
    ];

    // Get revenue
    const revenue = await tenantClient.financialEvent.aggregate({
      where: {
        type: FinancialEventType.REVENUE,
        productId: { in: productIds },
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });

    // Get production costs
    const productionCosts = await tenantClient.financialEvent.aggregate({
      where: {
        type: FinancialEventType.COST_PRODUCTION,
        referenceId: { in: poIds },
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });

    // Get expenses
    const expenses = await tenantClient.expense.aggregate({
      where: {
        locationId: site.locationId ?? undefined,
        createdAt: { gte: start, lte: end },
        status: "PAID",
      },
      _sum: { amount: true },
    });

    const totalRevenue = Number(revenue._sum.amount || 0);
    const totalCost = Number(productionCosts._sum.amount || 0) + Number(expenses._sum.amount || 0);
    const netProfit = totalRevenue - totalCost;
    const totalQuantity = productionOrders.reduce(
      (sum, po) => sum + Number(po.producedQuantity || 0),
      0,
    );

    return {
      siteId,
      totalRevenue,
      totalCost,
      netProfit,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      totalQuantity,
    };
  }
}
