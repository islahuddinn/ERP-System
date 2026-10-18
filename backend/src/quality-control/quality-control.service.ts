import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { QualityControlRepository } from "./quality-control.repository";
import { CreateQualityControlDto, UpdateQualityControlDto } from "./dto/quality-control.dto";
import { PrismaClient, QualityStatus } from "@prisma/tenant-client";
import { StockLedgerService } from "../common/services/stock-ledger.service";
import { FinancialEventService } from "../common/services/financial-event.service";
import { StockTransactionType } from "@prisma/tenant-client";

@Injectable()
export class QualityControlService {
  constructor(
    private readonly qualityControlRepository: QualityControlRepository,
    private readonly stockLedgerService: StockLedgerService,
    private readonly financialEventService: FinancialEventService,
  ) {}

  async create(
    tenantClient: PrismaClient,
    createDto: CreateQualityControlDto,
    tenantId: string,
    userId?: string,
  ) {
    // Validate product exists
    const product = await tenantClient.product.findFirst({
      where: {
        id: createDto.productId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Validate batch if provided
    if (createDto.batchId) {
      const batch = await tenantClient.rawMaterialBatch.findFirst({
        where: {
          id: createDto.batchId,
          deletedAt: null,
        },
      });

      if (!batch) {
        throw new NotFoundException("Batch not found");
      }
    }

    // Generate inspection number if not provided
    if (!createDto.inspectionNumber) {
      createDto.inspectionNumber = await this.generateInspectionNumber(tenantClient, tenantId);
    }

    const inspection = await this.qualityControlRepository.create(tenantClient, {
      inspectionNumber: createDto.inspectionNumber,
      batchId: createDto.batchId,
      productId: createDto.productId,
      inspectionType: createDto.inspectionType,
      qualityStatus: createDto.qualityStatus,
      results: createDto.results,
      inspectedById: userId,
      notes: createDto.notes,
      observations: createDto.observations,
      tenantId,
    });

    // If failed, handle rejection (move to waste, update ledger)
    if (createDto.qualityStatus === QualityStatus.FAILED) {
      await this.handleRejection(tenantClient, inspection, userId);
    }

    return inspection;
  }

  async findAll(tenantClient: PrismaClient, tenantId: string, filters: any) {
    return this.qualityControlRepository.findAll(tenantClient, tenantId, filters);
  }

  async findOne(tenantClient: PrismaClient, id: string, tenantId: string) {
    const inspection = await this.qualityControlRepository.findOne(tenantClient, id, tenantId);
    if (!inspection) {
      throw new NotFoundException("Quality inspection not found");
    }
    return inspection;
  }

  async update(
    tenantClient: PrismaClient,
    id: string,
    updateDto: UpdateQualityControlDto,
    tenantId: string,
    userId?: string,
  ) {
    const existing = await this.findOne(tenantClient, id, tenantId);

    // If status changed to FAILED, handle rejection
    if (
      updateDto.qualityStatus === QualityStatus.FAILED &&
      existing.qualityStatus !== QualityStatus.FAILED
    ) {
      await this.handleRejection(tenantClient, existing, userId);
    }

    return this.qualityControlRepository.update(tenantClient, id, updateDto, tenantId);
  }

  async remove(tenantClient: PrismaClient, id: string, tenantId: string) {
    await this.findOne(tenantClient, id, tenantId);
    return this.qualityControlRepository.remove(tenantClient, id, tenantId);
  }

  private async handleRejection(tenantClient: PrismaClient, inspection: any, userId?: string) {
    // Create waste record for rejected items
    // This will be handled by the waste management service
    // For now, we'll just log it
    // In a full implementation, this would create a waste record and update stock
  }

  private async generateInspectionNumber(
    tenantClient: PrismaClient,
    tenantId: string,
  ): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const count = await tenantClient.qualityControl.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(year, date.getMonth(), 1),
          lt: new Date(year, date.getMonth() + 1, 1),
        },
      },
    });

    return `QC-${year}${month}-${String(count + 1).padStart(4, "0")}`;
  }
}
