import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  ExpenseStatus,
  PaymentMethod,
  PrismaClient,
  Prisma,
  CashTransactionType,
} from "@prisma/tenant-client";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { ExpenseQueryDto } from "./dto/expense-query.dto";
import { ApproveExpenseDto } from "./dto/approve-expense.dto";
import { AuditService } from "../audit/audit.service";
import { AuditContextService } from "../audit/audit-context.service";
import { ActorType } from "../audit/utils/types";
import { CashInHandService } from "../cash-in-hand/cash-in-hand.service";
import { FinancialEventService } from "../common/services/financial-event.service";
import { GlPostingService } from "../financial/gl-posting/gl-posting.service";
import { GlPostingKind, GlSourceType } from "../financial/gl-posting/utils/enums";
import { PaginationDto } from "../common/dto/pagination.dto";
import { createPaginatedResponse, getPaginationParams } from "../common/utils/pagination.helper";

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private auditService: AuditService,
    private auditContext: AuditContextService,
    private cashInHandService: CashInHandService,
    private financialEventService: FinancialEventService,
    private glPostingService: GlPostingService,
  ) {}

  private getPrisma(tenantClient?: PrismaClient): PrismaClient {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for expenses");
    }
    return tenantClient;
  }

  /**
   * Generate unique expense number: EXP-YYYY-NNNN
   */
  private async generateExpenseNumber(prisma: PrismaClient): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;

    const lastExpense = await prisma.expense.findFirst({
      where: {
        expenseNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        expenseNumber: "desc",
      },
    });

    let sequence = 1;
    if (lastExpense) {
      const lastSequence = parseInt(lastExpense.expenseNumber.split("-")[2] || "0");
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, "0")}`;
  }

  async create(tenantClient: PrismaClient, createDto: CreateExpenseDto, userId: string) {
    const prisma = this.getPrisma(tenantClient);
    this.logger.log(`Creating expense for category: ${createDto.categoryId}`);

    // Validate category exists
    const category = await prisma.expenseCategory.findUnique({
      where: { id: createDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException("Expense category not found");
    }

    if (!category.isActive) {
      throw new BadRequestException("Cannot create expense with inactive category");
    }

    // Validate location exists
    const location = await prisma.location.findUnique({
      where: { id: createDto.locationId },
    });

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    // Generate expense number
    const expenseNumber = await this.generateExpenseNumber(prisma);

    // Calculate next recurring date if applicable
    let nextRecurringDate: Date | null = null;
    if (createDto.isRecurring && createDto.recurringFrequency) {
      const expenseDate = new Date(createDto.expenseDate);
      nextRecurringDate = this.calculateNextRecurringDate(
        expenseDate,
        createDto.recurringFrequency,
      );
    }

    // Create expense in transaction
    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          categoryId: createDto.categoryId,
          locationId: createDto.locationId,
          amount: createDto.amount,
          paymentMethod: createDto.paymentMethod,
          paymentDate: new Date(createDto.paymentDate),
          expenseDate: new Date(createDto.expenseDate),
          description: createDto.description,
          vendor: createDto.vendor,
          referenceNumber: createDto.referenceNumber,
          isRecurring: createDto.isRecurring ?? false,
          recurringFrequency: createDto.recurringFrequency,
          nextRecurringDate,
          attachments: createDto.attachments || [],
          status: ExpenseStatus.PENDING,
          createdById: userId,
        },
        include: {
          category: true,
          location: true,
        },
      });

      // If payment method is CASH, create cash transaction
      let cashTransactionId: string | null = null;
      if (createDto.paymentMethod === PaymentMethod.CASH) {
        try {
          const cashTransaction = await this.cashInHandService.createTransaction(
            tenantClient,
            {
              locationId: createDto.locationId,
              type: CashTransactionType.PAYMENT_OUT,
              amount: createDto.amount,
              description: createDto.description || `Expense: ${expenseNumber}`,
              reference: expenseNumber,
              referenceType: "EXPENSE",
              transactionDate: createDto.paymentDate,
            },
            userId,
          );

          cashTransactionId = cashTransaction.id;

          // Update expense with cash transaction ID
          await tx.expense.update({
            where: { id: expense.id },
            data: { cashTransactionId },
          });
        } catch (error) {
          this.logger.warn(`Failed to create cash transaction for expense: ${error.message}`);
          // Continue without cash transaction - expense is still created
        }
      }

      return { expense, cashTransactionId };
    });

    // Audit logging handled by the @Auditable interceptor on the controller route.
    this.logger.log(`Expense created successfully: ${result.expense.id}`);
    return result.expense;
  }

  async findAll(tenantClient: PrismaClient, queryDto: ExpenseQueryDto) {
    const prisma = this.getPrisma(tenantClient);
    const {
      page,
      limit,
      search,
      categoryId,
      locationId,
      status,
      paymentMethod,
      startDate,
      endDate,
    } = queryDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.ExpenseWhereInput = {
      deletedAt: null, // Only show non-deleted expenses
    };

    if (search) {
      where.OR = [
        { expenseNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { vendor: { contains: search, mode: "insensitive" } },
        { referenceNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (status) {
      where.status = status;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { expenseDate: "desc" },
        include: {
          category: true,
          location: true,
        },
      }),
      prisma.expense.count({ where }),
    ]);

    return createPaginatedResponse(expenses, total, page, limit);
  }

  async findOne(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);

    const expense = await prisma.expense.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        location: true,
        cashTransaction: {
          select: {
            id: true,
            amount: true,
            transactionDate: true,
          },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException("Expense not found");
    }

    return expense;
  }

  async update(
    tenantClient: PrismaClient,
    id: string,
    updateDto: UpdateExpenseDto,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);

    const existing = await this.findOne(prisma, id);

    // Cannot update if already paid
    if (existing.status === ExpenseStatus.PAID) {
      throw new BadRequestException("Cannot update paid expense");
    }

    // Capture pre-mutation snapshot for the @Auditable interceptor
    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.expenseNumber);

    // Validate category if being updated
    if (updateDto.categoryId && updateDto.categoryId !== existing.categoryId) {
      const category = await prisma.expenseCategory.findUnique({
        where: { id: updateDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException("Expense category not found");
      }

      if (!category.isActive) {
        throw new BadRequestException("Cannot use inactive category");
      }
    }

    // Validate location if being updated
    if (updateDto.locationId && updateDto.locationId !== existing.locationId) {
      const location = await prisma.location.findUnique({
        where: { id: updateDto.locationId },
      });

      if (!location) {
        throw new NotFoundException("Location not found");
      }
    }

    // Calculate next recurring date if recurring fields are updated
    let nextRecurringDate = existing.nextRecurringDate;
    if (
      updateDto.isRecurring !== undefined ||
      updateDto.recurringFrequency ||
      updateDto.expenseDate
    ) {
      const isRecurring = updateDto.isRecurring ?? existing.isRecurring;
      const frequency = updateDto.recurringFrequency ?? existing.recurringFrequency;
      const expenseDate = updateDto.expenseDate
        ? new Date(updateDto.expenseDate)
        : existing.expenseDate;

      if (isRecurring && frequency) {
        nextRecurringDate = this.calculateNextRecurringDate(expenseDate, frequency);
      } else {
        nextRecurringDate = null;
      }
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...updateDto,
        paymentDate: updateDto.paymentDate ? new Date(updateDto.paymentDate) : undefined,
        expenseDate: updateDto.expenseDate ? new Date(updateDto.expenseDate) : undefined,
        nextRecurringDate,
      },
      include: {
        category: true,
        location: true,
      },
    });

    // Audit logging handled by the @Auditable interceptor on the controller route.
    this.logger.log(`Expense updated: ${expense.id}`);
    return expense;
  }

  async remove(tenantClient: PrismaClient, id: string, userId: string) {
    const prisma = this.getPrisma(tenantClient);

    const expense = await this.findOne(prisma, id);

    // Capture pre-mutation snapshot for the @Auditable interceptor
    this.auditContext.setOldValue(expense);
    this.auditContext.setEntityLabel(expense.expenseNumber);

    // Soft delete
    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit logging handled by the @Auditable interceptor on the controller route.
    this.logger.log(`Expense deleted: ${expense.id}`);
    return { message: "Expense deleted successfully" };
  }

  async approve(
    tenantClient: PrismaClient,
    id: string,
    approveDto: ApproveExpenseDto,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);

    const expense = await this.findOne(prisma, id);

    if (expense.status === ExpenseStatus.PAID) {
      throw new BadRequestException("Cannot change status of paid expense");
    }

    const oldData = { ...expense };

    const updateData: any = {
      status: approveDto.status,
      approvedBy: userId,
      approvedAt: new Date(),
    };

    if (approveDto.status === ExpenseStatus.REJECTED) {
      updateData.rejectionReason = approveDto.rejectionReason || "Rejected by approver";
      // Note: If rejecting an expense with cash transaction, the cash transaction remains
      // This is intentional - the cash was already paid out, rejection is just for approval workflow
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        location: true,
      },
    });

    await this.auditService.log(tenantClient, {
      actorId: userId,
      actorType: ActorType.USER,
      entityName: "Expense",
      entityId: expense.id,
      action: "APPROVE",
      oldValue: oldData,
      newValue: updated,
    });

    this.logger.log(`Expense ${approveDto.status.toLowerCase()}: ${expense.id}`);
    return updated;
  }

  async markAsPaid(tenantClient: PrismaClient, id: string, userId: string) {
    const prisma = this.getPrisma(tenantClient);

    const expense = await this.findOne(prisma, id);

    if (expense.status === ExpenseStatus.PAID) {
      throw new BadRequestException("Expense is already marked as paid");
    }

    if (expense.status === ExpenseStatus.REJECTED) {
      throw new BadRequestException("Cannot mark rejected expense as paid");
    }

    const amount = Number(expense.amount);
    if (amount > 0) {
      await this.glPostingService.postBalancedEntry({
        sourceType: GlSourceType.EXPENSE,
        sourceId: expense.id,
        postingKind: GlPostingKind.PAY_EXPENSE,
        entryDate: expense.paymentDate || new Date(),
        description: `Expense ${expense.expenseNumber ?? expense.id}`,
        createdById: userId,
        lines: [
          { accountKey: "OPERATING_EXPENSE", debit: amount, credit: 0, description: "Operating expense" },
          { accountKey: "CASH", debit: 0, credit: amount, description: "Expense paid" },
        ],
      });
    }

    const oldData = { ...expense };

    // Update expense and record financial event in transaction
    const updated = await prisma.$transaction(async (tx) => {
      const updatedExpense = await tx.expense.update({
        where: { id },
        data: {
          status: ExpenseStatus.PAID,
        },
      });

      // Record financial event (COST_ADJUSTMENT for operational expenses)
      // This ensures expenses are included in profit calculations
      await this.financialEventService.recordAdjustmentCost(
        tenantClient,
        {
          amount: Number(expense.amount),
          referenceType: "EXPENSE",
          referenceId: expense.id,
          date: expense.paymentDate || new Date(),
        },
        tx,
      );

      return updatedExpense;
    });

    await this.auditService.log(tenantClient, {
      actorId: userId,
      actorType: ActorType.USER,
      entityName: "Expense",
      entityId: expense.id,
      action: "PAY",
      oldValue: oldData,
      newValue: updated,
    });

    this.logger.log(`Expense marked as paid: ${expense.id}`);
    return updated;
  }

  /**
   * Calculate next recurring date based on frequency
   */
  private calculateNextRecurringDate(currentDate: Date, frequency: string): Date {
    const next = new Date(currentDate);

    switch (frequency) {
      case "DAILY":
        next.setDate(next.getDate() + 1);
        break;
      case "WEEKLY":
        next.setDate(next.getDate() + 7);
        break;
      case "MONTHLY":
        next.setMonth(next.getMonth() + 1);
        break;
      case "YEARLY":
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        return currentDate;
    }

    return next;
  }
}
