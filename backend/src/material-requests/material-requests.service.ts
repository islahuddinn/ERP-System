import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { MaterialRequestsRepository } from "./material-requests.repository";
import {
  CreateMaterialRequestDto,
  UpdateMaterialRequestDto,
  MaterialRequestStatus,
} from "./dto/material-request.dto";
import { AuditService } from "../audit/audit.service";
import { AuditContextService } from "../audit/audit-context.service";
import { StockLedgerService } from "../common/services/stock-ledger.service";
import { WarehouseValidationService } from "../common/services/warehouse-validation.service";
import { PrismaClient, StockTransactionType } from "@prisma/tenant-client";

@Injectable()
export class MaterialRequestsService {
  private readonly logger = new Logger(MaterialRequestsService.name);

  constructor(
    private readonly materialRequestsRepository: MaterialRequestsRepository,
    private readonly auditService: AuditService,
    private readonly auditContext: AuditContextService,
    private readonly stockLedgerService: StockLedgerService,
    private readonly warehouseValidationService: WarehouseValidationService,
  ) {}

  async create(
    tenantClient: PrismaClient,
    createDto: CreateMaterialRequestDto,
    tenantId: string,
    userId: string,
  ) {
    try {
      this.logger.error(
        "[MATERIAL-REQUEST-SERVICE] Starting create: " +
          JSON.stringify(
            {
              hasTenantClient: !!tenantClient,
              tenantId,
              userId,
              dtoKeys: Object.keys(createDto || {}),
              materialsCount: createDto?.materials?.length,
              plantId: createDto?.plantId,
              warehouseId: createDto?.warehouseId,
              requiredDate: createDto?.requiredDate,
            },
            null,
            2,
          ),
      );

      // Validate materials array exists and is non-empty
      if (
        !createDto.materials ||
        !Array.isArray(createDto.materials) ||
        createDto.materials.length === 0
      ) {
        console.error(
          "[MATERIAL-REQUEST-SERVICE] Validation failed: materials array empty or missing",
        );
        throw new BadRequestException("At least one material item is required");
      }

      // Validate that either plantId or warehouseId is provided
      if (!createDto.plantId && !createDto.warehouseId) {
        throw new BadRequestException("Either plantId or warehouseId must be provided");
      }

      // Validate plant exists if provided
      if (createDto.plantId) {
        const plant = await this.materialRequestsRepository.validatePlant(
          tenantClient,
          createDto.plantId,
          tenantId,
        );
        if (!plant) {
          throw new BadRequestException("Plant not found or does not belong to tenant");
        }
      }

      // Validate warehouse if provided
      if (createDto.warehouseId) {
        const warehouse = await tenantClient.warehouse.findUnique({
          where: { id: createDto.warehouseId },
        });
        if (!warehouse) {
          throw new NotFoundException(`Warehouse ${createDto.warehouseId} not found`);
        }
        // BUSINESS RULE: Material Requests can ONLY fetch from STORAGE warehouses
        if (warehouse.warehouseType !== "STORAGE") {
          throw new BadRequestException(
            `Warehouse must be of type STORAGE, got ${warehouse.warehouseType}. Only STORAGE warehouses are allowed for material requests.`,
          );
        }
      }

      // If only warehouseId is provided, use the first active plant as default
      let plantIdToUse = createDto.plantId;
      if (!plantIdToUse && createDto.warehouseId) {
        const defaultPlant = await tenantClient.plant.findFirst({
          where: {
            isActive: true,
          },
        });
        if (!defaultPlant) {
          throw new BadRequestException(
            "No active plants found. Please create a plant or provide plantId.",
          );
        }
        plantIdToUse = defaultPlant.id;
      }

      // Validate production order if provided
      if (createDto.productionOrderId) {
        const productionOrder = await this.materialRequestsRepository.validateProductionOrder(
          tenantClient,
          createDto.productionOrderId,
        );
        if (!productionOrder) {
          throw new BadRequestException("Production order not found");
        }
      }

      // Validate requested by user if provided
      if (createDto.requestedById) {
        const user = await this.materialRequestsRepository.validateUser(
          tenantClient,
          createDto.requestedById,
          tenantId,
        );
        if (!user) {
          throw new BadRequestException("Requested by user not found");
        }
      }

      // Validate materials
      for (const item of createDto.materials) {
        if (!item.materialId) {
          throw new BadRequestException("Material ID is required for each item");
        }
        if (!item.requestedQuantity || item.requestedQuantity <= 0) {
          throw new BadRequestException(
            `Invalid requested quantity for material ${item.materialId}. Must be greater than 0.`,
          );
        }
        const material = await this.materialRequestsRepository.validateMaterial(
          tenantClient,
          item.materialId,
          tenantId,
        );
        if (!material) {
          throw new BadRequestException(`Material with ID ${item.materialId} not found`);
        }
      }

      // Generate unique request number if not provided
      if (!createDto.requestNumber) {
        this.logger.error("[MATERIAL-REQUEST-SERVICE] Generating request number");
        createDto.requestNumber = await this.generateRequestNumber(tenantClient, tenantId);
      }

      this.logger.error(
        "[MATERIAL-REQUEST-SERVICE] Calling repository.create with: " +
          JSON.stringify(
            {
              requestNumber: createDto.requestNumber,
              title: createDto.title,
              plantId: plantIdToUse,
              warehouseId: createDto.warehouseId,
              materialsCount: createDto.materials.length,
            },
            null,
            2,
          ),
      );

      // Extract materials to prevent it from being passed to repository
      const { materials, ...requestData } = createDto;

      // #region agent log
      const fs = require("fs");
      const logPath = "c:\\Users\\Mubeen\\factory_distribution_system\\.cursor\\debug.log";
      const logEntry =
        JSON.stringify({
          location: "material-requests.service.ts:90",
          message: "Service: After destructuring, before repository call",
          data: {
            createDtoKeys: Object.keys(createDto || {}),
            createDtoHasMaterials: "materials" in createDto,
            requestDataKeys: Object.keys(requestData),
            requestDataHasMaterials: "materials" in requestData,
            materialsExtracted: !!materials,
            materialsLength: materials?.length,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "E",
        }) + "\n";
      try {
        fs.appendFileSync(logPath, logEntry);
      } catch (e) {}
      // #endregion

      const materialRequest = await this.materialRequestsRepository.create(
        tenantClient,
        {
          ...requestData,
          plantId: plantIdToUse, // Use resolved plantId
          materials, // Pass materials separately
          requestedById: userId,
        },
        tenantId,
      );

      this.logger.error(
        "[MATERIAL-REQUEST-SERVICE] Repository.create succeeded, id:",
        materialRequest?.id,
      );

      // Audit is handled automatically by the @Auditable interceptor on the
      // controller route (module: MATERIAL_REQUESTS) using the returned entity.

      return materialRequest;
    } catch (error) {
      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException) {
        this.logger.error("[MATERIAL-REQUEST-SERVICE] BadRequestException:", error.message);
        throw error;
      }
      // Wrap other errors in BadRequestException to avoid 500s
      this.logger.error(
        "[MATERIAL-REQUEST-SERVICE] Unexpected error: " +
          JSON.stringify(
            {
              message: error.message,
              stack: error.stack,
              errorName: error.constructor.name,
            },
            null,
            2,
          ),
      );
      this.logger.error(`Error creating material request: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create material request: ${error.message}`);
    }
  }

  async findAll(tenantId: string, filters: any) {
    return this.materialRequestsRepository.findAll(tenantId, filters);
  }

  async findOne(id: string, tenantId: string) {
    const materialRequest = await this.materialRequestsRepository.findOne(id, tenantId);
    if (!materialRequest) {
      throw new NotFoundException("Material request not found");
    }
    return materialRequest;
  }

  async update(
    tenantClient: PrismaClient,
    id: string,
    updateDto: UpdateMaterialRequestDto,
    tenantId: string,
    userId: string,
  ) {
    const existingRequest = await this.findOne(id, tenantId);

    // Validate status transitions
    if (
      updateDto.status &&
      !this.isValidStatusTransition(existingRequest.status, updateDto.status)
    ) {
      throw new BadRequestException(
        `Invalid status transition from ${existingRequest.status} to ${updateDto.status}`,
      );
    }

    // Capture the pre-mutation snapshot for the @Auditable interceptor (UPDATE).
    this.auditContext.setOldValue(existingRequest);
    this.auditContext.setEntityLabel(existingRequest.requestNumber);

    const updatedRequest = await this.materialRequestsRepository.update(
      tenantClient,
      id,
      updateDto,
      tenantId,
    );

    return updatedRequest;
  }

  async remove(tenantClient: PrismaClient, id: string, tenantId: string, userId: string) {
    const existingRequest = await this.findOne(id, tenantId);

    // Only allow deletion of requests in DRAFT or PENDING status
    if (
      existingRequest.status !== MaterialRequestStatus.DRAFT &&
      existingRequest.status !== MaterialRequestStatus.PENDING
    ) {
      throw new BadRequestException("Can only delete material requests in DRAFT or PENDING status");
    }

    // Capture the pre-delete snapshot for the @Auditable interceptor (DELETE).
    this.auditContext.setOldValue(existingRequest);
    this.auditContext.setEntityLabel(existingRequest.requestNumber);

    await this.materialRequestsRepository.remove(id, tenantId);
  }

  async approveRequest(
    tenantClient: PrismaClient,
    id: string,
    approverId: string,
    comments: string,
    tenantId: string,
  ) {
    const existingRequest = await this.findOne(id, tenantId);

    if (existingRequest.status !== MaterialRequestStatus.PENDING) {
      throw new BadRequestException("Can only approve material requests in PENDING status");
    }

    // Get request with items
    const requestWithItems = await tenantClient.materialRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            material: true,
          },
        },
        plant: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!requestWithItems) {
      throw new NotFoundException("Material request not found");
    }

    // BUSINESS RULE: Validate warehouse has sufficient stock before approval
    // Check each item has enough available quantity in the warehouse
    const insufficientStockItems = [];
    for (const item of requestWithItems.items) {
      const stockBalance = await tenantClient.warehouseStockBalance.findFirst({
        where: {
          warehouseId: requestWithItems.warehouseId,
          productId: item.materialId,
        },
      });

      const requiredQty =
        item.approvedQuantity > 0 ? item.approvedQuantity : item.requestedQuantity;

      if (!stockBalance || stockBalance.availableQuantity < requiredQty) {
        insufficientStockItems.push({
          productId: item.materialId,
          productName: item.material?.name || "Unknown Product",
          required: requiredQty,
          available: stockBalance?.availableQuantity || 0,
        });
      }
    }

    if (insufficientStockItems.length > 0) {
      const itemDetails = insufficientStockItems
        .map((it) => `- ${it.productName}: Required ${it.required}, Available ${it.available}`)
        .join("\n");
      throw new BadRequestException(
        `Cannot approve Material Request - Insufficient stock in warehouse:\n${itemDetails}\n\n` +
          `Please ensure all products have sufficient available quantity before approval.`,
      );
    }

    // NOTE:
    // Originally this method attempted to *pre-check* stock availability here using
    // `checkStockAvailability` without a specific warehouse. However, our current
    // stock implementation is warehouse-based (see `warehouse_stock_balances`),
    // so calling the check without a `warehouseId` incorrectly falls back to the
    // legacy location-based balances and often returns 0, even when warehouse
    // stock is available (as seen in the UI screenshot).
    //
    // To avoid blocking valid approvals with false "Insufficient stock" errors,
    // we now rely on the strict stock check in `fulfillRequest`, where a concrete
    // `warehouseId` is provided, and remove this pre-check.

    // Capture the pre-mutation snapshot for the @Auditable interceptor (UPDATE).
    this.auditContext.setOldValue(existingRequest);
    this.auditContext.setEntityLabel(existingRequest.requestNumber);

    return tenantClient.$transaction(async (tx) => {
      const updatedRequest = await this.materialRequestsRepository.updateStatus(
        tenantClient,
        id,
        MaterialRequestStatus.APPROVED,
        tenantId,
        approverId,
        comments,
      );

      // BUSINESS RULE: When Material Request is approved, RESERVE stock for each item
      // Reserved = allocated but still in warehouse, not moved yet
      // Get the approved material items
      const approvedItems = await tenantClient.materialRequestItem.findMany({
        where: { materialRequestId: id },
        include: { material: true },
      });

      // Reserve warehouse stock for each approved item
      for (const item of approvedItems) {
        const approvedQty =
          item.approvedQuantity > 0 ? item.approvedQuantity : item.requestedQuantity;

        // Find the stock balance entry
        const stockBalance = await tenantClient.warehouseStockBalance.findFirst({
          where: {
            warehouseId: requestWithItems.warehouseId,
            productId: item.materialId,
          },
        });

        if (stockBalance) {
          // Reserve the stock: decrease availableQuantity, increase reservedQuantity
          // Total quantity stays same (available + reserved = total)
          const newAvailable = Math.max(0, stockBalance.availableQuantity - approvedQty);
          const newReserved = stockBalance.reservedQuantity + approvedQty;

          await tenantClient.warehouseStockBalance.update({
            where: { id: stockBalance.id },
            data: {
              availableQuantity: newAvailable,
              reservedQuantity: newReserved,
            },
          });

          // Record stock movement in ledger for audit trail
          try {
            await this.stockLedgerService.recordMovement(
              tenantClient,
              {
                warehouseId: requestWithItems.warehouseId,
                productId: item.materialId,
                quantity: approvedQty, // Positive for reserve (not a physical movement yet)
                movementType: StockTransactionType.RESERVED, // New movement type for reservations
                referenceId: id, // Link to material request
                referenceType: "MaterialRequest",
                remarks: `Stock reserved for approved Material Request ${requestWithItems.requestNumber}`,
                userId: approverId,
              },
              undefined,
            );
          } catch (ledgerError) {
            this.logger.warn(`Failed to record stock ledger entry: ${ledgerError.message}`);
            // Don't block approval if ledger fails, just log the warning
          }

          this.logger.log(
            `✓ Stock reserved in warehouse: ${item.material?.name} (${approvedQty}) from Material Request ${requestWithItems.requestNumber}`,
          );
        }
      }

      return updatedRequest;
    });
  }

  async submitRequest(tenantClient: PrismaClient, id: string, userId: string, tenantId: string) {
    const existingRequest = await this.findOne(id, tenantId);

    if (existingRequest.status !== MaterialRequestStatus.DRAFT) {
      throw new BadRequestException("Can only submit material requests in DRAFT status");
    }

    // Capture the pre-mutation snapshot for the @Auditable interceptor (UPDATE).
    this.auditContext.setOldValue(existingRequest);
    this.auditContext.setEntityLabel(existingRequest.requestNumber);

    const updatedRequest = await this.materialRequestsRepository.updateStatus(
      tenantClient,
      id,
      MaterialRequestStatus.PENDING,
      tenantId,
      userId,
      "Submitted for approval",
    );

    return updatedRequest;
  }

  async rejectRequest(
    tenantClient: PrismaClient,
    id: string,
    approverId: string,
    comments: string,
    tenantId: string,
  ) {
    const existingRequest = await this.findOne(id, tenantId);

    if (existingRequest.status !== MaterialRequestStatus.PENDING) {
      throw new BadRequestException("Can only reject material requests in PENDING status");
    }

    // Capture the pre-mutation snapshot for the @Auditable interceptor (UPDATE).
    this.auditContext.setOldValue(existingRequest);
    this.auditContext.setEntityLabel(existingRequest.requestNumber);

    const updatedRequest = await this.materialRequestsRepository.updateStatus(
      tenantClient,
      id,
      MaterialRequestStatus.REJECTED,
      tenantId,
      approverId,
      comments,
    );

    return updatedRequest;
  }

  async fulfillRequest(
    tenantClient: PrismaClient,
    id: string,
    fulfillerId: string,
    tenantId: string,
    warehouseId?: string, // Source warehouse for materials
  ) {
    const existingRequest = await this.findOne(id, tenantId);

    if (existingRequest.status !== MaterialRequestStatus.APPROVED) {
      throw new BadRequestException("Can only fulfill material requests that are approved");
    }

    // Get request with items
    const requestWithItems = await tenantClient.materialRequest.findUnique({
      where: { id },
      include: {
        items: true,
        plant: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!requestWithItems) {
      throw new NotFoundException("Material request not found");
    }

    // Capture the pre-mutation snapshot for the @Auditable interceptor (UPDATE).
    this.auditContext.setOldValue(existingRequest);
    this.auditContext.setEntityLabel(existingRequest.requestNumber);

    // Release stock using FIFO
    return tenantClient.$transaction(async (tx) => {
      const stockMovements = [];
      const itemFulfillments = [];

      for (const item of requestWithItems.items) {
        const quantityToFulfill =
          item.approvedQuantity > 0 ? item.approvedQuantity : item.requestedQuantity;

        // Determine effective warehouse to use for this item:
        // - If a warehouseId was provided in the request body, use it.
        // - Otherwise, auto-select a warehouse that has enough available stock for this product
        //   based on warehouse_stock_balances (to align with the UI stock view).
        let effectiveWarehouseId = warehouseId;

        if (!effectiveWarehouseId) {
          // Find warehouse with sufficient stock by summing all batch balances per warehouse
          // (The aggregate balance may be out of sync, so we sum actual batch balances)
          const warehouseStockSums = await (tx as any).$queryRaw`
            SELECT 
              warehouse_id as "warehouseId",
              SUM(available_quantity)::int as "totalAvailable"
            FROM warehouse_stock_balances
            WHERE product_id = ${item.materialId}
            GROUP BY warehouse_id
            HAVING SUM(available_quantity) >= ${quantityToFulfill}
            ORDER BY SUM(available_quantity) DESC
            LIMIT 1
          `;

          if (warehouseStockSums && warehouseStockSums.length > 0) {
            effectiveWarehouseId = warehouseStockSums[0].warehouseId;
            const totalAvailable = warehouseStockSums[0].totalAvailable;
            this.logger.log(
              `[FULFILL] Auto-selected warehouse ${effectiveWarehouseId} for product ${item.materialId} with total availableQuantity: ${totalAvailable} (sum of all batches)`,
            );
          } else {
            // Check if product has ANY stock at all (for debugging)
            const anyStockSums = await (tx as any).$queryRaw`
              SELECT 
                warehouse_id as "warehouseId",
                SUM(available_quantity)::int as "totalAvailable"
              FROM warehouse_stock_balances
              WHERE product_id = ${item.materialId}
              GROUP BY warehouse_id
              ORDER BY SUM(available_quantity) DESC
              LIMIT 1
            `;

            if (anyStockSums && anyStockSums.length > 0) {
              throw new BadRequestException(
                `Insufficient stock for material ${item.materialId}. Required: ${quantityToFulfill}, Available: ${anyStockSums[0].totalAvailable} in warehouse ${anyStockSums[0].warehouseId}`,
              );
            } else {
              throw new BadRequestException(
                `No stock found for material ${item.materialId} in any warehouse. Required: ${quantityToFulfill}`,
              );
            }
          }
        }

        // Verify warehouse has stock before attempting fulfillment
        if (!effectiveWarehouseId) {
          throw new BadRequestException(
            `No warehouse specified and no warehouse found with sufficient stock for material ${item.materialId}. Required: ${quantityToFulfill}`,
          );
        }

        // Release stock using FIFO
        const movement = await this.stockLedgerService.recordMovement(
          tenantClient,
          {
            productId: item.materialId,
            warehouseId: effectiveWarehouseId,
            zoneId: undefined, // TODO: Extract from request details if needed
            quantity: -quantityToFulfill,
            movementType: StockTransactionType.OUT, // Material request fulfillment
            referenceType: "MATERIAL_REQUEST",
            referenceId: id,
            remarks: `Material request ${existingRequest.requestNumber} - Released via FIFO`,
            userId: fulfillerId,
            useFIFO: true,
            allowExpired: false,
          },
          tx,
        );

        stockMovements.push(movement);

        // Update item fulfilled quantity
        const updatedItem = await tx.materialRequestItem.update({
          where: { id: item.id },
          data: {
            fulfilledQuantity: quantityToFulfill,
          },
        });

        itemFulfillments.push(updatedItem);
      }

      // Update request status to FULFILLED
      const updatedRequest = await this.materialRequestsRepository.updateStatus(
        tx,
        id,
        MaterialRequestStatus.FULFILLED,
        tenantId,
        fulfillerId,
      );

      this.logger.log(
        `Material request ${existingRequest.requestNumber} fulfilled. Stock released via FIFO.`,
      );

      return updatedRequest;
    });
  }

  async updateItem(
    tenantClient: PrismaClient,
    id: string,
    updateDto: any,
    tenantId: string,
    userId: string,
  ) {
    const item = await this.materialRequestsRepository.updateItem(id, updateDto, tenantId);

    // Log audit
    await this.auditService.log(tenantClient, {
      actorId: userId,
      entityName: "MaterialRequestItem",
      entityId: id,
      action: "UPDATE",
      newValue: item,
    });

    return item;
  }

  async getMaterialRequestStats(tenantId: string, plantId?: string) {
    return this.materialRequestsRepository.getMaterialRequestStats(tenantId, plantId);
  }

  private async generateRequestNumber(
    tenantClient: PrismaClient,
    tenantId: string,
  ): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    // Count existing requests for this month
    const count = await this.materialRequestsRepository.countRequestsInMonth(
      tenantClient,
      tenantId,
      year,
      month,
    );

    return `MR-${year}${month}-${String(count + 1).padStart(4, "0")}`;
  }

  private isValidStatusTransition(currentStatus: any, newStatus: MaterialRequestStatus): boolean {
    const current = String(currentStatus);
    const validTransitions = {
      [MaterialRequestStatus.DRAFT]: [
        MaterialRequestStatus.PENDING,
        MaterialRequestStatus.CANCELLED,
      ],
      [MaterialRequestStatus.PENDING]: [
        MaterialRequestStatus.APPROVED,
        MaterialRequestStatus.REJECTED,
        MaterialRequestStatus.CANCELLED,
      ],
      [MaterialRequestStatus.APPROVED]: [
        MaterialRequestStatus.FULFILLED,
        MaterialRequestStatus.CANCELLED,
      ],
      [MaterialRequestStatus.REJECTED]: [], // Terminal state
      [MaterialRequestStatus.FULFILLED]: [], // Terminal state
      [MaterialRequestStatus.CANCELLED]: [], // Terminal state
    };

    return (validTransitions as any)[current]?.includes(newStatus) ?? false;
  }

  // Get products available in a warehouse for material requests
  async getWarehouseProducts(tenantClient: PrismaClient, warehouseId: string, tenantId: string) {
    try {
      this.logger.log(
        `[GET-WAREHOUSE-PRODUCTS] Starting with warehouseId: ${warehouseId}, tenantId: ${tenantId}`,
      );

      // Validate warehouse exists and belongs to tenant
      const warehouse = await tenantClient.warehouse.findFirst({
        where: {
          id: warehouseId,
          // Don't filter by tenant here as warehouse is already scoped to tenant via tenantClient
        },
      });

      this.logger.log(`[GET-WAREHOUSE-PRODUCTS] Warehouse found: ${warehouse ? "YES" : "NO"}`);

      if (!warehouse) {
        this.logger.error(`[GET-WAREHOUSE-PRODUCTS] Warehouse ${warehouseId} not found`);
        throw new NotFoundException(`Warehouse ${warehouseId} not found`);
      }

      // Get all products with stock > 0 in this warehouse from warehouse_stock_balances
      const products = await tenantClient.warehouseStockBalance.findMany({
        where: {
          warehouseId: warehouseId,
          availableQuantity: {
            gt: 0, // Only products with available quantity > 0
          },
        },
        include: {
          product: {
            include: {
              uom: true,
            },
          },
        },
        orderBy: {
          product: {
            name: "asc",
          },
        },
      });

      this.logger.log(
        `[GET-WAREHOUSE-PRODUCTS] Found ${products.length} products with available stock`,
      );

      // Transform to response DTO
      const responseData = products.map((stock) => ({
        id: stock.product.id,
        name: stock.product.name,
        code: stock.product.code,
        availableQuantity: stock.availableQuantity,
        unit: stock.product.uom?.symbol || "Unit",
      }));

      this.logger.log(`[GET-WAREHOUSE-PRODUCTS] Returning ${responseData.length} products`);

      return {
        data: responseData,
        count: responseData.length,
      };
    } catch (error) {
      this.logger.error(
        `[GET-WAREHOUSE-PRODUCTS] Error getting warehouse products: ${error.message}`,
      );
      this.logger.error(`[GET-WAREHOUSE-PRODUCTS] Full error:`, error);
      throw error;
    }
  }
}
