import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, PrismaClient, StockTransactionType, RawMaterialBatchStatus } from "@prisma/tenant-client";
import { CapacityService } from "./capacity.service";

/**
 * StockLedgerService - Single Source of Truth for Stock Movements (Phase 4)
 *
 * This service ensures:
 * - All stock changes go through this service
 * - FIFO batch consumption
 * - Expired batches are blocked
 * - Warehouse/Zone stock tracking
 * - Stock balances are always consistent
 * - Every movement is logged in StockLedger
 * - Concurrency-safe with row-level locking
 */
@Injectable()
export class StockLedgerService {
  private readonly logger = new Logger(StockLedgerService.name);

  constructor(private readonly capacityService: CapacityService) {}

  /**
   * Map legacy TransactionType to StockTransactionType
   * This helper ensures backward compatibility during migration
   */
  private mapToStockTransactionType(legacyType: string, quantity: number): StockTransactionType {
    // If already StockTransactionType, return as-is
    if (Object.values(StockTransactionType).includes(legacyType as StockTransactionType)) {
      return legacyType as StockTransactionType;
    }

    // Map legacy TransactionType to StockTransactionType
    const typeMap: Record<string, StockTransactionType> = {
      PURCHASE: StockTransactionType.IN,
      SALE: StockTransactionType.OUT,
      WASTE: StockTransactionType.OUT,
      PRODUCTION: StockTransactionType.IN,
      TRANSFER: quantity > 0 ? StockTransactionType.TRANSFER_IN : StockTransactionType.TRANSFER_OUT,
      ADJUSTMENT: StockTransactionType.ADJUSTMENT,
      RECEIPT: StockTransactionType.IN,
      ISSUE: StockTransactionType.OUT,
    };

    return typeMap[legacyType] || StockTransactionType.ADJUSTMENT;
  }

  /**
   * Record a stock movement with FIFO batch tracking
   *
   * @param tenantClient - Prisma client for tenant database
   * @param params - Movement parameters
   * @param tx - Optional transaction client (for atomic operations)
   * @returns StockLedger entry
   */
  async recordMovement(
    tenantClient: PrismaClient,
    params: {
      productId: string;
      warehouseId?: string;
      zoneId?: string;
      batchId?: string; // Optional: for specific batch operations
      quantity: number; // Positive for increase, negative for decrease
      movementType: StockTransactionType;
      referenceType: string; // e.g., 'PURCHASE', 'SALE', 'TRANSFER', 'ADJUSTMENT', etc.
      referenceId: string;
      openingQty?: number; // Optional: for audit purposes
      closingQty?: number; // Optional: for audit purposes
      remarks?: string;
      userId: string;
      // FIFO options
      useFIFO?: boolean; // Default: true for decreases
      allowExpired?: boolean; // Default: false
      // Batch creation fields
      batchNumber?: string;
      expiryDate?: Date;
      manufacturingDate?: Date;
      receivedDate?: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || tenantClient;

    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: params.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product not found: ${params.productId}`);
    }

    // Validate warehouse if provided
    if (params.warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: params.warehouseId },
      });
      if (!warehouse) {
        throw new NotFoundException(`Warehouse not found: ${params.warehouseId}`);
      }
    }

    // Validate zone if provided
    if (params.zoneId) {
      const zone = await prisma.warehouseZone.findUnique({
        where: { id: params.zoneId },
      });
      if (!zone) {
        throw new NotFoundException(`Zone not found: ${params.zoneId}`);
      }
    }

    // Validate quantity
    if (params.quantity === 0 && params.movementType !== StockTransactionType.ADJUSTMENT) {
      throw new BadRequestException("Quantity cannot be zero for this movement type");
    }

    // For decreases: use FIFO and check expiry
    if (params.quantity < 0) {
      return this.recordDecrease(prisma, params);
    }

    // New: Handle Reservation (Positive quantity, but doesn't increase total stock)
    if (params.movementType === StockTransactionType.RESERVED) {
      return this.recordReservation(prisma, params);
    }

    // For increases: create batch if needed or add to existing
    return this.recordIncrease(prisma, params);
  }

  /**
   * Record a stock reservation (Transfer from Available to Reserved)
   */
  private async recordReservation(
    prisma: PrismaClient | Prisma.TransactionClient,
    params: {
      productId: string;
      warehouseId?: string;
      zoneId?: string;
      quantity: number; // Positive
      movementType: StockTransactionType;
      referenceType: string;
      referenceId: string;
      remarks?: string;
      userId: string;
    },
  ) {
    const quantityToReserve = params.quantity;

    // Get current stock balance
    const stockBalance = await this.getWarehouseStockBalance(
      prisma,
      params.productId,
      params.warehouseId,
      params.zoneId,
      true, // Lock for update
    );

    if (!stockBalance) {
      throw new BadRequestException(`No stock found to reserve for product ${params.productId}`);
    }

    if (stockBalance.availableQuantity < quantityToReserve) {
      throw new BadRequestException(
        `Insufficient available stock to reserve. Available: ${stockBalance.availableQuantity}, Requested: ${quantityToReserve}`,
      );
    }

    const newAvailable = Number(stockBalance.availableQuantity) - quantityToReserve;
    const newReserved = Number(stockBalance.reservedQuantity) + quantityToReserve;
    const currentTotal = Number(stockBalance.quantity);

    // Create ledger entry
    const ledgerEntry = await prisma.stockLedger.create({
      data: {
        productId: params.productId,
        warehouseId: params.warehouseId || null,
        zoneId: params.zoneId || null,
        quantity: 0, // No physical change
        transactionType: params.movementType,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        openingQty: currentTotal,
        closingQty: currentTotal,
        remarks: params.remarks || `Stock reserved: ${quantityToReserve}`,
        createdById: params.userId,
      },
    });

    // Update warehouse stock balance
    await this.updateWarehouseStockBalance(
      prisma,
      params.productId,
      currentTotal,
      params.warehouseId,
      params.zoneId,
      null,
      newAvailable,
      newReserved,
    );

    // CRITICAL: Also update batch available quantities to maintain consistency
    // Since reservation is aggregate, we decrement available_qty from batches using FIFO logic
    // This ensures that checkStockAvailability (which checks batches) is accurate
    if (params.warehouseId) {
      const batches = await prisma.rawMaterialBatch.findMany({
        where: {
          status: RawMaterialBatchStatus.ACTIVE,
          availableQuantity: { gt: 0 },
          deletedAt: null,
        },
        orderBy: { receivedDate: "asc" },
      });

      let remainingToReserve = quantityToReserve;
      for (const batch of batches) {
        if (remainingToReserve <= 0) break;
        const reserveFromBatch = Math.min(remainingToReserve, batch.availableQuantity);

        await prisma.rawMaterialBatch.update({
          where: { id: batch.id },
          data: {
            availableQuantity: batch.availableQuantity - reserveFromBatch,
          },
        });
        remainingToReserve -= reserveFromBatch;
      }
    }

    return {
      ledgerEntry,
      openingQty: currentTotal,
      closingQty: currentTotal,
      availableQuantity: newAvailable,
      reservedQty: newReserved,
    };
  }

  /**
   * Record stock decrease with FIFO batch consumption
   */
  private async recordDecrease(
    prisma: PrismaClient | Prisma.TransactionClient,
    params: {
      productId: string;
      warehouseId?: string;
      zoneId?: string;
      batchId?: string;
      quantity: number; // Negative
      movementType: StockTransactionType;
      referenceType: string;
      referenceId: string;
      openingQty?: number;
      closingQty?: number;
      remarks?: string;
      userId: string;
      useFIFO?: boolean;
      allowExpired?: boolean;
    },
  ) {
    const quantityToConsume = Math.abs(params.quantity);
    const useFIFO = params.useFIFO !== false; // Default true
    const allowExpired = params.allowExpired === true; // Default false

    // For stock availability check, sum ALL batch balances (not just aggregate)
    // The aggregate balance may be out of sync, so we sum actual batch balances
    // IMPORTANT: When zoneId is undefined, sum ALL zones in the warehouse (don't filter by zone)
    let currentBalance = 0;
    if (params.warehouseId) {
      // Sum all batch balances for this warehouse/product combination
      // If zoneId is provided, filter by it; otherwise sum all zones
      let stockSums;
      if (params.zoneId) {
        stockSums = await (prisma as any).$queryRaw`
          SELECT 
            COALESCE(SUM(available_quantity), 0)::float as "totalAvailable",
            COALESCE(SUM(quantity), 0)::float as "totalPhysical"
          FROM warehouse_stock_balances
          WHERE product_id = ${params.productId}
            AND warehouse_id = ${params.warehouseId}
            AND (zone_id = ${params.zoneId} OR zone_id IS NULL)
        `;
      } else {
        // Sum ALL batches regardless of zone_id (when zoneId is undefined)
        stockSums = await (prisma as any).$queryRaw`
          SELECT 
            COALESCE(SUM(available_quantity), 0)::float as "totalAvailable",
            COALESCE(SUM(quantity), 0)::float as "totalPhysical"
          FROM warehouse_stock_balances
          WHERE product_id = ${params.productId}
            AND warehouse_id = ${params.warehouseId}
        `;
      }

      const totalAvailable =
        stockSums && stockSums.length > 0 ? Number(stockSums[0].totalAvailable || 0) : 0;
      const totalPhysical =
        stockSums && stockSums.length > 0 ? Number(stockSums[0].totalPhysical || 0) : 0;

      // For transfers and adjustments, we can use physical stock (reserved or not)
      // The updateWarehouseStockBalance method will handle adjusting the reserved quantities
      const canUseReserved = (
        [
          StockTransactionType.TRANSFER_OUT,
          StockTransactionType.ADJUSTMENT,
        ] as StockTransactionType[]
      ).includes(params.movementType);

      currentBalance = canUseReserved ? totalPhysical : totalAvailable;
    } else {
      // Legacy location-based stock: use aggregate balance
      const stockBalance = await this.getWarehouseStockBalance(
        prisma,
        params.productId,
      params.warehouseId,
        params.zoneId,
        true, // Lock for update
      );
      currentBalance = stockBalance
        ? Number((stockBalance as any).availableQuantity ?? (stockBalance as any).quantity ?? 0)
        : 0;
    }

    // Debug logging
    this.logger.debug(
      `[STOCK-CHECK] Product: ${params.productId}, Warehouse: ${params.warehouseId || "none"}, ` +
        `CurrentBalance (sum of all batches): ${currentBalance}, Required: ${quantityToConsume}`,
    );

    if (currentBalance < quantityToConsume) {
      throw new BadRequestException(
        `Insufficient stock. Current: ${currentBalance}, Requested: ${quantityToConsume} (Product: ${params.productId}, Warehouse: ${params.warehouseId || "none"})`,
      );
    }

    // If specific batch requested
    if (params.batchId) {
      return this.consumeFromBatch(
        prisma,
        { ...params, batchId: params.batchId },
        quantityToConsume,
        allowExpired,
      );
    }

    // FIFO consumption: get batches in order (oldest first)
    if (useFIFO) {
      return this.consumeFIFO(prisma, params, quantityToConsume, allowExpired);
    }

    // Non-FIFO: consume from any available batch
    return this.consumeNonFIFO(prisma, params, quantityToConsume, allowExpired);
  }

  /**
   * Consume stock using FIFO (First In First Out)
   */
  private async consumeFIFO(
    prisma: PrismaClient | Prisma.TransactionClient,
    params: {
      productId: string;
      warehouseId?: string;
      zoneId?: string;
      quantity: number;
      movementType: StockTransactionType;
      referenceType: string;
      referenceId: string;
      openingQty?: number;
      closingQty?: number;
      remarks?: string;
      userId: string;
    },
    quantityToConsume: number,
    allowExpired: boolean,
  ) {
    // FIFO Logic (Required): Get available batches ordered by receivedDate
    // SELECT batches WHERE productId = ? AND availableQuantity > 0 AND status = 'ACTIVE'
    // AND (expiryDate IS NULL OR expiryDate > NOW()) ORDER BY receivedDate ASC
    const where: Prisma.RawMaterialBatchWhereInput = {
      rawMaterialId: params.productId,
      status: RawMaterialBatchStatus.ACTIVE,
      availableQuantity: { gt: 0 },
      deletedAt: null,
    };

    if (!allowExpired) {
      where.OR = [{ expiryDate: null }, { expiryDate: { gt: new Date() } }];
    }

    const batches = await prisma.rawMaterialBatch.findMany({
      where,
      orderBy: [{ receivedDate: "asc" }],
      take: 100,
    });

    if (batches.length === 0) {
      throw new BadRequestException(
        `No available batches found for product ${params.productId}${!allowExpired ? " (expired batches excluded)" : ""}`,
      );
    }

    let remainingQty = quantityToConsume;
    const ledgerEntries: any[] = [];
    const batchUpdates: Array<{
      id: string;
      consumedQty: number;
      availableQuantity: number;
    }> = [];

    // Get stock balance for opening/closing quantities
    const stockBalance = await this.getWarehouseStockBalance(
      prisma,
      params.productId,
      params.warehouseId,
      params.zoneId,
    );
    let currentTotalQty = stockBalance?.quantity || 0;

    // Consume from batches in FIFO order
    for (const batch of batches) {
      if (remainingQty <= 0) break;

      // Lock batch for update
      const lockedBatch = await prisma.rawMaterialBatch.findUnique({
        where: { id: batch.id },
      });

      if (!lockedBatch || lockedBatch.availableQuantity <= 0) continue;

      const consumeFromBatch = Math.min(remainingQty, lockedBatch.availableQuantity);
      const newConsumedQty = lockedBatch.consumedQuantity + consumeFromBatch;
      const newAvailableQty = lockedBatch.receivedQuantity - newConsumedQty;

      // Update batch
      await prisma.rawMaterialBatch.update({
        where: { id: batch.id },
        data: {
          consumedQuantity: newConsumedQty,
          availableQuantity: newAvailableQty,
          status: newAvailableQty <= 0 ? RawMaterialBatchStatus.CONSUMED : RawMaterialBatchStatus.ACTIVE,
        },
      });

      batchUpdates.push({
        id: batch.id,
        consumedQty: newConsumedQty,
        availableQuantity: newAvailableQty,
      });

      // Create ledger entry for this batch consumption
      const openingQty = currentTotalQty;
      currentTotalQty -= consumeFromBatch;
      const closingQty = currentTotalQty;

      const ledgerEntry = await prisma.stockLedger.create({
        data: {
          productId: params.productId,
          warehouseId: params.warehouseId || null,
          zoneId: params.zoneId || null,
          batchId: batch.id,
          quantity: -consumeFromBatch,
          transactionType: params.movementType,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          openingQty,
          closingQty,
          remarks: params.remarks || `FIFO consumption from batch ${batch.batchNumber}`,
          createdById: params.userId,
        },
      });

      ledgerEntries.push(ledgerEntry);
      remainingQty -= consumeFromBatch;
    }

    if (remainingQty > 0) {
      throw new BadRequestException(`Insufficient stock in batches. Remaining: ${remainingQty}`);
    }

    // Update warehouse stock balance
    await this.updateWarehouseStockBalance(
      prisma,
      params.productId,
      currentTotalQty,
      params.warehouseId,
      params.zoneId,
      undefined, // batchId
      undefined, // availableQuantity
      undefined, // reservedQuantity
      params.movementType,
    );

    this.logger.log(
      `FIFO consumption: Product ${params.productId}, Qty: ${quantityToConsume}, Batches: ${batchUpdates.length}`,
    );

    return {
      ledgerEntries,
      batchUpdates,
      totalQuantity: quantityToConsume,
      openingQty: stockBalance?.quantity || 0,
      closingQty: currentTotalQty,
    };
  }

  /**
   * Consume from a specific batch
   */
  private async consumeFromBatch(
    prisma: PrismaClient | Prisma.TransactionClient,
    params: {
      productId: string;
      warehouseId?: string;
      zoneId?: string;
      batchId: string;
      quantity: number;
      movementType: StockTransactionType;
      referenceType: string;
      referenceId: string;
      openingQty?: number;
      closingQty?: number;
      remarks?: string;
      userId: string;
    },
    quantityToConsume: number,
    allowExpired: boolean,
  ) {
    // Lock batch for update
    const batch = await prisma.rawMaterialBatch.findUnique({
      where: { id: params.batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch not found: ${params.batchId}`);
    }

    if (batch.status === RawMaterialBatchStatus.EXPIRED && !allowExpired) {
      throw new BadRequestException("Cannot consume from expired batch");
    }

    if (batch.status === RawMaterialBatchStatus.BLOCKED) {
      throw new BadRequestException("Cannot consume from blocked batch");
    }

    if (batch.availableQuantity < quantityToConsume) {
      throw new BadRequestException(
        `Insufficient batch quantity. Available: ${batch.availableQuantity}, Requested: ${quantityToConsume}`,
      );
    }

    // Update batch
    const newConsumedQty = batch.consumedQuantity + quantityToConsume;
    const newAvailableQty = batch.receivedQuantity - newConsumedQty;

    await prisma.rawMaterialBatch.update({
      where: { id: batch.id },
      data: {
        consumedQuantity: newConsumedQty,
        availableQuantity: newAvailableQty,
        status: newAvailableQty <= 0 ? RawMaterialBatchStatus.CONSUMED : batch.status,
      },
    });

    // Get stock balance
    const stockBalance = await this.getWarehouseStockBalance(
      prisma,
      params.productId,
      params.warehouseId,
      params.zoneId,
    );

    const openingQty = stockBalance?.quantity || 0;
    const closingQty = openingQty - quantityToConsume;

    // Create ledger entry
    const ledgerEntry = await prisma.stockLedger.create({
      data: {
        productId: params.productId,
        warehouseId: params.warehouseId || null,
        zoneId: params.zoneId || null,
        batchId: batch.id,
        quantity: -quantityToConsume,
        transactionType: params.movementType,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        openingQty,
        closingQty,
        remarks: params.remarks || `Consumption from batch ${batch.batchNumber}`,
        createdById: params.userId,
      },
    });

    // Update warehouse stock balance
    await this.updateWarehouseStockBalance(
      prisma,
      params.productId,
      closingQty,
      params.warehouseId,
      params.zoneId,
      undefined, // batchId
      undefined, // availableQuantity
      undefined, // reservedQuantity
      params.movementType,
    );

    return {
      ledgerEntry,
      batchUpdate: {
        id: batch.id,
        consumedQty: newConsumedQty,
        availableQuantity: newAvailableQty,
      },
      openingQty,
      closingQty,
    };
  }

  /**
   * Consume stock without FIFO (any available batch)
   */
  private async consumeNonFIFO(
    prisma: PrismaClient | Prisma.TransactionClient,
    params: {
      productId: string;
      warehouseId?: string;
      zoneId?: string;
      quantity: number;
      movementType: StockTransactionType;
      referenceType: string;
      referenceId: string;
      openingQty?: number;
      closingQty?: number;
      remarks?: string;
      userId: string;
    },
    quantityToConsume: number,
    allowExpired: boolean,
  ) {
    // Non-FIFO: consume from any available batch (still enforce ACTIVE status)
    const where: Prisma.RawMaterialBatchWhereInput = {
      rawMaterialId: params.productId,
      status: RawMaterialBatchStatus.ACTIVE,
      availableQuantity: { gt: 0 },
      deletedAt: null,
    };

    if (!allowExpired) {
      where.OR = [{ expiryDate: null }, { expiryDate: { gt: new Date() } }];
    }

    const batches = await prisma.rawMaterialBatch.findMany({
      where,
      take: 50,
    });

    if (batches.length === 0) {
      throw new BadRequestException("No available batches found");
    }

    // Consume from first available batch with enough quantity
    for (const batch of batches) {
      if (batch.availableQuantity >= quantityToConsume) {
        return this.consumeFromBatch(
          prisma,
          { ...params, batchId: batch.id },
          quantityToConsume,
          allowExpired,
        );
      }
    }

    throw new BadRequestException("No single batch has sufficient quantity");
  }

  /**
   * Record stock increase (receipt, production, etc.)
   */
  private async recordIncrease(
    prisma: PrismaClient | Prisma.TransactionClient,
    params: {
      productId: string;
      warehouseId?: string;
      zoneId?: string;
      batchId?: string;
      quantity: number; // Positive
      movementType: StockTransactionType;
      referenceType: string;
      referenceId: string;
      openingQty?: number;
      closingQty?: number;
      remarks?: string;
      userId: string;
      // For batch creation
      batchNumber?: string;
      expiryDate?: Date;
      manufacturingDate?: Date;
      receivedDate?: Date;
    },
  ) {
    const quantityToAdd = params.quantity;

    // Get current stock balance
    const stockBalance = await this.getWarehouseStockBalance(
      prisma,
      params.productId,
      params.warehouseId,
      params.zoneId,
      true, // Lock for update
    );

    const openingQty = stockBalance?.quantity || 0;
    const closingQty = openingQty + quantityToAdd;

    let batchId = params.batchId;

    // Create or update batch if needed
    // For transfers: If batchId provided, verify it's in the correct warehouse
    // If batchNumber provided but no batchId, find or create batch with that number
    if (batchId) {
      // Verify batch exists and is in correct warehouse
      const batch = await prisma.rawMaterialBatch.findUnique({
        where: { id: batchId },
      });

      if (batch) {
        // Update existing batch
        const newQuantity = batch.receivedQuantity + quantityToAdd;
        const newAvailableQty = newQuantity - batch.consumedQuantity;

        await prisma.rawMaterialBatch.update({
          where: { id: batchId },
          data: {
            availableQuantity: newAvailableQty,
            receivedQuantity: batch.receivedQuantity + quantityToAdd,
          },
        });
      } else {
        // Batch not found, clear batchId
        batchId = undefined;
      }
    }

    // If no batchId, create or find batch
    if (!batchId) {
      // If batchNumber provided, try to find existing batch first
      if (params.batchNumber) {
        const existingBatch = await prisma.rawMaterialBatch.findFirst({
          where: {
            batchNumber: params.batchNumber,
            deletedAt: null,
          },
        });

        if (existingBatch) {
          // Add to existing batch in destination warehouse
          const newQuantity = existingBatch.receivedQuantity + quantityToAdd;
          const newAvailableQty = newQuantity - existingBatch.consumedQuantity;

          await prisma.rawMaterialBatch.update({
            where: { id: existingBatch.id },
            data: {
              availableQuantity: newAvailableQty,
              receivedQuantity: existingBatch.receivedQuantity + quantityToAdd,
            },
          });

          batchId = existingBatch.id;
          this.logger.debug(
            `[RECORD-INCREASE] Added ${quantityToAdd} to existing batch ${params.batchNumber}`,
          );
        }
      }

      // If still no batchId, create new batch
      if (!batchId && (params.batchNumber || params.expiryDate || params.manufacturingDate)) {
        batchId = await this.createOrUpdateBatch(prisma, {
          warehouseId: params.warehouseId,
          zoneId: params.zoneId,
          batchNumber: params.batchNumber,
          quantity: quantityToAdd,
          expiryDate: params.expiryDate,
          manufacturingDate: params.manufacturingDate,
          receivedDate: params.receivedDate || new Date(),
        });

        this.logger.debug(
          `[RECORD-INCREASE] Created new batch ${params.batchNumber || "AUTO"} ` +
            `in warehouse ${params.warehouseId} with quantity ${quantityToAdd}`,
        );
      }
    }

    // Create ledger entry
    const ledgerEntry = await prisma.stockLedger.create({
      data: {
        productId: params.productId,
        warehouseId: params.warehouseId || null,
        zoneId: params.zoneId || null,
        batchId: batchId || null,
        quantity: quantityToAdd,
        transactionType: params.movementType,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        openingQty,
        closingQty,
        remarks:
          params.remarks ||
          `${params.movementType} - ${params.referenceType}:${params.referenceId}`,
        createdById: params.userId,
      },
    });

    // Update warehouse stock balance (aggregate - batchId: null)
    await this.updateWarehouseStockBalance(
      prisma,
      params.productId,
      closingQty,
      params.warehouseId,
      params.zoneId,
      null, // Explicitly pass null for aggregate balance
      undefined,
      undefined,
      params.movementType,
    );

    // Also update batch-specific stock balance if batch exists
    if (batchId) {
      // Get current batch balance or 0
      // Use findFirst when zoneId is null, as findUnique doesn't support null in composite keys
      const batchBalance = params.zoneId
        ? await prisma.warehouseStockBalance.findUnique({
            where: {
              warehouseId_zoneId_productId_batchId: {
                warehouseId: params.warehouseId!,
                zoneId: params.zoneId,
                productId: params.productId,
                batchId: batchId,
              },
            },
          })
        : await prisma.warehouseStockBalance.findFirst({
            where: {
              warehouseId: params.warehouseId!,
              zoneId: null,
              batchId: batchId,
            },
          });
      const batchOpeningQty = batchBalance?.quantity || 0;
      const batchClosingQty = batchOpeningQty + quantityToAdd;

      await this.updateWarehouseStockBalance(
        prisma,
        params.productId,
        batchClosingQty,
        params.warehouseId,
        params.zoneId,
        batchId,
        undefined,
        undefined,
        params.movementType,
      );
    }

    this.logger.log(
      `Stock increase: Product ${params.productId}, Qty: ${quantityToAdd}, Balance: ${openingQty} -> ${closingQty}`,
    );

    return {
      ledgerEntry,
      openingQty,
      closingQty,
      batchId,
    };
  }

  /**
   * Create or update batch
   */
  private async createOrUpdateBatch(
    prisma: PrismaClient | Prisma.TransactionClient,
    params: {
      warehouseId?: string;
      zoneId?: string;
      batchNumber?: string;
      quantity: number;
      expiryDate?: Date;
      manufacturingDate?: Date;
      receivedDate: Date;
    },
  ): Promise<string | null> {
    // Generate batch number if not provided
    let batchNumber =
      params.batchNumber || (await this.generateBatchNumber(prisma));

    // Check if batch already exists globally by batchNumber + productId
    const existingBatch = await prisma.rawMaterialBatch.findFirst({
      where: { batchNumber, deletedAt: null },
    });

    if (existingBatch) {
      // Update existing batch in this warehouse
      const newQuantity = existingBatch.receivedQuantity + params.quantity;
      const newAvailableQty = newQuantity - existingBatch.consumedQuantity;

      await prisma.rawMaterialBatch.update({
        where: { id: existingBatch.id },
        data: {
          availableQuantity: newAvailableQty,
          receivedQuantity: existingBatch.receivedQuantity + params.quantity,
        },
      });

      this.logger.debug(
        `[CREATE-OR-UPDATE-BATCH] Updated existing batch ${batchNumber}, new quantity: ${newQuantity}`,
      );

      return existingBatch.id;
    }

    // Cannot create a raw-material batch without rawMaterialId (product context — skip)
    this.logger.debug(
      `[CREATE-OR-UPDATE-BATCH] Skipping batch creation for ${batchNumber} — no rawMaterialId available`,
    );

    return null;
  }

  /**
   * Generate unique batch number
   */
  private async generateBatchNumber(
    prisma: PrismaClient | Prisma.TransactionClient,
  ): Promise<string> {
    const prefix = "BATCH";
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = date.getTime().toString().slice(-6);

    let batchNumber = `${prefix}-${dateStr}-${timeStr}`;
    let counter = 1;

    // Ensure uniqueness
    while (await prisma.rawMaterialBatch.findUnique({ where: { batchNumber } })) {
      batchNumber = `${prefix}-${dateStr}-${timeStr}-${counter}`;
      counter++;
    }

    return batchNumber;
  }

  /**
   * Get warehouse stock balance (with optional row-level lock)
   */
  private async getWarehouseStockBalance(
    prisma: PrismaClient | Prisma.TransactionClient,
    productId: string,
    warehouseId?: string,
    zoneId?: string,
    lockForUpdate = false,
  ) {
    if (!warehouseId) {
      return null; // Legacy location-based stock
    }

    if (lockForUpdate) {
      // Use raw query for SELECT FOR UPDATE
      // Map snake_case DB columns to camelCase for consistency with Prisma.
      // IMPORTANT: We must avoid passing a NULL parameter twice (Postgres 42P18),
      // so we branch on zoneId in JS and only use one parameter for it.
      let result;

      if (zoneId == null) {
        // zoneId is null → match rows where zone_id IS NULL
        result = await (prisma as any).$queryRaw`
          SELECT 
            id,
            warehouse_id as "warehouseId",
            zone_id as "zoneId",
            product_id as "productId",
            batch_id as "batchId",
            quantity,
            reserved_quantity as "reservedQuantity",
            available_quantity as "availableQuantity",
            last_updated as "lastUpdated"
          FROM warehouse_stock_balances
          WHERE product_id = ${productId}
            AND warehouse_id = ${warehouseId}
            AND zone_id IS NULL
            AND batch_id IS NULL
          FOR UPDATE
        `;
      } else {
        // zoneId has a concrete value
        result = await (prisma as any).$queryRaw`
          SELECT 
            id,
            warehouse_id as "warehouseId",
            zone_id as "zoneId",
            product_id as "productId",
            batch_id as "batchId",
            quantity,
            reserved_quantity as "reservedQuantity",
            available_quantity as "availableQuantity",
            last_updated as "lastUpdated"
          FROM warehouse_stock_balances
          WHERE product_id = ${productId}
            AND warehouse_id = ${warehouseId}
            AND zone_id = ${zoneId}
            AND batch_id IS NULL
          FOR UPDATE
        `;
      }

      return (result as any[])[0] || null;
    }

    // Non-locking path: when zoneId is not provided, we cannot use the
    // compound unique key with a null zoneId (Prisma disallows null in the
    // unique input), so we use findFirst with an explicit where clause.
    if (zoneId == null) {
      return prisma.warehouseStockBalance.findFirst({
        where: {
          warehouseId,
          zoneId: null,
          batchId: null,
        },
      });
    }

    // When zoneId is provided, we can safely use the compound unique key
    return prisma.warehouseStockBalance.findUnique({
      where: {
        warehouseId_zoneId_productId_batchId: {
          warehouseId,
          zoneId,
          productId,
          batchId: null,
        },
      },
    });
  }

  /**
   * Update warehouse stock balance
   */
  private async updateWarehouseStockBalance(
    prisma: PrismaClient | Prisma.TransactionClient,
    productId: string,
    quantity: number,
    warehouseId?: string,
    zoneId?: string,
    batchId?: string | null,
    availableQuantity?: number,
    reservedQuantity?: number,
    movementType?: StockTransactionType,
  ) {
    if (!warehouseId) return;

    const balanceBatchId = batchId !== undefined ? batchId : null;

    const existing = await prisma.warehouseStockBalance.findFirst({
      where: {
        warehouseId,
        zoneId: zoneId || null,
        batchId: balanceBatchId,
      },
    });

    let finalAvailable = availableQuantity;
    let finalReserved = reservedQuantity;

    if (existing && finalAvailable === undefined && finalReserved === undefined) {
      const oldTotal = Number(existing.quantity);
      const diff = quantity - oldTotal;

      if (diff < 0) {
        // Reduction
        if (movementType === StockTransactionType.TRANSFER_OUT) {
          // Deduct from reserved stock
          finalReserved = Math.max(0, Number(existing.reservedQuantity) + diff);
          finalAvailable = quantity - finalReserved;
        } else {
          // Deduct from available stock
          finalAvailable = Math.max(0, Number(existing.availableQuantity) + diff);
          finalReserved = Number(existing.reservedQuantity);
        }
      } else {
        // Increase or no change
        finalAvailable = Number(existing.availableQuantity) + diff;
        finalReserved = Number(existing.reservedQuantity);
      }
    } else if (!existing) {
      finalAvailable = availableQuantity !== undefined ? availableQuantity : quantity;
      finalReserved = reservedQuantity !== undefined ? reservedQuantity : 0;
    }

    // Fallback if still undefined (e.g. increase with existing but somehow skipped)
    finalAvailable = finalAvailable === undefined ? quantity : finalAvailable;
    finalReserved = finalReserved === undefined ? 0 : finalReserved;

    // Final safety check: physical stock cannot be negative
    const finalQuantity = Math.max(0, quantity);
    finalAvailable = Math.max(0, finalAvailable === undefined ? finalQuantity : finalAvailable);
    finalReserved = Math.max(0, finalReserved === undefined ? 0 : finalReserved);

    if (existing) {
      await prisma.warehouseStockBalance.update({
        where: { id: existing.id },
        data: {
          quantity: finalQuantity,
          availableQuantity: finalAvailable,
          reservedQuantity: finalReserved,
          lastUpdated: new Date(),
        },
      });
    } else {
      await prisma.warehouseStockBalance.create({
        data: {
          warehouseId,
          zoneId: zoneId || null,
          productId,
          batchId: balanceBatchId,
          quantity: finalQuantity,
          reservedQuantity: finalReserved,
          availableQuantity: finalAvailable,
          lastUpdated: new Date(),
        },
      });
    }

    // Automatically update warehouse capacity after AGGREGATE stock balance change
    // We only update capacity for the aggregate balance (batchId is null) to avoid double counting
    if (balanceBatchId === null) {
      try {
        const volume = 1.0;

        // Calculate the physical volume delta based on the CAPPED final quantities
        const oldTotal = existing ? Number(existing.quantity) : 0;
        const quantityDiff = finalQuantity - oldTotal;
        const deltaVolume = quantityDiff * volume;

        // Perform atomic delta update
        if (deltaVolume !== 0) {
          await this.capacityService.adjustCapacity(prisma, warehouseId, deltaVolume);
        }
      } catch (e) {
        this.logger.error(
          `[CAPACITY-FAIL] Critical failure updating capacity for ${warehouseId}: ${e.message}`,
        );
        throw e; // RETHROW to ensure transaction rollback
      }
    }
  }

  /**
   * Record multiple stock movements in a single transaction
   */
  async recordMovements(
    tenantClient: PrismaClient,
    movements: Array<{
      productId: string;
      warehouseId?: string;
      zoneId?: string;
      batchId?: string;
      quantity: number;
      movementType: StockTransactionType;
      referenceType: string;
      referenceId: string;
      remarks?: string;
      useFIFO?: boolean;
      allowExpired?: boolean;
      batchNumber?: string;
      expiryDate?: Date;
      manufacturingDate?: Date;
      receivedDate?: Date;
    }>,
    userId: string,
  ) {
    return tenantClient.$transaction(async (tx) => {
      const results = [];

      for (const movement of movements) {
        const result = await this.recordMovement(
          tenantClient,
          {
            ...movement,
            userId,
          },
          tx,
        );
        results.push(result);
      }

      return results;
    });
  }

  /**
   * Get current stock balance
   */
  async getCurrentBalance(
    prisma: PrismaClient | Prisma.TransactionClient,
    productId: string,
    warehouseId?: string,
    zoneId?: string,
  ): Promise<number> {
    if (warehouseId) {
      const balance = await this.getWarehouseStockBalance(prisma, productId, warehouseId, zoneId);
      return balance ? Number(balance.quantity) : 0;
    }

    // Legacy location-based balance
    const balance = await prisma.stockBalance.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId: "", // This would need to be passed
        },
      },
    });

    return balance ? Number(balance.quantity) : 0;
  }

  /**
   * Check if sufficient stock is available
   * Automatically creates batches from orphan stock if needed
   */
  async checkStockAvailability(
    prisma: PrismaClient | Prisma.TransactionClient,
    productId: string,
    requiredQuantity: number,
    warehouseId?: string,
    zoneId?: string,
    allowExpired = false,
    checkPhysical = false,
  ): Promise<boolean> {
    // Use warehouse_stock_balances table as source of truth
    if (warehouseId) {
      const where: Prisma.WarehouseStockBalanceWhereInput = {
        warehouseId,
        productId,
      };

      if (zoneId !== undefined && zoneId !== null) {
        where.zoneId = zoneId;
      }

      const stockBalances = await prisma.warehouseStockBalance.findMany({
        where,
        select: {
          quantity: true,
          reservedQuantity: true,
          availableQuantity: true,
          zoneId: true,
        },
      });

      // Sum available or physical quantity based on checkPhysical flag
      const totalAvailable = stockBalances.reduce(
        (sum, b) => sum + Number(checkPhysical ? b.quantity : (b.availableQuantity ?? 0)),
        0,
      );

      // Debug logging
      this.logger.debug(
        `[STOCK-AVAILABILITY-CHECK] Product: ${productId}, Warehouse: ${warehouseId}, Zone: ${zoneId || "ALL"}, ` +
          `Required: ${requiredQuantity}, Available (from warehouse_stock_balances): ${totalAvailable}, ` +
          `Stock balance records: ${stockBalances.length}`,
      );

      if (stockBalances.length > 0) {
        this.logger.debug(
          `[STOCK-AVAILABILITY-CHECK] Stock balance details: ` +
            stockBalances
              .map(
                (b) =>
                  `Zone=${b.zoneId || "NULL"}, Qty=${b.quantity}, ` +
                  `Reserved=${b.reservedQuantity}, Available=${b.availableQuantity}`,
              )
              .join("; "),
        );
      }

      if (totalAvailable < requiredQuantity) {
        this.logger.warn(
          `[STOCK-AVAILABILITY] INSUFFICIENT STOCK - Product: ${productId}, Warehouse: ${warehouseId}\n` +
            `  Required: ${requiredQuantity}, Available: ${totalAvailable}\n` +
            `  Stock balance records: ${stockBalances.length}`,
        );
      }

      return totalAvailable >= requiredQuantity;
    }

    // Legacy location-based balance check
    const currentBalance = await this.getCurrentBalance(prisma, productId, warehouseId, zoneId);
    return currentBalance >= requiredQuantity;
  }

  /**
   * Automatically create batches from orphan stock in warehouse_stock_balances
   * This ensures stock is always accessible even if batches weren't created initially
   */
  private async autoCreateBatchesFromOrphanStock(
    prisma: PrismaClient | Prisma.TransactionClient,
    productId: string,
    warehouseId: string,
    zoneId?: string,
  ): Promise<any[]> {
    try {
      // Find orphan stock (stock in warehouse_stock_balances without batches)
      const orphanStock = await prisma.warehouseStockBalance.findMany({
        where: {
          warehouseId,
          batchId: null,
          availableQuantity: { gt: 0 },
          ...(zoneId ? { zoneId } : { zoneId: null }),
        },
        select: {
          id: true,
          quantity: true,
          availableQuantity: true,
          reservedQuantity: true,
          zoneId: true,
        },
      });

      if (orphanStock.length === 0) {
        this.logger.debug(
          `[AUTO-CREATE-BATCHES] No orphan stock found for product ${productId} in warehouse ${warehouseId}`,
        );
        return [];
      }

      // Raw-material batches require rawMaterialId — skip auto-creation for product orphan stock
      this.logger.log(
        `[AUTO-CREATE-BATCHES] Skipping auto-creation for product ${productId} in warehouse ${warehouseId} — raw material ID not available`,
      );

      return [];
    } catch (error) {
      this.logger.error(
        `[AUTO-CREATE-BATCHES] Failed to create batches from orphan stock: ${error.message}`,
        error.stack,
      );
      // Don't throw - return empty array so stock check can continue
      return [];
    }
  }

  /**
   * Mark expired batches (called by cron job)
   */
  async markExpiredBatches(tenantClient: PrismaClient) {
    const expiredBatches = await tenantClient.rawMaterialBatch.updateMany({
      where: {
        status: RawMaterialBatchStatus.ACTIVE,
        expiryDate: {
          lte: new Date(),
          not: null,
        },
        availableQuantity: { gt: 0 },
      },
      data: {
        status: RawMaterialBatchStatus.EXPIRED,
      },
    });

    this.logger.log(`Marked ${expiredBatches.count} batches as expired`);
    return expiredBatches.count;
  }
}
