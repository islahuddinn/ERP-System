import { Injectable } from "@nestjs/common";
import { Prisma, Payment, PaymentStatus } from "@prisma/master-client";
import { MasterPrismaService } from "src/master-prisma/master-prisma.service";
import { PaymentFiltersDto } from "./dto/payment-filters.dto";
import { buildOrderBy } from "src/common/utils/pagination.helper";

@Injectable()
export class PaymentsRepository {
  constructor(private readonly masterPrisma: MasterPrismaService) {}

  async create(data: Prisma.PaymentCreateInput) {
    return this.masterPrisma.payment.create({
      data,

      include: {
        subscription: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(query: PaymentFiltersDto) {
    const {
      page = 1,
      limit = 20,
      subscriptionId,
      tenantId,
      paymentMethod,
      status,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: Prisma.PaymentWhereInput = {};

    if (subscriptionId) where.subscriptionId = subscriptionId;
    if (tenantId) where.subscription = { tenantId };
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.paymentDate = {};

      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const [data, total] = await this.masterPrisma.$transaction([
      this.masterPrisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: buildOrderBy(sortBy, sortOrder),

        include: {
          subscription: {
            include: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),

      this.masterPrisma.payment.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(where: Prisma.PaymentWhereUniqueInput): Promise<Payment | null> {
    return this.masterPrisma.payment.findUnique({
      where,
      include: {
        subscription: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async update(
    where: Prisma.PaymentWhereUniqueInput,
    data: Prisma.PaymentUpdateInput,
  ): Promise<Payment> {
    return this.masterPrisma.payment.update({
      where,
      data,
      include: {
        subscription: {
          include: {
            tenant: true,
          },
        },
      },
    });
  }

  async checkExistence(where: Prisma.PaymentWhereUniqueInput): Promise<Payment | null> {
    return this.masterPrisma.payment.findUnique({ where });
  }

  async findPendingPayment(subscriptionId: string) {
    return this.masterPrisma.payment.findFirst({
      where: { subscriptionId, status: PaymentStatus.PENDING },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByReferenceNumber(referenceNumber: string) {
    return this.masterPrisma.payment.findUnique({ where: { referenceNumber } });
  }

  async getStats(where: Prisma.PaymentWhereInput = {}) {
    const [totalPayments, totalAmount, byStatus, byMethod] = await Promise.all([
      this.masterPrisma.payment.count({ where }),

      this.masterPrisma.payment.aggregate({
        where,
        _sum: { amount: true },
      }),

      this.masterPrisma.payment.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
        _sum: { amount: true },
      }),

      this.masterPrisma.payment.groupBy({
        by: ["paymentMethod"],
        where,
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalPayments,
      totalAmount: totalAmount._sum.amount ? Number(totalAmount._sum.amount) : 0,
      byStatus: byStatus.map((item) => ({
        status: item.status,
        count: item._count.id,
        amount: item._sum.amount ? Number(item._sum.amount) : 0,
      })),

      byMethod: byMethod.map((item) => ({
        method: item.paymentMethod,
        count: item._count.id,
        amount: item._sum.amount ? Number(item._sum.amount) : 0,
      })),
    };
  }
}
