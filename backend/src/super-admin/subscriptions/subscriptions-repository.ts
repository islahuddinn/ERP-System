import { Injectable } from "@nestjs/common";
import { MasterPrismaService } from "src/master-prisma/master-prisma.service";
import { Prisma, Subscription, Tenant } from "@prisma/master-client";
import { SubscriptionsQueryDto } from "./dto/find-subscriptions-query.dto";
import { buildOrderBy } from "src/common/utils/pagination.helper";

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly masterPrisma: MasterPrismaService) {}

  async create(data: Prisma.SubscriptionCreateInput) {
    return this.masterPrisma.subscription.create({
      data,

      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        payments: {
          orderBy: {
            paymentDate: "desc",
          },
          take: 5,
        },
      },
    });
  }

  async findAll(query: SubscriptionsQueryDto) {
    const { page = 1, limit = 20, search, tenantId, status, sortBy, sortOrder } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: Prisma.SubscriptionWhereInput = {};

    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;

    if (search) {
      where.OR = [{ notes: { contains: search, mode: "insensitive" } }];
    }

    // Execute paginated database transaction
    const [data, total] = await this.masterPrisma.$transaction([
      this.masterPrisma.subscription.findMany({
        where,
        skip,
        take,
        orderBy: buildOrderBy(sortBy, sortOrder),
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          payments: {
            orderBy: { paymentDate: "desc" },
            take: 5,
          },
          _count: {
            select: {
              payments: true,
            },
          },
        },
      }),
      this.masterPrisma.subscription.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(query: Prisma.SubscriptionWhereUniqueInput): Promise<Subscription | null> {
    return this.masterPrisma.subscription.findUnique({
      where: query,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            subdomain: true,
            status: true,
          },
        },
      },
    });
  }

  async update(
    where: Prisma.SubscriptionWhereUniqueInput,
    data: Prisma.SubscriptionUpdateInput,
  ): Promise<Subscription> {
    return this.masterPrisma.subscription.update({
      where,
      data,
      include: { tenant: true },
    });
  }

  async updateMany(
    where: Prisma.SubscriptionWhereInput,
    data: Prisma.SubscriptionUpdateManyMutationInput,
  ) {
    return this.masterPrisma.subscription.updateMany({
      where,
      data,
    });
  }

  async checkExistence(where: Prisma.SubscriptionWhereUniqueInput): Promise<Subscription | null> {
    return this.masterPrisma.subscription.findUnique({ where });
  }

  async deleteById(subscriptionId: string): Promise<void> {
    await this.masterPrisma.subscription.delete({ where: { id: subscriptionId } });
  }

  async countPaymentsBySubscriptionId(subscriptionId: string): Promise<number> {
    return this.masterPrisma.payment.count({ where: { subscriptionId } });
  }

  async findTenantById(tenantId: string): Promise<Tenant | null> {
    return this.masterPrisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null } });
  }
}
