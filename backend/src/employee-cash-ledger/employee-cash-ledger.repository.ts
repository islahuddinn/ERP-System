import { Injectable } from "@nestjs/common";
import {
  BranchStockTransferStatus,
  EmployeeCashLedgerEntryType,
  EmployeeCashTransferStatus,
  Prisma,
} from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../common/dto/pagination.dto";
import { getPaginationParams } from "../common/utils/pagination.helper";
import { EmployeeCashLedgerFiltersDto } from "./dto/employee-cash-ledger-filters.dto";
import { EMPLOYEE_CASH_LEDGER_HEADER_SELECT } from "./utils/constants";
import {
  EmployeeCashLedgerEntryWithBalance,
  EmployeeCashLedgerHeader,
  EmployeeCashLedgerSummary,
} from "./utils/types";

@Injectable()
export class EmployeeCashLedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findHeader(employeeId: string): Promise<EmployeeCashLedgerHeader | null> {
    return this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: EMPLOYEE_CASH_LEDGER_HEADER_SELECT,
    });
  }

  // No withEmployeeId: every row of mine, any counterparty. With one:
  // narrowed to just the rows tied to either a cash transfer or a branch
  // stock transfer between the two of us — RECOVERY_COLLECTED (customer, not
  // employee), OPENING_BALANCE, and ADJUSTMENT have no employee counterparty
  // to narrow against, so they're excluded once withEmployeeId is given.
  private async buildWhere(
    employeeId: string,
    employeeCashLedgerFiltersDto: EmployeeCashLedgerFiltersDto,
  ): Promise<Prisma.EmployeeCashLedgerWhereInput> {
    const { startDate, endDate, withEmployeeId } = employeeCashLedgerFiltersDto;

    const dateWhere: Prisma.EmployeeCashLedgerWhereInput = (startDate || endDate) && {
      date: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      },
    };

    if (!withEmployeeId) {
      return { employeeId, ...dateWhere };
    }

    const referenceIds = await this.findReferenceIdsBetween(employeeId, withEmployeeId);

    return {
      employeeId,
      type: {
        in: [
          EmployeeCashLedgerEntryType.TRANSFER_IN,
          EmployeeCashLedgerEntryType.TRANSFER_OUT,
          EmployeeCashLedgerEntryType.STOCK_RECEIVED,
          EmployeeCashLedgerEntryType.STOCK_DISPATCHED,
        ],
      },
      referenceId: { in: referenceIds },
      ...dateWhere,
    };
  }

  private async findReferenceIdsBetween(
    employeeId: string,
    withEmployeeId: string,
  ): Promise<string[]> {
    const [cashTransfers, stockTransfers] = await Promise.all([
      this.prisma.employeeCashTransfer.findMany({
        where: {
          status: EmployeeCashTransferStatus.RECEIVED,
          OR: [
            { fromEmployeeId: employeeId, toEmployeeId: withEmployeeId },
            { fromEmployeeId: withEmployeeId, toEmployeeId: employeeId },
          ],
        },
        select: { id: true },
      }),
      this.prisma.branchStockTransfer.findMany({
        where: {
          status: BranchStockTransferStatus.RECEIVED,
          OR: [
            { dispatchedById: employeeId, receivedById: withEmployeeId },
            { dispatchedById: withEmployeeId, receivedById: employeeId },
          ],
        },
        select: { id: true },
      }),
    ]);

    return [...cashTransfers, ...stockTransfers].map((entry) => entry.id);
  }

  // Pure DB-side aggregates — cheap regardless of how much history an
  // employee has, since no ledger rows are ever fetched to compute these.
  async getSummary(
    employeeId: string,
    employeeCashLedgerFiltersDto: EmployeeCashLedgerFiltersDto,
  ): Promise<EmployeeCashLedgerSummary> {
    const where = await this.buildWhere(employeeId, employeeCashLedgerFiltersDto);

    const [collectedAgg, receivedAgg, transferredOutAgg, cashTotalsAgg, stockDebtAgg, totalEntries] =
      await Promise.all([
        this.prisma.employeeCashLedger.aggregate({
          where: { ...where, type: EmployeeCashLedgerEntryType.RECOVERY_COLLECTED },
          _sum: { credit: true },
        }),
        this.prisma.employeeCashLedger.aggregate({
          where: { ...where, type: EmployeeCashLedgerEntryType.TRANSFER_IN },
          _sum: { credit: true },
        }),
        this.prisma.employeeCashLedger.aggregate({
          where: { ...where, type: EmployeeCashLedgerEntryType.TRANSFER_OUT },
          _sum: { debit: true },
        }),
        // Physical cash-in-hand — deliberately excludes STOCK_RECEIVED/
        // STOCK_DISPATCHED, since those track stock value owed between
        // employees, not cash actually in anyone's hand.
        this.prisma.employeeCashLedger.aggregate({
          where: {
            ...where,
            type: {
              notIn: [
                EmployeeCashLedgerEntryType.STOCK_RECEIVED,
                EmployeeCashLedgerEntryType.STOCK_DISPATCHED,
              ],
            },
          },
          _sum: { debit: true, credit: true },
        }),
        this.prisma.employeeCashLedger.aggregate({
          where: {
            ...where,
            type: {
              in: [
                EmployeeCashLedgerEntryType.STOCK_RECEIVED,
                EmployeeCashLedgerEntryType.STOCK_DISPATCHED,
              ],
            },
          },
          _sum: { debit: true, credit: true },
        }),
        this.prisma.employeeCashLedger.count({ where }),
      ]);

    return {
      totalCollected: collectedAgg._sum.credit ?? 0,
      totalReceived: receivedAgg._sum.credit ?? 0,
      totalTransferredOut: transferredOutAgg._sum.debit ?? 0,
      currentCashInHand: (cashTotalsAgg._sum.credit ?? 0) - (cashTotalsAgg._sum.debit ?? 0),
      // Positive: this employee owes more for stock than they're owed.
      netStockDebt: (stockDebtAgg._sum.debit ?? 0) - (stockDebtAgg._sum.credit ?? 0),
      totalEntries,
    };
  }

  // Ledger rows are always chronological (oldest first) — that's the only
  // order a running balance is meaningful in, so `sortBy`/`sortOrder` on the
  // filters DTO are intentionally not used here.
  //
  // Running balance without a stored balance column: fetch every row from
  // the very start up to the end of the requested page ("bounded prefix"),
  // accumulate the balance across that prefix, then return only the
  // requested page's slice — each entry already carrying its correct
  // cumulative balance.
  async findEntries(
    employeeId: string,
    employeeCashLedgerFiltersDto: EmployeeCashLedgerFiltersDto,
  ): Promise<PaginatedResponse<EmployeeCashLedgerEntryWithBalance>> {
    const { page = 1, limit = 10 } = employeeCashLedgerFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);
    const where = await this.buildWhere(employeeId, employeeCashLedgerFiltersDto);

    const [prefixRows, total] = await Promise.all([
      this.prisma.employeeCashLedger.findMany({
        where,
        orderBy: [{ date: "asc" }, { id: "asc" }],
        take: skip + take,
      }),
      this.prisma.employeeCashLedger.count({ where }),
    ]);

    let runningBalance = 0;

    const prefixWithBalance = prefixRows.map((row) => {
      runningBalance += row.credit - row.debit;
      return { ...row, balance: runningBalance };
    });

    const pageEntries = prefixWithBalance.slice(skip);

    return buildPaginatedResponse(pageEntries, total, page, limit);
  }
}
