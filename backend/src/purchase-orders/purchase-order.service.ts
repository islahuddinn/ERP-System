import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditContextService } from "../audit/audit-context.service";
import { PurchaseOrderRepository, ItemDiff } from "./purchase-order.repository";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";
import { PurchaseQueryDto } from "./dto/purchase-query.dto";
import { AddPaymentDto } from "./dto/add-payment.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";
import { DecidePoApprovalDto } from "./dto/decide-po-approval.dto";
import { RequestWithUser } from "../common/interfaces";
import { PaymentMethod, POApprovalStatus, PurchaseStatus } from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { currencySymbol } from "../common/utils/currency.util";

const BANK_ACCOUNT_METHODS = new Set<PaymentMethod>([
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.CHEQUE,
]);
import PDFDocument from "pdfkit";

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly auditContext: AuditContextService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreatePurchaseOrderDto, req: RequestWithUser) {
    const { id: userId } = req.user;
    const {
      items,
      supplierId,
      orderDate,
      expectedDate,
      shippingCost = 0,
      approverIds,
      ...rest
    } = dto;

    await this.purchaseOrderRepository.validateRawMaterialIds(items.map((i) => i.rawMaterialId));
    await this.purchaseOrderRepository.validateApproverIds(approverIds);

    const orderNumber = await this.purchaseOrderRepository.generateOrderNumber();

    const mappedItems = items.map((item) => ({
      rawMaterialId: item.rawMaterialId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
      notes: item.notes,
    }));

    const subTotal = mappedItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const totalAmount = subTotal + shippingCost;

    const po = await this.purchaseOrderRepository.create(
      {
        ...rest,
        orderNumber,
        supplierId,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        subTotal,
        shippingCost,
        totalAmount,
        createdById: userId,
      },
      mappedItems,
      [...new Set(approverIds)],
    );

    this.auditContext.setEntityLabel(po.orderNumber);

    return po;
  }

  async findAll(queryDto: PurchaseQueryDto) {
    return this.purchaseOrderRepository.findAll(queryDto);
  }

  async findOne(purchaseOrderId: string) {
    const po = await this.purchaseOrderRepository.findById(purchaseOrderId);

    if (!po) throw new NotFoundException(`Purchase order "${purchaseOrderId}" not found`);

    return po;
  }

  /**
   * Render a single purchase order as a PDF document (returned as a Buffer).
   * Follows the existing PDFKit pattern used in factory-reports / payroll payslips.
   */
  async generatePdf(purchaseOrderId: string): Promise<Buffer> {
    const po = await this.findOne(purchaseOrderId);
    const settings = await this.prisma.settings.findFirst({ select: { currency: true } });
    const symbol = currencySymbol(settings?.currency);

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const chunks: Buffer[] = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const money = (v: unknown): string => `${symbol} ${Number(v ?? 0).toFixed(2)}`;
        const supplierName = po.supplier?.name ?? po.supplierName ?? "—";

        // ── Header ──────────────────────────────────────────────
        doc.fontSize(20).font("Helvetica-Bold").text("Purchase Order", { align: "center" });
        doc.moveDown(0.3);
        doc.fontSize(11).font("Helvetica").text(po.orderNumber, { align: "center" });
        doc.moveDown(1);

        // ── Meta block (supplier left, order info right) ────────
        doc.fontSize(10).font("Helvetica");
        const metaTop = doc.y;
        doc.text(`Supplier: ${supplierName}`, 50, metaTop, { width: 280 });
        if (po.supplier?.phone) doc.text(`Phone: ${po.supplier.phone}`, 50);
        if (po.supplier?.email) doc.text(`Email: ${po.supplier.email}`, 50);

        doc.text(`Status: ${po.status}`, 350, metaTop, { width: 195 });
        doc.text(`Payment: ${po.paymentStatus}`, 350);
        doc.text(`Order Date: ${new Date(po.orderDate).toLocaleDateString()}`, 350);
        if (po.expectedDate)
          doc.text(`Expected: ${new Date(po.expectedDate).toLocaleDateString()}`, 350);
        if (po.referenceNo) doc.text(`Reference: ${po.referenceNo}`, 350);
        doc.moveDown(2);

        // ── Items table header ──────────────────────────────────
        const tableTop = doc.y;
        doc.font("Helvetica-Bold").fontSize(10);
        doc.text("Raw Material", 50, tableTop);
        doc.text("Qty", 280, tableTop, { width: 50, align: "right" });
        doc.text("Unit Price", 340, tableTop, { width: 90, align: "right" });
        doc.text("Total", 440, tableTop, { width: 105, align: "right" });
        doc
          .moveTo(50, tableTop + 14)
          .lineTo(545, tableTop + 14)
          .stroke();

        // ── Rows ────────────────────────────────────────────────
        doc.font("Helvetica").fontSize(9);
        let y = tableTop + 20;
        for (const item of po.items ?? []) {
          if (y > 760) {
            doc.addPage();
            y = 50;
          }
          const rm = item.rawMaterial;
          const label = rm ? `${rm.name} (${rm.code})${rm.uom ? " — " + rm.uom.symbol : ""}` : "—";
          doc.text(label, 50, y, { width: 220 });
          doc.text(String(item.quantity), 280, y, { width: 50, align: "right" });
          doc.text(money(item.unitPrice), 340, y, { width: 90, align: "right" });
          doc.text(money(item.totalPrice), 440, y, { width: 105, align: "right" });
          y += 20;
        }

        // ── Totals ──────────────────────────────────────────────
        doc
          .moveTo(340, y + 2)
          .lineTo(545, y + 2)
          .stroke();
        y += 10;
        const totalLine = (label: string, value: unknown, bold = false) => {
          doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
          doc.text(label, 340, y, { width: 90, align: "right" });
          doc.text(money(value), 440, y, { width: 105, align: "right" });
          y += 16;
        };
        totalLine("Subtotal:", po.subTotal);
        totalLine("Shipping:", po.shippingCost);
        totalLine("Total:", po.totalAmount, true);
        totalLine("Amount Paid:", po.amountPaid);

        // ── Remarks ─────────────────────────────────────────────
        if (po.remarks) {
          doc.moveDown(2);
          doc.font("Helvetica-Bold").fontSize(10).text("Remarks:", 50);
          doc.font("Helvetica").fontSize(9).text(po.remarks, 50, undefined, { width: 495 });
        }

        // Small helper to start a new page when we're near the bottom margin.
        const ensureSpace = (needed: number) => {
          if (doc.y + needed > 760) doc.addPage();
        };

        const fmtDate = (v: unknown): string =>
          v ? new Date(v as string).toLocaleString() : "—";

        // ── Payments (QA #45) ───────────────────────────────────
        const payments = po.payments ?? [];
        ensureSpace(80);
        doc.moveDown(2);
        doc.font("Helvetica-Bold").fontSize(12).text("Payments", 50);
        doc.moveDown(0.5);
        if (!payments.length) {
          doc.font("Helvetica").fontSize(9).text("No payments recorded.", 50);
        } else {
          const pTop = doc.y;
          doc.font("Helvetica-Bold").fontSize(9);
          doc.text("Date", 50, pTop, { width: 90 });
          doc.text("Method", 150, pTop, { width: 100 });
          doc.text("Reference", 260, pTop, { width: 130 });
          doc.text("Amount", 440, pTop, { width: 105, align: "right" });
          doc
            .moveTo(50, pTop + 12)
            .lineTo(545, pTop + 12)
            .stroke();
          doc.font("Helvetica").fontSize(9);
          let py = pTop + 18;
          for (const p of payments) {
            if (py > 760) {
              doc.addPage();
              py = 50;
            }
            doc.text(fmtDate(p.paymentDate ?? p.createdAt), 50, py, { width: 90 });
            doc.text(String(p.paymentMethod ?? "—"), 150, py, { width: 100 });
            doc.text(String(p.referenceNumber ?? "—"), 260, py, { width: 130 });
            doc.text(money(p.amount), 440, py, { width: 105, align: "right" });
            py += 16;
          }
          doc.y = py;
        }

        // ── Approvals (QA #45) ──────────────────────────────────
        const approvals = po.approvals ?? [];
        ensureSpace(80);
        doc.moveDown(2);
        doc.font("Helvetica-Bold").fontSize(12).text("Approvals", 50);
        doc.moveDown(0.5);
        if (!approvals.length) {
          doc.font("Helvetica").fontSize(9).text("No approvals required.", 50);
        } else {
          const aTop = doc.y;
          doc.font("Helvetica-Bold").fontSize(9);
          doc.text("Approver", 50, aTop, { width: 150 });
          doc.text("Status", 200, aTop, { width: 80 });
          doc.text("Decided", 280, aTop, { width: 120 });
          doc.text("Remarks", 400, aTop, { width: 145 });
          doc
            .moveTo(50, aTop + 12)
            .lineTo(545, aTop + 12)
            .stroke();
          doc.font("Helvetica").fontSize(9);
          let ay = aTop + 18;
          for (const a of approvals) {
            if (ay > 760) {
              doc.addPage();
              ay = 50;
            }
            const approverName =
              [a.approver?.firstName, a.approver?.lastName].filter(Boolean).join(" ") ||
              a.approver?.name ||
              a.approver?.email ||
              a.approverId ||
              "—";
            doc.text(String(approverName), 50, ay, { width: 150 });
            doc.text(String(a.status ?? "—"), 200, ay, { width: 80 });
            doc.text(fmtDate(a.decidedAt), 280, ay, { width: 120 });
            doc.text(String(a.remarks ?? "—"), 400, ay, { width: 145 });
            ay += 16;
          }
          doc.y = ay;
        }

        doc.end();
      } catch (err) {
        reject(err as Error);
      }
    });
  }

  async update(purchaseOrderId: string, dto: UpdatePurchaseOrderDto, req: RequestWithUser) {
    const { id: userId } = req.user;

    const existing = await this.findOne(purchaseOrderId);

    if (
      existing.status === PurchaseStatus.RECEIVED ||
      existing.status === PurchaseStatus.CANCELLED
    ) {
      throw new BadRequestException(`Cannot update a ${existing.status} purchase order`);
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.orderNumber);

    const { items, orderDate, expectedDate, shippingCost, approverIds, ...rest } = dto;

    // Validate the replacement approver set up front (existence + active). The repository
    // reconciles the approval rows to this set inside the update transaction.
    if (approverIds !== undefined) {
      await this.purchaseOrderRepository.validateApproverIds(approverIds);
    }

    let diff: ItemDiff | undefined;

    let subTotal = Number(existing.subTotal);

    const newShippingCost =
      shippingCost !== undefined ? shippingCost : Number(existing.shippingCost);

    if (items !== undefined) {
      const existingItemIds = existing.items.map((i) => i.id);
      const incomingWithId = items.filter((i) => i.id);
      const incomingNew = items.filter((i) => !i.id);
      const incomingIds = incomingWithId.map((i) => i.id);

      const toDelete = existingItemIds.filter((id) => !incomingIds.includes(id));

      const toUpdate = incomingWithId.map((i) => ({
        id: i.id!,
        // Allow switching an existing line to a different raw material (QA: raw-material
        // edits were dropped because the update mapping ignored rawMaterialId).
        rawMaterialId: i.rawMaterialId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice:
          i.quantity !== undefined && i.unitPrice !== undefined
            ? i.quantity * i.unitPrice
            : undefined,
        notes: i.notes,
      }));

      const toCreate = incomingNew.map((i) => ({
        rawMaterialId: i.rawMaterialId!,
        quantity: i.quantity!,
        unitPrice: i.unitPrice!,
        totalPrice: i.quantity! * i.unitPrice!,
        notes: i.notes,
      }));

      // Validate every raw material that will be persisted: new lines plus any existing
      // line whose raw material changed in this update.
      const updatedRawMaterialIds = toUpdate
        .map((i) => i.rawMaterialId)
        .filter((rawMaterialId): rawMaterialId is string => !!rawMaterialId);

      const idsToValidate = [...toCreate.map((i) => i.rawMaterialId), ...updatedRawMaterialIds];
      if (idsToValidate.length) {
        await this.purchaseOrderRepository.validateRawMaterialIds(idsToValidate);
      }

      diff = { toCreate, toUpdate, toDelete };

      const updatedExistingItems = existing.items
        .filter((i) => !toDelete.includes(i.id))
        .map((i) => {
          const updated = toUpdate.find((u) => u.id === i.id);
          return updated && updated.totalPrice !== undefined
            ? { totalPrice: updated.totalPrice }
            : { totalPrice: Number(i.totalPrice) };
        });

      const newItemTotals = toCreate.map((i) => ({ totalPrice: i.totalPrice }));

      subTotal = [...updatedExistingItems, ...newItemTotals].reduce(
        (sum, i) => sum + i.totalPrice,
        0,
      );
    }

    const totalAmount = subTotal + newShippingCost;

    const wasRejected = existing.approvals.some((a) => a.status === POApprovalStatus.REJECTED);

    return this.purchaseOrderRepository.update(
      purchaseOrderId,
      {
        ...rest,
        orderDate: orderDate ? new Date(orderDate) : undefined,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        shippingCost: newShippingCost,
        subTotal,
        totalAmount,
        updatedById: userId,
      },
      {
        diff,
        resetApprovals: wasRejected,
        approverIds: approverIds !== undefined ? [...new Set(approverIds)] : undefined,
      },
    );
  }

  async remove(purchaseOrderId: string, _req: RequestWithUser) {
    const existing = await this.findOne(purchaseOrderId);

    if (existing.status !== PurchaseStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT purchase orders can be deleted");
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.orderNumber);

    await this.purchaseOrderRepository.delete(purchaseOrderId);

    return { message: "Purchase order deleted successfully" };
  }

  async addPayment(purchaseOrderId: string, dto: AddPaymentDto, req: RequestWithUser) {
    const { id: userId } = req.user;

    const existing = await this.findOne(purchaseOrderId);

    if (existing.status === PurchaseStatus.CANCELLED) {
      throw new BadRequestException("Cannot add payment to a cancelled purchase order");
    }

    if (dto.bankAccountId) {
      if (!BANK_ACCOUNT_METHODS.has(dto.paymentMethod)) {
        throw new BadRequestException(
          `Bank account is only applicable for BANK_TRANSFER or CHEQUE payments, not ${dto.paymentMethod}`,
        );
      }
      if (!existing.supplierId) {
        throw new BadRequestException(
          "Cannot specify a bank account — this purchase order has no linked supplier",
        );
      }
      await this.purchaseOrderRepository.validateSupplierBankAccount(
        dto.bankAccountId,
        existing.supplierId,
      );
    }

    const currentAmountPaid = Number(existing.amountPaid);
    const totalAmount = Number(existing.totalAmount);
    const newAmountPaid = currentAmountPaid + dto.amount;

    if (newAmountPaid > totalAmount) {
      throw new BadRequestException(
        `Payment of ${dto.amount} exceeds remaining balance of ${(totalAmount - currentAmountPaid).toFixed(2)}`,
      );
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.orderNumber);

    return this.purchaseOrderRepository.addPayment(
      purchaseOrderId,
      dto.amount,
      dto.paymentMethod,
      dto.referenceNumber,
      dto.bankAccountId,
      dto.notes,
      userId,
      newAmountPaid,
      totalAmount,
    );
  }

  async updatePayment(
    purchaseOrderId: string,
    paymentId: string,
    dto: UpdatePaymentDto,
    req: RequestWithUser,
  ) {
    const { id: userId } = req.user;

    const existing = await this.findOne(purchaseOrderId);

    if (existing.status === PurchaseStatus.CANCELLED) {
      throw new BadRequestException("Cannot modify a payment on a cancelled purchase order");
    }

    const payment = await this.purchaseOrderRepository.findPaymentById(paymentId);

    if (!payment) throw new NotFoundException(`Payment "${paymentId}" not found`);

    if (payment.purchaseOrderId !== purchaseOrderId) {
      throw new BadRequestException("Payment does not belong to this purchase order");
    }

    // Resolve the effective payment method after the edit — fall back to the stored
    // method when the DTO omits it — so the bank-account constraint is checked correctly.
    const effectiveMethod = dto.paymentMethod ?? payment.paymentMethod;
    if (dto.bankAccountId) {
      if (!BANK_ACCOUNT_METHODS.has(effectiveMethod)) {
        throw new BadRequestException(
          `Bank account is only applicable for BANK_TRANSFER or CHEQUE payments, not ${effectiveMethod}`,
        );
      }
      if (!existing.supplierId) {
        throw new BadRequestException(
          "Cannot specify a bank account — this purchase order has no linked supplier",
        );
      }
      await this.purchaseOrderRepository.validateSupplierBankAccount(
        dto.bankAccountId,
        existing.supplierId,
      );
    }

    const oldAmount = Number(payment.amount);
    const totalAmount = Number(existing.totalAmount);
    const currentAmountPaid = Number(existing.amountPaid);

    // Compute what amountPaid would become after the edit
    const proposedAmountPaid = currentAmountPaid - oldAmount + dto.amount;

    if (proposedAmountPaid < 0) {
      throw new BadRequestException(
        `Reducing this payment by ${(oldAmount - dto.amount).toFixed(2)} would make total paid negative`,
      );
    }

    if (proposedAmountPaid > totalAmount) {
      throw new BadRequestException(
        `Payment of ${dto.amount} exceeds the order total of ${totalAmount.toFixed(2)}`,
      );
    }

    // Log the payment as the primary entity — ID and old snapshot match the PurchasePayment record
    this.auditContext.setEntityId(paymentId);
    this.auditContext.setOldValue({
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNumber,
      notes: payment.notes,
    });
    this.auditContext.setEntityLabel(`${existing.orderNumber} – Payment`);

    // A bank account only makes sense for BANK_TRANSFER/CHEQUE. If the edit lands on a
    // non-bank method, clear any previously linked account so the record stays consistent.
    const bankAccountId = BANK_ACCOUNT_METHODS.has(effectiveMethod)
      ? (dto.bankAccountId ?? null)
      : null;

    return this.purchaseOrderRepository.updatePayment(
      paymentId,
      purchaseOrderId,
      oldAmount,
      dto.amount,
      userId,
      {
        paymentMethod: dto.paymentMethod,
        referenceNumber: dto.referenceNumber ?? null,
        bankAccountId,
        notes: dto.notes ?? null,
      },
      currentAmountPaid,
      totalAmount,
    );
  }

  async getPaymentHistory(purchaseOrderId: string) {
    await this.findOne(purchaseOrderId);
    return this.purchaseOrderRepository.getPayments(purchaseOrderId);
  }

  async dropdown() {
    return this.purchaseOrderRepository.dropdown();
  }

  async updateStatus(purchaseOrderId: string, newStatus: PurchaseStatus, req: RequestWithUser) {
    const { id: userId } = req.user;
    const existing = await this.findOne(purchaseOrderId);
    const current = existing.status as PurchaseStatus;

    const validTransitions: Record<string, PurchaseStatus[]> = {
      [PurchaseStatus.DRAFT]: [PurchaseStatus.CONFIRMED, PurchaseStatus.CANCELLED],
      [PurchaseStatus.CONFIRMED]: [PurchaseStatus.RECEIVED],
      [PurchaseStatus.PARTIAL]: [PurchaseStatus.RECEIVED],
      [PurchaseStatus.RECEIVED]: [],
      [PurchaseStatus.CANCELLED]: [],
    };

    if (!validTransitions[current]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition purchase order from ${current} to ${newStatus}`,
      );
    }

    if (newStatus === PurchaseStatus.CONFIRMED) {
      if (!existing.items.length) {
        throw new BadRequestException("Cannot confirm a purchase order with no items");
      }
      // A rejected approval keeps the PO in DRAFT; it must not be confirmable until it is
      // edited (which resets approvals back to PENDING). Block confirming a rejected PO (QA #9).
      const isRejected = existing.approvals.some(
        (a) => a.status === POApprovalStatus.REJECTED,
      );
      if (isRejected) {
        throw new BadRequestException("A rejected purchase order cannot be confirmed.");
      }
    }

    if (newStatus === PurchaseStatus.CANCELLED) {
      const count = await this.purchaseOrderRepository.countCompletedGRNs(purchaseOrderId);
      if (count > 0) {
        throw new BadRequestException(
          `Cannot cancel — ${count} GRN(s) have already been completed for this order`,
        );
      }
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.orderNumber);

    return this.purchaseOrderRepository.update(
      purchaseOrderId,
      {
        status: newStatus,
        updatedById: userId,
      },
      // Manually confirming a PO settles any still-PENDING approvals so the approval
      // section no longer shows PENDING against a CONFIRMED order (QA #4).
      { approvePending: newStatus === PurchaseStatus.CONFIRMED },
    );
  }

  async approve(
    purchaseOrderId: string,
    decidePoApprovalDto: DecidePoApprovalDto,
    req: RequestWithUser,
  ) {
    const { id: userId } = req.user;
    const existing = await this.findOne(purchaseOrderId);

    const { remarks, decision } = decidePoApprovalDto;

    if (existing.status !== PurchaseStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot record an approval decision for a ${existing.status} purchase order`,
      );
    }

    if (!existing.approvals.length) {
      throw new BadRequestException("This purchase order does not require approval");
    }

    const approval = existing.approvals.find((a) => a.approverId === userId);

    if (!approval) {
      throw new ForbiddenException("You are not an approver for this purchase order");
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.orderNumber);

    const hasItems = existing?.items?.length > 0;

    return this.purchaseOrderRepository.decideApproval(
      purchaseOrderId,
      userId,
      decision,
      remarks,
      hasItems,
    );
  }

  async syncReceivedQtyAndStatus(
    purchaseOrderId: string,
    receivedItems: { rawMaterialId: string; acceptedQty: number }[],
    tx: any,
  ) {
    return this.purchaseOrderRepository.syncReceivedQtyAndStatus(
      purchaseOrderId,
      receivedItems,
      tx,
    );
  }
}
