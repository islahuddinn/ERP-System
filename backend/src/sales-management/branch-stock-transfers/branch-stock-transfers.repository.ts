import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import {
  BranchLedgerEntryType,
  BranchStockTransferStatus,
  EmployeeCashLedgerEntryType,
  Prisma,
} from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { buildOrderBy, getPaginationParams } from "../../common/utils/pagination.helper";
import { BranchStockRepository } from "../branch-stock/branch-stock.repository";
import { FactoryStockRepository } from "../factory-stock/factory-stock.repository";
import { BranchStockTransferFiltersDto } from "./dto/branch-stock-transfer-filters.dto";
import {
  BRANCH_STOCK_TRANSFER_DETAIL_INCLUDE,
  BRANCH_STOCK_TRANSFER_LIST_INCLUDE,
} from "./utils/constants";
import { BranchStockTransferDetail, BranchStockTransferListItem } from "./utils/types";

const BRANCH_STOCK_TRANSFER_SORTABLE_FIELDS = [
  "createdAt",
  "dispatchedAt",
  "receivedAt",
  "cancelledAt",
  "status",
];

export interface ConfirmReceiptItemData {
  transferItemId: string;
  productId: string;
  unitPrice: number;
  receivedQuantity: number;
}

@Injectable()
export class BranchStockTransfersRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchStockRepository: BranchStockRepository,
    private readonly factoryStockRepository: FactoryStockRepository,
  ) {}

  async findAll(
    branchStockTransferFiltersDto: BranchStockTransferFiltersDto,
  ): Promise<PaginatedResponse<BranchStockTransferListItem>> {
    const {
      fromBranchId,
      toBranchId,
      status,
      requestId,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = branchStockTransferFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.BranchStockTransferWhereInput = {
      ...(fromBranchId && { fromBranchId }),
      ...(toBranchId && { toBranchId }),
      ...(status && { status }),
      ...(requestId && { requestId }),
    };

    const orderBy =
      sortBy && BRANCH_STOCK_TRANSFER_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { createdAt: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.branchStockTransfer.findMany({
        where,
        skip,
        take,
        orderBy,
        include: BRANCH_STOCK_TRANSFER_LIST_INCLUDE,
      }),
      this.prisma.branchStockTransfer.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(transferId: string): Promise<BranchStockTransferDetail | null> {
    return this.prisma.branchStockTransfer.findUnique({
      where: { id: transferId },
      include: BRANCH_STOCK_TRANSFER_DETAIL_INCLUDE,
    });
  }

  /**
   * Debit minus credit across every BranchLedger row tied to this transfer —
   * the STOCK_RECEIVED debit written in confirmReceipt, netted against every
   * PAYMENT credit written since by a settling EmployeeCashTransfer (see
   * EmployeeCashTransferRepository.respond, which reuses this same transfer
   * id as its referenceId so the two rows net out cleanly). Zero for a
   * transfer that hasn't been received yet, since no debit row exists until
   * then — so an unreceived or cancelled transfer naturally has nothing due.
   */
  async getAmountDue(transferId: string): Promise<number> {
    const { _sum } = await this.prisma.branchLedger.aggregate({
      where: { referenceId: transferId },
      _sum: { debit: true, credit: true },
    });

    return Number(_sum.debit ?? 0) - Number(_sum.credit ?? 0);
  }

  /**
   * Stock and the ledger debit are both based on itemsWithReceivedQuantity
   * (what the service has already validated actually arrived), never on
   * the shipped quantity — a branch only owes for what it actually took
   * custody of. Any shortfall against what was shipped is recorded on the
   * item (see the `receivedQuantity < quantity` check below) but isn't
   * auto-corrected anywhere — that's a manual follow-up once someone knows
   * what really happened to the missing stock (damaged, lost, miscounted).
   */
  async confirmReceipt(
    transferId: string,
    receivedById: string,
    itemsWithReceivedQuantity: ConfirmReceiptItemData[],
  ): Promise<BranchStockTransferDetail> {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.branchStockTransfer.updateMany({
        where: { id: transferId, status: BranchStockTransferStatus.DISPATCHED },
        data: {
          status: BranchStockTransferStatus.RECEIVED,
          receivedById,
          receivedAt: new Date(),
        },
      });

      if (claim.count === 0) {
        throw new ConflictException(
          "This transfer is not awaiting receipt — it may have already been received",
        );
      }

      const transfer = await tx.branchStockTransfer.findUniqueOrThrow({
        where: { id: transferId },
        include: { items: true },
      });

      const shippedQuantityByItemId = new Map(transfer.items.map((item) => [item.id, item.quantity]));

      let receivedValue = 0;
      let isPartial = false;

      for (const item of itemsWithReceivedQuantity) {
        await tx.branchStockTransferItem.update({
          where: { id: item.transferItemId },
          data: { receivedQuantity: item.receivedQuantity },
        });

        if (item.receivedQuantity > 0) {
          await this.branchStockRepository.increment(
            transfer.toBranchId,
            item.productId,
            item.receivedQuantity,
            tx,
          );
        }

        receivedValue += item.receivedQuantity * item.unitPrice;

        if (item.receivedQuantity < (shippedQuantityByItemId.get(item.transferItemId) ?? 0)) {
          isPartial = true;
        }
      }

      /**
       * The debt is created here, at confirmed receipt — never when the
       * transfer was shipped. Only once the receiving branch has actually
       * taken custody of the goods do they owe anything for them, and only
       * for what arrived.
       */
      const toBranch = await tx.branch.findUniqueOrThrow({
        where: { id: transfer.toBranchId },
        select: { distributorId: true },
      });

      await tx.branchLedger.create({
        data: {
          branchId: transfer.toBranchId,
          counterpartyBranchId: transfer.fromBranchId,
          date: transfer.receivedAt as Date,
          type: BranchLedgerEntryType.STOCK_RECEIVED,
          referenceId: transfer.id,
          distributorIdAtTime: toBranch.distributorId,
          description: isPartial
            ? `Stock transfer ${transfer.transferNumber} received (partial — see item shortfalls)`
            : `Stock transfer ${transfer.transferNumber} received`,
          debit: receivedValue,
          credit: 0,
          createdById: receivedById,
        },
      });

      /**
       * Same debt, mirrored onto the two specific employees involved —
       * separate from the branch-level BranchLedger row above. Only written
       * when the transfer actually has a dispatching employee on record;
       * factory-origin transfers with no dispatchedById have nothing to
       * mirror here, and only the branch-level debt applies.
       */
      if (transfer.dispatchedById) {
        const employeeLedgerDescription = isPartial
          ? `Stock transfer ${transfer.transferNumber} received (partial — see item shortfalls)`
          : `Stock transfer ${transfer.transferNumber} received`;

        await tx.employeeCashLedger.create({
          data: {
            employeeId: receivedById,
            date: transfer.receivedAt as Date,
            type: EmployeeCashLedgerEntryType.STOCK_RECEIVED,
            reference: transfer.transferNumber,
            referenceId: transfer.id,
            description: employeeLedgerDescription,
            debit: receivedValue,
            credit: 0,
            createdById: receivedById,
          },
        });

        await tx.employeeCashLedger.create({
          data: {
            employeeId: transfer.dispatchedById,
            date: transfer.receivedAt as Date,
            type: EmployeeCashLedgerEntryType.STOCK_DISPATCHED,
            reference: transfer.transferNumber,
            referenceId: transfer.id,
            description: employeeLedgerDescription,
            debit: 0,
            credit: receivedValue,
            createdById: receivedById,
          },
        });
      }

      return tx.branchStockTransfer.findUniqueOrThrow({
        where: { id: transferId },
        include: BRANCH_STOCK_TRANSFER_DETAIL_INCLUDE,
      });
    });
  }

  /**
   * Only cancellable while DISPATCHED — a transfer is created already
   * shipped (see BranchStockRequestsRepository.shipRequestItems), so
   * that's the earliest state there is. RECEIVED is terminal: its ledger
   * debit already exists, and unwinding a confirmed receipt is a return,
   * not a cancellation. The service enforces who's allowed to do this —
   * this method just does the state change and reverses the stock the
   * shipment took out of the source.
   */
  async cancel(transferId: string, cancelledById: string): Promise<BranchStockTransferDetail> {
    return this.prisma.$transaction(async (tx) => {
      /**
       * Atomically claim the transfer: only a still-DISPATCHED row can be
       * claimed, so a concurrent receipt confirmation racing this cancel
       * loses cleanly instead of silently cancelling a transfer that just
       * moved.
       */
      const claim = await tx.branchStockTransfer.updateMany({
        where: { id: transferId, status: BranchStockTransferStatus.DISPATCHED },
        data: {
          status: BranchStockTransferStatus.CANCELLED,
          cancelledById,
          cancelledAt: new Date(),
        },
      });

      if (claim.count === 0) {
        throw new ConflictException(
          "This transfer is not dispatched — it may have already been received or cancelled",
        );
      }

      const transfer = await tx.branchStockTransfer.findUniqueOrThrow({
        where: { id: transferId },
        include: { items: true },
      });

      if (transfer.fromBranchId !== null) {
        for (const item of transfer.items) {
          await this.branchStockRepository.increment(
            transfer.fromBranchId,
            item.productId,
            item.quantity,
            tx,
          );
        }
      } else {
        for (const item of transfer.items) {
          await this.factoryStockRepository.increment(item.productId, item.quantity, tx);
        }
      }

      return tx.branchStockTransfer.findUniqueOrThrow({
        where: { id: transferId },
        include: BRANCH_STOCK_TRANSFER_DETAIL_INCLUDE,
      });
    });
  }
}
