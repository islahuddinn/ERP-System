import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import {
  Prisma,
  ReturnStatus,
  ReturnApprovalStatus,
  RawMaterialBatchStatus,
} from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { PurchaseReturnQueryDto } from "./dto/purchase-return-query.dto";
import { buildOrderBy, buildSearchFilter } from "../common/utils/pagination.helper";
import { getTotalPages } from "../common/reuseable-functions/getTotalPages";
import { handlePrismaUniqueError } from "../common/reuseable-functions/handlePrismaUniqueError";

const PURCHASE_RETURN_INCLUDE = {
  purchaseOrder: {
    select: {
      id: true,
      orderNumber: true,
      supplierId: true,
      supplierName: true,
      supplier: { select: { id: true, name: true, phone: true, email: true } },
    },
  },
  grn: { select: { id: true, receivingNumber: true } },
  items: {
    include: {
      rawMaterial: {
        select: {
          id: true,
          name: true,
          code: true,
          uom: { select: { id: true, name: true, symbol: true } },
        },
      },
      batch: {
        select: {
          id: true,
          batchNumber: true,
          availableQuantity: true,
          returnedQuantity: true,
          receivedQuantity: true,
        },
      },
      grnItem: { select: { id: true, receivedQuantity: true } },
      purchaseItem: { select: { id: true, quantity: true, unitPrice: true, receivedQty: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  approvals: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.PurchaseReturnInclude;

const USER_SELECT = { id: true, firstName: true, lastName: true, email: true } as const;

export interface CreateReturnItemData {
  rawMaterialId: string;
  batchId: string;
  grnItemId?: string;
  purchaseItemId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  reason?: string;
}

export interface ReturnItemDiff {
  toCreate: CreateReturnItemData[];
  toUpdate: {
    id: string;
    batchId?: string;
    grnItemId?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    reason?: string;
  }[];
  toDelete: string[];
}

type TxClient = Omit<
  PrismaService,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

@Injectable()
export class PurchaseReturnRepository {
  constructor(private readonly prisma: PrismaService) {}

  private serializeReturn(
    ret: any,
    usersMap: Record<string, { id: string; firstName: string; lastName: string; email: string }> = {},
  ) {
    if (!ret) return ret;
    return {
      ...ret,
      totalAmount: Number(ret.totalAmount),
      items: ret.items?.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        purchaseItem: item.purchaseItem
          ? { ...item.purchaseItem, unitPrice: Number(item.purchaseItem.unitPrice) }
          : item.purchaseItem,
      })),
      approvals: ret.approvals?.map((a: any) => ({
        ...a,
        approver: usersMap[a.approverId] ?? null,
      })),
    };
  }

  private async fetchUsersMap(
    ids: (string | null | undefined)[],
  ): Promise<Record<string, { id: string; firstName: string; lastName: string; email: string }>> {
    const uniqueIds = [...new Set(ids.filter(Boolean))] as string[];
    if (!uniqueIds.length) return {};
    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: USER_SELECT,
    });
    return Object.fromEntries(users.map((u) => [u.id, u]));
  }

  private async fetchUsersMapForReturn(
    ret: any,
  ): Promise<Record<string, { id: string; firstName: string; lastName: string; email: string }>> {
    return this.fetchUsersMap(ret?.approvals?.map((a: any) => a.approverId) ?? []);
  }

  async validateApproverIds(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const uniqueIds = [...new Set(ids)];
    const found = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds }, loginAccess: "ENABLED" },
      select: { id: true },
    });
    const foundSet = new Set(found.map((u) => u.id));
    const invalid = uniqueIds.filter((id) => !foundSet.has(id));
    if (invalid.length) {
      throw new BadRequestException(
        `The following approver user ID(s) are invalid: ${invalid.join(", ")}`,
      );
    }
  }

  private batchStatus(available: number): RawMaterialBatchStatus {
    return available <= 0 ? RawMaterialBatchStatus.CONSUMED : RawMaterialBatchStatus.PARTIAL;
  }

  /** Validate quantity ≤ availableQuantity, decrement the batch, and update raw material stock. */
  private async reserveBatchQuantity(
    tx: TxClient,
    batchId: string,
    quantity: number,
  ): Promise<void> {
    const batch = await tx.rawMaterialBatch.findUnique({
      where: { id: batchId },
      select: { id: true, batchNumber: true, availableQuantity: true, rawMaterialId: true },
    });

    if (!batch) {
      throw new BadRequestException(`Batch ${batchId} not found`);
    }

    if (quantity > batch.availableQuantity) {
      throw new BadRequestException(
        `Return quantity ${quantity} exceeds available quantity ${batch.availableQuantity} in batch ${batch.batchNumber}`,
      );
    }

    const newAvailable = batch.availableQuantity - quantity;

    await tx.rawMaterialBatch.update({
      where: { id: batch.id },
      data: { availableQuantity: newAvailable, status: this.batchStatus(newAvailable) },
    });

    await tx.rawMaterial.update({
      where: { id: batch.rawMaterialId },
      data: { currentStock: { decrement: quantity } },
    });
  }

  /** Restore a previously reserved quantity back to the batch and raw material stock. */
  private async releaseBatchQuantity(
    tx: TxClient,
    batchId: string,
    quantity: number,
  ): Promise<void> {
    const batch = await tx.rawMaterialBatch.findUnique({
      where: { id: batchId },
      select: { id: true, availableQuantity: true, receivedQuantity: true, rawMaterialId: true },
    });

    if (!batch) return;

    const newAvailable = batch.availableQuantity + quantity;
    await tx.rawMaterialBatch.update({
      where: { id: batch.id },
      data: {
        availableQuantity: newAvailable,
        // Restore AVAILABLE if there's remaining stock, stay PARTIAL/CONSUMED otherwise
        status:
          newAvailable >= batch.receivedQuantity
            ? RawMaterialBatchStatus.ACTIVE
            : this.batchStatus(newAvailable),
      },
    });

    await tx.rawMaterial.update({
      where: { id: batch.rawMaterialId },
      data: { currentStock: { increment: quantity } },
    });
  }

  async findBatchUnitCosts(batchIds: string[]): Promise<Map<string, number | null>> {
    const batches = await this.prisma.rawMaterialBatch.findMany({
      where: { id: { in: batchIds } },
      select: { id: true, unitCost: true },
    });
    return new Map(batches.map((b) => [b.id, b.unitCost]));
  }

  async generateReturnNumber(): Promise<string> {
    // Derive the next number from the HIGHEST existing returnNumber, not a row
    // count. A count reuses a freed number after a DRAFT return is deleted, which
    // collides with an existing PR-xxxxxx and throws P2002 → 409 "already exists"
    // even though the new return never got created. Fixed 6-digit padding makes
    // lexical desc order == numeric order.
    const last = await this.prisma.purchaseReturn.findFirst({
      where: { returnNumber: { startsWith: "PR-" } },
      orderBy: { returnNumber: "desc" },
      select: { returnNumber: true },
    });
    const lastNum = last ? parseInt(last.returnNumber.replace(/\D/g, ""), 10) || 0 : 0;
    return `PR-${String(lastNum + 1).padStart(6, "0")}`;
  }

  async create(
    header: Prisma.PurchaseReturnUncheckedCreateInput,
    items: CreateReturnItemData[],
    approverIds: string[] = [],
  ) {
    const MAX_ATTEMPTS = 5;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Validate and immediately reserve (decrement) each batch
        for (const item of items) {
          await this.reserveBatchQuantity(tx as unknown as TxClient, item.batchId, item.quantity);
        }

        const ret = await tx.purchaseReturn.create({ data: header });

        await tx.purchaseReturnItem.createMany({
          data: items.map((item) => ({
            returnId: ret.id,
            rawMaterialId: item.rawMaterialId,
            batchId: item.batchId,
            grnItemId: item.grnItemId ?? null,
            purchaseItemId: item.purchaseItemId ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            reason: item.reason ?? null,
          })),
        });

        if (approverIds.length) {
          await tx.purchaseReturnApproval.createMany({
            data: approverIds.map((approverId) => ({ returnId: ret.id, approverId })),
          });
        }

        return tx.purchaseReturn.findUnique({
          where: { id: ret.id },
          include: PURCHASE_RETURN_INCLUDE,
        });
      });

      const usersMap = await this.fetchUsersMapForReturn(result);
      return this.serializeReturn(result, usersMap);
    } catch (error: any) {
      // On a returnNumber collision (a concurrent create grabbed the same number),
      // regenerate and retry. Any other unique violation is surfaced normally.
      const target = String(error?.meta?.target ?? "").toLowerCase();
      const isReturnNumberCollision =
        error?.code === "P2002" &&
        (target.includes("returnnumber") || target.includes("return_number"));
      if (isReturnNumberCollision && attempt < MAX_ATTEMPTS) {
        header.returnNumber = await this.generateReturnNumber();
        continue;
      }
      handlePrismaUniqueError(error, "A purchase return with this number already exists");
    }
    }
    // All attempts exhausted on a persistent collision.
    throw new ConflictException("Could not generate a unique purchase return number. Please retry.");
  }

  async findAll(queryDto: PurchaseReturnQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      supplierId,
      purchaseOrderId,
      grnId,
      status,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = queryDto;

    const skip = (page - 1) * limit;
    const where: Prisma.PurchaseReturnWhereInput = {};

    if (search) {
      where.OR = buildSearchFilter(search, ["returnNumber", "reason"]);
    }

    if (supplierId) where.purchaseOrder = { supplierId };
    if (purchaseOrderId) where.purchaseOrderId = purchaseOrderId;
    if (grnId) where.grnId = grnId;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.returnDate = {};
      if (startDate) where.returnDate.gte = new Date(startDate);
      if (endDate) {
        // Make the end bound inclusive: a date-only "2026-06-23" parses to midnight,
        // which would exclude same-day rows. Use `< endDate + 1 day` so the whole day
        // (up to 23:59:59.999) is included.
        const endExclusive = new Date(endDate);
        endExclusive.setDate(endExclusive.getDate() + 1);
        where.returnDate.lt = endExclusive;
      }
    }

    const orderBy = buildOrderBy(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.purchaseReturn.findMany({
        where,
        include: PURCHASE_RETURN_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.purchaseReturn.count({ where }),
    ]);

    const usersMap = await this.fetchUsersMap(
      data.flatMap((r) => r.approvals?.map((a) => a.approverId) ?? []),
    );

    return {
      data: data.map((r) => this.serializeReturn(r, usersMap)),
      meta: { total, page, limit, totalPages: getTotalPages(total, limit) },
    };
  }

  async findById(returnId: string) {
    const result = await this.prisma.purchaseReturn.findUnique({
      where: { id: returnId },
      include: PURCHASE_RETURN_INCLUDE,
    });
    const usersMap = await this.fetchUsersMapForReturn(result);
    return this.serializeReturn(result, usersMap);
  }

  async update(
    returnId: string,
    header: Prisma.PurchaseReturnUncheckedUpdateInput,
    diff?: ReturnItemDiff,
    approverIds?: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Reconcile approvers (#7): add newly selected, remove de-selected.
      if (approverIds !== undefined) {
        const current = await tx.purchaseReturnApproval.findMany({
          where: { returnId },
          select: { approverId: true },
        });
        const currentIds = current.map((a) => a.approverId);
        const toAdd = approverIds.filter((id) => !currentIds.includes(id));
        const toRemove = currentIds.filter((id) => !approverIds.includes(id));
        if (toRemove.length) {
          await tx.purchaseReturnApproval.deleteMany({
            where: { returnId, approverId: { in: toRemove } },
          });
        }
        if (toAdd.length) {
          await tx.purchaseReturnApproval.createMany({
            data: toAdd.map((approverId) => ({ returnId, approverId })),
          });
        }
      }

      if (diff) {
        const { toDelete, toUpdate, toCreate } = diff;

        // Release reserved quantities for items being removed
        if (toDelete.length) {
          const deletedItems = await tx.purchaseReturnItem.findMany({
            where: { id: { in: toDelete } },
            select: { batchId: true, quantity: true },
          });
          for (const item of deletedItems) {
            if (item.batchId) {
              await this.releaseBatchQuantity(
                tx as unknown as TxClient,
                item.batchId,
                item.quantity,
              );
            }
          }
          await tx.purchaseReturnItem.deleteMany({ where: { id: { in: toDelete } } });
        }

        // Adjust reserved quantities for items being changed
        for (const item of toUpdate) {
          if (item.quantity !== undefined || item.batchId !== undefined) {
            const existing = await tx.purchaseReturnItem.findUnique({
              where: { id: item.id },
              select: { batchId: true, quantity: true },
            });

            if (existing?.batchId) {
              const oldBatchId = existing.batchId;
              const newBatchId = item.batchId ?? oldBatchId;
              const oldQty = existing.quantity;
              const newQty = item.quantity ?? oldQty;

              // Release the old reservation
              await this.releaseBatchQuantity(tx as unknown as TxClient, oldBatchId, oldQty);

              // Reserve against the (possibly different) new batch
              await this.reserveBatchQuantity(tx as unknown as TxClient, newBatchId, newQty);
            }
          }

          const { id, ...data } = item;
          await tx.purchaseReturnItem.update({ where: { id }, data });
        }

        // Validate and reserve for newly added items
        for (const item of toCreate) {
          await this.reserveBatchQuantity(tx as unknown as TxClient, item.batchId, item.quantity);
        }

        if (toCreate.length) {
          await tx.purchaseReturnItem.createMany({
            data: toCreate.map((item) => ({
              returnId,
              rawMaterialId: item.rawMaterialId,
              batchId: item.batchId,
              grnItemId: item.grnItemId ?? null,
              purchaseItemId: item.purchaseItemId ?? null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              reason: item.reason ?? null,
            })),
          });
        }
      }

      const result = await tx.purchaseReturn.update({
        where: { id: returnId },
        data: header,
        include: PURCHASE_RETURN_INCLUDE,
      });
      const usersMap = await this.fetchUsersMapForReturn(result);
      return this.serializeReturn(result, usersMap);
    });
  }

  async updateStatus(
    returnId: string,
    status: ReturnStatus,
    extra?: Prisma.PurchaseReturnUncheckedUpdateInput,
  ) {
    // APPROVED — simple status change, no inventory side-effects
    if (status === ReturnStatus.APPROVED) {
      const result = await this.prisma.purchaseReturn.update({
        where: { id: returnId },
        data: { status, ...extra },
        include: PURCHASE_RETURN_INCLUDE,
      });
      const usersMap = await this.fetchUsersMapForReturn(result);
      return this.serializeReturn(result, usersMap);
    }

    // CANCELLED / REJECTED — release the reserved batch quantities
    if (status === ReturnStatus.CANCELLED || status === ReturnStatus.REJECTED) {
      return this.prisma.$transaction(async (tx) => {
        const ret = await tx.purchaseReturn.findUnique({
          where: { id: returnId },
          include: { items: { select: { batchId: true, quantity: true } } },
        });

        for (const item of ret!.items) {
          if (item.batchId) {
            await this.releaseBatchQuantity(tx as unknown as TxClient, item.batchId, item.quantity);
          }
        }

        const result = await tx.purchaseReturn.update({
          where: { id: returnId },
          data: { status, ...extra },
          include: PURCHASE_RETURN_INCLUDE,
        });
        const usersMap = await this.fetchUsersMapForReturn(result);
        return this.serializeReturn(result, usersMap);
      });
    }

    // COMPLETED — availableQuantity and currentStock already decremented at create time;
    // record returnedQuantity and consumption log only
    return this.prisma.$transaction(async (tx) => {
      const ret = await tx.purchaseReturn.findUnique({
        where: { id: returnId },
        include: { items: true },
      });

      for (const item of ret!.items) {
        if (!item.batchId) continue;

        const batch = await tx.rawMaterialBatch.findUnique({
          where: { id: item.batchId },
          select: { id: true, availableQuantity: true },
        });

        if (!batch) {
          throw new BadRequestException(`Batch ${item.batchId} not found for return item`);
        }

        await tx.rawMaterialBatch.update({
          where: { id: batch.id },
          data: { returnedQuantity: { increment: item.quantity } },
        });

        await tx.rawMaterialBatchConsumption.create({
          data: {
            batchId: batch.id,
            consumedQuantity: item.quantity,
            remainingAfter: batch.availableQuantity,
            referenceType: "PURCHASE_RETURN",
            referenceId: returnId,
            notes: item.reason ?? null,
            createdById: (extra?.updatedById as string) ?? null,
          },
        });
      }

      const result = await tx.purchaseReturn.update({
        where: { id: returnId },
        data: { status, ...extra },
        include: PURCHASE_RETURN_INCLUDE,
      });
      const usersMap = await this.fetchUsersMapForReturn(result);
      return this.serializeReturn(result, usersMap);
    });
  }

  async decideApproval(
    returnId: string,
    approverId: string,
    decision: typeof ReturnApprovalStatus.APPROVED | typeof ReturnApprovalStatus.REJECTED,
    remarks?: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.purchaseReturnApproval.update({
        where: { returnId_approverId: { returnId, approverId } },
        data: { status: decision, remarks: remarks ?? null, decidedAt: new Date() },
      });

      if (decision === ReturnApprovalStatus.REJECTED) {
        await tx.purchaseReturn.update({
          where: { id: returnId },
          data: {
            status: ReturnStatus.REJECTED,
            rejectedById: approverId,
            rejectedReason: remarks ?? "Rejected by approver",
            updatedById: approverId,
          },
        });
      } else {
        const remaining = await tx.purchaseReturnApproval.count({
          where: { returnId, status: ReturnApprovalStatus.PENDING },
        });

        if (remaining === 0) {
          await tx.purchaseReturn.update({
            where: { id: returnId },
            data: {
              status: ReturnStatus.APPROVED,
              approvedById: approverId,
              approvedAt: new Date(),
              updatedById: approverId,
            },
          });
        }
      }

      return tx.purchaseReturn.findUnique({
        where: { id: returnId },
        include: PURCHASE_RETURN_INCLUDE,
      });
    });

    const usersMap = await this.fetchUsersMapForReturn(result);
    return this.serializeReturn(result, usersMap);
  }

  async delete(returnId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Release reserved batch quantities before hard-deleting the return
      const ret = await tx.purchaseReturn.findUnique({
        where: { id: returnId },
        include: { items: { select: { batchId: true, quantity: true } } },
      });

      for (const item of ret!.items) {
        if (item.batchId) {
          await this.releaseBatchQuantity(tx as unknown as TxClient, item.batchId, item.quantity);
        }
      }

      await tx.purchaseReturn.delete({ where: { id: returnId } });
    });
  }
}
