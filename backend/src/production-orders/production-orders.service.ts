import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ProductionOrderStatus, WasteItemType, WasteStatus } from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import {
  ProductionOrdersRepository,
  ProductionOrderWithRelations,
} from "./production-orders.repository";
import { CreateProductionOrderDto } from "./dto/create-production-order.dto";
import { UpdateProductionOrderDto } from "./dto/update-production-order.dto";
import { ProductionOrderQueryDto } from "./dto/production-order-query.dto";
import {
  ProductionOrderAction,
  UpdateProductionOrderStatusDto,
} from "./dto/update-production-order-status.dto";
import { AddProductionOrderCostDto } from "./dto/add-production-order-cost.dto";
import { AddProductionOrderWasteDto } from "./dto/add-production-order-waste.dto";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { allocateFifo, calculateRequiredQuantity } from "./utils/fifo.util";
import { RequestWithUser } from "src/common/interfaces";
import { ProductBatchesRepository } from "../product-management/product-batches/product-batches.repository";
import { AuditContextService } from "../audit/audit-context.service";

@Injectable()
export class ProductionOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productionOrdersRepository: ProductionOrdersRepository,
    private readonly productBatchesRepository: ProductBatchesRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  /**
   * Creates a new production order in DRAFT status, plans its raw material
   * consumption against the active BOM, and reserves stock from raw material
   * batches using FIFO (oldest batch first).
   *
   * ────────────────────────────────────────────────────────────────────────
   * FULL LIFECYCLE OF A PRODUCTION ORDER (A to Z, worked example)
   * ────────────────────────────────────────────────────────────────────────
   *
   * Scenario: produce 100 "Wooden Chairs".
   * BOM for Wooden Chair has one item: "Wood Plank",
   *   quantityPerUnit = 2.2, wastagePercent = 5%, unit = "pcs".
   *
   * STEP 1 — requiredQuantity (this method, calculateRequiredQuantity)
   *   requiredQuantity = plannedQuantity * quantityPerUnit * (1 + wastage%)
   *                    = 100 * 2.2 * 1.05
   *                    = 231 pcs of Wood Plank
   *
   * STEP 2 — FIFO batch allocation (this method, allocateFifo)
   *   Available raw material batches for "Wood Plank", oldest first:
   *
   *     | Batch | Received   | Available qty | Unit cost |
   *     |-------|------------|----------------|-----------|
   *     | B1    | 2026-05-01 | 150 pcs        | $10       |
   *     | B2    | 2026-05-15 | 100 pcs        | $12       |
   *
   *   allocateFifo(batches, 231) takes from the oldest batch first until
   *   231 pcs are covered:
   *
   *     | Batch | Allocated qty | Line cost            |
   *     |-------|----------------|----------------------|
   *     | B1    | 150 pcs        | 150 * $10 = $1,500   |
   *     | B2    |  81 pcs        |  81 * $12 = $972     |
   *     |-------|----------------|----------------------|
   *     | Total | 231 pcs        | rawMaterialCost = $2,472 |
   *
   *   - If total available stock < 231 pcs, a `shortfall` is reported and
   *     the whole create() transaction is aborted (400 error) — nothing is
   *     persisted.
   *
   * STEP 3 — records created by this method (status = DRAFT)
   *   ProductionOrder (the "header" row):
   *
   *     | Field            | Value     |
   *     |------------------|-----------|
   *     | orderNumber      | PO-000123 |
   *     | status           | DRAFT     |
   *     | plannedQuantity  | 100       |
   *     | producedQuantity | 0         |
   *     | rawMaterialCost  | 2,472     |
   *     | additionalCost   | 0         |
   *     | wasteInputCost   | 0         |
   *     | totalCost        | 2,472  (= rawMaterialCost + additionalCost + wasteInputCost) |
   *     | costPerUnit      | 24.72  (= rawMaterialCost / plannedQuantity, estimated) |
   *
   *   ProductionOrderMaterial (one row per BOM item):
   *     | rawMaterial | requiredQuantity | estimatedCost |
   *     |-------------|-------------------|---------------|
   *     | Wood Plank  | 231               | 2,472         |
   *
   *   ProductionOrderMaterialBatch (one row per FIFO allocation, + batch reserved):
   *     | material   | batch | allocatedQty | cost  |
   *     |------------|-------|--------------|-------|
   *     | Wood Plank | B1    | 150          | 1,500 |
   *     | Wood Plank | B2    | 81           | 972   |
   *
   *   `reserveBatch` only reduces each batch's *available* quantity (a soft
   *   reservation) — physical stock is untouched until `confirm()`.
   *
   * STEP 4 — confirm() : DRAFT -> IN_PROGRESS
   *   For each ProductionOrderMaterialBatch row, the reservation is turned
   *   into real consumption (`consumeBatchAllocation`), batch stock is
   *   physically deducted, and `startedAt` is set. Totals (rawMaterialCost,
   *   etc.) do not change at this step — they were already locked in at
   *   create() time.
   *
   * STEP 5 — addCost() : record extra costs while IN_PROGRESS
   *   Example: electricity cost of $200 is added via addCost(), which calls
   *   recalculateCosts(). additionalCost = sum of all cost rows for this order.
   *
   *     | Field           | Before | After |
   *     |-----------------|--------|-------|
   *     | rawMaterialCost | 2,472  | 2,472 |
   *     | additionalCost  | 0      | 200   |
   *     | wasteInputCost  | 0      | 0     |
   *     | totalCost       | 2,472  | 2,672 |  (= 2,472 + 200 + 0)
   *
   * STEP 6 — addWaste() : reuse a pending waste record as production input
   *   Example: 10 pcs of reclaimed Wood Plank @ $8/pc ($80 total) from a
   *   prior PENDING waste record is consumed as input. wasteInputCost = sum
   *   of all waste rows used by this order, and the waste record is marked
   *   reused. recalculateCosts() runs again:
   *
   *     | Field           | Before | After |
   *     |-----------------|--------|-------|
   *     | rawMaterialCost | 2,472  | 2,472 |
   *     | additionalCost  | 200    | 200   |
   *     | wasteInputCost  | 0      | 80    |
   *     | totalCost       | 2,672  | 2,752 |  (= 2,472 + 200 + 80)
   *
   *   addCost() / addWaste() can be called multiple times, in any order,
   *   any number of times while the order is IN_PROGRESS.
   *
   * STEP 7 — complete() : IN_PROGRESS -> COMPLETED
   *   The operator records the actual output, e.g. producedQuantity = 95
   *   chairs (some loss occurred). costPerUnit is derived from the final
   *   totalCost at this moment:
   *
   *     | Field            | Value                          |
   *     |------------------|--------------------------------|
   *     | producedQuantity | 95                             |
   *     | totalCost        | 2,752                          |
   *     | costPerUnit      | 2,752 / 95 = 28.97 (per chair) |
   *     | status           | COMPLETED                      |
   *     | completedAt      | now()                          |
   *
   *   Once COMPLETED, the order is locked: addCost()/addWaste() can no
   *   longer be called, since the ProductBatch created here has already
   *   snapshotted costPerUnit.
   *
   * STEP 8 — cancel() : DRAFT or IN_PROGRESS -> CANCELLED
   *   - If DRAFT: every reserved batch allocation is released back to
   *     available stock (releaseBatchReservation) — nothing was consumed.
   *   - If IN_PROGRESS: every consumed batch allocation is reversed
   *     (reverseBatchConsumption), restoring physical stock.
   *   - COMPLETED or already-CANCELLED orders cannot be cancelled.
   *
   * ────────────────────────────────────────────────────────────────────────
   * THIS METHOD (create) ONLY PERFORMS STEPS 1–3 ABOVE.
   * ────────────────────────────────────────────────────────────────────────
   */
  async create(
    createProductionOrderDto: CreateProductionOrderDto,
    req: RequestWithUser,
  ): Promise<ProductionOrderWithRelations> {
    const { id: userId } = req.user;
    const { bomId, productId } = createProductionOrderDto;

    const bom = await this.productionOrdersRepository.findActiveBomWithItems(bomId, productId);

    if (!bom) {
      throw new NotFoundException("No active BOM found for this product");
    }

    if (bom.items.length === 0) {
      throw new BadRequestException("BOM has no items to produce from");
    }

    const orderNumber = await this.productionOrdersRepository.generateOrderNumber();

    const orderId = await this.prisma.$transaction(async (tx) => {
      let rawMaterialCost = 0;

      const materialPlans: {
        rawMaterialId: string;
        uomId: string;
        requiredQuantity: number;
        allocations: ReturnType<typeof allocateFifo>["allocations"];
        estimatedCost: number;
      }[] = [];

      for (const item of bom.items) {
        const requiredQuantity = calculateRequiredQuantity(
          item.quantityPerUnit,
          createProductionOrderDto.plannedQuantity,
          item.wastagePercent,
        );

        const batches = await this.productionOrdersRepository.findAllocatableBatches(
          item.rawMaterialId,
        );
        const allocation = allocateFifo(batches, requiredQuantity);

        if (allocation.shortfall > 0) {
          throw new BadRequestException(
            `Insufficient stock for raw material "${item.rawMaterial.name}": ` +
              `need ${requiredQuantity}, short by ${allocation.shortfall}`,
          );
        }

        rawMaterialCost += allocation.totalCost;

        materialPlans.push({
          rawMaterialId: item.rawMaterialId,
          uomId: item.uomId,
          requiredQuantity,
          allocations: allocation.allocations,
          estimatedCost: allocation.totalCost,
        });
      }

      const { plannedQuantity } = createProductionOrderDto;
      const estimatedCostPerUnit = plannedQuantity > 0 ? rawMaterialCost / plannedQuantity : null;

      const order = await this.productionOrdersRepository.createOrder(tx, {
        orderNumber,
        productId: createProductionOrderDto.productId,
        bomId: createProductionOrderDto.bomId,
        siteId: createProductionOrderDto.siteId,
        plannedQuantity,
        rawMaterialCost,
        totalCost: rawMaterialCost,
        costPerUnit: estimatedCostPerUnit,
        notes: createProductionOrderDto.notes,
        createdById: userId,
      });

      for (const plan of materialPlans) {
        const material = await this.productionOrdersRepository.createMaterial(tx, {
          productionOrderId: order.id,
          rawMaterialId: plan.rawMaterialId,
          uomId: plan.uomId,
          requiredQuantity: plan.requiredQuantity,
          estimatedCost: plan.estimatedCost,
        });

        for (const allocation of plan.allocations) {
          await this.productionOrdersRepository.createMaterialBatch(tx, material.id, allocation);
          await this.productionOrdersRepository.reserveBatch(
            tx,
            allocation.rawMaterialBatchId,
            plan.rawMaterialId,
            allocation.allocatedQuantity,
          );
        }
      }

      return order.id;
    });

    return this.findOne(orderId);
  }

  async findAll(
    productionOrderQueryDto: ProductionOrderQueryDto,
  ): Promise<PaginatedResponse<ProductionOrderWithRelations>> {
    return this.productionOrdersRepository.findAll(productionOrderQueryDto);
  }

  async findOne(productionOrderId: string): Promise<ProductionOrderWithRelations> {
    const order = await this.productionOrdersRepository.findById(productionOrderId);

    if (!order) {
      throw new NotFoundException("Production order not found");
    }

    return order;
  }

  async update(
    productionOrderId: string,
    updateProductionOrderDto: UpdateProductionOrderDto,
  ): Promise<ProductionOrderWithRelations> {
    const order = await this.findOne(productionOrderId);

    if (order.status !== ProductionOrderStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT production orders can be updated");
    }

    // Capture the pre-update snapshot so the @Auditable interceptor can diff it
    // and generate the UPDATE audit log.
    this.auditContext.setOldValue(order);
    this.auditContext.setEntityLabel(order.orderNumber);

    await this.prisma.$transaction((tx) =>
      this.productionOrdersRepository.updateOrder(tx, productionOrderId, {
        ...updateProductionOrderDto,
      }),
    );

    return this.findOne(productionOrderId);
  }

  async updateStatus(
    productionOrderId: string,
    dto: UpdateProductionOrderStatusDto,
    req: RequestWithUser,
  ): Promise<ProductionOrderWithRelations> {
    switch (dto.action) {
      case ProductionOrderAction.CONFIRM:
        return this.confirm(productionOrderId);
      case ProductionOrderAction.COMPLETE:
        return this.complete(productionOrderId, dto, req);
      case ProductionOrderAction.CANCEL:
        return this.cancel(productionOrderId);
    }
  }

  /**
   * Converts reserved raw material batches into actual consumption and
   * moves the order from DRAFT to IN_PROGRESS.
   */
  private async confirm(productionOrderId: string): Promise<ProductionOrderWithRelations> {
    const order = await this.findOne(productionOrderId);

    if (order.status !== ProductionOrderStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT production orders can be confirmed");
    }

    const estimatedCostPerUnit =
      order.plannedQuantity > 0 ? order.rawMaterialCost / order.plannedQuantity : null;

    await this.prisma.$transaction(async (tx) => {
      for (const material of order.materials) {
        for (const allocation of material.batchAllocations) {
          const batch = await this.productionOrdersRepository.findBatchById(
            tx,
            allocation.rawMaterialBatchId,
          );
          await this.productionOrdersRepository.consumeBatchAllocation(tx, batch, allocation);
        }

        await this.productionOrdersRepository.updateMaterialConsumption(
          tx,
          material.id,
          material.requiredQuantity,
          material.estimatedCost,
        );
      }

      await this.productionOrdersRepository.updateOrder(tx, productionOrderId, {
        status: ProductionOrderStatus.IN_PROGRESS,
        startedAt: new Date(),
        costPerUnit: estimatedCostPerUnit,
      });
    });

    return this.findOne(productionOrderId);
  }

  /**
   * Records the manually entered output quantity, finalizes cost rollup, and
   * creates a WIP product batch. Pricing and dates are set later via
   * PATCH /product-batches/:id/finalize.
   */
  private async complete(
    productionOrderId: string,
    dto: UpdateProductionOrderStatusDto,
    req: RequestWithUser,
  ): Promise<ProductionOrderWithRelations> {
    const { id: userId } = req.user;
    const order = await this.findOne(productionOrderId);

    if (order.status !== ProductionOrderStatus.IN_PROGRESS) {
      throw new BadRequestException("Only IN_PROGRESS production orders can be completed");
    }

    const { producedQuantity, siteId } = dto;

    if (!producedQuantity || producedQuantity <= 0) {
      throw new BadRequestException("producedQuantity is required and must be greater than 0");
    }

    if (producedQuantity > order.plannedQuantity) {
      throw new BadRequestException(
        `Produced quantity (${producedQuantity}) cannot exceed planned quantity (${order.plannedQuantity})`,
      );
    }

    const totalCost = order.rawMaterialCost + order.additionalCost + order.wasteInputCost;
    const costPerUnit = totalCost / producedQuantity;

    await this.prisma.$transaction(async (tx) => {
      await this.productionOrdersRepository.updateOrder(tx, productionOrderId, {
        producedQuantity,
        status: ProductionOrderStatus.COMPLETED,
        completedAt: new Date(),
        totalCost,
        costPerUnit,
      });

      if (producedQuantity > 0) {
        await this.productBatchesRepository.createFromProductionOrder(
          tx,
          {
            productId: order.productId,
            siteId: siteId ?? order.siteId,
            productionOrderId: order.id,
            quantity: producedQuantity,
            costPerUnit,
          },
          userId,
        );
      }
    });

    return this.findOne(productionOrderId);
  }

  /**
   * Releases reservations (DRAFT) or reverses consumption (IN_PROGRESS).
   * No records are deleted, only status and stock counters are adjusted.
   */
  private async cancel(productionOrderId: string): Promise<ProductionOrderWithRelations> {
    const order = await this.findOne(productionOrderId);

    if (
      order.status === ProductionOrderStatus.COMPLETED ||
      order.status === ProductionOrderStatus.CANCELLED
    ) {
      throw new BadRequestException(`Cannot cancel a ${order.status} production order`);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const material of order.materials) {
        for (const allocation of material.batchAllocations) {
          const batch = await this.productionOrdersRepository.findBatchById(
            tx,
            allocation.rawMaterialBatchId,
          );

          if (order.status === ProductionOrderStatus.DRAFT) {
            await this.productionOrdersRepository.releaseBatchReservation(
              tx,
              allocation.rawMaterialBatchId,
              material.rawMaterialId,
              allocation.allocatedQuantity,
            );
          } else {
            await this.productionOrdersRepository.reverseBatchConsumption(tx, batch, allocation);
          }
        }
      }

      await this.productionOrdersRepository.updateOrder(tx, productionOrderId, {
        status: ProductionOrderStatus.CANCELLED,
      });
    });

    return this.findOne(productionOrderId);
  }

  async addCost(
    productionOrderId: string,
    addCostDto: AddProductionOrderCostDto,
    req: RequestWithUser,
  ): Promise<ProductionOrderWithRelations> {
    const order = await this.findOne(productionOrderId);

    this.assertInProgress(order);

    const { id: userId } = req.user;

    await this.prisma.$transaction(async (tx) => {
      await this.productionOrdersRepository.createCost(tx, {
        productionOrderId,
        costType: addCostDto.costType,
        description: addCostDto.description,
        amount: addCostDto.amount,
        createdById: userId,
      });

      await this.recalculateCosts(tx, order);
    });

    return this.findOne(productionOrderId);
  }

  async addWaste(
    productionOrderId: string,
    addWasteDto: AddProductionOrderWasteDto,
    req: RequestWithUser,
  ): Promise<ProductionOrderWithRelations> {
    const { id: userId } = req.user;
    const order = await this.findOne(productionOrderId);

    this.assertInProgress(order);

    await this.prisma.$transaction(async (tx) => {
      const wasteRecord = await this.productionOrdersRepository.findReusableWasteManagement(
        tx,
        addWasteDto.wasteManagementId,
      );

      if (!wasteRecord) {
        throw new NotFoundException("Waste management record not found");
      }

      if (wasteRecord.itemType !== WasteItemType.RAW_MATERIAL || !wasteRecord.rawMaterialId) {
        throw new BadRequestException("Only raw material waste records can be reused as input");
      }

      if (wasteRecord.status !== WasteStatus.PENDING) {
        throw new BadRequestException("This waste record is not available for reuse");
      }

      if (addWasteDto.quantity > wasteRecord.quantity) {
        throw new BadRequestException(
          `Quantity used (${addWasteDto.quantity}) cannot exceed the available waste quantity (${wasteRecord.quantity})`,
        );
      }

      await this.productionOrdersRepository.createWaste(tx, {
        productionOrderId,
        rawMaterialId: wasteRecord.rawMaterialId,
        uomId: wasteRecord.rawMaterial.uomId,
        quantity: addWasteDto.quantity,
        unitCost: addWasteDto.unitCost,
        totalCost: addWasteDto.totalCost,
        notes: addWasteDto.notes,
        createdById: userId,
      });

      await this.productionOrdersRepository.markWasteManagementReused(
        tx,
        addWasteDto.wasteManagementId,
      );

      await this.recalculateCosts(tx, order);
    });

    return this.findOne(productionOrderId);
  }

  private assertInProgress(order: ProductionOrderWithRelations): void {
    if (order.status !== ProductionOrderStatus.IN_PROGRESS) {
      throw new BadRequestException(
        "Cost and waste can only be added to an IN_PROGRESS production order",
      );
    }
  }

  /**
   * Recomputes additionalCost, wasteInputCost and totalCost from the
   * current cost and waste records.
   */
  private async recalculateCosts(
    tx: Prisma.TransactionClient,
    order: ProductionOrderWithRelations,
  ): Promise<void> {
    const [additionalCost, wasteInputCost] = await Promise.all([
      this.productionOrdersRepository.sumCosts(tx, order.id),
      this.productionOrdersRepository.sumWastes(tx, order.id),
    ]);

    const totalCost = order.rawMaterialCost + additionalCost + wasteInputCost;

    await this.productionOrdersRepository.updateOrder(tx, order.id, {
      additionalCost,
      wasteInputCost,
      totalCost,
    });
  }
}
