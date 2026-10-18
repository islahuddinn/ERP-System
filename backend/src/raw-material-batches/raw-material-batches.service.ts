import { Injectable, BadRequestException } from "@nestjs/common";
import { RawMaterialBatchInspection, RawMaterialBatchStatus } from "@prisma/tenant-client";
import {
  RawMaterialBatchesRepository,
  BATCH_STATUS_BY_QUALITY_STATUS,
} from "./raw-material-batches.repository";
import { QueryRawMaterialBatchDto, ConsumeBatchDto } from "./dto/query-raw-material-batch.dto";
import {
  CreateRawMaterialBatchInspectionDto,
  UpdateRawMaterialBatchInspectionDto,
} from "./dto/raw-material-batch-inspection.dto";
import { UpdateRawMaterialBatchDto } from "./dto/update-raw-material-batch.dto";
import { AuditContextService } from "../audit/audit-context.service";

@Injectable()
export class RawMaterialBatchesService {
  constructor(
    private readonly rawMaterialBatchesRepository: RawMaterialBatchesRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  /**
   * Find All
   */
  findAll(query: QueryRawMaterialBatchDto) {
    return this.rawMaterialBatchesRepository.findAll(query);
  }

  findOne(batchId: string) {
    return this.rawMaterialBatchesRepository.findOne(batchId);
  }

  getFifoAllocation(rawMaterialId: string, requestedQuantity?: number) {
    if (requestedQuantity !== undefined && requestedQuantity <= 0) {
      throw new BadRequestException("Requested quantity must be greater than 0");
    }

    return this.rawMaterialBatchesRepository.getFifoAllocation(rawMaterialId, requestedQuantity);
  }

  async consume(batchId: string, consumeBatchDto: ConsumeBatchDto, userId: string) {
    const batch = await this.rawMaterialBatchesRepository.findOne(batchId);

    const { quantity } = consumeBatchDto;

    if (
      batch.status !== RawMaterialBatchStatus.ACTIVE &&
      batch.status !== RawMaterialBatchStatus.PARTIAL
    ) {
      throw new BadRequestException(
        `Batch ${batch.batchNumber} cannot be consumed (status: ${batch.status})`,
      );
    }

    if (quantity <= 0) {
      throw new BadRequestException("Consume quantity must be greater than 0");
    }

    if (quantity > batch.availableQuantity) {
      throw new BadRequestException(
        `Cannot consume ${quantity} — only ${batch.availableQuantity} available in batch ${batch.batchNumber}`,
      );
    }

    return this.rawMaterialBatchesRepository.executeConsume(batch, consumeBatchDto, userId);
  }

  async returnFromBatch(
    batchId: string,
    quantity: number,
    returnId: string,
    reason: string | null,
    userId: string,
  ) {
    const batch = await this.rawMaterialBatchesRepository.findOne(batchId);

    if (
      batch.status !== RawMaterialBatchStatus.ACTIVE &&
      batch.status !== RawMaterialBatchStatus.PARTIAL
    ) {
      throw new BadRequestException(
        `Batch ${batch.batchNumber} cannot be returned (status: ${batch.status})`,
      );
    }

    if (quantity <= 0) {
      throw new BadRequestException("Return quantity must be greater than 0");
    }

    if (quantity > batch.availableQuantity) {
      throw new BadRequestException(
        `Cannot return ${quantity} — only ${batch.availableQuantity} available in batch ${batch.batchNumber}`,
      );
    }

    return this.rawMaterialBatchesRepository.executeReturn(
      batch,
      quantity,
      returnId,
      reason,
      userId,
    );
  }

  getConsumptions(batchId: string) {
    return this.rawMaterialBatchesRepository.getConsumptions(batchId);
  }

  async update(batchId: string, data: UpdateRawMaterialBatchDto, userId: string) {
    const batch = await this.rawMaterialBatchesRepository.findOne(batchId);

    if (data.status) {
      if (
        batch.status === RawMaterialBatchStatus.CONSUMED ||
        batch.status === RawMaterialBatchStatus.EXPIRED
      ) {
        throw new BadRequestException(
          `Batch ${batch.batchNumber} status cannot be changed (status: ${batch.status})`,
        );
      }

      if (data.status === batch.status) {
        throw new BadRequestException(`Batch ${batch.batchNumber} is already ${data.status}`);
      }
    }

    this.auditContext.setOldValue(batch);
    this.auditContext.setEntityLabel(batch.batchNumber);

    return this.rawMaterialBatchesRepository.update(batchId, data, userId);
  }

  findExpiring(days: number = 30) {
    if (days < 0) {
      throw new BadRequestException("Days cannot be negative");
    }

    if (days > 365) {
      throw new BadRequestException("Days too large");
    }

    return this.rawMaterialBatchesRepository.findExpiring(days);
  }

  async createInspection(
    batchId: string,
    dto: CreateRawMaterialBatchInspectionDto,
    userId: string,
  ): Promise<RawMaterialBatchInspection> {
    const batch = await this.rawMaterialBatchesRepository.findOne(batchId);

    if (batch.status !== RawMaterialBatchStatus.QUARANTINE) {
      throw new BadRequestException(
        `Batch ${batch.batchNumber} is not pending inspection (status: ${batch.status})`,
      );
    }

    const { approvedQuantity, rejectedQuantity } = dto;

    if (rejectedQuantity && rejectedQuantity > batch.availableQuantity) {
      throw new BadRequestException(
        `rejectedQuantity (${rejectedQuantity}) cannot exceed batch available quantity (${batch.availableQuantity})`,
      );
    }

    if ((approvedQuantity ?? 0) + (rejectedQuantity ?? 0) > batch.receivedQuantity) {
      throw new BadRequestException(
        `approvedQuantity + rejectedQuantity (${(approvedQuantity ?? 0) + (rejectedQuantity ?? 0)}) cannot exceed received quantity (${batch.receivedQuantity})`,
      );
    }

    return this.rawMaterialBatchesRepository.createInspection(batch, dto, userId);
  }

  getInspections(batchId: string): Promise<RawMaterialBatchInspection[]> {
    return this.rawMaterialBatchesRepository.findInspectionsByBatch(batchId);
  }

  async updateInspection(
    inspectionId: string,
    dto: UpdateRawMaterialBatchInspectionDto,
    userId: string,
  ): Promise<RawMaterialBatchInspection> {
    const inspection = await this.rawMaterialBatchesRepository.findInspectionById(inspectionId);
    const batch = await this.rawMaterialBatchesRepository.findOne(inspection.batchId);

    this.auditContext.setOldValue(inspection);
    this.auditContext.setEntityLabel(batch.batchNumber);

    const oldRejectedQuantity = inspection.rejectedQuantity ?? 0;

    const newRejectedQuantity = dto.rejectedQuantity ?? oldRejectedQuantity;
    const newApprovedQuantity = dto.approvedQuantity ?? inspection.approvedQuantity ?? 0;
    const newQualityStatus = dto.qualityStatus ?? inspection.qualityStatus;

    if (newApprovedQuantity + newRejectedQuantity > batch.receivedQuantity) {
      throw new BadRequestException(
        `approvedQuantity + rejectedQuantity (${newApprovedQuantity + newRejectedQuantity}) cannot exceed received quantity (${batch.receivedQuantity})`,
      );
    }

    const rejectedDelta = newRejectedQuantity - oldRejectedQuantity;
    const newAvailableQuantity = batch.availableQuantity - rejectedDelta;
    const maxAvailableQuantity =
      batch.receivedQuantity - batch.consumedQuantity - batch.returnedQuantity;

    if (newAvailableQuantity < 0) {
      throw new BadRequestException(
        `Cannot increase rejectedQuantity to ${newRejectedQuantity} — only ${batch.availableQuantity} currently available in batch ${batch.batchNumber}`,
      );
    }

    if (newAvailableQuantity > maxAvailableQuantity) {
      throw new BadRequestException(
        `Cannot decrease rejectedQuantity to ${newRejectedQuantity} — resulting available quantity (${newAvailableQuantity}) would exceed batch capacity (${maxAvailableQuantity})`,
      );
    }

    let newStatus = BATCH_STATUS_BY_QUALITY_STATUS[newQualityStatus] ?? batch.status;

    if (newAvailableQuantity <= 0 && newStatus !== RawMaterialBatchStatus.BLOCKED) {
      newStatus = RawMaterialBatchStatus.CONSUMED;
    }

    return this.rawMaterialBatchesRepository.updateInspection(
      inspection,
      batch,
      dto,
      newAvailableQuantity,
      rejectedDelta,
      newStatus,
      userId,
    );
  }
}
