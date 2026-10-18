import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { MasterPrismaService } from "../../master-prisma/master-prisma.service";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import { SubscriptionsQueryDto } from "./dto/find-subscriptions-query.dto";
import { SubscriptionsRepository } from "./subscriptions-repository";
import { getTotalPages } from "src/common/reuseable-functions/getTotalPages";
import {
  Tenant,
  Prisma,
  Subscription,
  SubscriptionType,
  SubscriptionStatus,
} from "@prisma/master-client";
import { addDays, addMonths, addYears } from "src/common/reuseable-functions/validateDates";
import { UpdateSubscriptionStatusDto } from "./dto/update-subscription-status.dto";

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private masterPrisma: MasterPrismaService,
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  /** ------------------------------ CRUD ------------------------------ */

  async create(createSubscriptionDto: CreateSubscriptionDto) {
    const { tenantId, startDate, type, notes, amount, currency } = createSubscriptionDto;

    await this.checkTenantExistence({ id: tenantId });

    const start = new Date(startDate);

    const endDate = type === SubscriptionType.PERMANENT ? null : this.calculateEndDate(start, type);

    const subscriptionData: Prisma.SubscriptionCreateInput = {
      tenant: { connect: { id: tenantId } },
      type,
      startDate: start,
      endDate,
      amount: new Decimal(amount),
      currency,
      notes,
    };

    try {
      return await this.subscriptionsRepository.create(subscriptionData);
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error.message}`);

      throw new BadRequestException("Failed to create subscription");
    }
  }

  async findAll(query: SubscriptionsQueryDto) {
    const { page, limit } = query;

    const { data, total } = await this.subscriptionsRepository.findAll(query);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: getTotalPages(total, limit),
      },
    };
  }

  async findOne(subscriptionId: string) {
    const subscription = await this.subscriptionsRepository.findOne({ id: subscriptionId });

    if (!subscription) {
      throw new NotFoundException(`Subscription not found.`);
    }

    return subscription;
  }

  async update(subscriptionId: string, dto: UpdateSubscriptionDto) {
    const existing = await this.checkExistence({ id: subscriptionId });

    const { type, startDate, amount, currency, notes } = dto;

    const finalType = type ?? existing.type;
    const finalStartDate = startDate ? new Date(startDate) : new Date(existing.startDate);
    let finalEndDate: Date | null;

    // 🔥 CORE RULE ENGINE
    if (finalType === SubscriptionType.PERMANENT) {
      finalEndDate = null;
    } else {
      finalEndDate = this.calculateEndDate(finalStartDate, finalType);
    }

    const updateData: Prisma.SubscriptionUpdateInput = {
      type: finalType,
      startDate: finalStartDate,
      endDate: finalEndDate,
    };

    if (currency !== undefined) updateData.currency = currency;
    if (notes) updateData.notes = notes;
    if (amount !== undefined) updateData.amount = new Decimal(amount);

    return this.subscriptionsRepository.update({ id: subscriptionId }, updateData);
  }

  async remove(subscriptionId: string) {
    await this.checkExistence({ id: subscriptionId });

    /**
     * Check if there are payments
     */
    const paymentsCount = await this.masterPrisma.payment.count({ where: { subscriptionId } });

    if (paymentsCount > 0) {
      throw new BadRequestException(`Cannot delete subscription with existing payments`);
    }

    return this.masterPrisma.subscription.delete({ where: { id: subscriptionId } });
  }

  /** ------------------------------ STATUS ------------------------------ */

  async updateStatus(
    subscriptionId: string,
    updateSubscriptionStatusDto: UpdateSubscriptionStatusDto,
  ) {
    const subscription = await this.checkExistence({ id: subscriptionId });

    const { status, notes } = updateSubscriptionStatusDto;

    // optional: prevent invalid transitions
    this.validateStatusTransition(subscription.status, status);

    return this.subscriptionsRepository.update(
      { id: subscriptionId },
      { status, notes: notes ?? subscription.notes },
    );
  }

  private validateStatusTransition(current: SubscriptionStatus, next: SubscriptionStatus) {
    const allowed: Record<SubscriptionStatus, SubscriptionStatus[]> = {
      ACTIVE: [
        SubscriptionStatus.SUSPENDED,
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.EXPIRED,
      ],
      SUSPENDED: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED],
      PENDING: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED],
      CANCELLED: [],
      EXPIRED: [],
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(`Invalid status transition from ${current} to ${next}`);
    }
  }

  /** ------------------------------ HELPERS ------------------------------ */

  async checkExistence(query: Prisma.SubscriptionWhereUniqueInput): Promise<Subscription> {
    const found = await this.subscriptionsRepository.checkExistence(query);

    if (!found) {
      throw new NotFoundException(`Subscription not found.`);
    }

    return found;
  }

  async checkTenantExistence(query: Prisma.TenantWhereInput): Promise<Tenant> {
    const found = await this.masterPrisma.tenant.findFirst({ where: query });

    if (!found) {
      throw new NotFoundException(`Tenant not found.`);
    }

    return found;
  }

  calculateEndDate(startDate: Date, type: SubscriptionType): Date | null {
    switch (type) {
      case SubscriptionType.MONTHLY:
        return addMonths(startDate, 1);

      case SubscriptionType.QUARTERLY:
        return addMonths(startDate, 3);

      case SubscriptionType.YEARLY:
      case SubscriptionType.ANNUALLY:
        return addYears(startDate, 1);

      case SubscriptionType.PERMANENT:
        return null;

      case SubscriptionType.TRIAL:
        return addDays(startDate, 14);

      default:
        return null;
    }
  }

  /** ------------------------------ FOR CRONJOB (To Expire Subscriptions) ------------------------------ */

  async expireSubscriptions() {
    const now = new Date();

    await this.subscriptionsRepository.updateMany(
      { endDate: { lt: now }, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.EXPIRED },
    );
  }
}
