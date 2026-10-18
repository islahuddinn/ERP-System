import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/tenant-client";

@Injectable()
export class ExpenseReportsService {
  private readonly logger = new Logger(ExpenseReportsService.name);

  private buildWhereClause(
    startDate?: string,
    endDate?: string,
    categoryId?: string,
    locationId?: string,
    status?: string,
    paymentMethod?: string,
  ): Prisma.ExpenseWhereInput {
    const where: Prisma.ExpenseWhereInput = {
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (status) {
      where.status = status as any;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod as any;
    }

    return where;
  }

  async getSummary(tenantClient: PrismaClient, startDate?: string, endDate?: string) {
    const where = this.buildWhereClause(startDate, endDate);

    const [totalExpenses, totalCount, byCategory, byPaymentMethod, byStatus, byLocation] =
      await Promise.all([
        tenantClient.expense.aggregate({
          where,
          _sum: { amount: true },
        }),
        tenantClient.expense.count({ where }),
        tenantClient.expense.groupBy({
          by: ["categoryId"],
          where,
          _sum: { amount: true },
          _count: true,
        }),
        tenantClient.expense.groupBy({
          by: ["paymentMethod"],
          where,
          _sum: { amount: true },
          _count: true,
        }),
        tenantClient.expense.groupBy({
          by: ["status"],
          where,
          _sum: { amount: true },
          _count: true,
        }),
        tenantClient.expense.groupBy({
          by: ["locationId"],
          where,
          _sum: { amount: true },
          _count: true,
        }),
      ]);

    // Get category details for breakdown
    const categoryIds = byCategory.map((c) => c.categoryId);
    const categories =
      categoryIds.length > 0
        ? await tenantClient.expenseCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, color: true, icon: true },
          })
        : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    // Get location details for breakdown
    const locationIds = byLocation.map((l) => l.locationId).filter(Boolean);
    const locations =
      locationIds.length > 0
        ? await tenantClient.location.findMany({
            where: { id: { in: locationIds } },
            select: { id: true, name: true },
          })
        : [];

    const locationMap = new Map(locations.map((l) => [l.id, l]));

    return {
      summary: {
        totalAmount: Number(totalExpenses._sum.amount || 0),
        totalCount,
        averageAmount: totalCount > 0 ? Number(totalExpenses._sum.amount || 0) / totalCount : 0,
      },
      byCategory: byCategory.map((c) => ({
        categoryId: c.categoryId,
        category: categoryMap.get(c.categoryId) || null,
        totalAmount: Number(c._sum.amount || 0),
        count: c._count,
        percentage: totalExpenses._sum.amount
          ? (Number(c._sum.amount) / Number(totalExpenses._sum.amount)) * 100
          : 0,
      })),
      byPaymentMethod: byPaymentMethod.map((p) => ({
        paymentMethod: p.paymentMethod,
        totalAmount: Number(p._sum.amount || 0),
        count: p._count,
        percentage: totalExpenses._sum.amount
          ? (Number(p._sum.amount) / Number(totalExpenses._sum.amount)) * 100
          : 0,
      })),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        totalAmount: Number(s._sum.amount || 0),
        count: s._count,
        percentage: totalExpenses._sum.amount
          ? (Number(s._sum.amount) / Number(totalExpenses._sum.amount)) * 100
          : 0,
      })),
      byLocation: byLocation.map((l) => ({
        locationId: l.locationId,
        location: locationMap.get(l.locationId) || null,
        totalAmount: Number(l._sum.amount || 0),
        count: l._count,
        percentage: totalExpenses._sum.amount
          ? (Number(l._sum.amount) / Number(totalExpenses._sum.amount)) * 100
          : 0,
      })),
    };
  }

  async getCategoryBreakdown(tenantClient: PrismaClient, startDate?: string, endDate?: string) {
    const where = this.buildWhereClause(startDate, endDate);

    const categoryBreakdown = await tenantClient.expense.groupBy({
      by: ["categoryId"],
      where,
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
    });

    // Get category details
    const categoryIds = categoryBreakdown.map((c) => c.categoryId);
    const categories =
      categoryIds.length > 0
        ? await tenantClient.expenseCategory.findMany({
            where: { id: { in: categoryIds } },
            select: {
              id: true,
              name: true,
              description: true,
              color: true,
              icon: true,
            },
          })
        : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    // Calculate total for percentage
    const totalAmount = categoryBreakdown.reduce((sum, c) => sum + Number(c._sum.amount || 0), 0);

    return categoryBreakdown
      .map((c) => ({
        categoryId: c.categoryId,
        category: categoryMap.get(c.categoryId) || null,
        totalAmount: Number(c._sum.amount || 0),
        count: c._count,
        averageAmount: Number(c._avg.amount || 0),
        percentage: totalAmount > 0 ? (Number(c._sum.amount) / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  async getPaymentMethodBreakdown(
    tenantClient: PrismaClient,
    startDate?: string,
    endDate?: string,
  ) {
    const where = this.buildWhereClause(startDate, endDate);

    const paymentBreakdown = await tenantClient.expense.groupBy({
      by: ["paymentMethod"],
      where,
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
    });

    // Calculate total for percentage
    const totalAmount = paymentBreakdown.reduce((sum, p) => sum + Number(p._sum.amount || 0), 0);

    return paymentBreakdown
      .map((p) => ({
        paymentMethod: p.paymentMethod,
        totalAmount: Number(p._sum.amount || 0),
        count: p._count,
        averageAmount: Number(p._avg.amount || 0),
        percentage: totalAmount > 0 ? (Number(p._sum.amount) / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  async getLocationBreakdown(tenantClient: PrismaClient, startDate?: string, endDate?: string) {
    const where = this.buildWhereClause(startDate, endDate);

    const locationBreakdown = await tenantClient.expense.groupBy({
      by: ["locationId"],
      where,
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
    });

    // Get location details
    const locationIds = locationBreakdown.map((l) => l.locationId).filter(Boolean);
    const locations =
      locationIds.length > 0
        ? await tenantClient.location.findMany({
            where: { id: { in: locationIds } },
            select: { id: true, name: true },
          })
        : [];

    const locationMap = new Map(locations.map((l) => [l.id, l]));

    // Calculate total for percentage
    const totalAmount = locationBreakdown.reduce((sum, l) => sum + Number(l._sum.amount || 0), 0);

    return locationBreakdown
      .map((l) => ({
        locationId: l.locationId,
        location: locationMap.get(l.locationId) || null,
        totalAmount: Number(l._sum.amount || 0),
        count: l._count,
        averageAmount: Number(l._avg.amount || 0),
        percentage: totalAmount > 0 ? (Number(l._sum.amount) / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  async getStatusBreakdown(tenantClient: PrismaClient, startDate?: string, endDate?: string) {
    const where = this.buildWhereClause(startDate, endDate);

    const statusBreakdown = await tenantClient.expense.groupBy({
      by: ["status"],
      where,
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
    });

    // Calculate total for percentage
    const totalAmount = statusBreakdown.reduce((sum, s) => sum + Number(s._sum.amount || 0), 0);

    return statusBreakdown.map((s) => ({
      status: s.status,
      totalAmount: Number(s._sum.amount || 0),
      count: s._count,
      averageAmount: Number(s._avg.amount || 0),
      percentage: totalAmount > 0 ? (Number(s._sum.amount) / totalAmount) * 100 : 0,
    }));
  }

  async getTrends(
    tenantClient: PrismaClient,
    startDate?: string,
    endDate?: string,
    groupBy: "day" | "week" | "month" = "month",
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getFullYear(), end.getMonth() - 11, 1); // Last 12 months default

    // Validate groupBy to prevent SQL injection
    const validPeriods = ["day", "week", "month"];
    const period = validPeriods.includes(groupBy) ? groupBy : "month";

    // Build SQL query conditionally based on period (safe approach)
    let trendsRaw: Array<{
      period: Date;
      total_amount: Prisma.Decimal | number | null;
      count: bigint;
    }>;

    if (period === "day") {
      trendsRaw = await tenantClient.$queryRaw<
        Array<{
          period: Date;
          total_amount: Prisma.Decimal | number | null;
          count: bigint;
        }>
      >(Prisma.sql`
        SELECT
          DATE_TRUNC('day', "expense_date") AS period,
          COALESCE(SUM("amount"), 0)::DOUBLE PRECISION AS total_amount,
          COUNT(*)::BIGINT AS count
        FROM expenses
        WHERE "deleted_at" IS NULL
          AND "expense_date" >= ${start}
          AND "expense_date" <= ${end}
        GROUP BY DATE_TRUNC('day', "expense_date")
        ORDER BY period ASC
      `);
    } else if (period === "week") {
      trendsRaw = await tenantClient.$queryRaw<
        Array<{
          period: Date;
          total_amount: Prisma.Decimal | number | null;
          count: bigint;
        }>
      >(Prisma.sql`
        SELECT
          DATE_TRUNC('week', "expense_date") AS period,
          COALESCE(SUM("amount"), 0)::DOUBLE PRECISION AS total_amount,
          COUNT(*)::BIGINT AS count
        FROM expenses
        WHERE "deleted_at" IS NULL
          AND "expense_date" >= ${start}
          AND "expense_date" <= ${end}
        GROUP BY DATE_TRUNC('week', "expense_date")
        ORDER BY period ASC
      `);
    } else {
      // Default to month
      trendsRaw = await tenantClient.$queryRaw<
        Array<{
          period: Date;
          total_amount: Prisma.Decimal | number | null;
          count: bigint;
        }>
      >(Prisma.sql`
        SELECT
          DATE_TRUNC('month', "expense_date") AS period,
          COALESCE(SUM("amount"), 0)::DOUBLE PRECISION AS total_amount,
          COUNT(*)::BIGINT AS count
        FROM expenses
        WHERE "deleted_at" IS NULL
          AND "expense_date" >= ${start}
          AND "expense_date" <= ${end}
        GROUP BY DATE_TRUNC('month', "expense_date")
        ORDER BY period ASC
      `);
    }

    return trendsRaw.map((row) => ({
      period: row.period,
      totalAmount: Number(row.total_amount || 0),
      count: Number(row.count),
    }));
  }

  async getMonthlyComparison(tenantClient: PrismaClient, startDate?: string, endDate?: string) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getFullYear() - 1, end.getMonth(), 1);

    const monthlyExpensesRaw = await tenantClient.$queryRaw<
      Array<{
        month: Date;
        total_amount: Prisma.Decimal | number | null;
        count: bigint;
      }>
    >(Prisma.sql`
      SELECT
        DATE_TRUNC('month', "expense_date") AS month,
        COALESCE(SUM("amount"), 0)::DOUBLE PRECISION AS total_amount,
        COUNT(*)::BIGINT AS count
      FROM expenses
      WHERE "deleted_at" IS NULL
        AND "expense_date" >= ${start}
        AND "expense_date" <= ${end}
      GROUP BY DATE_TRUNC('month', "expense_date")
      ORDER BY month ASC
    `);

    return monthlyExpensesRaw.map((row) => ({
      month: row.month,
      totalAmount: Number(row.total_amount || 0),
      count: Number(row.count),
    }));
  }

  async getByPlant(
    tenantClient: PrismaClient,
    startDate?: string,
    endDate?: string,
    plantId?: string,
  ) {
    const where = this.buildWhereClause(startDate, endDate);

    // Expenses are linked to locations, and plants have locations
    // We need to find expenses through plant locations
    if (plantId) {
      const plant = await tenantClient.plant.findUnique({
        where: { id: plantId },
        include: { location: true },
      });
      if (plant?.location) {
        where.locationId = plant.location.id;
      }
    }

    const locationBreakdown = await tenantClient.expense.groupBy({
      by: ["locationId"],
      where,
      _sum: { amount: true },
      _count: true,
    });

    // Map locations to plants
    const locationIds = locationBreakdown.map((l) => l.locationId).filter(Boolean);
    const plants = await tenantClient.plant.findMany({
      where: { locationId: { in: locationIds } },
      include: { location: true },
    });

    const plantMap = new Map(plants.map((p) => [p.locationId, p]));

    return locationBreakdown
      .filter((l) => plantMap.has(l.locationId))
      .map((l) => {
        const plant = plantMap.get(l.locationId)!;
        return {
          plantId: plant.id,
          plant: { id: plant.id, name: plant.name, code: plant.code },
          totalAmount: Number(l._sum.amount || 0),
          count: l._count,
        };
      });
  }

  async getProfitImpact(tenantClient: PrismaClient, startDate?: string, endDate?: string) {
    const where = this.buildWhereClause(startDate, endDate);

    // Get total expenses
    const totalExpenses = await tenantClient.expense.aggregate({
      where,
      _sum: { amount: true },
    });

    // Get total revenue for the same period
    const revenueWhere: any = {
      status: "COMPLETED",
    };

    if (startDate || endDate) {
      revenueWhere.saleDate = {};
      if (startDate) revenueWhere.saleDate.gte = new Date(startDate);
      if (endDate) revenueWhere.saleDate.lte = new Date(endDate);
    }

    const totalRevenue = await tenantClient.sale.aggregate({
      where: revenueWhere,
      _sum: { totalAmount: true },
    });

    const expenses = Number(totalExpenses._sum.amount || 0);
    const revenue = Number(totalRevenue._sum.totalAmount || 0);
    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Get expenses by category for impact analysis
    const categoryBreakdown = await this.getCategoryBreakdown(tenantClient, startDate, endDate);

    return {
      totalExpenses: expenses,
      totalRevenue: revenue,
      netProfit: profit,
      profitMargin,
      expenseToRevenueRatio: revenue > 0 ? (expenses / revenue) * 100 : 0,
      categoryImpact: categoryBreakdown.map((cat) => ({
        category: cat.category,
        expenseAmount: cat.totalAmount,
        impactOnProfit: revenue > 0 ? (cat.totalAmount / revenue) * 100 : 0,
        impactOnMargin: profitMargin - ((revenue - expenses + cat.totalAmount) / revenue) * 100,
      })),
    };
  }
}
