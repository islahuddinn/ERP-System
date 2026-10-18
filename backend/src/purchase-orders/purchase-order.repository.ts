import { BadRequestException, Injectable } from "@nestjs/common";
import {
  Prisma,
  PaymentStatus,
  PaymentMethod,
  PurchaseStatus,
  POApprovalStatus,
  ReceivingStatus,
} from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { PurchaseQueryDto } from "./dto/purchase-query.dto";
import { buildOrderBy, buildSearchFilter } from "../common/utils/pagination.helper";
import { getTotalPages } from "../common/reuseable-functions/getTotalPages";
import { PurchaseOrderDashboardStats } from "./utils/interfaces";

const PURCHASE_ORDER_INCLUDE = {
  supplier: { select: { id: true, name: true, phone: true, email: true } },
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
    },
    orderBy: { createdAt: "asc" as const },
  },
  payments: {
    include: {
      bankAccount: {
        select: { id: true, bankName: true, accountTitle: true, accountNumber: true },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
  approvals: { orderBy: { createdAt: "asc" as const } },
  // Count of GRNs linked to this PO — used by the UI to hide the "Create GRN" action
  // once a GRN already exists (only one GRN is allowed per PO).
  _count: { select: { grns: true } },
} satisfies Prisma.PurchaseOrderInclude;

const USER_SELECT = { id: true, firstName: true, lastName: true, email: true } as const;

export interface CreateItemData {
  rawMaterialId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface ItemDiff {
  toCreate: CreateItemData[];
  toUpdate: {
    id: string;
    rawMaterialId?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    notes?: string;
  }[];
  toDelete: string[];
}

export interface UpdatePurchaseOrderOptions {
  diff?: ItemDiff;
  // Reset every approval back to PENDING (used after editing a rejected PO).
  resetApprovals?: boolean;
  // Reconcile the PO's approver set to exactly these IDs (add missing, remove extras).
  approverIds?: string[];
  // Mark any still-PENDING approvals as APPROVED (used when a PO is manually confirmed
  // so the approval rows reflect the confirmed state instead of lingering on PENDING).
  approvePending?: boolean;
}

@Injectable()
export class PurchaseOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async fetchUsersMap(ids: (string | null | undefined)[]) {
    const uniqueIds = [...new Set(ids.filter(Boolean))] as string[];
    if (!uniqueIds.length)
      return {} as Record<
        string,
        { id: string; firstName: string; lastName: string; email: string }
      >;
    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: USER_SELECT,
    });
    return Object.fromEntries(users.map((u) => [u.id, u]));
  }

  private serializePO(
    po: any,
    usersMap: Record<
      string,
      { id: string; firstName: string; lastName: string; email: string }
    > = {},
  ) {
    if (!po) return po;
    return {
      ...po,
      createdBy: po.createdById ? (usersMap[po.createdById] ?? null) : null,
      updatedBy: po.updatedById ? (usersMap[po.updatedById] ?? null) : null,
      subTotal: Number(po.subTotal),
      shippingCost: Number(po.shippingCost),
      totalAmount: Number(po.totalAmount),
      amountPaid: Number(po.amountPaid),
      remainingAmount: Number(po.totalAmount) - Number(po.amountPaid),
      items: po.items?.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      payments: po.payments?.map((p: any) => ({
        ...p,
        paidBy: p.paidById ? (usersMap[p.paidById] ?? null) : null,
        amount: Number(p.amount),
      })),
      approvals: po.approvals?.map((a: any) => ({
        ...a,
        approver: usersMap[a.approverId] ?? null,
      })),
    };
  }

  private async fetchUsersMapForPO(po: any) {
    return this.fetchUsersMap([
      po?.createdById,
      po?.updatedById,
      ...(po?.payments?.map((p: any) => p.paidById) ?? []),
      ...(po?.approvals?.map((a: any) => a.approverId) ?? []),
    ]);
  }

  private serializePayment(p: any) {
    if (!p) return p;
    return { ...p, amount: Number(p.amount) };
  }

  async validateSupplierBankAccount(bankAccountId: string, supplierId: string): Promise<void> {
    const account = await this.prisma.supplierBankAccount.findFirst({
      where: { id: bankAccountId, supplierId, deletedAt: null },
      select: { id: true },
    });
    if (!account) {
      throw new BadRequestException(
        "Bank account not found or does not belong to this purchase order's supplier",
      );
    }
  }

  async validateRawMaterialIds(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const found = await this.prisma.rawMaterial.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const foundSet = new Set(found.map((r) => r.id));
    const invalid = ids.filter((id) => !foundSet.has(id));
    if (invalid.length) {
      throw new BadRequestException(
        `The following raw material ID(s) are not available: ${invalid.join(", ")}`,
      );
    }
  }

  async validateApproverIds(ids: string[]): Promise<void> {
    if (!ids?.length) {
      throw new BadRequestException(
        "At least one approver ID is required to create a purchase order",
      );
    }
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

  async generateOrderNumber(): Promise<string> {
    const latest = await this.prisma.purchaseOrder.findFirst({
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    const next = latest ? parseInt(latest.orderNumber.replace("PO-", ""), 10) + 1 : 1;
    return `PO-${String(next).padStart(6, "0")}`;
  }

  async create(
    header: Prisma.PurchaseOrderUncheckedCreateInput,
    items: CreateItemData[],
    approverIds: string[] = [],
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({ data: header });

      if (items.length) {
        await tx.purchaseItem.createMany({
          data: items.map((item) => ({
            purchaseOrderId: po.id,
            rawMaterialId: item.rawMaterialId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes ?? null,
          })),
        });
      }

      if (approverIds.length) {
        await tx.purchaseOrderApproval.createMany({
          data: approverIds.map((approverId) => ({ purchaseOrderId: po.id, approverId })),
        });
      }

      return tx.purchaseOrder.findUnique({
        where: { id: po.id },
        include: PURCHASE_ORDER_INCLUDE,
      });
    });
    const usersMap = await this.fetchUsersMapForPO(result);
    return this.serializePO(result, usersMap);
  }

  async findAll(queryDto: PurchaseQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      supplierId,
      status,
      paymentStatus,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = queryDto;

    const skip = (page - 1) * limit;
    const where: Prisma.PurchaseOrderWhereInput = {};

    if (search) {
      where.OR = [
        ...buildSearchFilter(search, ["orderNumber", "referenceNo"]),
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) where.orderDate.gte = new Date(startDate);
      if (endDate) where.orderDate.lte = new Date(endDate);
    }

    const orderBy = buildOrderBy(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: PURCHASE_ORDER_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    const usersMap = await this.fetchUsersMap(
      data.flatMap((po) => [
        po.createdById,
        po.updatedById,
        ...po.approvals.map((a) => a.approverId),
      ]),
    );

    return {
      data: data.map((po) => this.serializePO(po, usersMap)),
      meta: { total, page, limit, totalPages: getTotalPages(total, limit) },
    };
  }

  async findById(purchaseOrderId: string) {
    const result = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: PURCHASE_ORDER_INCLUDE,
    });

    const usersMap = await this.fetchUsersMapForPO(result);

    return this.serializePO(result, usersMap);
  }

  async update(
    purchaseOrderId: string,
    header: Prisma.PurchaseOrderUncheckedUpdateInput,
    options: UpdatePurchaseOrderOptions = {},
  ) {
    const { diff, resetApprovals = false, approverIds, approvePending = false } = options;

    const result = await this.prisma.$transaction(async (tx) => {
      if (resetApprovals) {
        await tx.purchaseOrderApproval.updateMany({
          where: { purchaseOrderId },
          data: { status: POApprovalStatus.PENDING, remarks: null, decidedAt: null },
        });
      }

      // Reconcile the approver set to exactly `approverIds` (QA: approver edits were dropped
      // because approverIds was never persisted on update).
      if (approverIds) {
        const existingApprovals = await tx.purchaseOrderApproval.findMany({
          where: { purchaseOrderId },
          select: { approverId: true },
        });
        const existingIds = new Set(existingApprovals.map((a) => a.approverId));
        const desiredIds = new Set(approverIds);

        const toRemove = [...existingIds].filter((approverId) => !desiredIds.has(approverId));
        const toAdd = [...desiredIds].filter((approverId) => !existingIds.has(approverId));

        if (toRemove.length) {
          await tx.purchaseOrderApproval.deleteMany({
            where: { purchaseOrderId, approverId: { in: toRemove } },
          });
        }
        if (toAdd.length) {
          await tx.purchaseOrderApproval.createMany({
            data: toAdd.map((approverId) => ({ purchaseOrderId, approverId })),
          });
        }
      }

      // When a PO is manually confirmed, settle any outstanding approvals so the approval
      // rows no longer show PENDING against a CONFIRMED order.
      if (approvePending) {
        await tx.purchaseOrderApproval.updateMany({
          where: { purchaseOrderId, status: POApprovalStatus.PENDING },
          data: { status: POApprovalStatus.APPROVED, decidedAt: new Date() },
        });
      }

      if (diff) {
        if (diff.toDelete.length) {
          await tx.purchaseItem.deleteMany({ where: { id: { in: diff.toDelete } } });
        }

        for (const item of diff.toUpdate) {
          const { id, ...data } = item;
          await tx.purchaseItem.update({ where: { id }, data });
        }

        if (diff.toCreate.length) {
          await tx.purchaseItem.createMany({
            data: diff.toCreate.map((item) => ({
              purchaseOrderId,
              rawMaterialId: item.rawMaterialId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              notes: item.notes ?? null,
            })),
          });
        }
      }

      return tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: header,
        include: PURCHASE_ORDER_INCLUDE,
      });
    });
    const usersMap = await this.fetchUsersMapForPO(result);
    return this.serializePO(result, usersMap);
  }

  async delete(purchaseOrderId: string) {
    return this.prisma.purchaseOrder.delete({ where: { id: purchaseOrderId } });
  }

  async addPayment(
    purchaseOrderId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    referenceNumber: string | undefined,
    bankAccountId: string | undefined,
    notes: string | undefined,
    paidById: string,
    newAmountPaid: number,
    totalAmount: number,
  ) {
    let paymentStatus: PaymentStatus;
    if (newAmountPaid <= 0) {
      paymentStatus = PaymentStatus.PENDING;
    } else if (newAmountPaid >= totalAmount) {
      paymentStatus = PaymentStatus.PAID;
    } else {
      paymentStatus = PaymentStatus.PARTIAL;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.purchasePayment.create({
        data: {
          purchaseOrderId,
          amount,
          paymentMethod,
          referenceNumber: referenceNumber ?? null,
          bankAccountId: bankAccountId ?? null,
          notes: notes ?? null,
          paidById,
        },
      });

      return tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { amountPaid: newAmountPaid, paymentStatus },
        include: PURCHASE_ORDER_INCLUDE,
      });
    });
    const usersMap = await this.fetchUsersMapForPO(result);
    return this.serializePO(result, usersMap);
  }

  async getPayments(purchaseOrderId: string) {
    const payments = await this.prisma.purchasePayment.findMany({
      where: { purchaseOrderId },
      include: {
        bankAccount: {
          select: { id: true, bankName: true, accountTitle: true, accountNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return payments.map((p) => this.serializePayment(p));
  }

  async findPaymentById(paymentId: string) {
    const payment = await this.prisma.purchasePayment.findUnique({
      where: { id: paymentId },
      include: {
        bankAccount: {
          select: { id: true, bankName: true, accountTitle: true, accountNumber: true },
        },
      },
    });
    return this.serializePayment(payment);
  }

  async updatePayment(
    paymentId: string,
    purchaseOrderId: string,
    oldAmount: number,
    newAmount: number,
    updatedById: string,
    patch: {
      paymentMethod?: PaymentMethod;
      referenceNumber?: string | null;
      bankAccountId?: string | null;
      notes?: string | null;
    },
    currentAmountPaid: number,
    totalAmount: number,
  ) {
    const newAmountPaid = currentAmountPaid - oldAmount + newAmount;

    let paymentStatus: PaymentStatus;

    if (newAmountPaid <= 0) {
      paymentStatus = PaymentStatus.PENDING;
    } else if (newAmountPaid >= totalAmount) {
      paymentStatus = PaymentStatus.PAID;
    } else {
      paymentStatus = PaymentStatus.PARTIAL;
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.purchasePayment.update({
        where: { id: paymentId },
        data: { amount: newAmount, updatedById, ...patch },
      });

      // Update PO totals atomically but return the payment as the primary record
      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { amountPaid: newAmountPaid, paymentStatus },
      });

      return this.serializePayment(updatedPayment);
    });
  }

  async dropdown() {
    return this.prisma.purchaseOrder.findMany({
      // where: { status: { in: ["CONFIRMED", "PARTIAL"] } },
      orderBy: { createdAt: "desc" },
      select: {
        paymentStatus: true,
        status: true,
        id: true,
        orderNumber: true,
        orderDate: true,
        supplier: { select: { id: true, name: true } },
      },
    });
  }

  async countCompletedGRNs(purchaseOrderId: string): Promise<number> {
    return this.prisma.gRN.count({
      where: {
        purchaseOrderId,
        status: ReceivingStatus.COMPLETED,
      },
    });
  }

  async syncReceivedQtyAndStatus(
    purchaseOrderId: string,
    receivedItems: { rawMaterialId: string; acceptedQty: number }[],
    tx: Prisma.TransactionClient,
  ) {
    for (const { rawMaterialId, acceptedQty } of receivedItems) {
      if (acceptedQty <= 0) continue;
      await tx.purchaseItem.updateMany({
        where: { purchaseOrderId, rawMaterialId },
        data: { receivedQty: { increment: acceptedQty } },
      });
    }

    const items = await tx.purchaseItem.findMany({
      where: { purchaseOrderId },
      select: { quantity: true, receivedQty: true },
    });

    if (!items.length) return;

    const allReceived = items.every((i) => i.receivedQty >= i.quantity);
    const anyReceived = items.some((i) => i.receivedQty > 0);

    if (!anyReceived) return;

    const newStatus = allReceived ? PurchaseStatus.RECEIVED : PurchaseStatus.PARTIAL;

    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: newStatus },
    });
  }

  async decideApproval(
    purchaseOrderId: string,
    approverId: string,
    decision: typeof POApprovalStatus.APPROVED | typeof POApprovalStatus.REJECTED,
    remarks: string | undefined,
    hasItems: boolean,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrderApproval.update({
        where: { purchaseOrderId_approverId: { purchaseOrderId, approverId } },
        data: { status: decision, remarks: remarks ?? null, decidedAt: new Date() },
      });

      if (decision === POApprovalStatus.APPROVED && hasItems) {
        const remaining = await tx.purchaseOrderApproval.count({
          where: { purchaseOrderId, status: POApprovalStatus.PENDING },
        });

        if (remaining === 0) {
          await tx.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: PurchaseStatus.CONFIRMED },
          });
        }
      }

      return tx.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: PURCHASE_ORDER_INCLUDE,
      });
    });

    const usersMap = await this.fetchUsersMapForPO(result);
    return this.serializePO(result, usersMap);
  }

  //–––––––––––––––––––––––––––––––– Dashboard APIs ––––––––––––––––––––––––––––––––

  async getDashboardStats(): Promise<PurchaseOrderDashboardStats> {
    const [statusCounts, valueAggregate, outstandingAggregate, pendingApprovalCount] =
      await Promise.all([
        this.prisma.purchaseOrder.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        this.prisma.purchaseOrder.aggregate({
          _sum: { totalAmount: true },
        }),
        this.prisma.purchaseOrder.aggregate({
          where: { paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] } },
          _sum: { totalAmount: true, amountPaid: true },
        }),
        this.prisma.purchaseOrderApproval.count({ where: { status: POApprovalStatus.PENDING } }),
      ]);

    const countByStatus = (status: PurchaseStatus): number =>
      statusCounts.find((entry) => entry.status === status)?._count._all ?? 0;

    const totalOutstandingAmount =
      Number(outstandingAggregate._sum.totalAmount || 0) -
      Number(outstandingAggregate._sum.amountPaid || 0);

    return {
      totalPurchaseOrders: statusCounts.reduce((sum, entry) => sum + entry._count._all, 0),
      draftPurchaseOrders: countByStatus(PurchaseStatus.DRAFT),
      confirmedPurchaseOrders: countByStatus(PurchaseStatus.CONFIRMED),
      partialPurchaseOrders: countByStatus(PurchaseStatus.PARTIAL),
      receivedPurchaseOrders: countByStatus(PurchaseStatus.RECEIVED),
      cancelledPurchaseOrders: countByStatus(PurchaseStatus.CANCELLED),
      pendingApprovalCount,
      totalPurchaseValue: Number(valueAggregate._sum.totalAmount || 0),
      totalOutstandingAmount,
    };
  }
}
