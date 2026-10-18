import { Injectable, Logger } from "@nestjs/common";
import { MasterPrismaService } from "../../master-prisma/master-prisma.service";
import { MultiTenantPrismaService } from "../../prisma/multi-tenant-prisma.service";
import { Prisma } from "@prisma/tenant-client";
import { PaymentStatus, TenantStatus } from "@prisma/master-client";
const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private masterPrisma: MasterPrismaService,
    private multiTenantPrisma: MultiTenantPrismaService,
  ) {}

  /**
   * Get dashboard overview statistics
   */
  async getOverview() {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalSubscriptions,
      activeSubscriptions,
      totalPayments,
      completedPayments,
      totalRevenue,
    ] = await Promise.all([
      this.masterPrisma.tenant.count(),
      this.masterPrisma.tenant.count({
        where: { status: TenantStatus.ACTIVE },
      }),
      this.masterPrisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
      this.masterPrisma.subscription.count(),
      this.masterPrisma.subscription.count({ where: { status: "ACTIVE" } }),
      this.masterPrisma.payment.count(),
      this.masterPrisma.payment.count({ where: { status: PaymentStatus.PAID } }),
      this.getTotalRevenue(),
    ]);

    // Get recent tenants (last 5)
    const recentTenants = await this.masterPrisma.tenant.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    // Get expiring subscriptions (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringSubscriptions = await this.masterPrisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: {
          lte: thirtyDaysFromNow,
          gte: new Date(),
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { endDate: "asc" },
      take: 10,
    });

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
        inactive: totalTenants - activeTenants - suspendedTenants,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
      },
      payments: {
        total: totalPayments,
        completed: completedPayments,
      },
      revenue: {
        total: totalRevenue,
        currency: "USD",
      },
      recentTenants,
      expiringSubscriptions,
    };
  }

  /**
   * Get revenue statistics
   */
  async getRevenue(startDate?: Date, endDate?: Date) {
    const where: any = {
      status: "COMPLETED",
    };

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = startDate;
      if (endDate) where.paymentDate.lte = endDate;
    }

    const payments = await this.masterPrisma.payment.findMany({
      where,
      select: {
        amount: true,
        paymentDate: true,
        currency: true,
      },
      orderBy: { paymentDate: "asc" },
    });

    // Calculate total revenue
    const totalRevenue = payments.reduce((sum, payment) => {
      return sum + Number(payment.amount);
    }, 0);

    // Group by month
    const monthlyRevenue = payments.reduce(
      (acc, payment) => {
        const month = new Date(payment.paymentDate).toISOString().slice(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = 0;
        }
        acc[month] += Number(payment.amount);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group by payment method
    const revenueByMethod = await this.masterPrisma.payment.groupBy({
      by: ["paymentMethod"],
      where,
      _sum: {
        amount: true,
      },
    });

    return {
      total: totalRevenue,
      currency: "USD",
      monthly: monthlyRevenue,
      byMethod: revenueByMethod.map((item) => ({
        method: item.paymentMethod,
        amount: Number(item._sum.amount || 0),
      })),
      payments: payments.length,
    };
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats() {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      tenantsBySubscriptionType,
      recentTenants,
      tenantGrowth,
    ] = await Promise.all([
      this.masterPrisma.tenant.count(),
      this.masterPrisma.tenant.count({
        where: { status: TenantStatus.ACTIVE },
      }),
      this.masterPrisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
      this.getTenantsBySubscriptionType(),
      this.getRecentTenants(10),
      this.getTenantGrowth(),
    ]);

    return {
      total: totalTenants,
      active: activeTenants,
      suspended: suspendedTenants,
      inactive: totalTenants - activeTenants - suspendedTenants,
      bySubscriptionType: tenantsBySubscriptionType,
      recent: recentTenants,
      growth: tenantGrowth,
    };
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics() {
    const [
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      subscriptionsByType,
      expiringSubscriptions,
    ] = await Promise.all([
      this.masterPrisma.subscription.count(),
      this.masterPrisma.subscription.count({ where: { status: "ACTIVE" } }),
      this.masterPrisma.subscription.count({ where: { status: "EXPIRED" } }),
      this.masterPrisma.subscription.count({ where: { status: "CANCELLED" } }),
      this.getSubscriptionsByType(),
      this.getExpiringSubscriptions(30),
    ]);

    return {
      total: totalSubscriptions,
      active: activeSubscriptions,
      expired: expiredSubscriptions,
      cancelled: cancelledSubscriptions,
      byType: subscriptionsByType,
      expiring: expiringSubscriptions,
    };
  }

  /**
   * Get usage metrics (placeholder for future implementation)
   */
  async getUsageMetrics() {
    // This can be expanded with actual usage tracking
    // For now, return basic metrics
    return {
      totalTenants: await this.masterPrisma.tenant.count(),
      totalSubscriptions: await this.masterPrisma.subscription.count(),
      totalPayments: await this.masterPrisma.payment.count(),
      tenantPrisma: this.multiTenantPrisma.getConnectionStats(),
      redisConfigured: Boolean(process.env.REDIS_URL),
      message:
        "Usage metrics include tenant Prisma connection cache stats; set REDIS_URL for distributed cache rollout.",
    };
  }

  // Helper methods

  private async getTotalRevenue(): Promise<number> {
    const result = await this.masterPrisma.payment.aggregate({
      where: { status: PaymentStatus.PAID },
      _sum: {
        amount: true,
      },
    });
    return Number(result._sum.amount || 0);
  }

  private async getTenantsBySubscriptionType() {
    const tenants = await this.masterPrisma.tenant.findMany({
      select: {
        id: true,
        subscriptions: {
          where: {
            status: "ACTIVE",
          },
          take: 1,
          orderBy: {
            startDate: "desc",
          },
        },
      },
    });

    return tenants.reduce(
      (acc, tenant) => {
        const subscription = tenant.subscriptions[0];

        if (!subscription) return acc;

        const type = subscription.type;

        acc[type] = (acc[type] || 0) + 1;

        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private async getRecentTenants(limit: number = 10) {
    return this.masterPrisma.tenant.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });
  }

  private async getTenantGrowth() {
    // Get tenant count by month for last 12 months
    const months: Record<string, number> = {};
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      months[monthKey] = 0;
    }

    const tenants = await this.masterPrisma.tenant.findMany({
      select: {
        createdAt: true,
      },
    });

    tenants.forEach((tenant) => {
      const monthKey = new Date(tenant.createdAt).toISOString().slice(0, 7);
      if (months[monthKey] !== undefined) {
        months[monthKey]++;
      }
    });

    // Calculate cumulative growth
    let cumulative = 0;
    const growth = Object.entries(months).map(([month, count]) => {
      cumulative += count;
      return {
        month,
        count,
        cumulative,
      };
    });

    return growth;
  }

  private async getSubscriptionsByType() {
    const subscriptions = await this.masterPrisma.subscription.findMany({
      select: {
        type: true,
      },
    });

    return subscriptions.reduce(
      (acc, sub) => {
        acc[sub.type] = (acc[sub.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private async getExpiringSubscriptions(days: number = 30) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.masterPrisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: {
          lte: endDate,
          gte: new Date(),
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { endDate: "asc" },
    });
  }
}
