import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { WorkOrdersRepository } from "./work-orders.repository";
import { CreateWorkOrderDto, UpdateWorkOrderDto } from "./dto/work-order.dto";
import { PrismaClient, WorkOrderStatus } from "@prisma/tenant-client";
import { StockLedgerService } from "../common/services/stock-ledger.service";

@Injectable()
export class WorkOrdersService {
  private readonly logger = new Logger(WorkOrdersService.name);

  constructor(
    private readonly workOrdersRepository: WorkOrdersRepository,
    private readonly stockLedgerService: StockLedgerService,
  ) {}

  async create(tenantClient: PrismaClient, createDto: CreateWorkOrderDto, tenantId: string) {
    // Validate production order exists
    const productionOrder = await tenantClient.productionOrder.findFirst({
      where: {
        id: createDto.productionOrderId,
      },
    });

    if (!productionOrder) {
      throw new NotFoundException("Production order not found");
    }

    // Generate work order number if not provided
    const workOrderNumber =
      createDto.workOrderNumber || (await this.generateWorkOrderNumber(tenantClient, tenantId));

    return this.workOrdersRepository.create(tenantClient, {
      workOrderNumber,
      productionOrderId: createDto.productionOrderId,
      title: createDto.title,
      description: createDto.description,
      status: createDto.status,
      priority: createDto.priority,
      scheduledStartDate: new Date(createDto.scheduledStartDate),
      scheduledEndDate: new Date(createDto.scheduledEndDate),
      assignedToId: createDto.assignedToId,
      notes: createDto.notes,
      tenantId,
    });
  }

  async findAll(tenantClient: PrismaClient, tenantId: string, filters: any) {
    return this.workOrdersRepository.findAll(tenantClient, tenantId, filters);
  }

  async findOne(tenantClient: PrismaClient, id: string, tenantId: string) {
    const workOrder = await this.workOrdersRepository.findOne(tenantClient, id, tenantId);
    if (!workOrder) {
      throw new NotFoundException("Work order not found");
    }
    return workOrder;
  }

  async update(
    tenantClient: PrismaClient,
    id: string,
    updateDto: UpdateWorkOrderDto,
    tenantId: string,
  ) {
    const existing = await this.findOne(tenantClient, id, tenantId);

    // Validate status transitions
    if (updateDto.status && !this.isValidStatusTransition(existing.status, updateDto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${existing.status} to ${updateDto.status}`,
      );
    }

    const updateData: any = { ...updateDto };
    if (updateDto.scheduledStartDate) {
      updateData.scheduledStartDate = new Date(updateDto.scheduledStartDate);
    }
    if (updateDto.scheduledEndDate) {
      updateData.scheduledEndDate = new Date(updateDto.scheduledEndDate);
    }

    // Set actual dates based on status
    if (updateDto.status === WorkOrderStatus.IN_PROGRESS && !existing.actualStartDate) {
      updateData.actualStartDate = new Date();
    }

    // Handle work order completion - create finished goods
    if (
      updateDto.status === WorkOrderStatus.COMPLETED &&
      existing.status !== WorkOrderStatus.COMPLETED
    ) {
      updateData.actualEndDate = new Date();

      // Create finished goods in transaction
      return await tenantClient.$transaction(async (tx) => {
        // Get production order with product info
        const productionOrder = await tx.productionOrder.findUnique({
          where: { id: existing.productionOrderId },
          include: {
            product: true,
          },
        });

        if (!productionOrder) {
          throw new NotFoundException("Production order not found");
        }

        // Find a suitable warehouse: prefer DISPATCH, then STORAGE, then any
        const dispatchWarehouse =
          (await tx.warehouse.findFirst({
            where: { warehouseType: "DISPATCH" as any },
          })) ||
          (await tx.warehouse.findFirst({
            where: { warehouseType: "STORAGE" as any },
          })) ||
          (await tx.warehouse.findFirst());

        if (!dispatchWarehouse) {
          throw new BadRequestException("No suitable warehouse found");
        }

        // Use production order produced quantity
        const finishedQuantity = Number(productionOrder.producedQuantity || 0);
        if (finishedQuantity <= 0) {
          throw new BadRequestException("Production order has no completed quantity");
        }

        // Record finished goods receipt using StockLedgerService
        await this.stockLedgerService.recordMovement(
          tenantClient,
          {
            productId: productionOrder.productId,
            warehouseId: dispatchWarehouse.id,
            quantity: finishedQuantity,
            movementType: "IN" as any,
            referenceType: "WORK_ORDER",
            referenceId: id,
            remarks: `Finished goods from Work Order ${existing.workOrderNumber}`,
            userId: updateData.assignedToId || "system",
          },
          tx,
        );

        this.logger.log(
          `[WORK-ORDER] Work Order ${existing.workOrderNumber} COMPLETED. ` +
            `FINISHED GOODS ADDED TO DISPATCH WAREHOUSE: ${dispatchWarehouse.name}, ` +
            `Quantity: ${finishedQuantity}`,
        );

        // Update work order
        const updatedWorkOrder = await this.workOrdersRepository.update(
          tenantClient,
          id,
          updateData,
          tenantId,
        );

        return updatedWorkOrder;
      });
    }

    return this.workOrdersRepository.update(tenantClient, id, updateData, tenantId);
  }

  private calculateExpiryDate(product: any, manufacturingDate: Date | null): Date | null {
    if (!manufacturingDate) return null;
    const mfgDate = manufacturingDate || new Date();
    const expiryDate = new Date(mfgDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    return expiryDate;
  }

  async remove(tenantClient: PrismaClient, id: string, tenantId: string) {
    const existing = await this.findOne(tenantClient, id, tenantId);

    // Only allow deletion of scheduled work orders
    if (existing.status !== WorkOrderStatus.SCHEDULED) {
      throw new BadRequestException("Can only delete scheduled work orders");
    }

    return this.workOrdersRepository.remove(tenantClient, id, tenantId);
  }

  async getSchedule(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ) {
    return this.workOrdersRepository.getSchedule(tenantClient, tenantId, startDate, endDate);
  }

  private async generateWorkOrderNumber(
    tenantClient: PrismaClient,
    tenantId: string,
  ): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const count = await tenantClient.workOrder.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(year, date.getMonth(), 1),
          lt: new Date(year, date.getMonth() + 1, 1),
        },
      },
    });

    return `WO-${year}${month}-${String(count + 1).padStart(4, "0")}`;
  }

  private isValidStatusTransition(
    currentStatus: WorkOrderStatus,
    newStatus: WorkOrderStatus,
  ): boolean {
    const validTransitions = {
      [WorkOrderStatus.SCHEDULED]: [
        WorkOrderStatus.IN_PROGRESS,
        WorkOrderStatus.CANCELLED,
        WorkOrderStatus.ON_HOLD,
      ],
      [WorkOrderStatus.IN_PROGRESS]: [
        WorkOrderStatus.COMPLETED,
        WorkOrderStatus.CANCELLED,
        WorkOrderStatus.ON_HOLD,
      ],
      [WorkOrderStatus.ON_HOLD]: [
        WorkOrderStatus.SCHEDULED,
        WorkOrderStatus.IN_PROGRESS,
        WorkOrderStatus.CANCELLED,
      ],
      [WorkOrderStatus.COMPLETED]: [],
      [WorkOrderStatus.CANCELLED]: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }
}
