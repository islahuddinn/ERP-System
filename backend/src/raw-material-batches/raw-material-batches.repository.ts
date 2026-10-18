import { Injectable, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  QualityStatus,
  RawMaterialBatchStatus,
  RawMaterialBatchInspection,
} from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { BatchItemDto } from "./dto/create-raw-material-batch.dto";
import { QueryRawMaterialBatchDto, ConsumeBatchDto } from "./dto/query-raw-material-batch.dto";
import {
  CreateRawMaterialBatchInspectionDto,
  UpdateRawMaterialBatchInspectionDto,
} from "./dto/raw-material-batch-inspection.dto";
import { UpdateRawMaterialBatchDto } from "./dto/update-raw-material-batch.dto";
import { buildOrderBy, buildSearchFilter } from "../common/utils/pagination.helper";
import { getTotalPages } from "../common/reuseable-functions/getTotalPages";

const BATCH_INCLUDE = {
  rawMaterial: { select: { id: true, name: true, code: true } },
  site: { select: { id: true, name: true, code: true } },
  grnItem: { select: { id: true, receivedQuantity: true } },
} as const;

export const BATCH_STATUS_BY_QUALITY_STATUS: Record<QualityStatus, RawMaterialBatchStatus | null> = {
  [QualityStatus.PASSED]: RawMaterialBatchStatus.ACTIVE,
  [QualityStatus.CONDITIONAL]: RawMaterialBatchStatus.ACTIVE,
  [QualityStatus.FAILED]: RawMaterialBatchStatus.BLOCKED,
  [QualityStatus.PENDING]: null,
};

@Injectable()
export class RawMaterialBatchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async generateBatchNumber(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `RM-${yyyymm}-`;

    const existingCount = await tx.rawMaterialBatch.count({
      where: { batchNumber: { startsWith: prefix } },
    });

    let seq = existingCount + 1;
    let batchNumber = `${prefix}${String(seq).padStart(4, "0")}`;

    while (await tx.rawMaterialBatch.findUnique({ where: { batchNumber } })) {
      seq++;
      batchNumber = `${prefix}${String(seq).padStart(4, "0")}`;
    }

    return batchNumber;
  }

  private async generateInspectionNumber(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `QC-RM-${yyyymm}-`;

    const existingCount = await tx.rawMaterialBatchInspection.count({
      where: { inspectionNumber: { startsWith: prefix } },
    });

    let seq = existingCount + 1;
    let inspectionNumber = `${prefix}${String(seq).padStart(4, "0")}`;

    while (await tx.rawMaterialBatchInspection.findUnique({ where: { inspectionNumber } })) {
      seq++;
      inspectionNumber = `${prefix}${String(seq).padStart(4, "0")}`;
    }

    return inspectionNumber;
  }

  async createInspection(
    batch: {
      id: string;
      rawMaterialId: string;
      availableQuantity: number;
      status: RawMaterialBatchStatus;
    },
    createRawMaterialBatchInspectionDto: CreateRawMaterialBatchInspectionDto,
    userId: string,
  ): Promise<RawMaterialBatchInspection> {
    const {
      rejectedQuantity,
      inspectionType,
      qualityStatus,
      approvedQuantity,
      results,
      observations,
      notes,
      inspectedDate,
    } = createRawMaterialBatchInspectionDto;

    return this.prisma.$transaction(async (tx) => {
      const inspectionNumber = await this.generateInspectionNumber(tx);

      const inspection = await tx.rawMaterialBatchInspection.create({
        data: {
          inspectionNumber,
          batchId: batch.id,
          inspectionType,
          qualityStatus,
          approvedQuantity,
          rejectedQuantity,
          results,
          observations: observations ?? [],
          notes: notes ?? null,
          inspectedDate: inspectedDate ? new Date(inspectedDate) : undefined,
          inspectedById: userId,
          createdById: userId,
        },
      });

      let newAvailable = batch.availableQuantity;
      let newStatus = BATCH_STATUS_BY_QUALITY_STATUS[qualityStatus] ?? batch.status;

      if (rejectedQuantity) {
        newAvailable = batch.availableQuantity - rejectedQuantity;

        await tx.rawMaterialBatchConsumption.create({
          data: {
            batchId: batch.id,
            consumedQuantity: rejectedQuantity,
            remainingAfter: newAvailable,
            referenceType: "QUALITY_REJECTION",
            referenceId: inspection.id,
            notes: notes ?? null,
            createdById: userId,
          },
        });

        await tx.rawMaterial.update({
          where: { id: batch.rawMaterialId },
          data: { currentStock: { decrement: rejectedQuantity } },
        });

        if (newAvailable <= 0 && newStatus !== RawMaterialBatchStatus.BLOCKED) {
          newStatus = RawMaterialBatchStatus.CONSUMED;
        }
      }

      await tx.rawMaterialBatch.update({
        where: { id: batch.id },
        data: {
          status: newStatus,
          availableQuantity: newAvailable,
          updatedById: userId,
        },
      });

      return inspection;
    });
  }

  async findInspectionsByBatch(batchId: string): Promise<RawMaterialBatchInspection[]> {
    return this.prisma.rawMaterialBatchInspection.findMany({
      where: { batchId },
      orderBy: { inspectedDate: "desc" },
    });
  }

  async findInspectionById(inspectionId: string): Promise<RawMaterialBatchInspection> {
    const inspection = await this.prisma.rawMaterialBatchInspection.findUnique({
      where: { id: inspectionId },
    });

    if (!inspection) throw new NotFoundException(`Inspection ${inspectionId} not found`);

    return inspection;
  }

  async updateInspection(
    inspection: RawMaterialBatchInspection,
    batch: { id: string; rawMaterialId: string; batchNumber: string; status: RawMaterialBatchStatus },
    data: UpdateRawMaterialBatchInspectionDto,
    newAvailableQuantity: number,
    rejectedDelta: number,
    newStatus: RawMaterialBatchStatus,
    userId: string,
  ): Promise<RawMaterialBatchInspection> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.rawMaterialBatchInspection.update({
        where: { id: inspection.id },
        data: { ...data, updatedById: userId },
      });

      if (rejectedDelta !== 0 || newStatus !== batch.status) {
        await tx.rawMaterialBatch.update({
          where: { id: batch.id },
          data: {
            availableQuantity: newAvailableQuantity,
            status: newStatus,
            updatedById: userId,
          },
        });
      }

      if (rejectedDelta !== 0) {
        await tx.rawMaterialBatchConsumption.create({
          data: {
            batchId: batch.id,
            consumedQuantity: rejectedDelta,
            remainingAfter: newAvailableQuantity,
            referenceType: "QUALITY_REJECTION_ADJUSTMENT",
            referenceId: inspection.id,
            notes: data.notes ?? inspection.notes ?? null,
            createdById: userId,
          },
        });

        await tx.rawMaterial.update({
          where: { id: batch.rawMaterialId },
          data: { currentStock: { decrement: rejectedDelta } },
        });
      }

      return updated;
    });
  }

  private async createBatchRecords(
    tx: Prisma.TransactionClient,
    batches: BatchItemDto[],
    grn: { receivedDate: Date },
    userId: string,
    status: RawMaterialBatchStatus,
  ): Promise<Prisma.RawMaterialBatchGetPayload<{ include: typeof BATCH_INCLUDE }>[]> {
    const created: Prisma.RawMaterialBatchGetPayload<{ include: typeof BATCH_INCLUDE }>[] = [];

    for (const b of batches) {
      const batchNumber = await this.generateBatchNumber(tx);
      const unitCost = b.unitCost ?? 0;

      const batch = await tx.rawMaterialBatch.create({
        data: {
          batchNumber,
          rawMaterialId: b.rawMaterialId,
          grnItemId: b.grnItemId,
          siteId: b.siteId,
          receivedQuantity: b.quantity,
          availableQuantity: b.quantity,
          consumedQuantity: 0,
          unitCost,
          receivedDate: grn.receivedDate,
          manufacturingDate: b.manufacturingDate ? new Date(b.manufacturingDate) : null,
          expiryDate: b.expiryDate ? new Date(b.expiryDate) : null,
          status,
          notes: b.notes ?? null,
          createdById: userId,
        },
        include: BATCH_INCLUDE,
      });

      created.push(batch);
    }

    return created;
  }

  private async incrementRawMaterialStock(tx: Prisma.TransactionClient, batches: BatchItemDto[]) {
    const increments = new Map<string, number>();
    for (const b of batches) {
      increments.set(b.rawMaterialId, (increments.get(b.rawMaterialId) ?? 0) + b.quantity);
    }

    for (const [rawMaterialId, increment] of increments) {
      await tx.rawMaterial.update({
        where: { id: rawMaterialId },
        data: { currentStock: { increment } },
      });
    }
  }

  async createBatchesWithTx(
    tx: Prisma.TransactionClient,
    batches: BatchItemDto[],
    grn: { receivedDate: Date },
    userId: string,
    status: RawMaterialBatchStatus,
  ): Promise<{
    created: Prisma.RawMaterialBatchGetPayload<{ include: typeof BATCH_INCLUDE }>[];
    count: number;
  }> {
    if (batches.length === 0) return { created: [], count: 0 };

    const created = await this.createBatchRecords(tx, batches, grn, userId, status);
    await this.incrementRawMaterialStock(tx, batches);
    return { created, count: created.length };
  }

  async createOpeningStockBatch(
    rawMaterialId: string,
    quantity: number,
    unitCost: number,
    userId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const batchNumber = await this.generateBatchNumber(tx);
      await tx.rawMaterialBatch.create({
        data: {
          batchNumber,
          rawMaterialId,
          receivedQuantity: quantity,
          availableQuantity: quantity,
          consumedQuantity: 0,
          unitCost,
          receivedDate: new Date(),
          status: RawMaterialBatchStatus.ACTIVE,
          createdById: userId,
        },
      });
    });
  }

  async findAll(query: QueryRawMaterialBatchDto) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy,
      sortOrder,
      status,
      rawMaterialId,
      siteId,
      grnId,
      expiringDays,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (rawMaterialId) where.rawMaterialId = rawMaterialId;
    if (siteId) where.siteId = siteId;
    if (status) where.status = status;
    if (grnId) where.grnItem = { grnId };
    if (startDate || endDate) {
      // Filter by the batch's received date (the business-meaningful date users see
      // and select), not createdAt. createdAt is the row-insert timestamp, which for
      // backdated GRNs diverges from receivedDate and leaked out-of-range records into
      // the selected window (QA #31). Consistent with the GRN list, which also filters
      // on receivedDate.
      where.receivedDate = {};
      if (startDate) where.receivedDate.gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        where.receivedDate.lte = d;
      }
    }
    if (expiringDays) {
      const today = new Date();
      const cutoff = new Date();
      cutoff.setDate(today.getDate() + expiringDays);
      where.expiryDate = { gte: today, lte: cutoff };
    }
    if (search) where.OR = buildSearchFilter(search, ["batchNumber"]);

    const orderBy = sortBy ? buildOrderBy(sortBy, sortOrder) : { receivedDate: "desc" };

    const [data, total] = await Promise.all([
      this.prisma.rawMaterialBatch.findMany({
        where,
        include: {
          rawMaterial: { select: { id: true, name: true, code: true } },
          site: { select: { id: true, name: true, code: true } },
          grnItem: {
            select: {
              id: true,
              receivedQuantity: true,
              grn: { select: { id: true, receivingNumber: true, receivedDate: true } },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.rawMaterialBatch.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: getTotalPages(total, limit) } };
  }

  async findOne(batchId: string) {
    const batch = await this.prisma.rawMaterialBatch.findUnique({
      where: { id: batchId, deletedAt: null },
      include: {
        rawMaterial: {
          select: {
            id: true,
            name: true,
            code: true,
            uom: { select: { name: true, symbol: true } },
          },
        },
        site: { select: { id: true, name: true, code: true, type: true, category: true } },
        grnItem: {
          select: {
            id: true,
            receivedQuantity: true,
            grn: {
              select: {
                id: true,
                receivingNumber: true,
                receivedDate: true,
                purchaseOrder: { select: { supplier: { select: { name: true } } } },
              },
            },
          },
        },
        consumptions: { orderBy: { consumedDate: "desc" }, take: 20 },
      },
    });

    if (!batch) throw new NotFoundException(`Raw material batch ${batchId} not found`);

    return batch;
  }

  async getFifoAllocation(rawMaterialId: string, requestedQuantity?: number) {
    const batches = await this.prisma.rawMaterialBatch.findMany({
      where: {
        rawMaterialId,
        // status: { in: [RawMaterialBatchStatus.ACTIVE, RawMaterialBatchStatus.PARTIAL] },
        availableQuantity: { gt: 0 },
        deletedAt: null,
        OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
      },
      include: {
        site: { select: { id: true, name: true, code: true } },
        rawMaterial: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ expiryDate: "asc" }, { receivedDate: "asc" }, { createdAt: "asc" }],
    });

    const totalAvailable = batches.reduce((sum, b) => sum + b.availableQuantity, 0);
    if (!requestedQuantity) return { rawMaterialId, totalAvailable, batches };

    const allocations: Array<{
      batchId: string;
      batchNumber: string;
      site: (typeof batches)[0]["site"];
      expiryDate: Date | null;
      receivedDate: Date;
      totalAvailableQty: number;
      allocateQty: number;
      unitCost: number;
      totalCost: number;
    }> = [];

    let remaining = requestedQuantity;

    for (const batch of batches) {
      if (remaining <= 0) break;
      const allocate = Math.min(batch.availableQuantity, remaining);
      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        site: batch.site,
        unitCost: batch.unitCost,
        expiryDate: batch.expiryDate,
        receivedDate: batch.receivedDate,
        totalAvailableQty: batch.availableQuantity,
        allocateQty: allocate,
        totalCost: allocate * batch.unitCost,
      });
      remaining -= allocate;
    }

    return {
      totalCost: allocations.reduce((sum, a) => sum + a.totalCost, 0),
      rawMaterialId,
      requestedQuantity,
      totalAvailable,
      totalAllocated: requestedQuantity - Math.max(0, remaining),
      shortfall: Math.max(0, remaining),
      isFulfilled: remaining <= 0,
      allocations,
    };
  }

  async executeConsume(
    batch: { id: string; availableQuantity: number; rawMaterialId: string },
    consumeBatchDto: ConsumeBatchDto,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const newAvailable = batch.availableQuantity - consumeBatchDto.quantity;
      const newStatus =
        newAvailable <= 0 ? RawMaterialBatchStatus.CONSUMED : RawMaterialBatchStatus.PARTIAL;

      const updated = await tx.rawMaterialBatch.update({
        where: { id: batch.id },
        data: {
          availableQuantity: newAvailable,
          consumedQuantity: { increment: consumeBatchDto.quantity },
          status: newStatus,
        },
        include: {
          rawMaterial: { select: { id: true, name: true, code: true } },
          site: { select: { id: true, name: true, code: true } },
        },
      });

      await tx.rawMaterialBatchConsumption.create({
        data: {
          batchId: batch.id,
          consumedQuantity: consumeBatchDto.quantity,
          remainingAfter: newAvailable,
          referenceType: consumeBatchDto.referenceType ?? null,
          referenceId: consumeBatchDto.referenceId ?? null,
          notes: consumeBatchDto.notes ?? null,
          createdById: userId,
        },
      });

      await tx.rawMaterial.update({
        where: { id: batch.rawMaterialId },
        data: { currentStock: { decrement: consumeBatchDto.quantity } },
      });

      return updated;
    });
  }

  async executeReturn(
    batch: { id: string; availableQuantity: number; rawMaterialId: string },
    quantity: number,
    returnId: string,
    reason: string | null,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const newAvailable = batch.availableQuantity - quantity;
      const newStatus =
        newAvailable <= 0 ? RawMaterialBatchStatus.CONSUMED : RawMaterialBatchStatus.PARTIAL;

      const updated = await tx.rawMaterialBatch.update({
        where: { id: batch.id },
        data: {
          availableQuantity: newAvailable,
          returnedQuantity: { increment: quantity },
          status: newStatus,
        },
        include: {
          rawMaterial: { select: { id: true, name: true, code: true } },
          site: { select: { id: true, name: true, code: true } },
        },
      });

      await tx.rawMaterialBatchConsumption.create({
        data: {
          batchId: batch.id,
          consumedQuantity: quantity,
          remainingAfter: newAvailable,
          referenceType: "PURCHASE_RETURN",
          referenceId: returnId,
          notes: reason ?? null,
          createdById: userId,
        },
      });

      await tx.rawMaterial.update({
        where: { id: batch.rawMaterialId },
        data: { currentStock: { decrement: quantity } },
      });

      return updated;
    });
  }

  async getConsumptions(batchId: string) {
    const exists = await this.prisma.rawMaterialBatch.findUnique({
      where: { id: batchId, deletedAt: null },
      select: { id: true },
    });

    if (!exists) throw new NotFoundException(`Raw material batch ${batchId} not found`);

    return this.prisma.rawMaterialBatchConsumption.findMany({
      where: { batchId },
      orderBy: { consumedDate: "desc" },
    });
  }

  async update(
    batchId: string,
    data: UpdateRawMaterialBatchDto,
    userId: string,
  ): Promise<Prisma.RawMaterialBatchGetPayload<{ include: typeof BATCH_INCLUDE }>> {
    return this.prisma.rawMaterialBatch.update({
      where: { id: batchId },
      data: { ...data, updatedById: userId },
      include: BATCH_INCLUDE,
    });
  }

  async findExpiring(days: number = 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() + days);
    cutoff.setHours(23, 59, 59, 999);

    return this.prisma.rawMaterialBatch.findMany({
      where: {
        deletedAt: null,
        // status: {
        //   in: [RawMaterialBatchStatus.ACTIVE, RawMaterialBatchStatus.PARTIAL],
        // },
        expiryDate: {
          gte: today,
          lte: cutoff,
        },
      },
      include: {
        rawMaterial: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        expiryDate: "asc",
      },
    });
  }
}
