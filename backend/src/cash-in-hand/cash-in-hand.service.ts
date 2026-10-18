import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/tenant-client";
import { AuditService } from "../audit/audit.service";
import { AuditContextService } from "../audit/audit-context.service";
import { CreateCashInHandDto } from "./dto/create-cash-in-hand.dto";
import { UpdateCashCountDto } from "./dto/update-cash-count.dto";
import { ApproveCashCountDto } from "./dto/approve-cash-count.dto";
import { CreateCashTransactionDto } from "./dto/create-cash-transaction.dto";
import { CashTransactionType, CashCountStatus } from "@prisma/tenant-client";
import { GlPostingService } from "../financial/gl-posting/gl-posting.service";
import { GlPostingKind, GlSourceType } from "../financial/gl-posting/utils/enums";

@Injectable()
export class CashInHandService {
  constructor(
    private auditService: AuditService,
    private auditContext: AuditContextService,
    private glPostingService: GlPostingService,
  ) {}

  private getPrisma(
    tenantClient?: PrismaClient | Prisma.TransactionClient,
  ): PrismaClient | Prisma.TransactionClient {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for cash-in-hand operations");
    }

    return tenantClient;
  }

  /**
   * Get current cash balance for a location
   */
  async getCurrentBalance(tenantClient: PrismaClient, locationId: string): Promise<any> {
    const prisma = this.getPrisma(tenantClient);

    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    // Get today's cash in hand record - normalize to UTC to avoid timezone issues
    const today = new Date();
    const todayDateString = today.toISOString().split("T")[0]; // YYYY-MM-DD format
    const todayParts = todayDateString.split("-");
    const todayUtc = new Date(
      Date.UTC(
        parseInt(todayParts[0]), // year
        parseInt(todayParts[1]) - 1, // month (0-indexed)
        parseInt(todayParts[2]), // day
      ),
    );

    // Set end of day for transaction queries (local time)
    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);
    const endOfToday = new Date(todayLocal);
    endOfToday.setHours(23, 59, 59, 999);

    // Query using UTC-normalized date for precise matching
    const cashInHand = await prisma.cashInHand.findUnique({
      where: {
        locationId_date: {
          locationId,
          date: todayUtc, // Use UTC-normalized date
        },
      },
      include: {
        transactions: {
          orderBy: { transactionDate: "asc" },
        },
      },
    });

    // Double-check: Verify that if cashInHand exists, it's actually for today
    // This prevents returning old records due to timezone or date comparison issues
    let verifiedCashInHand = cashInHand;
    if (cashInHand) {
      // Normalize record date to UTC for comparison
      const recordDate = new Date(cashInHand.date);
      const recordDateString = recordDate.toISOString().split("T")[0];

      // If the record date doesn't match today's date, treat it as null
      if (recordDateString !== todayDateString) {
        console.warn(
          `âš ï¸ Found cash in hand record with date ${recordDateString} but expected ${todayDateString}. Treating as null.`,
        );
        verifiedCashInHand = null;
      }
    }

    // Calculate expected balance from transactions if no cash in hand record
    let currentBalance = 0;
    let openingBalance = 0;

    if (verifiedCashInHand) {
      openingBalance = Number(verifiedCashInHand.openingBalance);

      // Calculate from transactions - only include transactions AFTER the register was opened/reopened
      // Transactions made while closed are already included in openingBalance
      // Use the most recent of createdAt, countedAt, or updatedAt to determine when register was opened/reopened
      const registerOpenedAt =
        verifiedCashInHand.countedAt ||
        verifiedCashInHand.createdAt ||
        verifiedCashInHand.updatedAt ||
        todayUtc;

      // Get all transactions for today
      const allCashTransactions = await this.getTransactionsByDateRange(
        prisma,
        locationId,
        todayLocal,
        endOfToday,
      );

      // Filter to only include transactions made AFTER the register was opened/reopened
      // Add a small buffer (1 second) to account for timing precision issues
      const openedAtWithBuffer = new Date(registerOpenedAt.getTime() + 1000); // Add 1 second buffer
      const transactionsAfterOpening = allCashTransactions.filter(
        (txn) => new Date(txn.transactionDate) > openedAtWithBuffer, // Use > instead of >= to exclude transactions at exact reopening time
      );

      // Calculate current balance from opening + only transactions after opening
      currentBalance = this.calculateBalanceFromTransactions(
        transactionsAfterOpening,
        openingBalance,
      );
    } else {
      // Try to get yesterday's closing balance - use UTC-normalized yesterday
      const yesterdayUtc = new Date(todayUtc);
      yesterdayUtc.setUTCDate(yesterdayUtc.getUTCDate() - 1);

      const yesterdayRecord = await prisma.cashInHand.findUnique({
        where: {
          locationId_date: {
            locationId,
            date: yesterdayUtc,
          },
        },
      });

      if (yesterdayRecord && yesterdayRecord.closingBalance) {
        openingBalance = Number(yesterdayRecord.closingBalance);
      }

      // Calculate from today's transactions - use end of day to include all transactions today
      const cashTransactions = await this.getTransactionsByDateRange(
        prisma,
        locationId,
        todayLocal,
        endOfToday,
      );
      currentBalance = this.calculateBalanceFromTransactions(cashTransactions, openingBalance);
    }

    return {
      locationId,
      locationName: location.name,
      date: todayDateString, // Use the date string we created
      openingBalance,
      currentBalance,
      cashInHand: verifiedCashInHand, // Return verified cash in hand (null if not for today)
    };
  }

  /**
   * Create or get cash in hand record for a date
   */
  async createOrGetCashInHand(
    tenantClient: PrismaClient,
    dto: CreateCashInHandDto,
    userId: string,
  ): Promise<any> {
    const prisma = this.getPrisma(tenantClient);
    const { date, locationId, openingBalance } = dto;

    // Normalize date to UTC to avoid timezone issues
    // Parse date string (YYYY-MM-DD) and create UTC date at midnight
    const dateParts = date.split("-");
    const targetDate = new Date(
      Date.UTC(
        parseInt(dateParts[0]), // year
        parseInt(dateParts[1]) - 1, // month (0-indexed)
        parseInt(dateParts[2]), // day
      ),
    );

    // Validate location
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    // Check if record already exists - use the normalized UTC date
    const existing = await prisma.cashInHand.findUnique({
      where: {
        locationId_date: {
          locationId,
          date: targetDate,
        },
      },
    });

    // Check if trying to reopen an approved record for today
    // Use same UTC normalization for today's date
    const today = new Date();
    const todayDateString = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const todayParts = todayDateString.split("-");
    const todayUtc = new Date(
      Date.UTC(parseInt(todayParts[0]), parseInt(todayParts[1]) - 1, parseInt(todayParts[2])),
    );
    const isToday = targetDate.getTime() === todayUtc.getTime();

    if (existing) {
      // If record exists and is OPEN or COUNTED (not approved), just return it
      if (existing.status === CashCountStatus.OPEN || existing.status === CashCountStatus.COUNTED) {
        // Record already exists and is open/counted - return it
        return existing;
      }

      // If record exists and is APPROVED for today, allow reopening
      if (existing.status === CashCountStatus.APPROVED && isToday) {
        // Check for cash transactions after approval (if any sales were made between approval and reopening)
        const approvalTime = existing.approvedAt || existing.countedAt || new Date(targetDate);
        const transactionsAfterApproval = await this.getTransactionsByDateRange(
          prisma,
          locationId,
          approvalTime,
          new Date(), // Current time
        );

        // Calculate net cash flow after approval
        let netCashFlowAfterApproval = 0;
        for (const txn of transactionsAfterApproval) {
          const amount = Number(txn.amount);
          switch (txn.type) {
            case CashTransactionType.CASH_SALE:
              netCashFlowAfterApproval += amount;
              break;
            case CashTransactionType.REFUND:
            case CashTransactionType.PAYMENT_OUT:
              netCashFlowAfterApproval -= amount;
              break;
            case CashTransactionType.ADJUSTMENT:
              netCashFlowAfterApproval += amount;
              break;
          }
        }

        // Calculate opening balance for reopening
        const baseReopenAmount =
          openingBalance !== undefined
            ? Number(openingBalance)
            : existing.closingBalance
              ? Number(existing.closingBalance)
              : Number(existing.openingBalance);

        const newOpeningBalance = baseReopenAmount + netCashFlowAfterApproval;

        // Ensure not negative (only warn, don't auto-correct to 0)
        // Negative balance could indicate a legitimate short or error
        if (newOpeningBalance < 0) {
          console.warn(
            `âš ï¸ Warning: Reopening balance is negative (${newOpeningBalance}). ` +
              `This may indicate a cash shortage. Review transactions.`,
          );
        }

        // Log info if there were transactions after approval
        if (netCashFlowAfterApproval !== 0) {
          console.log(
            `â„¹ï¸ Reopening: Found ${transactionsAfterApproval.length} transaction(s) after approval. ` +
              `Net cash flow: ${netCashFlowAfterApproval > 0 ? "+" : ""}${netCashFlowAfterApproval.toFixed(2)}. ` +
              `Adjusted opening balance: ${newOpeningBalance.toFixed(2)}`,
          );
        }

        const reopened = await prisma.cashInHand.update({
          where: {
            locationId_date: {
              locationId,
              date: targetDate,
            },
          },
          data: {
            openingBalance: newOpeningBalance,
            status: CashCountStatus.OPEN,
            closingBalance: null,
            expectedClosing: null,
            actualCount: null,
            variance: null,
            notes: null,
            countedById: userId,
            countedAt: new Date(),
            approvedById: null,
            approvedAt: null,
          },
          include: {
            location: true,
          },
        });

        // Log audit trail for reopening
        await this.auditService.log(prisma, {
          actorId: userId,
          entityName: "CashInHand",
          entityId: reopened.id,
          action: "UPDATE",
          oldValue: {
            status: CashCountStatus.APPROVED,
            closingBalance: existing.closingBalance,
          },
          newValue: {
            status: CashCountStatus.OPEN,
            openingBalance: newOpeningBalance,
            action: "REOPENED",
            ...(netCashFlowAfterApproval !== 0 && {
              transactionsAfterApproval: transactionsAfterApproval.length,
              netCashFlowAfterApproval: netCashFlowAfterApproval,
              adjustedOpeningBalance: newOpeningBalance,
            }),
          },
        });

        return reopened;
      } else {
        // Record exists but can't be reopened (not today or not approved)
        throw new BadRequestException(
          "Cash in hand record already exists for this date and location",
        );
      }
    }

    // Check for existing cash transactions today BEFORE opening (sales made without opening register)
    // Use local time for transaction queries (transactions have full DateTime)
    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);

    // Get all cash transactions that occurred before opening
    const existingTransactions = await this.getTransactionsByDateRange(
      prisma,
      locationId,
      todayLocal,
      new Date(), // Current time - transactions before now
    );

    // Calculate net cash flow from existing transactions
    let netCashFlowBeforeOpen = 0;
    for (const txn of existingTransactions) {
      const amount = Number(txn.amount);
      switch (txn.type) {
        case CashTransactionType.CASH_SALE:
          netCashFlowBeforeOpen += amount; // Cash received
          break;
        case CashTransactionType.REFUND:
        case CashTransactionType.PAYMENT_OUT:
          netCashFlowBeforeOpen -= amount; // Cash paid out
          break;
        case CashTransactionType.ADJUSTMENT:
          netCashFlowBeforeOpen += amount; // Adjustments can be positive or negative (amount already signed)
          break;
        // OPENING and CLOSING transactions are ignored here
      }
    }

    // Determine opening balance for new record
    const baseOpeningBalance =
      openingBalance !== undefined
        ? Number(openingBalance)
        : await (async () => {
            const yesterday = new Date(targetDate);
            yesterday.setDate(yesterday.getDate() - 1);

            const yesterdayRecord = await prisma.cashInHand.findUnique({
              where: {
                locationId_date: {
                  locationId,
                  date: yesterday,
                },
              },
            });

            if (yesterdayRecord && yesterdayRecord.closingBalance !== null) {
              return Number(yesterdayRecord.closingBalance);
            }

            return 0;
          })();

    const calculatedOpeningBalance = baseOpeningBalance + netCashFlowBeforeOpen;

    if (netCashFlowBeforeOpen !== 0) {
      console.log(
        `â„¹ï¸ Auto-adjusting opening balance: Found ${existingTransactions.length} cash transaction(s) ` +
          `before opening register. Net cash flow: ${netCashFlowBeforeOpen > 0 ? "+" : ""}${netCashFlowBeforeOpen.toFixed(2)}. ` +
          `Base opening: ${baseOpeningBalance.toFixed(2)}. Adjusted opening balance: ${calculatedOpeningBalance.toFixed(2)}`,
      );
    }

    const cashInHand = await prisma.cashInHand.create({
      data: {
        date: targetDate, // Use UTC-normalized targetDate
        locationId,
        openingBalance: calculatedOpeningBalance,
        countedById: userId,
        countedAt: new Date(),
      },
      include: {
        location: true,
      },
    });

    // Log audit trail
    await this.auditService.log(prisma, {
      actorId: userId,
      entityName: "CashInHand",
      entityId: cashInHand.id,
      action: "CREATE",
      newValue: {
        date: targetDate.toISOString().split("T")[0],
        locationId,
        openingBalance: calculatedOpeningBalance,
        ...(netCashFlowBeforeOpen !== 0 && {
          autoAdjusted: true,
          existingTransactionsCount: existingTransactions.length,
          netCashFlowBeforeOpen: netCashFlowBeforeOpen,
          userEnteredAmount: openingBalance,
          adjustedOpeningBalance: calculatedOpeningBalance,
        }),
      },
    });

    return cashInHand;
  }

  /**
   * Update cash count
   */
  async updateCashCount(
    tenantClient: PrismaClient,
    locationId: string,
    date: string,
    dto: UpdateCashCountDto,
    userId: string,
  ): Promise<any> {
    const prisma = this.getPrisma(tenantClient);
    // Normalize date to UTC to avoid timezone issues (same as createOrGetCashInHand)
    const dateParts = date.split("-");
    const targetDate = new Date(
      Date.UTC(
        parseInt(dateParts[0]), // year
        parseInt(dateParts[1]) - 1, // month (0-indexed)
        parseInt(dateParts[2]), // day
      ),
    );

    const cashInHand = await prisma.cashInHand.findUnique({
      where: {
        locationId_date: {
          locationId,
          date: targetDate,
        },
      },
    });

    if (!cashInHand) {
      throw new NotFoundException("Cash in hand record not found");
    }

    if (cashInHand.status === CashCountStatus.APPROVED) {
      throw new BadRequestException("Cannot update an approved cash count");
    }

    // Capture pre-mutation snapshot for the @Auditable interceptor
    this.auditContext.setOldValue(cashInHand);
    // Route param is :locationId, so pin the audit entry to the CashInHand record id.
    this.auditContext.setEntityId(cashInHand.id);

    // Get transactions to calculate expected closing - use local time range for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const transactions = await this.getTransactionsByDateRange(
      prisma,
      locationId,
      startOfDay,
      endOfDay,
    );
    const expectedClosing = this.calculateBalanceFromTransactions(
      transactions,
      Number(cashInHand.openingBalance),
    );

    const actualCount = dto.actualCount ?? null;
    const variance = actualCount !== null ? actualCount - expectedClosing : null;

    const updated = await prisma.cashInHand.update({
      where: {
        locationId_date: {
          locationId,
          date: targetDate,
        },
      },
      data: {
        actualCount,
        variance,
        expectedClosing,
        notes: dto.notes ?? null,
        status: actualCount !== null ? CashCountStatus.COUNTED : CashCountStatus.OPEN,
        countedById: userId,
        countedAt: new Date(),
      },
      include: {
        location: true,
      },
    });

    // Audit logging handled by the @Auditable interceptor on the controller route.
    return updated;
  }

  /**
   * Approve cash count
   */
  async approveCashCount(
    tenantClient: PrismaClient,
    locationId: string,
    date: string,
    dto: ApproveCashCountDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    const prisma = this.getPrisma(tenantClient);
    // Check if user has ADMIN role
    if (userRole !== "ADMIN") {
      throw new ForbiddenException("Only administrators can approve cash counts");
    }
    // Normalize date to UTC to avoid timezone issues (same as other methods)
    const dateParts = date.split("-");
    const targetDate = new Date(
      Date.UTC(
        parseInt(dateParts[0]), // year
        parseInt(dateParts[1]) - 1, // month (0-indexed)
        parseInt(dateParts[2]), // day
      ),
    );

    const cashInHand = await prisma.cashInHand.findUnique({
      where: {
        locationId_date: {
          locationId,
          date: targetDate,
        },
      },
    });

    if (!cashInHand) {
      throw new NotFoundException("Cash in hand record not found");
    }

    if (cashInHand.status !== CashCountStatus.COUNTED) {
      throw new BadRequestException("Only counted cash can be approved");
    }

    // Capture pre-mutation snapshot for the @Auditable interceptor
    this.auditContext.setOldValue(cashInHand);
    // Route param is :locationId, so pin the audit entry to the CashInHand record id.
    this.auditContext.setEntityId(cashInHand.id);

    const updated = await prisma.cashInHand.update({
      where: {
        locationId_date: {
          locationId,
          date: targetDate,
        },
      },
      data: {
        approvedById: userId,
        approvedAt: new Date(),
        status: CashCountStatus.APPROVED,
        notes: dto.notes || cashInHand.notes,
        closingBalance: cashInHand.actualCount,
      },
      include: {
        location: true,
      },
    });

    // Audit logging handled by the @Auditable interceptor on the controller route.
    return updated;
  }

  /**
   * Get cash transactions
   */
  async getTransactions(
    tenantClient: PrismaClient,
    locationId?: string,
    startDate?: string,
    endDate?: string,
    type?: CashTransactionType,
  ): Promise<any[]> {
    const prisma = this.getPrisma(tenantClient);
    const where: any = {};

    if (locationId) {
      where.locationId = locationId;
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.transactionDate.lte = end;
      }
    }

    if (type) {
      where.type = type;
    }

    return prisma.cashTransaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
    });
  }

  /**
   * Get transactions by date range (internal helper)
   */
  private async getTransactionsByDateRange(
    prisma: PrismaClient | Prisma.TransactionClient,
    locationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return prisma.cashTransaction.findMany({
      where: {
        locationId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { transactionDate: "asc" },
    });
  }

  /**
   * Create cash transaction
   */
  async createTransaction(
    tenantClient: PrismaClient,
    dto: CreateCashTransactionDto,
    userId: string,
  ): Promise<any> {
    // Validate location
    const location = await this.getPrisma(tenantClient).location.findUnique({
      where: { id: dto.locationId },
    });

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    const transactionDate = dto.transactionDate ? new Date(dto.transactionDate) : new Date();

    const transaction = await this.getPrisma(tenantClient).cashTransaction.create({
      data: {
        locationId: dto.locationId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        reference: dto.reference,
        referenceType: dto.referenceType,
        transactionDate,
        processedById: userId,
      },
    });

    await this.postCashTransactionJournal(transaction, userId);

    // Audit logging handled by the @Auditable interceptor on the controller route.
    return transaction;
  }

  private async postCashTransactionJournal(
    transaction: { id: string; type: CashTransactionType; amount: unknown; transactionDate: Date; referenceType?: string | null },
    userId: string,
  ): Promise<void> {
    const amount = Number(transaction.amount);
    if (amount <= 0) return;

    if (
      transaction.type === CashTransactionType.CASH_SALE ||
      transaction.type === CashTransactionType.REFUND ||
      transaction.type === CashTransactionType.CLOSING
    ) {
      return;
    }

    const lines =
      transaction.type === CashTransactionType.OPENING
        ? [
            { accountKey: "CASH" as const, debit: amount, credit: 0, description: "Opening cash" },
            { accountKey: "OPENING_EQUITY" as const, debit: 0, credit: amount, description: "Opening equity" },
          ]
        : transaction.type === CashTransactionType.ADJUSTMENT
          ? [
              // Amount is always >= 0 and ops add it to the drawer, so this is cash over.
              { accountKey: "CASH" as const, debit: amount, credit: 0, description: "Cash over / adjustment" },
              { accountKey: "OPERATING_EXPENSE" as const, debit: 0, credit: amount, description: "Cash over/short" },
            ]
          : [
              { accountKey: "OPERATING_EXPENSE" as const, debit: amount, credit: 0, description: transaction.type },
              { accountKey: "CASH" as const, debit: 0, credit: amount, description: "Cash out" },
            ];

    await this.glPostingService.postBalancedEntry({
      sourceType: GlSourceType.CASH_IN_HAND,
      sourceId: transaction.id,
      postingKind: GlPostingKind.CASH_MOVEMENT,
      entryDate: transaction.transactionDate,
      description: `Cash in hand ${transaction.type}`,
      createdById: userId,
      lines,
    });
  }

  /**
   * Calculate balance from transactions
   */
  private calculateBalanceFromTransactions(transactions: any[], openingBalance: number): number {
    return transactions.reduce((balance, transaction) => {
      const amount = Number(transaction.amount);

      switch (transaction.type) {
        case CashTransactionType.OPENING:
          // Opening transaction is already included in openingBalance, skip it
          return balance;
        case CashTransactionType.CASH_SALE:
          return balance + amount;
        case CashTransactionType.PAYMENT_OUT:
        case CashTransactionType.REFUND:
        case CashTransactionType.CLOSING:
          return balance - amount;
        case CashTransactionType.ADJUSTMENT:
          // For adjustments, amount can be positive or negative based on description
          return balance + amount;
        default:
          return balance;
      }
    }, openingBalance);
  }

  /**
   * Get cash in hand history
   */
  async getHistory(
    tenantClient: PrismaClient,
    locationId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any[]> {
    const prisma = this.getPrisma(tenantClient);
    const where: any = {};

    if (locationId) {
      where.locationId = locationId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    return prisma.cashInHand.findMany({
      where,
      include: {
        location: true,
      },
      orderBy: { date: "desc" },
    });
  }

  /**
   * Get cash summary report
   */
  async getCashSummaryReport(
    tenantClient: PrismaClient,
    locationId?: string,
    date?: string,
  ): Promise<any> {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const where: any = {
      date: targetDate,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const cashRecords = await tenantClient.cashInHand.findMany({
      where,
      include: {
        location: true,
      },
    });

    const totalCashTransactions = await tenantClient.cashTransaction.aggregate({
      where: {
        locationId: locationId || undefined,
        transactionDate: {
          gte: targetDate,
          lte: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000 - 1),
        },
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    return {
      date: targetDate.toISOString().split("T")[0],
      totalRecords: cashRecords.length,
      totalOpening: cashRecords.reduce((sum, r) => sum + Number(r.openingBalance), 0),
      totalClosing: cashRecords.reduce((sum, r) => sum + (Number(r.closingBalance) || 0), 0),
      totalVariance: cashRecords.reduce((sum, r) => sum + (Number(r.variance) || 0), 0),
      transactions: {
        count: totalCashTransactions._count.id,
        totalAmount: Number(totalCashTransactions._sum.amount || 0),
      },
      records: cashRecords,
    };
  }
}
