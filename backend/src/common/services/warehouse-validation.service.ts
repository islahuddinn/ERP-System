import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaClient, WarehouseType, ZoneType } from "@prisma/tenant-client";

/**
 * PHASE 1: FOUNDATION & CONTROL
 * Warehouse Validation Service
 *
 * Enforces warehouse type segregation as a CRITICAL rule:
 * - STORAGE warehouses can ONLY receive purchases
 * - DISPATCH warehouses can ONLY serve sales
 * - Zone types must match warehouse type
 */
@Injectable()
export class WarehouseValidationService {
  private readonly logger = new Logger(WarehouseValidationService.name);

  /**
   * CRITICAL BUSINESS RULE: Purchase Order Receipt Warehouse Validation
   *
   * When a purchase order is received:
   * - DISPATCH warehouses are DISABLED - PO cannot be received into dispatch
   * - STORAGE warehouses are REQUIRED - all POs must go to storage only
   *
   * Rationale:
   * - Dispatch warehouses serve SALES only (fulfillment)
   * - Storage warehouses receive RAW MATERIALS (purchases)
   * - This segregation prevents cross-contamination of supply flows
   *
   * @param tenantClient - Prisma client
   * @param warehouseId - Warehouse ID to validate
   * @param operationName - For error message
   * @throws BadRequestException if warehouse is not STORAGE type
   */
  async validateWarehouseTypeForReceiving(
    tenantClient: PrismaClient,
    warehouseId: string,
    operationName: string = "Purchase Receipt",
  ): Promise<void> {
    // Get warehouse
    const warehouse = await tenantClient.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse not found: ${warehouseId}`);
    }

    // Validate warehouse is active
    if (!warehouse.isActive) {
      throw new BadRequestException(
        `Warehouse is inactive and cannot be used for ${operationName}: ${warehouse.name}`,
      );
    }

    // CRITICAL RULE: Only STORAGE warehouses can receive purchases
    // DISPATCH warehouses are DISABLED for PO receipt
    if (warehouse.warehouseType !== WarehouseType.STORAGE) {
      throw new BadRequestException(
        `PURCHASE ORDER RECEIPT BLOCKED - DISPATCH WAREHOUSE NOT ALLOWED\n` +
          `Warehouse "${warehouse.name}" is type ${warehouse.warehouseType}.\n` +
          `DISPATCH warehouses are reserved for SALES/FULFILLMENT only.\n` +
          `STORAGE warehouses are REQUIRED for all purchase order receipts.\n` +
          `Please select a STORAGE warehouse to receive this purchase order.`,
      );
    }

    this.logger.log(
      `✓ Warehouse validation passed for ${operationName}: ${warehouse.name} (STORAGE)`,
    );
  }

  /**
   * Validate warehouse exists and is of correct type for SALES
   * RULE 1: Only DISPATCH warehouses can serve sales
   *
   * @param tenantClient - Prisma client
   * @param warehouseId - Warehouse ID to validate
   * @param operationName - For error message
   * @throws BadRequestException if warehouse is not DISPATCH type
   */
  async validateWarehouseTypeForSales(
    tenantClient: PrismaClient,
    warehouseId: string,
    operationName: string = "Sale",
  ): Promise<void> {
    // Get warehouse
    const warehouse = await tenantClient.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse not found: ${warehouseId}`);
    }

    // Validate warehouse is active
    if (!warehouse.isActive) {
      throw new BadRequestException(
        `Warehouse is inactive and cannot be used for ${operationName}: ${warehouse.name}`,
      );
    }

    // RULE: Only DISPATCH warehouses can serve sales
    if (warehouse.warehouseType !== WarehouseType.DISPATCH) {
      throw new BadRequestException(
        `VALIDATION FAILED: ${operationName} can only be fulfilled from DISPATCH warehouses. ` +
          `Warehouse "${warehouse.name}" is type ${warehouse.warehouseType}. ` +
          `STORAGE warehouses contain raw materials only.`,
      );
    }

    this.logger.log(
      `✓ Warehouse validation passed for ${operationName}: ${warehouse.name} (DISPATCH)`,
    );
  }

  /**
   * Validate zone type matches warehouse type
   * RULE 1: STORAGE warehouses can only have RAW_MATERIALS or QUARANTINE zones
   *         DISPATCH warehouses can only have FINISHED_GOODS zone
   *
   * @param tenantClient - Prisma client
   * @param zoneId - Zone ID to validate
   * @param warehouseType - Expected warehouse type
   * @throws BadRequestException if zone type doesn't match warehouse type
   */
  async validateZoneTypeMatch(
    tenantClient: PrismaClient,
    zoneId: string,
    warehouseType: WarehouseType,
  ): Promise<void> {
    // Get zone with warehouse details
    const zone = await tenantClient.warehouseZone.findUnique({
      where: { id: zoneId },
      include: { warehouse: true },
    });

    if (!zone) {
      throw new NotFoundException(`Zone not found: ${zoneId}`);
    }

    // Validate zone matches warehouse type
    const validZoneTypesForStorage: string[] = ["RAW_MATERIALS", "PACKAGING", "QUARANTINE"];
    const validZoneTypesForDispatch: string[] = ["FINISHED_GOODS"];

    if (warehouseType === WarehouseType.STORAGE) {
      if (!validZoneTypesForStorage.includes(zone.zoneType as string)) {
        throw new BadRequestException(
          `VALIDATION FAILED: Zone "${zone.name}" has type ${zone.zoneType}. ` +
            `STORAGE warehouses can only contain RAW_MATERIALS or QUARANTINE zones. ` +
            `Zone type mismatch.`,
        );
      }
    } else if (warehouseType === WarehouseType.DISPATCH) {
      if (!validZoneTypesForDispatch.includes(zone.zoneType as string)) {
        throw new BadRequestException(
          `VALIDATION FAILED: Zone "${zone.name}" has type ${zone.zoneType}. ` +
            `DISPATCH warehouses can only contain FINISHED_GOODS zones. ` +
            `Zone type mismatch.`,
        );
      }
    }

    this.logger.log(
      `✓ Zone type validation passed: ${zone.name} (${zone.zoneType}) in ${warehouseType} warehouse`,
    );
  }

  /**
   * Get default STORAGE warehouse for a location (for material requests, receiving)
   * @param tenantClient - Prisma client
   * @param locationId - Location ID
   * @returns Warehouse if found, null otherwise
   */
  async getStorageWarehouseForLocation(tenantClient: PrismaClient, locationId: string) {
    return tenantClient.warehouse.findFirst({
      where: {
        locationId,
        warehouseType: WarehouseType.STORAGE,
        isActive: true,
      },
    });
  }

  /**
   * Get default DISPATCH warehouse for a location (for sales)
   * @param tenantClient - Prisma client
   * @param locationId - Location ID
   * @returns Warehouse if found, null otherwise
   */
  async getDispatchWarehouseForLocation(tenantClient: PrismaClient, locationId: string) {
    return tenantClient.warehouse.findFirst({
      where: {
        locationId,
        warehouseType: WarehouseType.DISPATCH,
        isActive: true,
      },
    });
  }

  /**
   * Validate that a warehouse has sufficient stock for an operation
   * RULE 4: Stock must never go negative
   *
   * @param tenantClient - Prisma client
   * @param warehouseId - Warehouse ID
   * @param productId - Product ID
   * @param requiredQuantity - Quantity needed
   * @param zoneId - Optional zone ID to restrict to specific zone
   * @throws BadRequestException if insufficient stock
   * @returns Available quantity in warehouse
   */
  async validateStockAvailability(
    tenantClient: PrismaClient,
    warehouseId: string,
    productId: string,
    requiredQuantity: number,
    zoneId?: string,
  ): Promise<number> {
    // Get total available stock in warehouse (or zone if specified)
    const stocks = await tenantClient.warehouseStockBalance.findMany({
      where: {
        warehouseId,
        productId,
        ...(zoneId && { zoneId }),
      },
    });

    const totalAvailable = stocks.reduce((sum, s) => sum + (s.quantity - s.reservedQuantity), 0);

    // Check if we have enough
    if (totalAvailable < requiredQuantity) {
      throw new BadRequestException(
        `VALIDATION FAILED: Insufficient stock. ` +
          `Required: ${requiredQuantity}, Available: ${totalAvailable}. ` +
          `Cannot proceed with stock deduction (would result in negative stock).`,
      );
    }

    this.logger.log(
      `✓ Stock availability check passed: ${totalAvailable} available (need ${requiredQuantity})`,
    );

    return totalAvailable;
  }

  /**
   * Validate projected quantity won't go negative
   * This is a pre-flight check before any OUT movement
   *
   * RULE 4: No Negative Stock (Critical Rule)
   *
   * @param currentQuantity - Current stock balance
   * @param outQuantity - Quantity being deducted
   * @throws BadRequestException if result would be negative
   */
  validateProjectedQuantity(currentQuantity: number, outQuantity: number): void {
    const projected = currentQuantity - outQuantity;

    if (projected < 0) {
      throw new BadRequestException(
        `VALIDATION FAILED: Stock cannot go negative. ` +
          `Current: ${currentQuantity}, Requested: ${outQuantity}, Projected: ${projected}. ` +
          `REJECTED to prevent inventory mismatch.`,
      );
    }

    this.logger.log(
      `✓ Negative stock validation passed: ${currentQuantity} - ${outQuantity} = ${projected} (≥ 0)`,
    );
  }
}
