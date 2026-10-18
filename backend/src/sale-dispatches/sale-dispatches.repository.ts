import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SaleDispatchStatus, TransactionType } from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { syncProductBatchDerivedStatus } from "../product-management/product-batches/utils/batch-status.util";
import { SaleDispatchQueryDto } from "./dto/sale-dispatch-query.dto";
import { UpdateSaleDispatchDto } from "./dto/update-sale-dispatch.dto";
import { PaginatedResponse, buildPaginatedResponse, SortOrder } from "../common/dto/pagination.dto";

// ---------------------------------------------------------------------------
// Include shapes
// ---------------------------------------------------------------------------

// List view — no items, minimal sale/site fields
const DISPATCH_LIST_INCLUDE = {
  sale: {
    select: {
      id: true,
      saleNumber: true,
      status: true,
      saleDate: true,
      customer: { select: { id: true, shopName: true } },
    },
  },
  site: {
    select: { id: true, name: true, code: true },
  },
} satisfies Prisma.SaleDispatchInclude;

// Detail view — full items + batch names + site address
const DISPATCH_DETAIL_INCLUDE = {
  sale: {
    select: {
      id: true,
      saleNumber: true,
      status: true,
      saleDate: true,
      customer: {
        select: { id: true, shopName: true, phone: true, email: true },
      },
    },
  },
  site: {
    select: {
      id: true,
      name: true,
      code: true,
      location: {
        select: { address: true, city: true, state: true, country: true },
      },
    },
  },
  items: {
    include: {
      saleItem: {
        select: {
          id: true,
          itemName: true,
          sku: true,
          quantity: true,
          dispatchedQuantity: true,
        },
      },
      productBatch: {
        select: { id: true, batchNumber: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.SaleDispatchInclude;

export type SaleDispatchSummary = Prisma.SaleDispatchGetPayload<{
  include: typeof DISPATCH_LIST_INCLUDE;
}>;

export type SaleDispatchWithDetails = Prisma.SaleDispatchGetPayload<{
  include: typeof DISPATCH_DETAIL_INCLUDE;
}>;

@Injectable()
export class SaleDispatchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // GENERATE DISPATCH NUMBER
  // ---------------------------------------------------------------------------

  async generateDispatchNumber(
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx ?? this.prisma;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const last = await client.saleDispatch.findFirst({
      where: { dispatchNumber: { startsWith: `SD-${dateStr}` } },
      orderBy: { dispatchNumber: "desc" },
    });
    const seq = last ? parseInt(last.dispatchNumber.split("-")[2]) + 1 : 1;
    return `SD-${dateStr}-${seq.toString().padStart(4, "0")}`;
  }

  // ---------------------------------------------------------------------------
  // GENERATE DISPATCHES FROM SALE
  //
  // Auto-allocates product batches FIFO per site and creates one SaleDispatch
  // per site. Batch-level reservation (availableQty ↓, reservedQty ↑) happens
  // here — product-level reservation was already done at sale creation.
  // ---------------------------------------------------------------------------

  async generateFromSale(saleId: string, userId: string): Promise<SaleDispatchWithDetails[]> {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: {
          saleItems: { where: { productId: { not: null } } },
        },
      });

      if (!sale) throw new NotFoundException(`Sale ${saleId} not found`);

      // Check no active dispatches already exist for this sale
      const existing = await tx.saleDispatch.count({
        where: {
          saleId,
          status: { in: [SaleDispatchStatus.DRAFT, SaleDispatchStatus.APPROVED] },
        },
      });
      if (existing > 0) {
        throw new BadRequestException(
          "Active dispatches already exist for this sale. Delete or cancel them before regenerating.",
        );
      }

      // Allocate batches per sale item using FIFO, grouped by site
      // siteAllocations: siteId → list of { saleItemId, productBatchId, quantity }
      const siteAllocations = new Map<
        string,
        Array<{ saleItemId: string; productBatchId: string; quantity: number }>
      >();

      for (const item of sale.saleItems) {
        if (!item.productId) continue;

        const alreadyDispatched = Number(item.dispatchedQuantity);
        const remaining = Number(item.quantity) - alreadyDispatched;
        if (remaining <= 0.001) continue;

        const batches = await tx.productBatch.findMany({
          where: {
            productId: item.productId,
            status: "ACTIVE",
            availableQuantity: { gt: 0 },
            siteId: { not: null },
          },
          orderBy: { createdAt: "asc" },
        });

        const totalAvailable = batches.reduce((s, b) => s + b.availableQuantity, 0);
        if (totalAvailable < remaining - 0.001) {
          throw new BadRequestException(
            `Insufficient batch stock for "${item.itemName}": need ${remaining.toFixed(3)}, available ${totalAvailable.toFixed(3)}`,
          );
        }

        let leftToAllocate = remaining;

        for (const batch of batches) {
          if (leftToAllocate <= 0.001) break;

          const take = Math.min(batch.availableQuantity, leftToAllocate);
          const siteId = batch.siteId!;

          if (!siteAllocations.has(siteId)) {
            siteAllocations.set(siteId, []);
          }
          siteAllocations.get(siteId)!.push({
            saleItemId: item.id,
            productBatchId: batch.id,
            quantity: take,
          });

          // Reserve at batch level
          await tx.productBatch.update({
            where: { id: batch.id },
            data: {
              availableQuantity: { decrement: take },
              reservedQuantity: { increment: take },
            },
          });
          await syncProductBatchDerivedStatus(tx, batch.id);

          leftToAllocate -= take;
        }
      }

      if (siteAllocations.size === 0) {
        throw new BadRequestException(
          "No dispatchable items found — all items may already be fully dispatched or have no available stock.",
        );
      }

      // Snapshot site managers and create one dispatch per site
      const createdDispatchIds: string[] = [];

      for (const [siteId, allocations] of siteAllocations) {
        const site = await tx.site.findUnique({
          where: { id: siteId },
          select: { managerId: true },
        });

        const dispatchNumber = await this.generateDispatchNumber(tx);

        const dispatch = await tx.saleDispatch.create({
          data: {
            dispatchNumber,
            saleId,
            siteId,
            status: SaleDispatchStatus.DRAFT,
            createdById: userId,
            dispatchOfficerId: userId,
            siteManagerId: site?.managerId ?? "",
            items: {
              create: allocations.map((a) => ({
                saleItemId: a.saleItemId,
                productBatchId: a.productBatchId,
                quantity: a.quantity,
              })),
            },
          },
          select: { id: true },
        });

        createdDispatchIds.push(dispatch.id);
      }

      return tx.saleDispatch.findMany({
        where: { id: { in: createdDispatchIds } },
        include: DISPATCH_DETAIL_INCLUDE,
        orderBy: { createdAt: "asc" },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // ORDER BY resolver
  //
  // Maps a client sort token to a Prisma orderBy. Scalar columns sort directly;
  // relation columns (sale #, customer, site) need an explicit nested orderBy —
  // the generic scalar `buildOrderBy` cannot express these.
  // ---------------------------------------------------------------------------

  private buildDispatchOrderBy(
    sortBy?: string,
    sortOrder?: SortOrder,
  ): Prisma.SaleDispatchOrderByWithRelationInput {
    const order: Prisma.SortOrder =
      (sortOrder ?? SortOrder.DESC).toLowerCase() === "asc" ? "asc" : "desc";

    switch (sortBy) {
      case "sale":
        return { sale: { saleNumber: order } };
      case "customer":
        return { sale: { customer: { shopName: order } } };
      case "site":
        return { site: { name: order } };
      case "dispatchNumber":
        return { dispatchNumber: order };
      case "status":
        return { status: order };
      case "createdAt":
        return { createdAt: order };
      default:
        return { createdAt: "desc" };
    }
  }

  // ---------------------------------------------------------------------------
  // FIND ALL — paginated
  // ---------------------------------------------------------------------------

  async findAll(
    saleDispatchQueryDto: SaleDispatchQueryDto,
  ): Promise<PaginatedResponse<SaleDispatchSummary>> {
    const { page, limit, saleId, siteId, status, startDate, endDate, search, sortBy, sortOrder } =
      saleDispatchQueryDto;

    const skip = (page - 1) * limit;

    const where: Prisma.SaleDispatchWhereInput = {};
    if (saleId) where.saleId = saleId;
    if (siteId) where.siteId = siteId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }
    if (search) {
      where.dispatchNumber = { contains: search, mode: "insensitive" };
    }

    const orderBy = this.buildDispatchOrderBy(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.saleDispatch.findMany({
        where,
        include: DISPATCH_LIST_INCLUDE,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.saleDispatch.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page ?? 1, limit ?? 10);
  }

  // ---------------------------------------------------------------------------
  // FIND ONE
  // ---------------------------------------------------------------------------

  async findById(saleDispatchId: string): Promise<SaleDispatchWithDetails> {
    const dispatch = await this.prisma.saleDispatch.findUnique({
      where: { id: saleDispatchId },
      include: DISPATCH_DETAIL_INCLUDE,
    });

    if (!dispatch) {
      throw new NotFoundException(`Sale dispatch ${saleDispatchId} not found`);
    }

    return dispatch;
  }

  // ---------------------------------------------------------------------------
  // UPDATE — handles officer/notes changes and status transitions.
  //
  // DELIVERED:  ProductBatch reservedQty ↓, consumedQty ↑
  //             Product currentStock ↓, reservedStock ↓
  //             SaleItem dispatchedQuantity ↑
  //             StockTransaction created
  // APPROVED:   approvedAt stamped
  // DRAFT:      approvedAt cleared (reject)
  // ---------------------------------------------------------------------------

  async update(
    saleDispatchId: string,
    updateSaleDispatchDto: UpdateSaleDispatchDto,
    dispatch: SaleDispatchWithDetails,
    userId: string,
  ): Promise<SaleDispatchWithDetails> {
    const { status, dispatchOfficerId, notes } = updateSaleDispatchDto;

    switch (status) {
      case SaleDispatchStatus.DELIVERED:
        return this.applyDelivered(saleDispatchId, dispatch, userId);

      default: {
        const data: Prisma.SaleDispatchUpdateInput = {};
        if (status === SaleDispatchStatus.APPROVED) data.approvedAt = new Date();
        if (status === SaleDispatchStatus.DRAFT) data.approvedAt = null;
        if (status) data.status = status;
        if (dispatchOfficerId) data.dispatchOfficerId = dispatchOfficerId;
        if (notes !== undefined) data.notes = notes;

        return this.prisma.saleDispatch.update({
          where: { id: saleDispatchId },
          data,
          include: DISPATCH_DETAIL_INCLUDE,
        });
      }
    }
  }

  private async applyDelivered(
    saleDispatchId: string,
    dispatch: SaleDispatchWithDetails,
    userId: string,
  ): Promise<SaleDispatchWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      const itemQtyMap = new Map<string, number>();

      for (const dispatchItem of dispatch.items) {
        await tx.productBatch.update({
          where: { id: dispatchItem.productBatchId },
          data: {
            reservedQuantity: { decrement: dispatchItem.quantity },
            consumedQuantity: { increment: dispatchItem.quantity },
          },
        });
        await syncProductBatchDerivedStatus(tx, dispatchItem.productBatchId);

        itemQtyMap.set(
          dispatchItem.saleItemId,
          (itemQtyMap.get(dispatchItem.saleItemId) ?? 0) + dispatchItem.quantity,
        );
      }

      const saleItemsWithProduct = await tx.saleItem.findMany({
        where: { id: { in: [...itemQtyMap.keys()] } },
        select: { id: true, productId: true, itemName: true },
      });

      const productMap = new Map<string, { qty: number; itemName: string }>();

      for (const si of saleItemsWithProduct) {
        if (!si.productId) continue;
        const qty = itemQtyMap.get(si.id) ?? 0;
        const prev = productMap.get(si.productId);
        productMap.set(si.productId, { qty: (prev?.qty ?? 0) + qty, itemName: si.itemName });
      }

      for (const [productId, { qty, itemName }] of productMap) {
        await tx.product.update({
          where: { id: productId },
          data: { currentStock: { decrement: qty }, reservedStock: { decrement: qty } },
        });

        await tx.stockTransaction.create({
          data: {
            productId,
            type: TransactionType.SALE,
            quantity: qty,
            saleId: dispatch.saleId,
            referenceNo: dispatch.dispatchNumber,
            remarks: `Dispatch ${dispatch.dispatchNumber} — ${itemName}`,
            createdById: userId,
          },
        });
      }

      for (const [saleItemId, qty] of itemQtyMap) {
        await tx.saleItem.update({
          where: { id: saleItemId },
          data: { dispatchedQuantity: { increment: qty } },
        });
      }

      return tx.saleDispatch.update({
        where: { id: saleDispatchId },
        data: { status: SaleDispatchStatus.DELIVERED, deliveredAt: new Date() },
        include: DISPATCH_DETAIL_INCLUDE,
      });
    });
  }
}
