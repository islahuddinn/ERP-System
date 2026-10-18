import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ProductBatchStageStatus, ProductBatchStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { ProductBatchesRepository, ProductBatchWithRelations } from "./product-batches.repository";
import { QueryProductBatchDto } from "./dto/query-product-batch.dto";
import { StartProductBatchStageDto } from "./dto/start-product-batch-stage.dto";
import { CompleteProductBatchStageDto } from "./dto/complete-product-batch-stage.dto";
import { FinalizeProductBatchDto } from "./dto/finalize-product-batch.dto";
import { UpdateProductBatchDto } from "./dto/update-product-batch.dto";
import { AuditContextService } from "../../audit/audit-context.service";
import { RequestWithUser } from "src/common/interfaces";

const ACTIVE_STATUSES: ProductBatchStatus[] = [
  ProductBatchStatus.ACTIVE,
  ProductBatchStatus.PARTIAL,
];

@Injectable()
export class ProductBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productBatchesRepository: ProductBatchesRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  findAll(query: QueryProductBatchDto): Promise<PaginatedResponse<ProductBatchWithRelations>> {
    return this.productBatchesRepository.findAll(query);
  }

  findOne(productBatchId: string): Promise<ProductBatchWithRelations> {
    return this.productBatchesRepository.findOne(productBatchId);
  }

  async findByProductionOrderId(productionOrderId: string): Promise<ProductBatchWithRelations> {
    const batch = await this.productBatchesRepository.findByProductionOrderId(productionOrderId);
    if (!batch) throw new NotFoundException("No product batch found for this production order");
    return batch;
  }

  getStockByProduct(productId: string) {
    return this.productBatchesRepository.getStockByProduct(productId);
  }

  getDistinctStages(): Promise<string[]> {
    return this.productBatchesRepository.findDistinctStages();
  }

  /**
   * Begins the next stage (e.g. Packing, Processing) for a batch. The
   * entire current availableQuantity is "checked into" the new stage
   * (recorded as receivedQuantity) and is unavailable until the stage is
   * completed. Only one stage can be in progress at a time.
   */
  async startStage(
    productBatchId: string,
    dto: StartProductBatchStageDto,
    req: RequestWithUser,
  ): Promise<ProductBatchWithRelations> {
    const { id: userId } = req.user;

    const batch = await this.productBatchesRepository.findOne(productBatchId);

    if (!ACTIVE_STATUSES.includes(batch.status)) {
      throw new BadRequestException(
        `Batch ${batch.batchNumber} cannot be processed further (status: ${batch.status})`,
      );
    }

    if (batch.isFinal) {
      throw new BadRequestException(
        `Batch ${batch.batchNumber} is already a finished good and cannot be moved to another stage`,
      );
    }

    const latestStage = await this.productBatchesRepository.findLatestStage(batch.id);

    if (latestStage?.status === ProductBatchStageStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Batch ${batch.batchNumber} already has stage "${latestStage.stageName}" in progress — ` +
          `complete or cancel it before starting a new stage`,
      );
    }

    if (batch.availableQuantity <= 0) {
      throw new BadRequestException(
        `Batch ${batch.batchNumber} has no available quantity to process`,
      );
    }

    this.auditContext.setOldValue(batch);
    this.auditContext.setEntityLabel(batch.batchNumber);

    await this.prisma.$transaction((tx) =>
      this.productBatchesRepository.startStage(tx, batch, dto, userId),
    );

    return this.productBatchesRepository.findOne(productBatchId);
  }

  /**
   * Completes the in-progress stage: records approved/rejected quantities
   * and additional cost, recomputes costPerUnit.
   *
   * costPerUnit is recomputed as:
   *   (previousCostPerUnit * receivedQuantity + additionalCost) / approvedQuantity
   *
   * To mark a batch as a finished good, call finalizeBatch after all stages
   * are done.
   */
  async completeStage(
    productBatchId: string,
    stageId: string,
    dto: CompleteProductBatchStageDto,
    req: RequestWithUser,
  ): Promise<ProductBatchWithRelations> {
    const { id: userId } = req.user;

    const batch = await this.productBatchesRepository.findOne(productBatchId);
    const stage = await this.productBatchesRepository.findStage(productBatchId, stageId);

    if (stage.status !== ProductBatchStageStatus.IN_PROGRESS) {
      throw new BadRequestException(`Stage "${stage.stageName}" is not in progress`);
    }

    const { approvedQuantity } = dto;
    const rejectedQuantity = dto.rejectedQuantity ?? 0;

    if (approvedQuantity > stage.receivedQuantity) {
      throw new BadRequestException(
        `Stage "${stage.stageName}" received ${stage.receivedQuantity} units — ` +
          `approvedQuantity (${approvedQuantity}) cannot exceed that`,
      );
    }

    if (rejectedQuantity > stage.receivedQuantity) {
      throw new BadRequestException(
        `Stage "${stage.stageName}" received ${stage.receivedQuantity} units — ` +
          `rejectedQuantity (${rejectedQuantity}) cannot exceed that`,
      );
    }

    if (approvedQuantity + rejectedQuantity !== stage.receivedQuantity) {
      throw new BadRequestException(
        `Stage "${stage.stageName}": approvedQuantity (${approvedQuantity}) + rejectedQuantity (${rejectedQuantity}) ` +
          `= ${approvedQuantity + rejectedQuantity}, but must account for all received units (${stage.receivedQuantity}). ` +
          `Missing: ${stage.receivedQuantity - approvedQuantity - rejectedQuantity}`,
      );
    }

    this.auditContext.setOldValue(batch);
    this.auditContext.setEntityLabel(batch.batchNumber);

    const additionalCost = dto.additionalCost ?? 0;
    const newCostPerUnit =
      (batch.costPerUnit * stage.receivedQuantity + additionalCost) / stage.receivedQuantity;

    await this.prisma.$transaction((tx) =>
      this.productBatchesRepository.completeStage(tx, batch, stage, dto, newCostPerUnit, userId),
    );

    return this.productBatchesRepository.findOne(productBatchId);
  }

  /**
   * Marks a batch as a finished good: sets isFinal, adds the batch's
   * availableQuantity to Product.currentStock, records a StockLedger entry,
   * and updates the product's selling price if retailPrice is provided.
   */
  async finalizeBatch(
    productBatchId: string,
    dto: FinalizeProductBatchDto,
    req: RequestWithUser,
  ): Promise<ProductBatchWithRelations> {
    const { id: userId } = req.user;

    const batch = await this.productBatchesRepository.findOne(productBatchId);

    if (!ACTIVE_STATUSES.includes(batch.status)) {
      throw new BadRequestException(
        `Batch ${batch.batchNumber} cannot be finalized (status: ${batch.status})`,
      );
    }

    if (batch.isFinal) {
      throw new BadRequestException(`Batch ${batch.batchNumber} is already finalized`);
    }

    // Finalizing must NOT auto-complete an in-progress stage — stage completion
    // is its own workflow (record approved/rejected qty + cost). Require the
    // current stage to be completed (or cancelled) before finalizing so the
    // approved quantity is definite. See QA bug #55.
    const latestStage = await this.productBatchesRepository.findLatestStage(batch.id);

    if (latestStage?.status === ProductBatchStageStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Batch ${batch.batchNumber} has stage "${latestStage.stageName}" still in progress — ` +
          `complete that stage before finalizing the batch`,
      );
    }

    if (batch.availableQuantity <= 0) {
      throw new BadRequestException(
        `Batch ${batch.batchNumber} has no available quantity to finalize`,
      );
    }

    // Guard against an expiry date that precedes the manufacturing date, using
    // whichever value the request supplies falling back to what's on the batch.
    // See QA bug #54.
    const manufacturingDate = dto.manufacturingDate
      ? new Date(dto.manufacturingDate)
      : batch.manufacturingDate;
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : batch.expiryDate;

    if (manufacturingDate && expiryDate && expiryDate < manufacturingDate) {
      throw new BadRequestException(
        "Expiry date cannot be earlier than the manufacturing date",
      );
    }

    this.auditContext.setOldValue(batch);
    this.auditContext.setEntityLabel(batch.batchNumber);

    await this.prisma.$transaction((tx) =>
      this.productBatchesRepository.finalizeBatch(tx, batch, dto, userId),
    );

    return this.productBatchesRepository.findOne(productBatchId);
  }

  /**
   * Cancels the latest stage (in-progress or completed) and reverts the
   * batch back to the state recorded by the previous stage, including any
   * stock or rejected-quantity effects that stage applied. Only the latest
   * stage can be cancelled. Cancelling the initial "Production" stage (which has
   * no prior stage) releases the produced quantity back as available.
   */
  async cancelStage(
    productBatchId: string,
    stageId: string,
    req: RequestWithUser,
  ): Promise<ProductBatchWithRelations> {
    const { id: userId } = req.user;

    const batch = await this.productBatchesRepository.findOne(productBatchId);
    const stage = await this.productBatchesRepository.findStage(productBatchId, stageId);

    if (stage.status === ProductBatchStageStatus.CANCELLED) {
      throw new BadRequestException(`Stage "${stage.stageName}" is already cancelled`);
    }

    if (batch.isFinal) {
      throw new BadRequestException(
        `Batch ${batch.batchNumber} is already finalized — stages cannot be cancelled`,
      );
    }

    const latestStage = await this.productBatchesRepository.findLatestStage(batch.id);

    if (latestStage?.id !== stage.id) {
      throw new BadRequestException(
        `Only the latest stage ("${latestStage?.stageName}") can be cancelled`,
      );
    }

    // The initial "Production" stage has no prior stage to revert to; cancelling
    // it releases the produced quantity back as available (previousStage = null).
    // See QA bug #50.
    const previousStage = await this.productBatchesRepository.findPreviousStage(batch.id, stage.id);

    this.auditContext.setOldValue(batch);
    this.auditContext.setEntityLabel(batch.batchNumber);

    await this.prisma.$transaction((tx) =>
      this.productBatchesRepository.cancelStage(tx, batch, stage, previousStage, userId),
    );

    return this.productBatchesRepository.findOne(productBatchId);
  }

  async update(
    productBatchId: string,
    dto: UpdateProductBatchDto,
    userId: string,
  ): Promise<ProductBatchWithRelations> {
    const batch = await this.productBatchesRepository.findOne(productBatchId);

    this.auditContext.setOldValue(batch);
    this.auditContext.setEntityLabel(batch.batchNumber);

    // Sale price may not be set below the retail price (QA #42). Compare the
    // effective values — the incoming dto value when provided, otherwise what
    // is already stored on the batch.
    const effectiveRetailPrice =
      dto.retailPrice ?? (batch.retailPrice != null ? Number(batch.retailPrice) : undefined);
    const effectiveSalePrice =
      dto.salePrice ?? (batch.salePrice != null ? Number(batch.salePrice) : undefined);

    if (
      effectiveRetailPrice != null &&
      effectiveSalePrice != null &&
      effectiveSalePrice < effectiveRetailPrice
    ) {
      throw new BadRequestException("Sale price cannot be lower than the retail price");
    }

    if (dto.status) {
      if (
        batch.status === ProductBatchStatus.CONSUMED ||
        batch.status === ProductBatchStatus.EXPIRED
      ) {
        throw new BadRequestException(
          `Batch ${batch.batchNumber} status cannot be changed (status: ${batch.status})`,
        );
      }

      if (dto.status === batch.status) {
        throw new BadRequestException(`Batch ${batch.batchNumber} is already ${dto.status}`);
      }
    }

    return this.productBatchesRepository.update(productBatchId, dto, userId);
  }
}
