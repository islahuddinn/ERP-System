import { Injectable } from "@nestjs/common";
import { BranchStockTransferStatus, DistributionPricingMode, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { getPaginationParams } from "../../common/utils/pagination.helper";
import { BranchLedgerFiltersDto } from "./dto/branch-ledger-filters.dto";
import { BRANCH_LEDGER_ENTRY_INCLUDE, DEBT_TRANSFER_INCLUDE } from "./utils/constants";
import { BranchLedgerEntryDetail, DebtTransfer } from "./utils/types";
import { BranchLedgerSummary, EmployeeDebtEntry, EmployeeDebtsSummary } from "./utils/interfaces";

@Injectable()
export class BranchLedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  // FIXED_PRICE: prices never change on the way down, so there's no margin
  // to protect — a branch can see its own ledger and every descendant's.
  // FREE_PRICE: margins are real and private, so visibility is strictly
  // "myself only" — the ledger query below then only ever matches rows
  // where I'm branchId or counterpartyBranchId, never anything two hops away.
  async getVisibleBranchIds(requesterBranchId: string): Promise<string[]> {
    const settings = await this.prisma.settings.findFirst({
      select: { distributionPricingMode: true },
    });

    if (settings?.distributionPricingMode !== DistributionPricingMode.FIXED_PRICE) {
      return [requesterBranchId];
    }

    return this.collectDescendantBranchIds(requesterBranchId);
  }

  private async collectDescendantBranchIds(rootBranchId: string): Promise<string[]> {
    const visibleIds = [rootBranchId];
    let frontier = [rootBranchId];

    while (frontier.length > 0) {
      const children = await this.prisma.branch.findMany({
        where: { parentBranchId: { in: frontier } },
        select: { id: true },
      });

      if (children.length === 0) break;

      frontier = children.map((child) => child.id);
      visibleIds.push(...frontier);
    }

    return visibleIds;
  }

  async findAll(
    requesterBranchId: string,
    branchLedgerFiltersDto: BranchLedgerFiltersDto,
  ): Promise<PaginatedResponse<BranchLedgerEntryDetail>> {
    const { type, page = 1, limit = 10 } = branchLedgerFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const visibleBranchIds = await this.getVisibleBranchIds(requesterBranchId);

    const where: Prisma.BranchLedgerWhereInput = {
      OR: [
        { branchId: { in: visibleBranchIds } },
        { counterpartyBranchId: { in: visibleBranchIds } },
      ],
      ...(type && { type }),
    };

    const [data, total] = await Promise.all([
      this.prisma.branchLedger.findMany({
        where,
        skip,
        take,
        orderBy: { date: "desc" },
        include: BRANCH_LEDGER_ENTRY_INCLUDE,
      }),
      this.prisma.branchLedger.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findAllForAllBranches(
    branchLedgerFiltersDto: BranchLedgerFiltersDto,
  ): Promise<PaginatedResponse<BranchLedgerEntryDetail>> {
    const { type, page = 1, limit = 10 } = branchLedgerFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);
    const where: Prisma.BranchLedgerWhereInput = type ? { type } : {};
    const [data, total] = await Promise.all([
      this.prisma.branchLedger.findMany({
        where,
        skip,
        take,
        orderBy: { date: "desc" },
        include: BRANCH_LEDGER_ENTRY_INCLUDE,
      }),
      this.prisma.branchLedger.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getGlobalSummary(): Promise<BranchLedgerSummary> {
    const [debit, credit] = await Promise.all([
      this.prisma.branchLedger.aggregate({ _sum: { debit: true } }),
      this.prisma.branchLedger.aggregate({ _sum: { credit: true } }),
    ]);
    const totalDebit = Number(debit._sum.debit ?? 0);
    const totalCredit = Number(credit._sum.credit ?? 0);
    return {
      branchId: "all",
      owedToParent: totalDebit - totalCredit,
      owedFromChildren: 0,
      totalChargedByParent: totalDebit,
      totalChargedToChildren: totalCredit,
      profitLoss: totalCredit - totalDebit,
    };
  }

  // Every figure here comes from rows where branchId or counterpartyBranchId
  // is exactly `branchId` — by construction, a branch only ever appears as
  // `branchId` against its own parent, and only ever appears as
  // `counterpartyBranchId` against its own children, so there's no risk of
  // this pulling in a grandparent's or grandchild's numbers.
  async getSummary(branchId: string): Promise<BranchLedgerSummary> {
    const [owedToParentAgg, owedFromChildrenAgg, chargedByParentAgg, chargedToChildrenAgg] =
      await Promise.all([
        this.prisma.branchLedger.aggregate({
          where: { branchId },
          _sum: { debit: true, credit: true },
        }),
        this.prisma.branchLedger.aggregate({
          where: { counterpartyBranchId: branchId },
          _sum: { debit: true, credit: true },
        }),
        this.prisma.branchLedger.aggregate({
          where: { branchId, debit: { gt: 0 } },
          _sum: { debit: true },
        }),
        this.prisma.branchLedger.aggregate({
          where: { counterpartyBranchId: branchId, debit: { gt: 0 } },
          _sum: { debit: true },
        }),
      ]);

    const owedToParent =
      Number(owedToParentAgg._sum.debit ?? 0) - Number(owedToParentAgg._sum.credit ?? 0);
    const owedFromChildren =
      Number(owedFromChildrenAgg._sum.debit ?? 0) - Number(owedFromChildrenAgg._sum.credit ?? 0);
    const totalChargedByParent = Number(chargedByParentAgg._sum.debit ?? 0);
    const totalChargedToChildren = Number(chargedToChildrenAgg._sum.debit ?? 0);

    return {
      branchId,
      owedToParent,
      owedFromChildren,
      totalChargedByParent,
      totalChargedToChildren,
      profitLoss: totalChargedToChildren - totalChargedByParent,
    };
  }

  /**
   * "Who personally owes whom" — derived entirely from BranchStockTransfer
   * and BranchLedger, never written anywhere of its own (see the comment on
   * EmployeeDebtsSummary for why: the debt belongs to the branch, not the
   * person, so it must never be duplicated onto an employee-owned row that
   * would go stale the moment a distributor is replaced).
   */
  async findMyDebts(employeeId: string): Promise<EmployeeDebtsSummary> {
    const myBranches = await this.prisma.branch.findMany({
      where: { distributorId: employeeId },
      select: { id: true },
    });
    const myBranchIds = myBranches.map((branch) => branch.id);

    const [transfersIOwe, transfersOwedToMe] = await Promise.all([
      myBranchIds.length
        ? this.prisma.branchStockTransfer.findMany({
            where: { toBranchId: { in: myBranchIds }, status: BranchStockTransferStatus.RECEIVED },
            include: DEBT_TRANSFER_INCLUDE,
          })
        : Promise.resolve([] as DebtTransfer[]),
      this.prisma.branchStockTransfer.findMany({
        where: { dispatchedById: employeeId, status: BranchStockTransferStatus.RECEIVED },
        include: DEBT_TRANSFER_INCLUDE,
      }),
    ]);

    const amountDueByTransferId = await this.getAmountDueByTransferId([
      ...transfersIOwe.map((transfer) => transfer.id),
      ...transfersOwedToMe.map((transfer) => transfer.id),
    ]);

    const iOwe = this.buildDebtEntries(transfersIOwe, amountDueByTransferId, (transfer) => ({
      counterpartyEmployeeId: transfer.dispatchedBy?.id ?? "",
      counterpartyEmployeeName: this.formatEmployeeName(transfer.dispatchedBy),
    }));

    const owedToMe = this.buildDebtEntries(
      transfersOwedToMe,
      amountDueByTransferId,
      (transfer) => ({
        counterpartyEmployeeId: transfer.toBranch.distributor?.id ?? "",
        counterpartyEmployeeName: this.formatEmployeeName(transfer.toBranch.distributor),
      }),
    );

    return {
      employeeId,
      iOwe,
      owedToMe,
      totalIOwe: iOwe.reduce((sum, entry) => sum + entry.amountDue, 0),
      totalOwedToMe: owedToMe.reduce((sum, entry) => sum + entry.amountDue, 0),
    };
  }

  private async getAmountDueByTransferId(transferIds: string[]): Promise<Map<string, number>> {
    if (!transferIds.length) return new Map();

    const balances = await this.prisma.branchLedger.groupBy({
      by: ["referenceId"],
      where: { referenceId: { in: transferIds } },
      _sum: { debit: true, credit: true },
    });

    return new Map(
      balances
        .filter((balance) => balance.referenceId !== null)
        .map((balance) => [
          balance.referenceId as string,
          Number(balance._sum.debit ?? 0) - Number(balance._sum.credit ?? 0),
        ]),
    );
  }

  private buildDebtEntries(
    transfers: DebtTransfer[],
    amountDueByTransferId: Map<string, number>,
    resolveCounterparty: (transfer: DebtTransfer) => {
      counterpartyEmployeeId: string;
      counterpartyEmployeeName: string;
    },
  ): EmployeeDebtEntry[] {
    return transfers
      .map((transfer) => ({
        transferId: transfer.id,
        transferNumber: transfer.transferNumber,
        branchId: transfer.toBranch.id,
        branchName: transfer.toBranch.name,
        amountDue: amountDueByTransferId.get(transfer.id) ?? 0,
        receivedAt: transfer.receivedAt,
        ...resolveCounterparty(transfer),
      }))
      .filter((entry) => entry.amountDue > 0);
  }

  private formatEmployeeName(
    employee: { user: { firstName: string; lastName: string } | null } | null,
  ): string {
    if (!employee?.user) return "Unknown";
    return `${employee.user.firstName} ${employee.user.lastName}`;
  }
}
