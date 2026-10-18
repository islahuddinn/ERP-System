import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { BranchLedgerEntryType, BranchStockReturnStatus, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { buildOrderBy, getPaginationParams } from "../../common/utils/pagination.helper";
import { BranchStockRepository } from "../branch-stock/branch-stock.repository";
import { FactoryStockRepository } from "../factory-stock/factory-stock.repository";
import { BranchStockReturnFiltersDto } from "./dto/branch-stock-return-filters.dto";
import { BRANCH_STOCK_RETURN_DETAIL_INCLUDE, BRANCH_STOCK_RETURN_LIST_INCLUDE } from "./utils/constants";
import { BranchStockReturnDetail, BranchStockReturnListItem } from "./utils/types";

const BRANCH_STOCK_RETURN_SORTABLE_FIELDS = ["requestDate", "createdAt", "status"];

export interface CreateBranchStockReturnItemData {
  transferItemId: string;
  quantity: number;
}

export interface CreateBranchStockReturnData {
  transferId: string;
  returningBranchId: string;
  receivingBranchId: string | null;
  requestedById: string;
  reason: string;
  items: CreateBranchStockReturnItemData[];
}

@Injectable()
export class BranchStockReturnsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchStockRepository: BranchStockRepository,
    private readonly factoryStockRepository: FactoryStockRepository,
  ) {}

  async findAll(
    branchStockReturnFiltersDto: BranchStockReturnFiltersDto,
  ): Promise<PaginatedResponse<BranchStockReturnListItem>> {
    const {
      transferId,
      returningBranchId,
      receivingBranchId,
      status,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = branchStockReturnFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.BranchStockReturnWhereInput = {
      ...(transferId && { transferId }),
      ...(returningBranchId && { returningBranchId }),
      ...(receivingBranchId && { receivingBranchId }),
      ...(status && { status }),
    };

    const orderBy =
      sortBy && BRANCH_STOCK_RETURN_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { requestDate: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.branchStockReturn.findMany({
        where,
        skip,
        take,
        orderBy,
        include: BRANCH_STOCK_RETURN_LIST_INCLUDE,
      }),
      this.prisma.branchStockReturn.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(returnId: string): Promise<BranchStockReturnDetail | null> {
    return this.prisma.branchStockReturn.findUnique({
      where: { id: returnId },
      include: BRANCH_STOCK_RETURN_DETAIL_INCLUDE,
    });
  }

  private async generateReturnNumber(tx: Prisma.TransactionClient): Promise<string> {
    const latest = await tx.branchStockReturn.findFirst({
      orderBy: { returnNumber: "desc" },
      select: { returnNumber: true },
    });
    const next = latest ? parseInt(latest.returnNumber.replace("BSRT-", ""), 10) + 1 : 1;
    return `BSRT-${String(next).padStart(6, "0")}`;
  }

  /**
   * How much of each transfer item is still returnable: the actually
   * received quantity, minus quantity already committed to that item by any
   * non-REJECTED prior return — mirrors
   * BranchStockRequestsRepository.computeRemainingBalance.
   */
  private computeRemainingReturnableQuantity(
    transfer: { items: { id: string; receivedQuantity: number | null }[] },
    existingReturns: {
      status: BranchStockReturnStatus;
      items: { transferItemId: string; quantity: number }[];
    }[],
  ): Map<string, number> {
    const alreadyReturnedByTransferItemId = new Map<string, number>();

    for (const stockReturn of existingReturns) {
      if (stockReturn.status === BranchStockReturnStatus.REJECTED) continue;

      for (const item of stockReturn.items) {
        alreadyReturnedByTransferItemId.set(
          item.transferItemId,
          (alreadyReturnedByTransferItemId.get(item.transferItemId) ?? 0) + item.quantity,
        );
      }
    }

    return new Map(
      transfer.items.map((item) => [
        item.id,
        (item.receivedQuantity ?? 0) - (alreadyReturnedByTransferItemId.get(item.id) ?? 0),
      ]),
    );
  }

  /**
   * Created PENDING — no stock or ledger movement happens here. The
   * advisory lock on transferId serializes concurrent return-creation
   * against the same transfer, so two overlapping requests can never both
   * claim the same remaining returnable quantity.
   */
  async create(data: CreateBranchStockReturnData): Promise<BranchStockReturnDetail> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.transferId}))`;

      const transfer = await tx.branchStockTransfer.findUniqueOrThrow({
        where: { id: data.transferId },
        include: { items: true },
      });

      const existingReturns = await tx.branchStockReturn.findMany({
        where: { transferId: data.transferId },
        include: { items: true },
      });

      const remainingByTransferItemId = this.computeRemainingReturnableQuantity(
        transfer,
        existingReturns,
      );

      const itemsToReturn = data.items.map((requested) => {
        const transferItem = transfer.items.find((item) => item.id === requested.transferItemId);
        if (!transferItem) {
          throw new BadRequestException(
            `Item ${requested.transferItemId} does not belong to this transfer`,
          );
        }

        const remaining = remainingByTransferItemId.get(transferItem.id) ?? 0;
        if (requested.quantity > remaining) {
          throw new BadRequestException(
            `Cannot return ${requested.quantity} — only ${remaining} remains returnable on this item`,
          );
        }

        const unitPrice = Number(transferItem.unitPrice);
        return {
          transferItemId: transferItem.id,
          productId: transferItem.productId,
          quantity: requested.quantity,
          unitPrice,
          totalAmount: requested.quantity * unitPrice,
        };
      });

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('branch_stock_return_number'))`;
      const returnNumber = await this.generateReturnNumber(tx);
      const subtotal = itemsToReturn.reduce((sum, item) => sum + item.totalAmount, 0);

      const stockReturn = await tx.branchStockReturn.create({
        data: {
          returnNumber,
          transferId: data.transferId,
          returningBranchId: data.returningBranchId,
          receivingBranchId: data.receivingBranchId,
          requestedById: data.requestedById,
          reason: data.reason,
          subtotal,
          totalAmount: subtotal,
          items: { create: itemsToReturn },
        },
      });

      return tx.branchStockReturn.findUniqueOrThrow({
        where: { id: stockReturn.id },
        include: BRANCH_STOCK_RETURN_DETAIL_INCLUDE,
      });
    });
  }

  /**
   * Approves a PENDING return: claims it, decrements the returning branch's
   * stock (guarded — it may have moved on again since the return was
   * requested), restores it to the receiving branch (or the Factory), and
   * posts a single STOCK_RETURNED credit on the returning branch's ledger —
   * an offsetting entry, never a mutation of the original STOCK_RECEIVED
   * debit, following this codebase's append-only ledger-correction
   * convention.
   */
  async approve(returnId: string, approvedById: string): Promise<BranchStockReturnDetail> {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.branchStockReturn.updateMany({
        where: { id: returnId, status: BranchStockReturnStatus.PENDING },
        data: {
          status: BranchStockReturnStatus.APPROVED,
          approvedById,
          approvedAt: new Date(),
        },
      });

      if (claim.count === 0) {
        throw new ConflictException(
          "This return is no longer pending — it may have already been approved or rejected",
        );
      }

      const stockReturn = await tx.branchStockReturn.findUniqueOrThrow({
        where: { id: returnId },
        include: { items: true },
      });

      let returnedValue = 0;
      for (const item of stockReturn.items) {
        await this.branchStockRepository.decrement(
          stockReturn.returningBranchId,
          item.productId,
          item.quantity,
          tx,
        );

        if (stockReturn.receivingBranchId !== null) {
          await this.branchStockRepository.increment(
            stockReturn.receivingBranchId,
            item.productId,
            item.quantity,
            tx,
          );
        } else {
          await this.factoryStockRepository.increment(item.productId, item.quantity, tx);
        }

        returnedValue += item.quantity * Number(item.unitPrice);
      }

      const returningBranch = await tx.branch.findUniqueOrThrow({
        where: { id: stockReturn.returningBranchId },
        select: { distributorId: true },
      });

      await tx.branchLedger.create({
        data: {
          branchId: stockReturn.returningBranchId,
          counterpartyBranchId: stockReturn.receivingBranchId,
          date: stockReturn.approvedAt as Date,
          type: BranchLedgerEntryType.STOCK_RETURNED,
          referenceId: stockReturn.id,
          distributorIdAtTime: returningBranch.distributorId,
          description: `Stock return ${stockReturn.returnNumber} approved`,
          debit: 0,
          credit: returnedValue,
          createdById: approvedById,
        },
      });

      return tx.branchStockReturn.findUniqueOrThrow({
        where: { id: returnId },
        include: BRANCH_STOCK_RETURN_DETAIL_INCLUDE,
      });
    });
  }

  /**
   * rejectedById/rejectedAt reuse the same approvedById/approvedAt columns
   * — both mean "who last decided on this return, and when" — same
   * convention as BranchStockRequestsRepository.reject.
   */
  async reject(returnId: string, rejectedById: string): Promise<BranchStockReturnDetail> {
    const claim = await this.prisma.branchStockReturn.updateMany({
      where: { id: returnId, status: BranchStockReturnStatus.PENDING },
      data: {
        status: BranchStockReturnStatus.REJECTED,
        approvedById: rejectedById,
        approvedAt: new Date(),
      },
    });

    if (claim.count === 0) {
      throw new ConflictException(
        "This return is no longer pending — it may have already been approved or rejected",
      );
    }

    return this.prisma.branchStockReturn.findUniqueOrThrow({
      where: { id: returnId },
      include: BRANCH_STOCK_RETURN_DETAIL_INCLUDE,
    });
  }
}
