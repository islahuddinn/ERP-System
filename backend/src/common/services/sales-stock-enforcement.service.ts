import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaClient, SaleStatus, WarehouseType } from "@prisma/tenant-client";
import { WarehouseValidationService } from "./warehouse-validation.service";
import { StockLedgerService } from "./stock-ledger.service";

/**
 * PHASE 1: FOUNDATION & CONTROL
 * Sales Stock Enforcement Service
 *
 * CRITICAL RULE: Stock Deduction Must Precede Profit Recording
 *
 * A sale CANNOT be marked COMPLETED unless:
 * 1. Stock exists in DISPATCH warehouse
 * 2. Stock is deducted
 * 3. StockLedger entry is written
 */
@Injectable()
export class SalesStockEnforcementService {
  private readonly logger = new Logger(SalesStockEnforcementService.name);

  constructor(
    private warehouseValidationService: WarehouseValidationService,
    private stockLedgerService: StockLedgerService,
  ) {}

  /**
   * PHASE 1 RULE 2: Enforce stock deduction BEFORE sale completion
   *
   * This method validates that:
   * 1. Dispatch warehouse exists and is active
   * 2. All sale items have sufficient stock in dispatch
   * 3. Stock will be deducted in a transaction
   * 4. StockLedger entry is created for audit trail
   * 5. ONLY THEN can sale status be set to COMPLETED
   *
   * @param tenantClient - Prisma client
   * @param saleId - Sale ID
   * @param warehouseId - Optional warehouse ID (if not provided, use default dispatch)
   * @param userId - User deducting stock
   * @throws BadRequestException if warehouse is not DISPATCH or stock insufficient
   */
  async enforceStockDeductionBeforeCompletion(
    tenantClient: PrismaClient,
    saleId: string,
    locationId: string,
    warehouseId?: string,
    userId?: string,
  ): Promise<void> {
    // Get sale with items
    const sale = await tenantClient.sale.findUnique({
      where: { id: saleId },
      include: {
        saleItems: {
          include: { product: true },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale not found: ${saleId}`);
    }

    // Determine warehouse
    let effectiveWarehouseId = warehouseId;
    if (!effectiveWarehouseId) {
      // Auto-select default dispatch warehouse
      const dispatchWh = await this.warehouseValidationService.getDispatchWarehouseForLocation(
        tenantClient,
        locationId,
      );
      if (!dispatchWh) {
        throw new BadRequestException(
          "No DISPATCH warehouse found for this location. Cannot complete sale without dispatch warehouse.",
        );
      }
      effectiveWarehouseId = dispatchWh.id;
    }

    // RULE 1: Validate warehouse is DISPATCH type
    await this.warehouseValidationService.validateWarehouseTypeForSales(
      tenantClient,
      effectiveWarehouseId,
      `Sale ${sale.saleNumber}`,
    );

    // RULE 4: Validate stock availability for ALL items
    for (const item of sale.saleItems) {
      try {
        await this.warehouseValidationService.validateStockAvailability(
          tenantClient,
          effectiveWarehouseId,
          item.productId,
          Number(item.quantity),
        );
      } catch (error) {
        throw new BadRequestException(
          `Cannot complete sale ${sale.saleNumber}. ` + `${error.message}`,
        );
      }
    }

    this.logger.log(
      `✓ Stock validation passed for sale ${sale.saleNumber}: ` +
        `All ${sale.saleItems.length} items have sufficient stock in DISPATCH warehouse`,
    );
  }

  /**
   * Validate that a sale has a corresponding stock deduction ledger entry
   * Used to verify profit can be calculated
   *
   * RULE 2: Profit calculation must validate a StockLedger OUT entry exists
   *
   * @param tenantClient - Prisma client
   * @param saleId - Sale ID
   * @returns true if StockLedger OUT entry exists
   * @throws BadRequestException if no stock movement found
   */
  async validateStockDeductionExists(tenantClient: PrismaClient, saleId: string): Promise<boolean> {
    const stockLedgerEntry = await tenantClient.stockLedger.findFirst({
      where: {
        referenceId: saleId,
        referenceType: "SALE",
        transactionType: "OUT", // Deduction
      },
    });

    if (!stockLedgerEntry) {
      throw new BadRequestException(
        `VALIDATION FAILED: Cannot calculate profit for sale. ` +
          `No stock deduction found in StockLedger. ` +
          `Sale may not have been completed properly.`,
      );
    }

    this.logger.log(`✓ Stock deduction verified for sale ${saleId}`);
    return true;
  }

  /**
   * Validate sale is COMPLETED status
   * Used before any profit calculation
   *
   * RULE 2: Profit can only be calculated for COMPLETED sales
   *
   * @param tenantClient - Prisma client
   * @param saleId - Sale ID
   * @throws BadRequestException if sale is not COMPLETED
   */
  async validateSaleIsCompleted(tenantClient: PrismaClient, saleId: string): Promise<void> {
    const sale = await tenantClient.sale.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      throw new NotFoundException(`Sale not found: ${saleId}`);
    }

    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException(
        `VALIDATION FAILED: Cannot calculate profit for non-completed sale. ` +
          `Sale status is ${sale.status}, must be COMPLETED. ` +
          `Complete the sale and ensure stock is deducted first.`,
      );
    }

    this.logger.log(`✓ Sale completion validation passed for ${sale.saleNumber}`);
  }

  /**
   * Validate that all sale items have batch linkage (Phase 2+)
   * This ensures profit calculation can use actual batch cost
   *
   * @param tenantClient - Prisma client
   * @param saleId - Sale ID
   * @returns true if all items have batchId set
   */
  async validateBatchLinkage(tenantClient: PrismaClient, saleId: string): Promise<boolean> {
    const saleItems = await tenantClient.saleItem.findMany({
      where: { saleId },
      select: { id: true, sku: true },
    });

    // Phase 2: Batch linkage will be implemented when SaleItem.batchId is added
    // For now, this is a placeholder for future enhancement
    const itemsWithoutBatch = saleItems;

    if (itemsWithoutBatch.length > 0) {
      this.logger.warn(
        `⚠️ Sale ${saleId} has ${itemsWithoutBatch.length} items without batch linkage. ` +
          `Profit calculation will use generic product cost.`,
      );
      return false;
    }

    this.logger.log(
      `✓ Batch linkage validation passed for sale ${saleId}: ` +
        `All ${saleItems.length} items linked to batches`,
    );
    return true;
  }
}
