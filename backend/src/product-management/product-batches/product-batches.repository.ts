import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  ProductBatchStageStatus,
  ProductBatchStatus,
  StockTransactionType,
} from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { buildOrderBy, buildSearchFilter } from "../../common/utils/pagination.helper";
import { getTotalPages } from "../../common/reuseable-functions/getTotalPages";
import { QueryProductBatchDto } from "./dto/query-product-batch.dto";
import { StartProductBatchStageDto } from "./dto/start-product-batch-stage.dto";
import { CompleteProductBatchStageDto } from "./dto/complete-product-batch-stage.dto";
import { FinalizeProductBatchDto } from "./dto/finalize-product-batch.dto";
import { UpdateProductBatchDto } from "./dto/update-product-batch.dto";

export const PRODUCT_BATCH_INCLUDE = {
  product: { select: { id: true, name: true, code: true } },
  site: { select: { id: true, name: true, code: true } },
  productionOrder: { select: { id: true, orderNumber: true } },
  stages: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.ProductBatchInclude;

export type ProductBatchWithRelations = Prisma.ProductBatchGetPayload<{
  include: typeof PRODUCT_BATCH_INCLUDE;
}>;

export type ProductBatchStage = Prisma.ProductBatchStageGetPayload<Record<string, never>>;

@Injectable()
export class ProductBatchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async generateBatchNumber(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `PB-${yyyymm}-`;

    const existingCount = await tx.productBatch.count({
      where: { batchNumber: { startsWith: prefix } },
    });

    let seq = existingCount + 1;
    let batchNumber = `${prefix}${String(seq).padStart(4, "0")}`;

    while (await tx.productBatch.findUnique({ where: { batchNumber } })) {
      seq++;
      batchNumber = `${prefix}${String(seq).padStart(4, "0")}`;
    }

    return batchNumber;
  }

  /**
   * Adjusts Product.currentStock and records a StockLedger entry. Only
   * "finished" quantity (isFinal batches) ever contributes to currentStock.
   */
  async applyStockChange(
    tx: Prisma.TransactionClient,
    params: {
      productId: string;
      productBatchId: string;
      delta: number;
      referenceType: string;
      referenceId: string;
      remarks: string;
      userId: string;
    },
  ): Promise<void> {
    const { productId, productBatchId, delta, referenceType, referenceId, remarks, userId } =
      params;

    if (delta === 0) return;

    const product = await tx.product.findUniqueOrThrow({
      where: { id: productId },
      select: { currentStock: true },
    });

    const closingQty = product.currentStock + delta;

    await tx.product.update({
      where: { id: productId },
      data: { currentStock: closingQty },
    });

    await tx.stockLedger.create({
      data: {
        productId,
        productBatchId,
        quantity: delta,
        transactionType: delta > 0 ? StockTransactionType.IN : StockTransactionType.ADJUSTMENT,
        referenceType,
        referenceId,
        openingQty: product.currentStock,
        closingQty,
        remarks,
        createdById: userId,
      },
    });
  }

  /**
   * Creates the initial ProductBatch (and its first "Production" stage row)
   * when a ProductionOrder completes.
   */
  async createFromProductionOrder(
    tx: Prisma.TransactionClient,
    data: {
      productId: string;
      siteId?: string | null;
      productionOrderId: string;
      quantity: number;
      costPerUnit: number;
    },
    userId: string,
  ): Promise<ProductBatchWithRelations> {
    const batchNumber = await this.generateBatchNumber(tx);

    const batch = await tx.productBatch.create({
      data: {
        batchNumber,
        productId: data.productId,
        siteId: data.siteId ?? null,
        productionOrderId: data.productionOrderId,
        currentStage: "Production",
        isFinal: false,
        quantity: data.quantity,
        availableQuantity: 0, // locked until Production stage is completed
        costPerUnit: data.costPerUnit,
        status: ProductBatchStatus.ACTIVE,
        createdById: userId,
      },
      include: PRODUCT_BATCH_INCLUDE,
    });

    // Production stage starts IN_PROGRESS — the user must explicitly complete it
    // (recording approved/rejected quantities) before starting the next stage.
    await tx.productBatchStage.create({
      data: {
        productBatchId: batch.id,
        stageName: "Production",
        siteId: data.siteId ?? null,
        status: ProductBatchStageStatus.IN_PROGRESS,
        receivedQuantity: data.quantity,
        createdById: userId,
      },
    });

    return batch;
  }

  async findAll(
    query: QueryProductBatchDto,
  ): Promise<PaginatedResponse<ProductBatchWithRelations>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy,
      sortOrder,
      productId,
      siteId,
      status,
      currentStage,
      isFinal,
      startDate,
      endDate,
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.ProductBatchWhereInput = { deletedAt: null };

    if (productId) where.productId = productId;
    if (siteId) where.siteId = siteId;
    if (status) where.status = status;
    if (currentStage) where.currentStage = currentStage;
    if (isFinal !== undefined) where.isFinal = isFinal;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }
    if (search) where.OR = buildSearchFilter(search, ["batchNumber"]);

    // Batch numbers are formatted PB-YYYYMM-NNNN and the sequence RESETS every
    // month, so a pure lexical sort on batchNumber does not reliably give
    // strict newest-first / oldest-last across months (and breaks once a
    // monthly sequence exceeds its zero-padding). Batch numbers are assigned in
    // creation order, so sorting by createdAt is the robust chronological
    // equivalent: DESC → newest batch first, ASC → oldest (…-0001) first.
    const effectiveSortBy = sortBy === "batchNumber" ? "createdAt" : sortBy;
    const orderBy = effectiveSortBy
      ? buildOrderBy(effectiveSortBy, sortOrder)
      : { createdAt: "desc" };

    const [data, total] = await Promise.all([
      this.prisma.productBatch.findMany({
        where,
        include: PRODUCT_BATCH_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.productBatch.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: getTotalPages(total, limit),
        hasNext: page < getTotalPages(total, limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Distinct current-stage values across all non-deleted batches. Stage names
   * are free-form strings (no enum), so this powers the static "Current Stage"
   * filter options — computing them from the full dataset rather than the
   * on-screen (server-paginated) page.
   */
  async findDistinctStages(): Promise<string[]> {
    const rows = await this.prisma.productBatch.findMany({
      where: { deletedAt: null },
      distinct: ["currentStage"],
      select: { currentStage: true },
      orderBy: { currentStage: "asc" },
    });

    return rows.map((r) => r.currentStage).filter((s): s is string => !!s);
  }

  async findOne(productBatchId: string): Promise<ProductBatchWithRelations> {
    const batch = await this.prisma.productBatch.findUnique({
      where: { id: productBatchId, deletedAt: null },
      include: PRODUCT_BATCH_INCLUDE,
    });

    if (!batch) throw new NotFoundException(`Product batch ${productBatchId} not found`);

    return batch;
  }

  async findByProductionOrderId(
    productionOrderId: string,
  ): Promise<ProductBatchWithRelations | null> {
    return this.prisma.productBatch.findFirst({
      where: { productionOrderId, deletedAt: null },
      include: PRODUCT_BATCH_INCLUDE,
    });
  }

  /**
   * Latest non-cancelled stage for a batch — represents the batch's current
   * position (either the in-progress stage, or the last completed one).
   */
  async findLatestStage(productBatchId: string): Promise<ProductBatchStage | null> {
    return this.prisma.productBatchStage.findFirst({
      where: { productBatchId, status: { not: ProductBatchStageStatus.CANCELLED } },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Most recent non-cancelled stage before the given one — the state to
   * revert to when cancelling.
   */
  async findPreviousStage(
    productBatchId: string,
    excludeStageId: string,
  ): Promise<ProductBatchStage | null> {
    return this.prisma.productBatchStage.findFirst({
      where: {
        productBatchId,
        id: { not: excludeStageId },
        status: { not: ProductBatchStageStatus.CANCELLED },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findStage(productBatchId: string, stageId: string): Promise<ProductBatchStage> {
    const stage = await this.prisma.productBatchStage.findFirst({
      where: { id: stageId, productBatchId },
    });

    if (!stage) throw new NotFoundException(`Stage ${stageId} not found for this batch`);

    return stage;
  }

  /**
   * Begins the next stage for a batch: snapshots the batch's available
   * quantity as this stage's receivedQuantity, moves the batch's current
   * stage/site, and zeroes out availableQuantity until the stage is
   * completed (it is "locked" while in progress).
   */
  async startStage(
    tx: Prisma.TransactionClient,
    batch: ProductBatchWithRelations,
    dto: StartProductBatchStageDto,
    userId: string,
  ): Promise<void> {
    const receivedQuantity = batch.availableQuantity;
    const siteId = dto.siteId ?? batch.siteId;

    // Locks the batch row so concurrent startStage calls serialize here —
    // the in-progress check below is then safe from race conditions.
    await tx.productBatch.update({
      where: { id: batch.id },
      data: {
        currentStage: dto.stageName,
        siteId,
        availableQuantity: 0,
        updatedById: userId,
      },
    });

    const existingInProgress = await tx.productBatchStage.findFirst({
      where: { productBatchId: batch.id, status: ProductBatchStageStatus.IN_PROGRESS },
    });

    if (existingInProgress) {
      throw new ConflictException(
        `Batch ${batch.batchNumber} already has stage "${existingInProgress.stageName}" in progress — ` +
          `complete or cancel it before starting a new stage`,
      );
    }

    await tx.productBatchStage.create({
      data: {
        productBatchId: batch.id,
        stageName: dto.stageName,
        siteId,
        status: ProductBatchStageStatus.IN_PROGRESS,
        receivedQuantity,
        startedAt: new Date(),
        createdById: userId,
      },
    });
  }

  /**
   * Completes the in-progress stage: records approved/rejected quantities
   * and cost, recomputes costPerUnit, and rolls up rejected quantity for
   * lifetime reporting. Does NOT finalize the batch — call finalizeBatch
   * separately when all stages are done.
   */
  async completeStage(
    tx: Prisma.TransactionClient,
    batch: ProductBatchWithRelations,
    stage: ProductBatchStage,
    dto: CompleteProductBatchStageDto,
    newCostPerUnit: number,
    userId: string,
  ): Promise<void> {
    const rejectedQuantity = dto.rejectedQuantity ?? 0;
    const additionalCost = dto.additionalCost ?? 0;

    await tx.productBatch.update({
      where: { id: batch.id },
      data: {
        quantity: dto.approvedQuantity,
        availableQuantity: dto.approvedQuantity,
        consumedQuantity: 0,
        reservedQuantity: 0,
        returnedQuantity: 0,
        costPerUnit: newCostPerUnit,
        notes: dto.notes ?? batch.notes,
        updatedById: userId,
      },
    });

    await tx.productBatchStage.update({
      where: { id: stage.id },
      data: {
        status: ProductBatchStageStatus.COMPLETED,
        approvedQuantity: dto.approvedQuantity,
        rejectedQuantity,
        additionalCost,
        costPerUnit: newCostPerUnit,
        notes: dto.notes,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Marks a batch as a finished good: sets isFinal, records pricing/dates,
   * adds quantity to Product.currentStock via the stock ledger, and syncs
   * Product.sellingPrice to retailPrice if provided.
   *
   * The batch's current stage must already be completed (enforced in the
   * service) — finalize never touches stage status. It pushes the batch's
   * availableQuantity into stock.
   */
  async finalizeBatch(
    tx: Prisma.TransactionClient,
    batch: ProductBatchWithRelations,
    dto: FinalizeProductBatchDto,
    userId: string,
  ): Promise<void> {
    const effectiveQuantity = batch.availableQuantity;

    await tx.productBatch.update({
      where: { id: batch.id },
      data: {
        isFinal: true,
        retailPrice: dto.retailPrice ?? batch.retailPrice,
        salePrice: dto.salePrice ?? batch.salePrice,
        manufacturingDate: dto.manufacturingDate
          ? new Date(dto.manufacturingDate)
          : batch.manufacturingDate,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : batch.expiryDate,
        notes: dto.notes ?? batch.notes,
        updatedById: userId,
      },
    });

    await this.applyStockChange(tx, {
      productId: batch.productId,
      productBatchId: batch.id,
      delta: effectiveQuantity,
      referenceType: "PRODUCT_BATCH_FINALIZED",
      referenceId: batch.id,
      remarks: `Batch finalized: ${batch.batchNumber}`,
      userId,
    });

    // Update product's AVCO cost price from this finalized batch, and sync the
    // selling price to the batch's retail price when one was provided.
    const retailPrice = dto.retailPrice ?? batch.retailPrice;
    await tx.product.update({
      where: { id: batch.productId },
      data: {
        costPrice: batch.costPerUnit,
        ...(retailPrice != null ? { sellingPrice: retailPrice } : {}),
      },
    });
  }

  /**
   * Cancels the latest stage (in-progress or completed) and reverts the
   * batch back to the state recorded by the previous stage, undoing any
   * stock/rejected-quantity effects that stage applied.
   */
  async cancelStage(
    tx: Prisma.TransactionClient,
    batch: ProductBatchWithRelations,
    stage: ProductBatchStage,
    previousStage: ProductBatchStage | null,
    userId: string,
  ): Promise<void> {
    await tx.productBatchStage.update({
      where: { id: stage.id },
      data: { status: ProductBatchStageStatus.CANCELLED, completedAt: new Date() },
    });

    // With a previous stage, revert to its recorded state. Without one (the
    // initial "Production" stage), keep the batch on this stage's name/site and
    // release the produced quantity back as available.
    await tx.productBatch.update({
      where: { id: batch.id },
      data: {
        currentStage: previousStage?.stageName ?? stage.stageName,
        siteId: previousStage ? previousStage.siteId : batch.siteId,
        isFinal: false,
        quantity: stage.receivedQuantity,
        availableQuantity: stage.receivedQuantity,
        costPerUnit: previousStage?.costPerUnit ?? batch.costPerUnit,
        updatedById: userId,
      },
    });

    if (stage.rejectedQuantity) {
      await tx.product.update({
        where: { id: batch.productId },
        data: { totalRejectedQuantity: { decrement: stage.rejectedQuantity } },
      });
    }
  }

  async update(
    productBatchId: string,
    data: UpdateProductBatchDto,
    userId: string,
  ): Promise<ProductBatchWithRelations> {
    return this.prisma.productBatch.update({
      where: { id: productBatchId },
      data: { ...data, updatedById: userId },
      include: PRODUCT_BATCH_INCLUDE,
    });
  }

  /**
   * Stage-wise stock breakdown for a product — how many units are
   * currently at each stage, and how many are finished/sellable.
   */
  async getStockByProduct(
    productId: string,
  ): Promise<Array<{ stage: string; isFinal: boolean; quantity: number; batchCount: number }>> {
    const groups = await this.prisma.productBatch.groupBy({
      by: ["currentStage", "isFinal"],
      where: {
        productId,
        deletedAt: null,
        status: { notIn: [ProductBatchStatus.CONSUMED, ProductBatchStatus.EXPIRED] },
      },
      _sum: { availableQuantity: true },
      _count: { _all: true },
    });

    return groups.map((g) => ({
      stage: g.currentStage,
      isFinal: g.isFinal,
      quantity: g._sum.availableQuantity ?? 0,
      batchCount: g._count._all,
    }));
  }
}
