import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EntryStatus, ExpenseStatus, PayrollStatus, SaleStatus } from "@prisma/tenant-client";
import { GlPostingRepository } from "../gl-posting/gl-posting.repository";
import { GlPostingService } from "../gl-posting/gl-posting.service";
import { SYSTEM_ACCOUNT_CODES, MONEY_EPSILON } from "../gl-posting/utils/constants";
import { GlPostingKind, GlSourceType } from "../gl-posting/utils/enums";

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private readonly glPostingRepository: GlPostingRepository,
    private readonly glPostingService: GlPostingService,
  ) {}

  async getTrialBalance(startDate?: Date, endDate?: Date, accountId?: string) {
    const normalizedEndDate = endDate
      ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999)
      : undefined;

    const lines = await this.prisma.journalLine.findMany({
      where: {
        ...(accountId && { accountId }),
        journal: {
          status: "POSTED",
          deletedAt: null,
          ...(startDate || normalizedEndDate
            ? {
                entryDate: {
                  ...(startDate && { gte: startDate }),
                  ...(normalizedEndDate && { lte: normalizedEndDate }),
                },
              }
            : {}),
        },
      },
      include: {
        account: true,
        journal: true,
      },
    });

    // Aggregate by account
    const accountMap = new Map();

    for (const line of lines) {
      // Use real account data from Chart of Accounts
      const accountId = line.accountId;
      const accountCode = line.account.accountCode;
      const accountName = line.account.accountName;
      const accountType = line.account.accountType;
      const normalBalance = line.account.normalBalance;

      if (!accountMap.has(accountCode)) {
        accountMap.set(accountCode, {
          accountCode,
          accountName,
          accountType,
          normalBalance,
          debit: 0,
          credit: 0,
          balance: 0,
          lines: [],
        });
      }

      const account = accountMap.get(accountCode);
      const debitAmount = Number(line.debitAmount);
      const creditAmount = Number(line.creditAmount);

      account.debit += debitAmount;
      account.credit += creditAmount;

      // Add line details for debugging/auditing
      account.lines.push({
        entryNumber: "TEMP-" + line.id,
        entryDate: line.createdAt,
        description: line.description,
        debit: debitAmount,
        credit: creditAmount,
      });
    }

    // Calculate balances based on normal balance
    const trialBalance = Array.from(accountMap.values()).map((account) => {
      if (account.normalBalance === "DEBIT") {
        account.balance = account.debit - account.credit;
      } else {
        account.balance = account.credit - account.debit;
      }

      // Remove lines array for cleaner response
      const { lines, ...accountData } = account;
      return accountData;
    });

    // Sort by account code
    trialBalance.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    // Calculate totals
    const totals = trialBalance.reduce(
      (acc, account) => {
        acc.totalDebit += account.debit;
        acc.totalCredit += account.credit;
        return acc;
      },
      { totalDebit: 0, totalCredit: 0 },
    );

    return {
      period: {
        startDate,
        endDate,
      },
      accounts: trialBalance,
      totals,
      isBalanced: Math.abs(totals.totalDebit - totals.totalCredit) < 0.01,
    };
  }

  async getIncomeStatement(startDate?: Date, endDate?: Date) {
    const trialBalance = await this.getTrialBalance(startDate, endDate);

    const revenue = trialBalance.accounts.filter((acc) => acc.accountType === "REVENUE");
    const expenses = trialBalance.accounts.filter((acc) => acc.accountType === "EXPENSE");

    const totalRevenue = revenue.reduce((sum, acc) => sum + acc.balance, 0);
    const totalExpenses = expenses.reduce((sum, acc) => sum + acc.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      period: trialBalance.period,
      revenue: {
        accounts: revenue,
        total: totalRevenue,
      },
      expenses: {
        accounts: expenses,
        total: totalExpenses,
      },
      netIncome,
    };
  }

  async getBalanceSheet(startDate?: Date, endDate?: Date) {
    const trialBalance = await this.getTrialBalance(startDate, endDate);

    const assets = trialBalance.accounts.filter((acc) => acc.accountType === "ASSET");
    const liabilities = trialBalance.accounts.filter((acc) => acc.accountType === "LIABILITY");
    const equity = trialBalance.accounts.filter((acc) => acc.accountType === "EQUITY");

    const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
    const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);

    return {
      period: trialBalance.period,
      assets: {
        accounts: assets,
        total: totalAssets,
      },
      liabilities: {
        accounts: liabilities,
        total: totalLiabilities,
      },
      equity: {
        accounts: equity,
        total: totalEquity,
      },
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }

  async getCashFlow(startDate?: Date, endDate?: Date) {
    const where: any = {
      deletedAt: null,
      ...(startDate || endDate
        ? {
            transactionDate: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    const txs = await this.prisma.bankTransaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
    });

    let inflows = 0;
    let outflows = 0;

    for (const t of txs) {
      const amt = Number(t.amount);
      if (t.type === "DEPOSIT") inflows += amt;
      else if (t.type === "WITHDRAW") outflows += amt;
    }

    const glCash = await this.glPostingRepository.sumPostedByAccountCode(
      SYSTEM_ACCOUNT_CODES.CASH,
      startDate,
      endDate,
    );

    return {
      period: { startDate, endDate },
      inflows,
      outflows,
      netCashFlow: inflows - outflows,
      glCash: {
        accountCode: SYSTEM_ACCOUNT_CODES.CASH,
        debit: glCash.debit,
        credit: glCash.credit,
        net: glCash.debit - glCash.credit,
      },
      transactions: txs,
    };
  }

  listPostingExceptions() {
    return this.glPostingService.listExceptions();
  }

  async getReconciliation(startDate?: Date, endDate?: Date) {
    const trialBalance = await this.getTrialBalance(startDate, endDate);
    const dateFilter = startDate || endDate
      ? {
          gte: startDate,
          lte: endDate,
        }
      : undefined;

    const [posSales, payrollPaid, expensesPaid, vendorBills, customerInvoices, glPos, glPayroll, glExpense, glVendorBills, glCustomerInvoices, glCash, glAr, glAp] =
      await Promise.all([
        this.prisma.sale.aggregate({
          where: {
            status: { in: [SaleStatus.COMPLETED, SaleStatus.CREDIT] },
            ...(dateFilter ? { saleDate: dateFilter } : {}),
          },
          _sum: { totalAmount: true },
        }),
        this.prisma.payroll.aggregate({
          where: {
            status: PayrollStatus.PAID,
            ...(dateFilter ? { paidAt: dateFilter } : {}),
          },
          _sum: { netPay: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            status: ExpenseStatus.PAID,
            ...(dateFilter ? { paymentDate: dateFilter } : {}),
          },
          _sum: { amount: true },
        }),
        this.prisma.vendorBill.aggregate({
          where: {
            deletedAt: null,
            ...(dateFilter ? { billDate: dateFilter } : {}),
          },
          _sum: { totalAmount: true },
        }),
        this.prisma.customerInvoice.aggregate({
          where: {
            deletedAt: null,
            ...(dateFilter ? { invoiceDate: dateFilter } : {}),
          },
          _sum: { totalAmount: true },
        }),
        this.glPostingRepository.sumPostedBySourceType(
          GlSourceType.SALE,
          startDate,
          endDate,
          GlPostingKind.RECOGNIZE_REVENUE,
        ),
        this.glPostingRepository.sumPostedBySourceType(
          GlSourceType.PAYROLL,
          startDate,
          endDate,
          GlPostingKind.PAY_SALARY,
        ),
        this.glPostingRepository.sumPostedBySourceType(
          GlSourceType.EXPENSE,
          startDate,
          endDate,
          GlPostingKind.PAY_EXPENSE,
        ),
        this.glPostingRepository.sumPostedBySourceType(
          GlSourceType.VENDOR_BILL,
          startDate,
          endDate,
          GlPostingKind.RECOGNIZE_AP,
        ),
        this.glPostingRepository.sumPostedBySourceType(
          GlSourceType.CUSTOMER_INVOICE,
          startDate,
          endDate,
          GlPostingKind.RECOGNIZE_AR,
        ),
        this.glPostingRepository.sumPostedByAccountCode(SYSTEM_ACCOUNT_CODES.CASH, startDate, endDate),
        this.glPostingRepository.sumPostedByAccountCode(SYSTEM_ACCOUNT_CODES.AR, startDate, endDate),
        this.glPostingRepository.sumPostedByAccountCode(SYSTEM_ACCOUNT_CODES.AP, startDate, endDate),
      ]);

    const matches = [
      this.reconciliationRow("POS sales vs GL SALE journals", Number(posSales._sum.totalAmount ?? 0), glPos),
      this.reconciliationRow("Paid payroll vs GL PAYROLL journals", Number(payrollPaid._sum.netPay ?? 0), glPayroll),
      this.reconciliationRow("Paid expenses vs GL EXPENSE journals", Number(expensesPaid._sum.amount ?? 0), glExpense),
      this.reconciliationRow("Vendor bills vs GL VENDOR_BILL journals", Number(vendorBills._sum.totalAmount ?? 0), glVendorBills),
      this.reconciliationRow("AR invoices vs GL CUSTOMER_INVOICE journals", Number(customerInvoices._sum.totalAmount ?? 0), glCustomerInvoices),
    ];

    return {
      period: { startDate, endDate },
      trialBalance: {
        isBalanced: trialBalance.isBalanced,
        totalDebit: trialBalance.totals.totalDebit,
        totalCredit: trialBalance.totals.totalCredit,
      },
      controlAccounts: {
        cash: { debit: glCash.debit, credit: glCash.credit, net: glCash.debit - glCash.credit },
        ar: { debit: glAr.debit, credit: glAr.credit, net: glAr.debit - glAr.credit },
        ap: { debit: glAp.debit, credit: glAp.credit, net: glAp.credit - glAp.debit },
      },
      matches,
      allMatched: matches.every((row) => row.ok),
      exceptions: this.glPostingService.listExceptions(),
    };
  }

  private reconciliationRow(name: string, operational: number, gl: number) {
    const delta = Math.round((operational - gl) * 100) / 100;
    return {
      name,
      operational,
      gl,
      delta,
      ok: Math.abs(delta) < MONEY_EPSILON,
    };
  }

  async getGeneralLedger(accountId?: string, startDate?: Date, endDate?: Date) {
    const whereClause: any = { status: EntryStatus.POSTED, deletedAt: null };

    if (startDate || endDate) {
      whereClause.entryDate = {};
      if (startDate) whereClause.entryDate.gte = startDate;
      if (endDate) whereClause.entryDate.lte = endDate;
    }

    const lines = await this.prisma.journalLine.findMany({
      where: {
        journal: whereClause,
        ...(accountId && { accountId }),
      },
      include: {
        account: true,
        journal: {
          select: { entryNumber: true, entryDate: true, description: true },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by account for running balances
    const accountMap = new Map();

    for (const line of lines) {
      const accountId = line.accountId;

      if (!accountMap.has(accountId)) {
        accountMap.set(accountId, {
          accountId: accountId,
          lines: [],
          openingBalance: 0,
          closingBalance: 0,
        });
      }

      const account = accountMap.get(accountId);
      account.lines.push(line);

      // Update running totals
      const debitAmount = Number(line.debitAmount);
      const creditAmount = Number(line.creditAmount);

      // For now, assume all accounts are debit balance - fix later
      account.closingBalance += debitAmount - creditAmount;
    }

    return Array.from(accountMap.values());
  }
}
