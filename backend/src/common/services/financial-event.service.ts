import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, PrismaClient, FinancialEventType } from "@prisma/tenant-client";

/**
 * FinancialEventService - Single Source of Truth for Financial Events
 *
 * This service ensures:
 * - All money movements are tracked through financial events
 * - Profit calculations are accurate
 * - All revenue and cost events are properly logged
 * - No direct balance updates without financial events
 */
@Injectable()
export class FinancialEventService {
  private readonly logger = new Logger(FinancialEventService.name);

  /**
   * Record a financial event
   *
   * @param tenantClient - Prisma client for tenant database
   * @param params - Event parameters
   * @param tx - Optional transaction client (for atomic operations)
   * @returns FinancialEvent record
   */
  async recordEvent(
    tenantClient: PrismaClient,
    params: {
      eventType: FinancialEventType;
      amount: number;
      productId?: string;
      referenceType: string; // e.g., 'PURCHASE', 'SALE', 'PRODUCTION', etc.
      referenceId: string;
      debitAccount?: string; // Optional: for accounting purposes
      creditAccount?: string; // Optional: for accounting purposes
      date?: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || tenantClient;

    // Validate amount
    if (params.amount <= 0) {
      throw new BadRequestException("Financial event amount must be greater than zero");
    }

    // Validate product if provided
    if (params.productId) {
      const product = await prisma.product.findUnique({
        where: { id: params.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product not found: ${params.productId}`);
      }
    }

    // Create financial event
    const financialEvent = await prisma.financialEvent.create({
      data: {
        type: params.eventType,
        amount: params.amount,
        productId: params.productId || null,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        createdAt: params.date || new Date(),
      },
    });

    this.logger.log(
      `Financial event recorded: ${params.eventType} - Amount: ${params.amount}, Reference: ${params.referenceType}:${params.referenceId}`,
    );

    return financialEvent;
  }

  /**
   * Record multiple financial events in a single transaction
   */
  async recordEvents(
    tenantClient: PrismaClient,
    events: Array<{
      eventType: FinancialEventType;
      amount: number;
      productId?: string;
      referenceType: string;
      referenceId: string;
      debitAccount?: string;
      creditAccount?: string;
      date?: Date;
    }>,
  ) {
    return tenantClient.$transaction(async (tx) => {
      const results = [];

      for (const event of events) {
        const result = await this.recordEvent(tenantClient, event, tx);
        results.push(result);
      }

      return results;
    });
  }

  /**
   * Record REVENUE event (for sales)
   */
  async recordRevenue(
    tenantClient: PrismaClient,
    params: {
      amount: number;
      productId?: string;
      referenceType: string;
      referenceId: string;
      date?: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.recordEvent(
      tenantClient,
      {
        eventType: FinancialEventType.REVENUE,
        ...params,
      },
      tx,
    );
  }

  /**
   * Record COST_PURCHASE event (for purchases)
   */
  async recordPurchaseCost(
    tenantClient: PrismaClient,
    params: {
      amount: number;
      productId?: string;
      referenceType: string;
      referenceId: string;
      date?: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.recordEvent(
      tenantClient,
      {
        eventType: FinancialEventType.COST_PURCHASE,
        ...params,
      },
      tx,
    );
  }

  /**
   * Record COST_PRODUCTION event (for production)
   */
  async recordProductionCost(
    tenantClient: PrismaClient,
    params: {
      amount: number;
      productId?: string;
      referenceType: string;
      referenceId: string;
      date?: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.recordEvent(
      tenantClient,
      {
        eventType: FinancialEventType.COST_PRODUCTION,
        ...params,
      },
      tx,
    );
  }

  /**
   * Record COST_WASTE event (for waste)
   */
  async recordWasteCost(
    tenantClient: PrismaClient,
    params: {
      amount: number;
      productId?: string;
      referenceType: string;
      referenceId: string;
      date?: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.recordEvent(
      tenantClient,
      {
        eventType: FinancialEventType.COST_WASTE,
        ...params,
      },
      tx,
    );
  }

  /**
   * Record COST_ADJUSTMENT event (for adjustments)
   */
  async recordAdjustmentCost(
    tenantClient: PrismaClient,
    params: {
      amount: number;
      productId?: string;
      referenceType: string;
      referenceId: string;
      date?: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.recordEvent(
      tenantClient,
      {
        eventType: FinancialEventType.COST_ADJUSTMENT,
        ...params,
      },
      tx,
    );
  }

  /**
   * Calculate profit for a date range
   */
  async calculateProfit(tenantClient: PrismaClient, startDate?: Date, endDate?: Date) {
    const where: Prisma.FinancialEventWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [revenue, costs] = await Promise.all([
      tenantClient.financialEvent.aggregate({
        where: {
          ...where,
          type: FinancialEventType.REVENUE,
        },
        _sum: {
          amount: true,
        },
      }),
      tenantClient.financialEvent.aggregate({
        where: {
          ...where,
          type: {
            in: [
              FinancialEventType.COST_PURCHASE,
              FinancialEventType.COST_PRODUCTION,
              FinancialEventType.COST_WASTE,
              FinancialEventType.COST_ADJUSTMENT,
            ],
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalRevenue = Number(revenue._sum.amount || 0);
    const totalCosts = Number(costs._sum.amount || 0);
    const profit = totalRevenue - totalCosts;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCosts,
      profit,
      margin,
    };
  }

  /**
   * Get financial events with filters
   */
  async getEvents(
    tenantClient: PrismaClient,
    filters: {
      eventType?: FinancialEventType;
      referenceType?: string;
      referenceId?: string;
      productId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const { page = 1, limit = 10, ...whereFilters } = filters;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.FinancialEventWhereInput = {};

    if (whereFilters.eventType) {
      where.type = whereFilters.eventType;
    }

    if (whereFilters.referenceType) {
      where.referenceType = whereFilters.referenceType;
    }

    if (whereFilters.referenceId) {
      where.referenceId = whereFilters.referenceId;
    }

    if (whereFilters.productId) {
      where.productId = whereFilters.productId;
    }

    if (whereFilters.startDate || whereFilters.endDate) {
      where.createdAt = {};
      if (whereFilters.startDate) {
        where.createdAt.gte = whereFilters.startDate;
      }
      if (whereFilters.endDate) {
        where.createdAt.lte = whereFilters.endDate;
      }
    }

    const [events, total] = await Promise.all([
      tenantClient.financialEvent.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      tenantClient.financialEvent.count({ where }),
    ]);

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
