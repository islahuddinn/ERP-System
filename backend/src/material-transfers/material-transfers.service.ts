import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { MaterialTransfersRepository } from "./material-transfers.repository";
import {
  CreateMaterialTransferDto,
  UpdateMaterialTransferDto,
  MaterialTransferStatus,
} from "./dto/material-transfer.dto";
import { AuditService } from "../audit/audit.service";
import { AuditContextService } from "../audit/audit-context.service";
import { StockLedgerService } from "../common/services/stock-ledger.service";
import { PrismaClient, StockTransactionType } from "@prisma/tenant-client";

@Injectable()
export class MaterialTransfersService {
  private readonly logger = new Logger(MaterialTransfersService.name);

  constructor(
    private readonly materialTransfersRepository: MaterialTransfersRepository,
    private readonly auditService: AuditService,
    private readonly auditContext: AuditContextService,
    private readonly stockLedgerService: StockLedgerService,
  ) {}

  async create(
    tenantClient: PrismaClient,
    createDto: CreateMaterialTransferDto,
    tenantId: string,
    userId: string,
  ) {
    // Validate source location
    const sourceLocation = await this.materialTransfersRepository.validateLocation(
      createDto.sourceLocationId,
      createDto.sourceLocationType,
      tenantId,
    );
    if (!sourceLocation) {
      throw new BadRequestException("Source location not found or does not belong to tenant");
    }

    // Validate destination location
    const destinationLocation = await this.materialTransfersRepository.validateLocation(
      createDto.destinationLocationId,
      createDto.destinationLocationType,
      tenantId,
    );
    if (!destinationLocation) {
      throw new BadRequestException("Destination location not found or does not belong to tenant");
    }

    // Validate requested by user if provided
    if (createDto.requestedById) {
      const user = await this.materialTransfersRepository.validateUser(
        createDto.requestedById,
        tenantId,
      );
      if (!user) {
        throw new BadRequestException("Requested by user not found");
      }
    }

    // Validate materials
    for (const item of createDto.items) {
      const material = await this.materialTransfersRepository.validateMaterial(
        item.materialId,
        tenantId,
      );
      if (!material) {
        throw new BadRequestException(`Material with ID ${item.materialId} not found`);
      }
    }

    // Create material transfer with retry mechanism for unique constraint violations
    const maxRetries = 10;
    let attempt = 0;
    let materialTransfer;

    while (attempt < maxRetries) {
      try {
        // Generate unique transfer number if not provided
        if (!createDto.transferNumber) {
          createDto.transferNumber = await this.generateTransferNumber(tenantId);
        }

        materialTransfer = await this.materialTransfersRepository.create(
          {
            ...createDto,
            requestedById: userId,
          },
          tenantId,
        );
        break; // Success, exit retry loop
      } catch (error: any) {
        // Check if error is due to unique constraint violation on transferNumber
        if (error.code === "P2002" && error.meta?.target?.includes("transferNumber")) {
          attempt++;
          this.logger.warn(
            `Unique constraint violation on transferNumber. Retrying (${attempt}/${maxRetries})...`,
          );
          // Reset transferNumber to force regeneration on next attempt
          createDto.transferNumber = undefined;
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(100 * Math.pow(2, attempt), 1000)),
          );
        } else {
          // Re-throw non-unique-constraint errors
          throw error;
        }
      }
    }

    if (!materialTransfer) {
      throw new Error(
        `Failed to create material transfer after ${maxRetries} attempts due to transferNumber conflicts.`,
      );
    }

    // Creation audit is handled automatically by the @Auditable interceptor on
    // the controller route (module: MATERIAL_TRANSFERS) using the returned entity.

    // Auto-approve transfer
    const approvedTransfer = await this.approveTransfer(
      tenantClient,
      materialTransfer.id,
      userId,
      "Auto-approved on creation",
      tenantId,
    );

    // Auto-start transfer (deduct stock immediately)
    const completedTransfer = await this.startTransfer(
      tenantClient,
      approvedTransfer.id,
      userId,
      "Auto-started on creation",
      tenantId,
    );

    return completedTransfer;
  }

  async findAll(tenantId: string, filters: any) {
    return this.materialTransfersRepository.findAll(tenantId, filters);
  }

  async findOne(id: string, tenantId: string) {
    const materialTransfer = await this.materialTransfersRepository.findOne(id, tenantId);
    if (!materialTransfer) {
      throw new NotFoundException("Material transfer not found");
    }
    return materialTransfer;
  }

  async update(
    tenantClient: PrismaClient,
    id: string,
    updateDto: UpdateMaterialTransferDto,
    tenantId: string,
    userId: string,
  ) {
    const existingTransfer = await this.findOne(id, tenantId);

    // Validate status transitions
    if (
      updateDto.status &&
      !this.isValidStatusTransition(existingTransfer.status, updateDto.status)
    ) {
      throw new BadRequestException(
        `Invalid status transition from ${existingTransfer.status} to ${updateDto.status}`,
      );
    }

    // Capture the pre-mutation snapshot for the @Auditable interceptor (UPDATE).
    this.auditContext.setOldValue(existingTransfer);
    this.auditContext.setEntityLabel(existingTransfer.transferNumber);

    const updatedTransfer = await this.materialTransfersRepository.update(
      tenantClient,
      id,
      updateDto,
      tenantId,
    );

    return updatedTransfer;
  }

  async remove(tenantClient: PrismaClient, id: string, tenantId: string, userId: string) {
    const existingTransfer = await this.findOne(id, tenantId);

    // Only allow deletion of transfers in PENDING status
    if (existingTransfer.status !== MaterialTransferStatus.PENDING) {
      throw new BadRequestException("Can only delete material transfers in PENDING status");
    }

    // Capture the pre-delete snapshot for the @Auditable interceptor (DELETE).
    this.auditContext.setOldValue(existingTransfer);
    this.auditContext.setEntityLabel(existingTransfer.transferNumber);

    await this.materialTransfersRepository.remove(tenantClient, id, tenantId);
  }

  async approveTransfer(
    tenantClient: PrismaClient,
    id: string,
    approverId: string,
    comments: string,
    tenantId: string,
  ) {
    const existingTransfer = await this.findOne(id, tenantId);

    if (existingTransfer.status !== MaterialTransferStatus.PENDING) {
      throw new BadRequestException("Can only approve material transfers in PENDING status");
    }

    // Capture the pre-mutation snapshot for the @Auditable interceptor (UPDATE).
    this.auditContext.setOldValue(existingTransfer);
    this.auditContext.setEntityLabel(existingTransfer.transferNumber);

    const updatedTransfer = await this.materialTransfersRepository.updateStatus(
      tenantClient,
      id,
      MaterialTransferStatus.APPROVED,
      tenantId,
      approverId,
      comments,
    );

    return updatedTransfer;
  }

  async startTransfer(
    tenantClient: PrismaClient,
    id: string,
    transporterId: string,
    transportDetails: string,
    tenantId: string,
  ) {
    const existingTransfer = await this.findOne(id, tenantId);

    if (existingTransfer.status !== MaterialTransferStatus.APPROVED) {
      throw new BadRequestException("Can only start material transfers that are approved");
    }

    // Get transfer with items
    const transferWithItems = await tenantClient.materialTransfer.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!transferWithItems) {
      throw new NotFoundException("Material transfer not found");
    }

    // Phase 1: Deduct from source using FIFO (IN_TRANSIT)
    // Get source warehouse/zone information
    const sourceWarehouseId =
      existingTransfer.sourceLocationType === "WAREHOUSE"
        ? existingTransfer.sourceLocationId
        : undefined;

    this.logger.log(
      `[START-TRANSFER] Transfer ${existingTransfer.transferNumber}: ` +
        `Source: ${existingTransfer.sourceLocationType} (${existingTransfer.sourceLocationId}), ` +
        `Warehouse ID: ${sourceWarehouseId || "N/A"}`,
    );

    if (!sourceWarehouseId) {
      throw new BadRequestException(
        "Source location must be a WAREHOUSE to start transfer. Current type: " +
          existingTransfer.sourceLocationType,
      );
    }

    // Capture the pre-mutation snapshot for the @Auditable interceptor (UPDATE).
    this.auditContext.setOldValue(existingTransfer);
    this.auditContext.setEntityLabel(existingTransfer.transferNumber);

    // Deduct stock from source using FIFO
    return tenantClient.$transaction(async (tx) => {
      const stockMovements = [];

      for (const item of transferWithItems.items) {
        // Check stock availability
        this.logger.debug(
          `[START-TRANSFER] Checking stock for material ${item.materialId}, ` +
            `Required: ${item.quantity}, Warehouse: ${sourceWarehouseId}`,
        );

        // Extract zoneId from sourceLocationDetails if available
        // Format: "Zone: {zoneId}" or similar
        let sourceZoneId: string | undefined = undefined;
        if (existingTransfer.sourceLocationDetails) {
          const zoneMatch = existingTransfer.sourceLocationDetails.match(/Zone:\s*([a-f0-9-]+)/i);
          if (zoneMatch && zoneMatch[1]) {
            sourceZoneId = zoneMatch[1];
            this.logger.debug(
              `[START-TRANSFER] Extracted zoneId ${sourceZoneId} from sourceLocationDetails: ${existingTransfer.sourceLocationDetails}`,
            );
          }
        }

        this.logger.debug(
          `[START-TRANSFER] Checking stock for material ${item.materialId}, ` +
            `Required: ${item.quantity}, Warehouse: ${sourceWarehouseId}, Zone: ${sourceZoneId || "ALL"}`,
        );

        const available = await this.stockLedgerService.checkStockAvailability(
          tx,
          item.materialId,
          item.quantity,
          sourceWarehouseId,
          sourceZoneId, // Use extracted zoneId or undefined (which means all zones)
          false, // don't allow expired
          true, // checkPhysical (allow using reserved stock for transfers)
        );

        if (!available) {
          // Get ALL batches (including expired, inactive, etc.) for comprehensive diagnostic
          const allBatches = await tx.rawMaterialBatch.findMany({
            where: {
              rawMaterialId: item.materialId,
            },
            select: {
              id: true,
              batchNumber: true,
              availableQuantity: true,
              receivedQuantity: true,
              consumedQuantity: true,
              status: true,
              expiryDate: true,
              deletedAt: true,
            },
          });

          // Get active, non-expired batches
          const activeBatches = allBatches.filter(
            (b) =>
              b.status === "ACTIVE" &&
              b.deletedAt === null &&
              Number(b.receivedQuantity || 0) > 0 &&
              (!b.expiryDate || new Date(b.expiryDate) > new Date()),
          );

          const totalAvailable = activeBatches.reduce((sum, b) => sum + Number(b.receivedQuantity || 0), 0);

          // Detailed logging
          this.logger.error(
            `[START-TRANSFER] Insufficient stock. Material: ${item.materialId}, ` +
              `Required: ${item.quantity}, Available: ${totalAvailable}, Warehouse: ${sourceWarehouseId}, Zone: ${sourceZoneId || "ALL"}\n` +
              `Total batches found: ${allBatches.length}, Active batches: ${activeBatches.length}\n` +
              `All batches: ${JSON.stringify(
                allBatches.map((b) => ({
                  batchNumber: b.batchNumber,
                  availableQuantity: b.availableQuantity,
                  receivedQuantity: b.receivedQuantity,
                  status: b.status,
                  expired: b.expiryDate && new Date(b.expiryDate) <= new Date(),
                })),
                null,
                2,
              )}`,
          );

          throw new BadRequestException(
            `Insufficient stock for material ${item.materialId}. Required: ${item.quantity}, Available: ${totalAvailable}. ` +
              `Found ${activeBatches.length} active batch(es) in warehouse ${sourceWarehouseId}${sourceZoneId ? `, zone ${sourceZoneId}` : ""}. ` +
              `Check batch status, expiry dates, and available quantities.`,
          );
        }

        // Record stock decrease from source (FIFO)
        this.logger.log(
          `[TRANSFER] STOCK MOVED - NO BATCH. ` +
            `Transfer ${existingTransfer.transferNumber}, Material: ${item.materialId}, ` +
            `Source Warehouse: ${sourceWarehouseId}, Quantity: ${item.quantity}`,
        );

        const movement = await this.stockLedgerService.recordMovement(
          tenantClient,
          {
            productId: item.materialId,
            warehouseId: sourceWarehouseId,
            zoneId: undefined, // TODO: Extract from sourceLocationDetails if needed
            quantity: -item.quantity,
            movementType: StockTransactionType.TRANSFER_OUT,
            referenceType: "MATERIAL_TRANSFER",
            referenceId: id,
            remarks: `Transfer ${existingTransfer.transferNumber} - Deducted from source`,
            userId: transporterId,
            useFIFO: true,
            allowExpired: false,
          },
          tx,
        );

        stockMovements.push(movement);
      }

      // Update transfer status to IN_TRANSIT
      const updatedTransfer = await this.materialTransfersRepository.updateStatus(
        tx,
        id,
        MaterialTransferStatus.IN_TRANSIT,
        tenantId,
        transporterId,
      );

      // Update transport details
      await this.materialTransfersRepository.update(
        tx,
        id,
        {
          transporterId,
          transportDetails,
        },
        tenantId,
      );

      this.logger.log(
        `Transfer ${existingTransfer.transferNumber} started. Stock deducted from source using FIFO.`,
      );

      return updatedTransfer;
    });
  }

  async receiveTransfer(
    tenantClient: PrismaClient,
    id: string,
    receiverId: string,
    receivingComments: string,
    items: any[],
    tenantId: string,
  ) {
    const existingTransfer = await this.findOne(id, tenantId);

    if (existingTransfer.status !== MaterialTransferStatus.IN_TRANSIT) {
      throw new BadRequestException("Can only receive material transfers that are in transit");
    }

    // Get transfer with items
    const transferWithItems = await tenantClient.materialTransfer.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!transferWithItems) {
      throw new NotFoundException("Material transfer not found");
    }

    // Phase 2: Add to destination (preserving batch integrity)
    const destinationWarehouseId =
      existingTransfer.destinationLocationType === "WAREHOUSE"
        ? existingTransfer.destinationLocationId
        : undefined;

    // Capture the pre-mutation snapshot for the @Auditable interceptor (UPDATE).
    this.auditContext.setOldValue(existingTransfer);
    this.auditContext.setEntityLabel(existingTransfer.transferNumber);

    return tenantClient.$transaction(async (tx) => {
      const stockMovements = [];
      const itemUpdates = [];

      for (const receivedItem of items) {
        const originalItem = transferWithItems.items.find((i) => i.id === receivedItem.id);
        if (!originalItem) {
          throw new BadRequestException(`Transfer item ${receivedItem.id} not found`);
        }

        // Calculate accepted quantity (actual - damaged)
        const acceptedQuantity =
          (receivedItem.actualQuantity || originalItem.quantity) -
          (receivedItem.damagedQuantity || 0);

        if (acceptedQuantity < 0) {
          throw new BadRequestException(
            `Accepted quantity cannot be negative for item ${receivedItem.id}`,
          );
        }

        // Update item with actual quantities
        const updatedItem = await this.materialTransfersRepository.updateItem(
          tx,
          receivedItem.id,
          {
            actualQuantity: receivedItem.actualQuantity || originalItem.quantity,
            damagedQuantity: receivedItem.damagedQuantity || 0,
            receivingNotes: receivedItem.receivingNotes,
          },
          tenantId,
        );

        itemUpdates.push(updatedItem);

        // Only add accepted quantity to destination
        if (acceptedQuantity > 0) {
          // Get batch information from source deduction (from ledger)
          // Find the ledger entries for this transfer to preserve batch info
          const sourceLedgerEntries = await tx.stockLedger.findMany({
            where: {
              referenceType: "MATERIAL_TRANSFER",
              referenceId: id,
              productId: originalItem.materialId,
              quantity: { lt: 0 }, // Only decreases
            },
            include: {
              rawMaterialBatch: {
                select: {
                  id: true,
                  batchNumber: true,
                  expiryDate: true,
                  manufacturingDate: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          });

          // Preserve batch information from source (batchNumber, expiryDate, etc.)
          // But find/create batch in DESTINATION warehouse (not source warehouse)
          let batchNumber: string | undefined;
          let expiryDate: Date | undefined;
          let manufacturingDate: Date | undefined;

          if (sourceLedgerEntries.length > 0 && sourceLedgerEntries[0].batchId) {
            // Get batch info from source to preserve traceability
            const sourceBatch = sourceLedgerEntries[0].rawMaterialBatch;
            if (sourceBatch) {
              batchNumber = sourceBatch.batchNumber;
              expiryDate = sourceBatch.expiryDate || undefined;
              manufacturingDate = sourceBatch.manufacturingDate || undefined;

              this.logger.debug(
                `[RECEIVE-TRANSFER] Preserving batch info from source: ` +
                  `batchNumber=${batchNumber}, expiryDate=${expiryDate}, ` +
                  `manufacturingDate=${manufacturingDate}`,
              );
            }
          }

          // Try to find existing batch with same batchNumber in destination warehouse
          // If found, we'll add to it; if not, createOrUpdateBatch will create a new one
          let destinationBatchId: string | undefined;
          if (batchNumber) {
            const existingDestinationBatch = await tx.rawMaterialBatch.findFirst({
              where: {
                batchNumber,
                rawMaterialId: originalItem.materialId,
                deletedAt: null,
              },
            });

            if (existingDestinationBatch) {
              destinationBatchId = existingDestinationBatch.id;
              this.logger.debug(
                `[RECEIVE-TRANSFER] Found existing batch ${batchNumber} in destination warehouse, ` +
                  `will add to it. Batch ID: ${destinationBatchId}`,
              );
            } else {
              this.logger.debug(
                `[RECEIVE-TRANSFER] Batch ${batchNumber} not found in destination warehouse, ` +
                  `will create new batch with same batchNumber`,
              );
            }
          }

          // Record stock increase to destination
          // If destinationBatchId is found, it will add to existing batch
          // If not, createOrUpdateBatch will create new batch with preserved batchNumber
          const movement = await this.stockLedgerService.recordMovement(
            tenantClient,
            {
              productId: originalItem.materialId,
              warehouseId: destinationWarehouseId,
              zoneId: undefined, // TODO: Extract from destinationLocationDetails if needed
              batchId: destinationBatchId, // Use destination batch ID if found, otherwise undefined to create new
              quantity: acceptedQuantity,
              movementType: StockTransactionType.TRANSFER_IN,
              referenceType: "MATERIAL_TRANSFER",
              referenceId: id,
              remarks: `Transfer ${existingTransfer.transferNumber} - Received at destination${receivedItem.damagedQuantity > 0 ? ` (${receivedItem.damagedQuantity} damaged)` : ""}`,
              userId: receiverId,
              batchNumber: batchNumber, // Preserve batch number from source
              expiryDate: expiryDate, // Preserve expiry date from source
              manufacturingDate: manufacturingDate, // Preserve manufacturing date from source
              receivedDate: new Date(),
            },
            tx,
          );

          stockMovements.push(movement);
        }

        // If there's damaged quantity, it's already deducted from source
        // No need to add it back - it's considered waste/loss
        if (receivedItem.damagedQuantity > 0) {
          this.logger.warn(
            `Transfer ${existingTransfer.transferNumber}: ${receivedItem.damagedQuantity} units damaged for material ${originalItem.materialId}`,
          );
        }
      }

      // Update transfer status to RECEIVED
      const updatedTransfer = await this.materialTransfersRepository.updateStatus(
        tx,
        id,
        MaterialTransferStatus.RECEIVED,
        tenantId,
        receiverId,
        receivingComments,
      );

      this.logger.log(
        `Transfer ${existingTransfer.transferNumber} received. Stock added to destination with batch integrity preserved.`,
      );

      return updatedTransfer;
    });
  }

  async cancelTransfer(
    tenantClient: PrismaClient,
    id: string,
    userId: string,
    comments: string,
    tenantId: string,
  ) {
    const existingTransfer = await this.findOne(id, tenantId);

    if (
      ![MaterialTransferStatus.PENDING, MaterialTransferStatus.APPROVED].includes(
        String(existingTransfer.status) as any,
      )
    ) {
      throw new BadRequestException(
        "Can only cancel material transfers in PENDING or APPROVED status",
      );
    }

    // Capture the pre-mutation snapshot for the @Auditable interceptor (UPDATE).
    this.auditContext.setOldValue(existingTransfer);
    this.auditContext.setEntityLabel(existingTransfer.transferNumber);

    const updatedTransfer = await this.materialTransfersRepository.updateStatus(
      tenantClient,
      id,
      MaterialTransferStatus.CANCELLED,
      tenantId,
      userId,
      comments,
    );

    return updatedTransfer;
  }

  async updateItem(
    tenantClient: PrismaClient,
    id: string,
    updateDto: any,
    tenantId: string,
    userId: string,
  ) {
    const item = await this.materialTransfersRepository.updateItem(
      tenantClient,
      id,
      updateDto,
      tenantId,
    );

    // Log audit
    await this.auditService.log(tenantClient, {
      actorId: userId,
      entityName: "MaterialTransferItem",
      entityId: id,
      action: "UPDATE",
      newValue: item,
    });

    return item;
  }

  async getMaterialTransferStats(tenantId: string, locationType?: string, locationId?: string) {
    return this.materialTransfersRepository.getMaterialTransferStats(
      tenantId,
      locationType,
      locationId,
    );
  }

  async getActiveTransfersByLocation(tenantId: string, locationType: string, locationId: string) {
    return this.materialTransfersRepository.getActiveTransfersByLocation(
      tenantId,
      locationType,
      locationId,
    );
  }

  private async generateTransferNumber(tenantId: string): Promise<string> {
    const maxRetries = 10;
    let attempt = 0;

    while (attempt < maxRetries) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const randomSuffix = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");

      // Format: MT-YYYYMMDD-XXXX (ERP-style)
      const transferNumber = `MT-${year}${month}${day}-${randomSuffix}`;

      // Check if this transferNumber already exists
      const exists = await this.materialTransfersRepository.transferNumberExists(
        transferNumber,
        tenantId,
      );

      if (!exists) {
        return transferNumber;
      }

      // If collision occurs, retry with new random suffix
      attempt++;
      this.logger.warn(
        `Transfer number collision detected: ${transferNumber}. Retrying (${attempt}/${maxRetries})...`,
      );
    }

    throw new Error(
      `Failed to generate unique transfer number after ${maxRetries} attempts. Please try again.`,
    );
  }

  private isValidStatusTransition(currentStatus: any, newStatus: MaterialTransferStatus): boolean {
    const current = String(currentStatus);
    const validTransitions = {
      [MaterialTransferStatus.PENDING]: [
        MaterialTransferStatus.APPROVED,
        MaterialTransferStatus.CANCELLED,
      ],
      [MaterialTransferStatus.APPROVED]: [
        MaterialTransferStatus.IN_TRANSIT,
        MaterialTransferStatus.CANCELLED,
      ],
      [MaterialTransferStatus.IN_TRANSIT]: [MaterialTransferStatus.RECEIVED],
      [MaterialTransferStatus.RECEIVED]: [], // Terminal state
      [MaterialTransferStatus.CANCELLED]: [], // Terminal state
    };

    return (validTransitions as any)[current]?.includes(newStatus) ?? false;
  }

  /**
   * Diagnostic method to check stock availability with detailed information
   */
  async checkStockDiagnostics(
    tenantClient: PrismaClient,
    productId: string,
    warehouseId: string,
    requiredQuantity: number,
    tenantId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);

    // Get all batches for this product
    const allBatches = await prisma.rawMaterialBatch.findMany({
      where: {
      },
      select: {
        id: true,
        batchNumber: true,
        receivedQuantity: true,
        consumedQuantity: true,
        availableQuantity: true,
        status: true,
        expiryDate: true,
        receivedDate: true,
        deletedAt: true,
      },
      orderBy: {
        receivedDate: "asc",
      },
    });

    // Get active, non-expired batches (what stock check uses)
    const activeBatches = allBatches.filter((b) => {
      const isExpired = b.expiryDate && new Date(b.expiryDate) <= new Date();
      const isDeleted = b.deletedAt !== null;
      return b.status === "ACTIVE" && b.availableQuantity > 0 && !isDeleted && !isExpired;
    });

    const totalAvailable = activeBatches.reduce((sum, b) => sum + Number(b.availableQuantity || 0), 0);
    const totalInAllBatches = allBatches.reduce((sum, b) => sum + Number(b.availableQuantity || 0), 0);

    // Get warehouse stock balances
    const stockBalances = await prisma.warehouseStockBalance.findMany({
      where: {
        warehouseId,
      },
      select: {
        id: true,
        batchId: true,
        quantity: true,
        availableQuantity: true,
        reservedQuantity: true,
      },
    });

    const aggregateBalance = stockBalances.find((b) => b.batchId === null);
    const batchBalances = stockBalances.filter((b) => b.batchId !== null);

    return {
      warehouseId,
      requiredQuantity,
      summary: {
        sufficient: totalAvailable >= requiredQuantity,
        totalAvailable,
        totalInAllBatches,
        activeBatchesCount: activeBatches.length,
        allBatchesCount: allBatches.length,
        shortage: Math.max(0, requiredQuantity - totalAvailable),
      },
      batches: {
        active: activeBatches.map((b) => ({
          batchNumber: b.batchNumber,
          receivedQuantity: b.receivedQuantity,
          consumedQuantity: b.consumedQuantity,
          availableQuantity: b.availableQuantity,
          status: b.status,
          expiryDate: b.expiryDate,
          receivedDate: b.receivedDate,
        })),
        all: allBatches.map((b) => ({
          batchNumber: b.batchNumber,
          receivedQuantity: b.receivedQuantity,
          consumedQuantity: b.consumedQuantity,
          availableQuantity: b.availableQuantity,
          status: b.status,
          expiryDate: b.expiryDate,
          deletedAt: b.deletedAt,
          isExpired: b.expiryDate && new Date(b.expiryDate) <= new Date(),
          isDeleted: b.deletedAt !== null,
          isActive:
            b.status === "ACTIVE" &&
            !b.deletedAt &&
            (!b.expiryDate || new Date(b.expiryDate) > new Date()),
        })),
      },
      stockBalances: {
        aggregate: aggregateBalance
          ? {
              quantity: aggregateBalance.quantity,
              availableQuantity: aggregateBalance.availableQuantity,
              reservedQuantity: aggregateBalance.reservedQuantity,
            }
          : null,
        batchSpecific: batchBalances.map((b) => ({
          batchId: b.batchId,
          quantity: b.quantity,
          availableQuantity: b.availableQuantity,
          reservedQuantity: b.reservedQuantity,
        })),
      },
      recommendations: this.generateStockRecommendations(
        allBatches,
        activeBatches,
        totalAvailable,
        requiredQuantity,
      ),
    };
  }

  private generateStockRecommendations(
    allBatches: any[],
    activeBatches: any[],
    totalAvailable: number,
    requiredQuantity: number,
  ): string[] {
    const recommendations: string[] = [];

    if (allBatches.length === 0) {
      recommendations.push("❌ No batches found. Create batch records for existing stock.");
      recommendations.push("   Use the batch creation API or migrate orphan stock to batches.");
    } else if (activeBatches.length === 0) {
      const expiredCount = allBatches.filter(
        (b) => b.expiryDate && new Date(b.expiryDate) <= new Date(),
      ).length;
      const deletedCount = allBatches.filter((b) => b.deletedAt !== null).length;
      const consumedCount = allBatches.filter((b) => b.availableQuantity <= 0).length;

      if (expiredCount > 0) {
        recommendations.push(`❌ All batches are expired (${expiredCount} expired batches).`);
        recommendations.push(
          "   Create new batches or update expiry dates if stock is still usable.",
        );
      }
      if (deletedCount > 0) {
        recommendations.push(`❌ All batches are deleted (${deletedCount} deleted batches).`);
        recommendations.push("   Restore batches or create new ones.");
      }
      if (consumedCount > 0) {
        recommendations.push(`❌ All batches are consumed (${consumedCount} consumed batches).`);
        recommendations.push("   Add more stock to batches.");
      }
    } else if (totalAvailable < requiredQuantity) {
      recommendations.push(
        `❌ Insufficient stock. Available: ${totalAvailable}, Required: ${requiredQuantity}`,
      );
      recommendations.push(`   Shortage: ${requiredQuantity - totalAvailable} units`);
      recommendations.push("   Add more stock to batches or reduce transfer quantity.");
    } else {
      recommendations.push("✅ Stock is sufficient for transfer.");
    }

    return recommendations;
  }

  /**
   * Get stock availability for a product across all warehouses
   * Useful for UI to show which warehouses have stock available
   */
  async getStockByWarehouse(tenantClient: PrismaClient, productId: string, tenantId: string) {
    const prisma = this.getPrisma(tenantClient);

    // Get all warehouses for this tenant
    const warehouses = await prisma.warehouse.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        warehouseType: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Get stock for this product in each warehouse
    const stockByWarehouse = await Promise.all(
      warehouses.map(async (warehouse) => {
        // Get all batches for this product in this warehouse
        const batches = await prisma.rawMaterialBatch.findMany({
          where: {
                status: "ACTIVE",
            availableQuantity: { gt: 0 },
            deletedAt: null,
            OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
          },
          select: {
            id: true,
            batchNumber: true,
            receivedQuantity: true,
            consumedQuantity: true,
            availableQuantity: true,
            expiryDate: true,
            receivedDate: true,
          },
          orderBy: {
            receivedDate: "asc",
          },
        });

        const totalAvailable = batches.reduce((sum, b) => sum + Number(b.availableQuantity || 0), 0);
        const totalQuantity = batches.reduce((sum, b) => sum + Number(b.receivedQuantity || 0), 0);

        // Get warehouse stock balance aggregate
        const stockBalance = await prisma.warehouseStockBalance.findFirst({
          where: {
                warehouseId: warehouse.id,
            batchId: null, // Aggregate
          },
          select: {
            quantity: true,
            availableQuantity: true,
            reservedQuantity: true,
          },
        });

        return {
          warehouse: {
            id: warehouse.id,
            name: warehouse.name,
            code: warehouse.code,
            warehouseType: warehouse.warehouseType,
          },
          stock: {
            totalAvailable,
            totalQuantity,
            reservedQuantity: stockBalance?.reservedQuantity || 0,
            aggregateQuantity: stockBalance?.quantity || 0,
            aggregateAvailable: stockBalance?.availableQuantity || 0,
          },
          batches: batches.map((b) => ({
            batchNumber: b.batchNumber,
            receivedQuantity: b.receivedQuantity,
            consumedQuantity: b.consumedQuantity,
            availableQuantity: b.availableQuantity,
            expiryDate: b.expiryDate,
            receivedDate: b.receivedDate,
          })),
          batchCount: batches.length,
          hasStock: totalAvailable > 0,
        };
      }),
    );

    // Filter to only warehouses with stock
    const warehousesWithStock = stockByWarehouse.filter((w) => w.hasStock);

    // Sort by available quantity (descending)
    const sorted = stockByWarehouse.sort((a, b) => b.stock.totalAvailable - a.stock.totalAvailable);

    return {
      summary: {
        totalWarehouses: warehouses.length,
        warehousesWithStock: warehousesWithStock.length,
        warehousesWithoutStock: warehouses.length - warehousesWithStock.length,
        totalStockAcrossAllWarehouses: stockByWarehouse.reduce(
          (sum, w) => sum + w.stock.totalAvailable,
          0,
        ),
      },
      warehouses: sorted,
      recommendations: this.generateStockRecommendationsForUI(sorted),
    };
  }

  /**
   * Get all products with stock availability by warehouse
   * Useful for UI to show which products have stock and where
   */
  async getProductsWithStock(tenantClient: PrismaClient, tenantId: string) {
    const prisma = this.getPrisma(tenantClient);

    // Get all active products
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Get all warehouses
    const warehouses = await prisma.warehouse.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Get stock for each product in each warehouse
    const productsWithStock = await Promise.all(
      products.map(async (product) => {
        const warehouseStock = await Promise.all(
          warehouses.map(async (warehouse) => {
            // Get active batches for this product in this warehouse
            const batches = await prisma.rawMaterialBatch.findMany({
              where: {
                rawMaterialId: product.id,
                status: "ACTIVE",
                availableQuantity: { gt: 0 },
                deletedAt: null,
                OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
              },
              select: {
                availableQuantity: true,
              },
            });

            const totalAvailable = batches.reduce((sum, b) => sum + Number(b.availableQuantity || 0), 0);

            return {
              warehouse: {
                id: warehouse.id,
                name: warehouse.name,
                code: warehouse.code,
              },
              availableQuantity: totalAvailable,
              hasStock: totalAvailable > 0,
              batchCount: batches.length,
            };
          }),
        );

        const totalStock = warehouseStock.reduce((sum, w) => sum + w.availableQuantity, 0);
        const warehousesWithStock = warehouseStock.filter((w) => w.hasStock);

        return {
          product: {
            id: product.id,
            name: product.name,
            code: product.code,
          },
          totalStock,
          hasStock: totalStock > 0,
          warehouses: warehouseStock,
          warehousesWithStock: warehousesWithStock.length,
        };
      }),
    );

    // Filter to only products with stock
    const productsWithAvailableStock = productsWithStock.filter((p) => p.hasStock);

    // Sort by total stock (descending)
    const sorted = productsWithStock.sort((a, b) => b.totalStock - a.totalStock);

    return {
      summary: {
        totalProducts: products.length,
        productsWithStock: productsWithAvailableStock.length,
        productsWithoutStock: products.length - productsWithAvailableStock.length,
      },
      products: sorted,
      // Quick reference: products with stock
      quickReference: productsWithAvailableStock.map((p) => ({
        productId: p.product.id,
        productName: p.product.name,
        productCode: p.product.code,
        warehouses: p.warehouses
          .filter((w) => w.hasStock)
          .map((w) => ({
            warehouseId: w.warehouse.id,
            warehouseName: w.warehouse.name,
            warehouseCode: w.warehouse.code,
            availableQuantity: w.availableQuantity,
          })),
      })),
    };
  }

  private generateStockRecommendationsForUI(warehouses: any[]): string[] {
    const recommendations: string[] = [];
    const withStock = warehouses.filter((w) => w.hasStock);

    if (withStock.length === 0) {
      recommendations.push("❌ No stock available in any warehouse");
      recommendations.push("   Add stock to warehouses before creating transfers");
    } else {
      recommendations.push(`✅ Stock available in ${withStock.length} warehouse(s):`);
      withStock.forEach((w) => {
        recommendations.push(
          `   - ${w.warehouse.name} (${w.warehouse.code}): ${w.stock.totalAvailable} units available`,
        );
      });
      recommendations.push("");
      recommendations.push("💡 Use these warehouses as source locations for transfers");
    }

    return recommendations;
  }

  private getPrisma(tenantClient: PrismaClient) {
    return tenantClient;
  }
}
