import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

import { CreateGrnDto, GrnQueryDto } from "./dto";

import { buildOrderBy, buildSearchFilter } from "../common/utils/pagination.helper";
import { Prisma, ReceivingStatus, RawMaterialBatchStatus } from "@prisma/tenant-client";
import { RawMaterialBatchesRepository } from "../raw-material-batches/raw-material-batches.repository";
import { BatchItemDto } from "../raw-material-batches/dto/create-raw-material-batch.dto";
import { PurchaseOrderService } from "../purchase-orders/purchase-order.service";
import { PaginatedResponse, buildPaginatedResponse } from "../common/dto/pagination.dto";
import { GrnDashboardStats } from "./utils/interfaces";

export const GRN_INCLUDE = {
  purchaseOrder: {
    select: {
      id: true,
      orderNumber: true,
      orderDate: true,
      expectedDate: true,
      shippingCost: true,
      remarks: true,
      supplier: { select: { id: true, name: true, phone: true, address: true, email: true } },
    },
  },
  items: {
    include: {
      rawMaterial: {
        select: { id: true, name: true },
      },
      uom: {
        select: { id: true, name: true, symbol: true, code: true },
      },
      rawMaterialBatches: {
        include: {
          site: { select: { id: true, name: true, code: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class GrnRepository {
  constructor(
    private prisma: PrismaService,
    private rawMaterialBatchesRepository: RawMaterialBatchesRepository,
    private purchaseOrderService: PurchaseOrderService,
  ) {}

  async create(
    createDto: CreateGrnDto & { receivedById?: string },
    userId: string,
  ): Promise<Prisma.GRNGetPayload<{ include: typeof GRN_INCLUDE }>> {
    return this.prisma.$transaction(async (tx) => {
      const grn = await tx.gRN.create({
        data: {
          receivingNumber: createDto.receivingNumber!,
          receivingType: createDto.receivingType as any,
          receivedDate: new Date(createDto.receivedDate),
          purchaseOrderId: createDto.purchaseOrderId || null,
          receivedById: createDto.receivedById || null,
          notes: createDto.notes || null,
          vehicleDetails: createDto.vehicleDetails || null,
          deliveryNoteNumber: createDto.deliveryNoteNumber || null,
          status: ReceivingStatus.COMPLETED,
          items: {
            create: createDto.items.map((item) => ({
              rawMaterialId: item.rawMaterialId,
              uomId: item.uomId,
              expectedQuantity: item.expectedQuantity,
              receivedQuantity: item.receivedQuantity,
              rejectedQuantity: 0,
              specifications: item.specifications || null,
              receivingNotes: item.receivingNotes || null,
            })),
          },
        },
        include: { items: true },
      });

      const batchInputs: BatchItemDto[] = [];

      grn.items.forEach((createdItem, index) => {
        const sourceItem = createDto.items[index];

        for (const batch of sourceItem.batches) {
          batchInputs.push({
            grnItemId: createdItem.id,
            rawMaterialId: createdItem.rawMaterialId,
            siteId: batch.siteId,
            quantity: batch.quantity,
            manufacturingDate: batch.manufacturingDate,
            expiryDate: batch.expiryDate,
            unitCost: batch.unitCost,
            notes: batch.notes,
          });
        }
      });

      await this.rawMaterialBatchesRepository.createBatchesWithTx(
        tx,
        batchInputs,
        { receivedDate: grn.receivedDate },
        userId,
        RawMaterialBatchStatus.QUARANTINE,
      );

      if (createDto.purchaseOrderId) {
        const stockUpdates = grn.items.map((item) => ({
          rawMaterialId: item.rawMaterialId,
          acceptedQty: item.receivedQuantity,
        }));

        await this.purchaseOrderService.syncReceivedQtyAndStatus(
          createDto.purchaseOrderId,
          stockUpdates,
          tx,
        );
      }

      return tx.gRN.findUniqueOrThrow({ where: { id: grn.id }, include: GRN_INCLUDE });
    });
  }

  async findAll(
    grnQueryDto: GrnQueryDto,
  ): Promise<PaginatedResponse<Prisma.GRNGetPayload<{ include: typeof GRN_INCLUDE }>>> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      receivingType,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = grnQueryDto;

    const skip = (page - 1) * limit;
    const where: Prisma.GRNWhereInput = {};

    if (search) {
      // Match the GRN's own fields plus the related PO number and supplier name, since
      // those columns are shown in the list and users expect to search by them (QA #23).
      where.OR = [
        ...buildSearchFilter(search, ["receivingNumber", "deliveryNoteNumber"]),
        { purchaseOrder: { orderNumber: { contains: search, mode: "insensitive" } } },
        { purchaseOrder: { supplier: { name: { contains: search, mode: "insensitive" } } } },
      ];
    }

    if (status) where.status = status;
    if (receivingType) where.receivingType = receivingType;

    if (startDate || endDate) {
      where.receivedDate = {};
      if (startDate) where.receivedDate.gte = new Date(startDate);
      if (endDate) where.receivedDate.lte = new Date(endDate);
    }

    const orderBy = buildOrderBy(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.gRN.findMany({
        where,
        include: GRN_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.gRN.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(
    grnId: string,
  ): Promise<Prisma.GRNGetPayload<{ include: typeof GRN_INCLUDE }> | null> {
    return this.prisma.gRN.findUnique({ where: { id: grnId }, include: GRN_INCLUDE });
  }

  async getGrnStats(): Promise<{ total: number; completed: number; completionRate: number }> {
    const [total, groups] = await Promise.all([
      this.prisma.gRN.count(),
      this.prisma.gRN.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);

    const countByStatus = Object.fromEntries(groups.map((g) => [g.status, g._count.status]));

    const get = (s: ReceivingStatus) => countByStatus[s] ?? 0;
    const completed = get(ReceivingStatus.COMPLETED);

    return {
      total,
      completed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  //–––––––––––––––––––––––––––––––– Dashboard APIs ––––––––––––––––––––––––––––––––

  async getDashboardStats(): Promise<GrnDashboardStats> {
    const [statusCounts, quantityAggregate] = await Promise.all([
      this.prisma.gRN.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.gRNItem.aggregate({
        _sum: { receivedQuantity: true, rejectedQuantity: true },
      }),
    ]);

    const countByStatus = (status: ReceivingStatus): number =>
      statusCounts.find((entry) => entry.status === status)?._count._all ?? 0;

    return {
      totalGrns: statusCounts.reduce((sum, entry) => sum + entry._count._all, 0),
      pendingGrns: countByStatus(ReceivingStatus.PENDING),
      inspectingGrns: countByStatus(ReceivingStatus.INSPECTING),
      approvedGrns: countByStatus(ReceivingStatus.APPROVED),
      rejectedGrns: countByStatus(ReceivingStatus.REJECTED),
      completedGrns: countByStatus(ReceivingStatus.COMPLETED),
      totalReceivedQuantity: Number(quantityAggregate._sum.receivedQuantity || 0),
      totalRejectedQuantity: Number(quantityAggregate._sum.rejectedQuantity || 0),
    };
  }

  async countGrnsInMonth(year: number, month: string): Promise<number> {
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(year, parseInt(month), 0);
    return this.prisma.gRN.count({ where: { createdAt: { gte: startDate, lte: endDate } } });
  }

  /**
   * Highest existing sequence number for a receiving-number prefix
   * (e.g. "GRN-202606-"). Derived from the actual numbers in use — not a row
   * count — so deletes / excluded dates can't make the next number collide.
   */
  async getMaxReceivingSequence(prefix: string): Promise<number> {
    const latest = await this.prisma.gRN.findFirst({
      where: { receivingNumber: { startsWith: prefix } },
      orderBy: { receivingNumber: "desc" },
      select: { receivingNumber: true },
    });
    if (!latest) return 0;
    const seq = parseInt(latest.receivingNumber.slice(prefix.length), 10);
    return Number.isNaN(seq) ? 0 : seq;
  }
}
