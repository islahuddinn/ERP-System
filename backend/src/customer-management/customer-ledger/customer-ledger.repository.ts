import { Injectable } from "@nestjs/common";
import { CustomerLedgerEntryType, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { getPaginationParams } from "../../common/utils/pagination.helper";
import { CustomerLedgerFiltersDto } from "./dto/customer-ledger-filters.dto";
import { CUSTOMER_LEDGER_HEADER_SELECT } from "./utils/constants";
import {
  CustomerLedgerEntryWithBalance,
  CustomerLedgerHeader,
  CustomerLedgerSummary,
} from "./utils/types";

@Injectable()
export class CustomerLedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findHeader(customerId: string): Promise<CustomerLedgerHeader | null> {
    return this.prisma.customer.findUnique({
      where: { id: customerId },
      select: CUSTOMER_LEDGER_HEADER_SELECT,
    });
  }

  private buildDateWhere(
    customerId: string,
    startDate?: string,
    endDate?: string,
  ): Prisma.CustomerLedgerWhereInput {
    return {
      customerId,
      ...((startDate || endDate) && {
        date: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };
  }

  // Pure DB-side aggregates — cheap regardless of how much history a shop
  // has, since no ledger rows are ever fetched to compute these.
  async getSummary(
    customerId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CustomerLedgerSummary> {
    const where = this.buildDateWhere(customerId, startDate, endDate);

    const [deliveriesAgg, recoveriesAgg, returnsAgg, totalsAgg, totalEntries] = await Promise.all([
      this.prisma.customerLedger.aggregate({
        where: { ...where, type: CustomerLedgerEntryType.DELIVERY },
        _sum: { debit: true },
      }),
      this.prisma.customerLedger.aggregate({
        where: { ...where, type: CustomerLedgerEntryType.RECOVERY },
        _sum: { credit: true },
      }),
      this.prisma.customerLedger.aggregate({
        where: { ...where, type: CustomerLedgerEntryType.RETURN },
        _sum: { credit: true },
      }),
      this.prisma.customerLedger.aggregate({
        where,
        _sum: { debit: true, credit: true },
      }),
      this.prisma.customerLedger.count({ where }),
    ]);

    return {
      totalDeliveries: deliveriesAgg._sum.debit ?? 0,
      totalRecoveries: recoveriesAgg._sum.credit ?? 0,
      totalReturns: returnsAgg._sum.credit ?? 0,
      currentBalance: (totalsAgg._sum.debit ?? 0) - (totalsAgg._sum.credit ?? 0),
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
  // cumulative balance. Cost grows with how deep into the history the page
  // is, but never fetches more than that; still far better than the
  // previous behavior of loading a shop's entire transaction history on
  // every request.
  async findEntries(
    customerId: string,
    customerLedgerFiltersDto: CustomerLedgerFiltersDto,
  ): Promise<PaginatedResponse<CustomerLedgerEntryWithBalance>> {
    const { startDate, endDate, page = 1, limit = 10 } = customerLedgerFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);
    const where = this.buildDateWhere(customerId, startDate, endDate);

    const [prefixRows, total] = await Promise.all([
      this.prisma.customerLedger.findMany({
        where,
        orderBy: [{ date: "asc" }, { id: "asc" }],
        take: skip + take,
      }),
      this.prisma.customerLedger.count({ where }),
    ]);

    let runningBalance = 0;

    const prefixWithBalance = prefixRows.map((row) => {
      runningBalance += row.debit - row.credit;
      return { ...row, balance: runningBalance };
    });

    const pageEntries = prefixWithBalance.slice(skip);

    return buildPaginatedResponse(pageEntries, total, page, limit);
  }

  // Full, unpaginated history — used only for CSV export, where "everything"
  // is the actual intent rather than a paginated view.
  async findAllForExport(
    customerId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CustomerLedgerEntryWithBalance[]> {
    const where = this.buildDateWhere(customerId, startDate, endDate);

    const rows = await this.prisma.customerLedger.findMany({
      where,
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });

    let runningBalance = 0;
    return rows.map((row) => {
      runningBalance += row.debit - row.credit;
      return { ...row, balance: runningBalance };
    });
  }
}
