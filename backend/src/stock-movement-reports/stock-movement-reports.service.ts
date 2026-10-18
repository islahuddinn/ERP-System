import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient, Prisma, StockTransactionType } from "@prisma/tenant-client";

@Injectable()
export class StockMovementReportsService {
  private readonly logger = new Logger(StockMovementReportsService.name);

  async getInboundMovements(
    tenantClient: PrismaClient,
    startDate?: string,
    endDate?: string,
    productId?: string,
  ) {
    const where: Prisma.StockLedgerWhereInput = {
      transactionType: {
        in: ["IN", "TRANSFER_IN"],
      },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (productId) {
      where.productId = productId;
    }

    const movements = await tenantClient.stockLedger.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
        zone: true,
        rawMaterialBatch: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return movements.map((m) => ({
      id: m.id,
      date: m.createdAt,
      product: m.product,
      quantity: Number(m.quantity),
      transactionType: m.transactionType,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      warehouse: m.warehouse,
      zone: m.zone,
      rawMaterialBatch: m.rawMaterialBatch,
      remarks: m.remarks,
    }));
  }

  async getOutboundMovements(
    tenantClient: PrismaClient,
    startDate?: string,
    endDate?: string,
    productId?: string,
  ) {
    const where: Prisma.StockLedgerWhereInput = {
      transactionType: {
        in: ["OUT", "TRANSFER_OUT"],
      },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (productId) {
      where.productId = productId;
    }

    const movements = await tenantClient.stockLedger.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
        zone: true,
        rawMaterialBatch: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return movements.map((m) => ({
      id: m.id,
      date: m.createdAt,
      product: m.product,
      quantity: Number(m.quantity),
      transactionType: m.transactionType,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      warehouse: m.warehouse,
      zone: m.zone,
      rawMaterialBatch: m.rawMaterialBatch,
      remarks: m.remarks,
    }));
  }

  async getTransfers(tenantClient: PrismaClient, startDate?: string, endDate?: string) {
    const where: Prisma.StockLedgerWhereInput = {
      transactionType: {
        in: ["TRANSFER_IN", "TRANSFER_OUT"],
      },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const movements = await tenantClient.stockLedger.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
        zone: true,
        rawMaterialBatch: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by referenceId to pair TRANSFER_IN and TRANSFER_OUT
    const transferMap = new Map<string, any>();

    for (const movement of movements) {
      const key = movement.referenceId;
      if (!transferMap.has(key)) {
        transferMap.set(key, {
          referenceId: key,
          referenceType: movement.referenceType,
          date: movement.createdAt,
          product: movement.product,
          quantity: 0,
          fromWarehouse: null,
          toWarehouse: null,
          rawMaterialBatch: movement.rawMaterialBatch,
        });
      }

      const transfer = transferMap.get(key)!;
      if (movement.transactionType === "TRANSFER_OUT") {
        transfer.fromWarehouse = movement.warehouse;
        transfer.quantity = Math.abs(Number(movement.quantity));
      } else if (movement.transactionType === "TRANSFER_IN") {
        transfer.toWarehouse = movement.warehouse;
      }
    }

    return Array.from(transferMap.values());
  }

  async getAdjustments(
    tenantClient: PrismaClient,
    startDate?: string,
    endDate?: string,
    productId?: string,
  ) {
    const where: Prisma.StockLedgerWhereInput = {
      transactionType: "ADJUSTMENT",
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (productId) {
      where.productId = productId;
    }

    const adjustments = await tenantClient.stockLedger.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
        zone: true,
        rawMaterialBatch: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return adjustments.map((a) => ({
      id: a.id,
      date: a.createdAt,
      productId: a.productId,
      quantity: Number(a.quantity),
      openingQty: Number(a.openingQty || 0),
      closingQty: Number(a.closingQty || 0),
      referenceType: a.referenceType,
      referenceId: a.referenceId,
      warehouseId: a.warehouseId,
      zoneId: a.zoneId,
      batchId: a.batchId,
      remarks: a.remarks,
      createdById: a.createdById,
    }));
  }

  async getWasteMovements(
    tenantClient: PrismaClient,
    startDate?: string,
    endDate?: string,
    productId?: string,
  ) {
    const where: Prisma.StockLedgerWhereInput = {
      referenceType: "WASTE",
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (productId) {
      where.productId = productId;
    }

    const wasteMovements = await tenantClient.stockLedger.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
        zone: true,
        rawMaterialBatch: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get waste records for additional details
    const wasteIds = wasteMovements.map((w) => w.referenceId).filter(Boolean);
    const wasteRecords = await tenantClient.wasteManagement.findMany({
      where: {
        id: { in: wasteIds },
      },
    });

    const wasteMap = new Map(wasteRecords.map((w) => [w.id, w]));

    return wasteMovements.map((m) => {
      const waste = wasteMap.get(m.referenceId);
      return {
        id: m.id,
        date: m.createdAt,
        product: m.product,
        quantity: Math.abs(Number(m.quantity)),
        wasteType: waste?.wasteType,
        reason: waste?.reason,
        cost: waste ? Number(waste.cost) : 0,
        warehouse: m.warehouse,
        zone: m.zone,
        rawMaterialBatch: m.rawMaterialBatch,
        remarks: m.remarks,
      };
    });
  }
}
