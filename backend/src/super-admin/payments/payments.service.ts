import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Payment, SubscriptionStatus, PaymentStatus } from "@prisma/master-client";
import { Decimal } from "@prisma/master-client/runtime/library";
import { PaymentsRepository } from "./payments.repository";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { CreateSubscriptionPaymentDto } from "./dto/create-payment.dto";
import { PaymentFiltersDto } from "./dto/payment-filters.dto";
import { MarkPaymentAsPaidDto } from "./dto/mark-payment-as-paid.dto";
import { MarkPaymentAsFailedDto } from "./dto/mark-payment-as-failed.dto";
import { CancelPaymentDto } from "./dto/cancel-payment.dto";
import { RefundPaymentDto } from "./dto/refund-payment.dto";
import { getTotalPages } from "src/common/reuseable-functions/getTotalPages";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /** ---------------------------------------------------------------- */
  /** CREATE */
  /** ---------------------------------------------------------------- */

  async create(createPaymentDto: CreateSubscriptionPaymentDto) {
    const { subscriptionId, referenceNumber, amount, currency, paymentMethod, paymentDate, notes } =
      createPaymentDto;

    /**
     * Validate subscription existence
     */
    const subscription = await this.subscriptionsService.checkExistence({ id: subscriptionId });

    /**
     * Validate subscription status
     */
    if (
      [SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED].some(
        (status) => status === subscription.status,
      )
    ) {
      throw new BadRequestException(
        `Cannot create payment for ${subscription.status} subscription.`,
      );
    }

    /**
     * Prevent duplicate pending payment
     */
    const existingPendingPayment = await this.paymentsRepository.findPendingPayment(subscriptionId);

    if (existingPendingPayment) {
      throw new ConflictException(`A pending payment already exists for this subscription.`);
    }

    /**
     * Validate reference number uniqueness
     */
    if (referenceNumber) {
      const existingReference =
        await this.paymentsRepository.findByReferenceNumber(referenceNumber);

      if (existingReference) {
        throw new ConflictException(`Payment with this reference number already exists.`);
      }
    }

    /**
     * Optional:
     * enforce exact subscription amount
     */
    // if (Number(dto.amount) !== Number(subscription.amount)) {
    //   throw new BadRequestException(
    //     `Payment amount must be equal to subscription amount.`,
    //   );
    // }

    const paymentData: Prisma.PaymentCreateInput = {
      subscription: { connect: { id: subscriptionId } },
      amount: new Decimal(amount),
      currency: currency ?? subscription.currency,
      paymentMethod,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      referenceNumber: referenceNumber,
      notes,
      status: PaymentStatus.PENDING,
    };

    try {
      const payment = await this.paymentsRepository.create(paymentData);

      this.logger.log(`Payment created: ${payment.id}`);

      return payment;
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`);

      throw new BadRequestException(`Failed to create payment.`);
    }
  }

  /** ---------------------------------------------------------------- */
  /** FIND ALL */
  /** ---------------------------------------------------------------- */

  async findAll(query: PaymentFiltersDto) {
    const { data, total, page, limit } = await this.paymentsRepository.findAll(query);

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

  /** ---------------------------------------------------------------- */
  /** FIND ONE */
  /** ---------------------------------------------------------------- */

  async findOne(paymentId: string) {
    const payment = await this.checkExistence({
      id: paymentId,
    });

    return payment;
  }

  /** ---------------------------------------------------------------- */
  /** MARK AS PAID */
  /** ---------------------------------------------------------------- */

  async markAsPaid(paymentId: string, markPaymentAsPaidDto: MarkPaymentAsPaidDto) {
    const { referenceNumber, paymentDate, notes } = markPaymentAsPaidDto;

    const payment = await this.checkExistence({ id: paymentId });

    this.validateTransition(payment.status, PaymentStatus.PAID);

    /**
     * Validate reference uniqueness
     */
    if (referenceNumber) {
      const existingReference =
        await this.paymentsRepository.findByReferenceNumber(referenceNumber);

      if (existingReference && existingReference.id !== payment.id) {
        throw new ConflictException("Payment with this reference number already exists.");
      }
    }

    const updated = await this.paymentsRepository.update(
      { id: paymentId },
      {
        status: PaymentStatus.PAID,
        paymentDate: paymentDate ? new Date(paymentDate) : payment.paymentDate,
        referenceNumber: referenceNumber ?? payment.referenceNumber,
        notes: notes ?? payment.notes,
      },
    );

    this.logger.log(`Payment marked as paid: ${paymentId}`);

    return updated;
  }

  /** ---------------------------------------------------------------- */
  /** MARK AS FAILED */
  /** ---------------------------------------------------------------- */

  async markAsFailed(paymentId: string, dto: MarkPaymentAsFailedDto) {
    const payment = await this.checkExistence({ id: paymentId });

    this.validateTransition(payment.status, PaymentStatus.FAILED);

    const updated = await this.paymentsRepository.update(
      { id: paymentId },
      { status: PaymentStatus.FAILED, notes: dto.notes ?? payment.notes },
    );

    this.logger.log(`Payment marked as failed: ${paymentId}`);

    return updated;
  }

  /** ---------------------------------------------------------------- */
  /** CANCEL */
  /** ---------------------------------------------------------------- */

  async cancel(paymentId: string, dto: CancelPaymentDto) {
    const payment = await this.checkExistence({ id: paymentId });

    this.validateTransition(payment.status, PaymentStatus.CANCELLED);

    const updated = await this.paymentsRepository.update(
      { id: paymentId },
      { status: PaymentStatus.CANCELLED, notes: dto.notes ?? payment.notes },
    );

    this.logger.log(`Payment cancelled: ${paymentId}`);

    return updated;
  }

  /** ---------------------------------------------------------------- */
  /** REFUND */
  /** ---------------------------------------------------------------- */

  async refund(paymentId: string, refundPaymentDto: RefundPaymentDto) {
    const { notes } = refundPaymentDto;

    const payment = await this.checkExistence({ id: paymentId });

    this.validateTransition(payment.status, PaymentStatus.REFUNDED);

    const updated = await this.paymentsRepository.update(
      { id: paymentId },
      { status: PaymentStatus.REFUNDED, notes: notes ?? payment.notes },
    );

    this.logger.log(`Payment refunded: ${paymentId}`);

    return updated;
  }

  /** ---------------------------------------------------------------- */
  /** RETRY */
  /** ---------------------------------------------------------------- */

  async retry(paymentId: string) {
    const payment = await this.checkExistence({ id: paymentId });

    const { status, subscriptionId, amount, currency, paymentMethod } = payment;

    if (status !== PaymentStatus.FAILED) {
      throw new BadRequestException(`Only failed payments can be retried.`);
    }

    /**
     * Prevent multiple pending retries
     */
    const existingPendingPayment = await this.paymentsRepository.findPendingPayment(subscriptionId);

    if (existingPendingPayment) {
      throw new ConflictException(`A pending payment already exists.`);
    }

    const paymentData: Prisma.PaymentCreateInput = {
      subscription: { connect: { id: subscriptionId } },
      amount,
      currency,
      paymentMethod,
      paymentDate: new Date(),
      notes: `Retry payment for payment ${payment.id}`,
      status: PaymentStatus.PENDING,
    };

    const retryPayment = await this.paymentsRepository.create(paymentData);

    this.logger.log(`Retry payment created: ${retryPayment.id}`);

    return retryPayment;
  }

  /** ---------------------------------------------------------------- */
  /** STATS */
  /** ---------------------------------------------------------------- */

  async getStats(tenantId?: string) {
    const where: Prisma.PaymentWhereInput = {};

    if (tenantId) where.subscription = { tenantId };

    return this.paymentsRepository.getStats(where);
  }

  /** ---------------------------------------------------------------- */
  /** HELPERS */
  /** ---------------------------------------------------------------- */

  async checkExistence(where: Prisma.PaymentWhereUniqueInput): Promise<Payment> {
    const payment = await this.paymentsRepository.checkExistence(where);

    if (!payment) {
      throw new NotFoundException("Payment not found.");
    }

    return payment;
  }

  private validateTransition(current: PaymentStatus, next: PaymentStatus) {
    const allowed: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [
        PaymentStatus.PAID,
        PaymentStatus.FAILED,
        PaymentStatus.CANCELLED,
      ],
      [PaymentStatus.PAID]: [PaymentStatus.REFUNDED],
      [PaymentStatus.FAILED]: [],
      [PaymentStatus.CANCELLED]: [],
      [PaymentStatus.REFUNDED]: [],
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(`Invalid payment transition from ${current} to ${next}.`);
    }
  }
}
