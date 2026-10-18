import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import {
  BranchStockRequestStatus,
  BranchStockTransferStatus,
  Prisma,
} from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { buildOrderBy, getPaginationParams } from "../../common/utils/pagination.helper";
import { BranchStockRepository } from "../branch-stock/branch-stock.repository";
import { FactoryStockRepository } from "../factory-stock/factory-stock.repository";
import { BRANCH_STOCK_TRANSFER_DETAIL_INCLUDE } from "../branch-stock-transfers/utils/constants";
import { BranchStockTransferDetail } from "../branch-stock-transfers/utils/types";
import { BranchStockRequestFiltersDto } from "./dto/branch-stock-request-filters.dto";
import {
  BRANCH_STOCK_REQUEST_DETAIL_INCLUDE,
  BRANCH_STOCK_REQUEST_LIST_INCLUDE,
} from "./utils/constants";
import { BranchStockRequestDetail, BranchStockRequestListItem } from "./utils/types";

const BRANCH_STOCK_REQUEST_SORTABLE_FIELDS = ["requestDate", "createdAt", "status"];

export interface CreateBranchStockRequestItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateBranchStockRequestData {
  requesterBranchId: string;
  fulfillerBranchId: string | null;
  requestedById: string;
  notes: string | null;
  items: CreateBranchStockRequestItemData[];
}

export interface ShipRequestItemData {
  requestItemId: string;
  quantity: number;
}

@Injectable()
export class BranchStockRequestsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchStockRepository: BranchStockRepository,
    private readonly factoryStockRepository: FactoryStockRepository,
  ) {}

  async findAll(
    branchStockRequestFiltersDto: BranchStockRequestFiltersDto,
  ): Promise<PaginatedResponse<BranchStockRequestListItem>> {
    const {
      requesterBranchId,
      fulfillerBranchId,
      status,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = branchStockRequestFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.BranchStockRequestWhereInput = {
      ...(requesterBranchId && { requesterBranchId }),
      ...(fulfillerBranchId && { fulfillerBranchId }),
      ...(status && { status }),
    };

    const orderBy =
      sortBy && BRANCH_STOCK_REQUEST_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { requestDate: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.branchStockRequest.findMany({
        where,
        skip,
        take,
        orderBy,
        include: BRANCH_STOCK_REQUEST_LIST_INCLUDE,
      }),
      this.prisma.branchStockRequest.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(requestId: string): Promise<BranchStockRequestDetail | null> {
    return this.prisma.branchStockRequest.findUnique({
      where: { id: requestId },
      include: BRANCH_STOCK_REQUEST_DETAIL_INCLUDE,
    });
  }

  async generateRequestNumber(tx: Prisma.TransactionClient): Promise<string> {
    const latest = await tx.branchStockRequest.findFirst({
      orderBy: { requestNumber: "desc" },
      select: { requestNumber: true },
    });
    const next = latest ? parseInt(latest.requestNumber.replace("BSR-", ""), 10) + 1 : 1;
    return `BSR-${String(next).padStart(6, "0")}`;
  }

  private async generateTransferNumber(tx: Prisma.TransactionClient): Promise<string> {
    const latest = await tx.branchStockTransfer.findFirst({
      orderBy: { transferNumber: "desc" },
      select: { transferNumber: true },
    });
    const next = latest ? parseInt(latest.transferNumber.replace("BST-", ""), 10) + 1 : 1;
    return `BST-${String(next).padStart(6, "0")}`;
  }

  async create(data: CreateBranchStockRequestData): Promise<BranchStockRequestDetail> {
    const { items, ...header } = data;

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('branch_stock_request_number'))`;
      const requestNumber = await this.generateRequestNumber(tx);

      const request = await tx.branchStockRequest.create({
        data: {
          ...header,
          requestNumber,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.quantity * item.unitPrice,
            })),
          },
        },
      });

      return tx.branchStockRequest.findUniqueOrThrow({
        where: { id: request.id },
        include: BRANCH_STOCK_REQUEST_DETAIL_INCLUDE,
      });
    });
  }

  /**
   * Approves a PENDING request. This is purely a status change — it does
   * NOT create a transfer or move any stock. Once APPROVED, the request
   * itself is locked (there is no update-request endpoint); the fulfiller
   * ships against it via shipRequestItems below, as many times as needed.
   */
  async approve(requestId: string, approvedById: string): Promise<BranchStockRequestDetail> {
    /**
     * Atomically claim the request: only a still-PENDING row can be
     * claimed, so a double-click or two approvers racing each other can
     * never both succeed.
     */
    const claim = await this.prisma.branchStockRequest.updateMany({
      where: { id: requestId, status: BranchStockRequestStatus.PENDING },
      data: {
        status: BranchStockRequestStatus.APPROVED,
        approvedById,
        approvedAt: new Date(),
      },
    });

    if (claim.count === 0) {
      throw new ConflictException(
        "This request is no longer pending — it may have already been approved or rejected",
      );
    }

    return this.prisma.branchStockRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: BRANCH_STOCK_REQUEST_DETAIL_INCLUDE,
    });
  }

  /**
   * How much of each request item is still outstanding, across every
   * non-cancelled transfer shipped against this request so far. A
   * CANCELLED transfer contributes nothing (excluded entirely). A
   * DISPATCHED transfer contributes its shipped quantity as-is — a
   * transfer is only ever created already-shipped (see shipRequestItems),
   * so there's no separate "planned vs actually sent" stage to account for.
   * A RECEIVED transfer contributes only what actually arrived
   * (receivedQuantity) — a shortfall in transit reopens that much balance
   * for a later shipment. So a request for 100 where only 80 got shipped
   * and only 60 of that arrived ends up with 40 still outstanding (the 20
   * never shipped, plus the 20 lost in transit).
   */
  private computeRemainingBalance(request: BranchStockRequestDetail): Map<string, number> {
    const committedByRequestItemId = new Map<string, number>();

    for (const transfer of request.transfers) {
      if (transfer.status === BranchStockTransferStatus.CANCELLED) continue;

      for (const transferItem of transfer.items) {
        const contribution =
          transfer.status === BranchStockTransferStatus.RECEIVED
            ? (transferItem.receivedQuantity ?? transferItem.quantity)
            : transferItem.quantity;

        committedByRequestItemId.set(
          transferItem.requestItemId,
          (committedByRequestItemId.get(transferItem.requestItemId) ?? 0) + contribution,
        );
      }
    }

    return new Map(
      request.items.map((requestItem) => [
        requestItem.id,
        requestItem.quantity - (committedByRequestItemId.get(requestItem.id) ?? 0),
      ]),
    );
  }

  /**
   * Ships (creates AND dispatches, in one step) a transfer for whatever
   * quantities the fulfiller states now — the full outstanding balance in
   * one call, or less if only part is ready (installment delivery, or
   * making up a previous shipment's shortfall). Stock leaves the source
   * immediately, in the same transaction. The advisory lock on the
   * requestId serializes concurrent shipments against the same request, so
   * two overlapping calls can never both claim the same remaining balance.
   */
  async shipRequestItems(
    requestId: string,
    requestedItems: ShipRequestItemData[],
    shippedById: string,
  ): Promise<BranchStockTransferDetail> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${requestId}))`;

      const request = await tx.branchStockRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: BRANCH_STOCK_REQUEST_DETAIL_INCLUDE,
      });

      const remainingByRequestItemId = this.computeRemainingBalance(request);

      const itemsToShip = requestedItems.map((requested) => {
        const requestItem = request.items.find((item) => item.id === requested.requestItemId);
        if (!requestItem) {
          throw new BadRequestException(
            `Item ${requested.requestItemId} does not belong to this request`,
          );
        }

        const remaining = remainingByRequestItemId.get(requested.requestItemId) ?? 0;
        if (requested.quantity > remaining) {
          throw new BadRequestException(
            `Cannot ship ${requested.quantity} of ${requestItem.product.name} — only ${remaining} remains outstanding on this request`,
          );
        }

        return {
          requestItemId: requestItem.id,
          productId: requestItem.productId,
          quantity: requested.quantity,
          unitPrice: Number(requestItem.unitPrice),
        };
      });

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('branch_stock_transfer_number'))`;
      const transferNumber = await this.generateTransferNumber(tx);
      const subtotal = itemsToShip.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      const transfer = await tx.branchStockTransfer.create({
        data: {
          transferNumber,
          fromBranchId: request.fulfillerBranchId,
          toBranchId: request.requesterBranchId,
          requestId,
          status: BranchStockTransferStatus.DISPATCHED,
          dispatchedById: shippedById,
          dispatchedAt: new Date(),
          subtotal,
          totalAmount: subtotal,
          items: {
            create: itemsToShip.map((item) => ({
              productId: item.productId,
              requestItemId: item.requestItemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.quantity * item.unitPrice,
            })),
          },
        },
      });

      for (const item of itemsToShip) {
        if (item.quantity <= 0) continue;

        if (request.fulfillerBranchId !== null) {
          await this.branchStockRepository.decrement(
            request.fulfillerBranchId,
            item.productId,
            item.quantity,
            tx,
          );
        } else {
          await this.factoryStockRepository.decrement(item.productId, item.quantity, tx);
        }
      }

      return tx.branchStockTransfer.findUniqueOrThrow({
        where: { id: transfer.id },
        include: BRANCH_STOCK_TRANSFER_DETAIL_INCLUDE,
      });
    });
  }

  /**
   * rejectedById/rejectedAt reuse the same approvedById/approvedAt columns
   * — both mean "who last decided on this request, and when", there's no
   * separate rejection-only column pair.
   */
  async reject(requestId: string, rejectedById: string): Promise<BranchStockRequestDetail> {
    const claim = await this.prisma.branchStockRequest.updateMany({
      where: { id: requestId, status: BranchStockRequestStatus.PENDING },
      data: {
        status: BranchStockRequestStatus.REJECTED,
        approvedById: rejectedById,
        approvedAt: new Date(),
      },
    });

    if (claim.count === 0) {
      throw new ConflictException(
        "This request is no longer pending — it may have already been approved or rejected",
      );
    }

    return this.prisma.branchStockRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: BRANCH_STOCK_REQUEST_DETAIL_INCLUDE,
    });
  }
}
