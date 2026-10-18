import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  SaleStatus,
  SaleDispatchStatus,
  PaymentStatus,
  ItemType,
  TransactionType,
  CustomerTransactionType,
  SaleReturnStatus,
  RefundStatus,
} from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerSaleDto } from "./dto/create-sale.dto";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";
import { SaleQueryDto } from "./dto/sale-query.dto";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { CreateCustomerSaleReturnDto } from "./dto/create-sale-return.dto";
import { PaginatedResponse, buildPaginatedResponse } from "../common/dto/pagination.dto";
import { buildSearchFilter, buildOrderBy } from "../common/utils/pagination.helper";
import { handlePrismaUniqueError } from "../common/reuseable-functions/handlePrismaUniqueError";
import { syncProductBatchDerivedStatus } from "../product-management/product-batches/utils/batch-status.util";

const SALE_INCLUDE = {
  customer: {
    select: { id: true, code: true, shopName: true, phone: true, email: true },
  },
  saleItems: {
    include: {
      product: { select: { id: true, name: true, code: true, uom: { select: { symbol: true } } } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  payments: { orderBy: { createdAt: "desc" as const } },
  returns: {
    include: { returnItems: { include: { originalSaleItem: true } } },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.SaleInclude;

export type SaleWithDetails = Prisma.SaleGetPayload<{ include: typeof SALE_INCLUDE }>;
export type SaleWithRemaining = SaleWithDetails & { remainingAmount: number };

export type SaleProduct = {
  id: string;
  name: string;
  code: string;
  costPrice: number | null;
};

export type PreparedSaleItem = {
  productId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  lineSubtotal: number;
  itemDiscountPercentage?: number;
  itemDiscountAmount: number; // flat discount on this line
  itemTotalDiscountAmount: number; // pct + flat combined
  lineTotal: number; // lineSubtotal − itemTotalDiscountAmount
  notes?: string;
};

export type SaleTotals = {
  subtotal: number; // gross sum of all lineSubtotals
  itemsDiscountAmount: number; // sum of all per-line discounts
  discountAmount: number; // sale-level flat discount
  totalDiscountAmount: number; // itemsDiscountAmount + all sale-level discounts
  taxAmount: number; // sale-level flat tax
  totalTaxAmount: number; // pct tax + flat tax
  totalAmount: number; // taxableAmount + totalTaxAmount
};

@Injectable()
export class SalesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------

  async findAll(dto: SaleQueryDto): Promise<PaginatedResponse<SaleWithDetails>> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      paymentStatus,
      customerId,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.saleDate = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }
    if (search) {
      where.OR = [
        ...buildSearchFilter(search, ["saleNumber", "notes"]),
        { customer: { OR: buildSearchFilter(search, ["shopName", "phone", "code"]) } },
      ];
    }

    // Customer is a relation, so it can't go through the scalar buildOrderBy
    // (`{ customer: "desc" }` is invalid). Map the "customerName" sort key to an
    // explicit relation orderBy; every other column is a scalar Sale field.
    const sortDir = (sortOrder ?? "DESC").toString().toLowerCase() as Prisma.SortOrder;
    const orderBy =
      sortBy === "customerName"
        ? { customer: { shopName: sortDir } }
        : sortBy
          ? buildOrderBy(sortBy, sortOrder)
          : { saleDate: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({ where, skip, take: limit, orderBy, include: SALE_INCLUDE }),
      this.prisma.sale.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(saleId: string): Promise<SaleWithRemaining> {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: SALE_INCLUDE,
    });

    if (!sale) throw new NotFoundException("Sale not found");

    return {
      ...sale,
      remainingAmount: Math.round((Number(sale.totalAmount) - Number(sale.amountPaid)) * 100) / 100,
    };
  }

  async findProductsByIds(ids: string[]): Promise<SaleProduct[]> {
    return this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, code: true, costPrice: true },
    });
  }

  // ---------------------------------------------------------------------------
  // NUMBER GENERATORS
  // ---------------------------------------------------------------------------

  async generateSaleNumber(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const last = await this.prisma.sale.findFirst({
      where: { saleNumber: { startsWith: `SALE-${dateStr}` } },
      orderBy: { saleNumber: "desc" },
    });
    const seq = last ? parseInt(last.saleNumber.split("-")[2]) + 1 : 1;
    return `SALE-${dateStr}-${seq.toString().padStart(4, "0")}`;
  }

  async generateReturnNumber(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const last = await this.prisma.saleReturn.findFirst({
      where: { returnNumber: { startsWith: `RET-${dateStr}` } },
      orderBy: { returnNumber: "desc" },
    });
    const seq = last ? parseInt(last.returnNumber.split("-")[2]) + 1 : 1;
    return `RET-${dateStr}-${seq.toString().padStart(4, "0")}`;
  }

  // ---------------------------------------------------------------------------
  // CREATE DRAFT
  //
  // Reserves stock at the product level only — no batch-level allocation yet.
  // Batch allocation happens when dispatches are generated from this sale.
  // product.currentStock is NOT changed here.
  // ---------------------------------------------------------------------------

  async createSaleRecord(
    saleNumber: string,
    dto: CreateCustomerSaleDto,
    items: PreparedSaleItem[],
    totals: SaleTotals,
    userId: string,
  ): Promise<SaleWithDetails> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        for (const item of items) {
          await this.reserveProductStock(tx, item.productId, item.quantity);
        }

        return tx.sale.create({
          data: {
            saleNumber,
            customerId: dto.customerId,
            saleDate: dto.saleDate ? new Date(dto.saleDate) : new Date(),
            subtotal: totals.subtotal,
            itemsDiscountAmount: totals.itemsDiscountAmount,
            taxPercentage: dto.taxPercentage ?? 0,
            taxAmount: dto.taxAmount ?? 0,
            totalTaxAmount: totals.totalTaxAmount,
            discountPercentage: dto.discountPercentage ?? 0,
            discountAmount: dto.discountAmount ?? 0,
            totalDiscountAmount: totals.totalDiscountAmount,
            totalAmount: totals.totalAmount,
            amountPaid: 0,
            paymentStatus: PaymentStatus.PENDING,
            status: SaleStatus.DRAFT,
            notes: dto.notes,
            createdById: userId,
            saleItems: {
              create: items.map((item) => ({
                productId: item.productId,
                itemType: ItemType.PRODUCT,
                itemName: item.itemName,
                sku: item.sku,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                costPrice: item.costPrice,
                lineSubtotal: item.lineSubtotal,
                itemDiscountPercentage: item.itemDiscountPercentage ?? 0,
                itemDiscountAmount: item.itemDiscountAmount,
                itemTotalDiscountAmount: item.itemTotalDiscountAmount,
                lineTotal: item.lineTotal,
                notes: item.notes,
              })),
            },
          },
          include: SALE_INCLUDE,
        });
      });
    } catch (error) {
      handlePrismaUniqueError(error);
    }
  }

  // ---------------------------------------------------------------------------
  // UPDATE — metadata only (no items, no totals change)
  // ---------------------------------------------------------------------------

  async updateSaleMeta(
    saleId: string,
    data: { customerId?: string; saleDate?: string; notes?: string },
  ): Promise<SaleWithDetails> {
    return this.prisma.sale.update({
      where: { id: saleId },
      data: {
        ...(data.customerId !== undefined ? { customerId: data.customerId } : {}),
        ...(data.saleDate ? { saleDate: new Date(data.saleDate) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: SALE_INCLUDE,
    });
  }

  // ---------------------------------------------------------------------------
  // UPDATE — full items replacement (DRAFT only)
  //
  // 1. Release existing batch reservations
  // 2. Re-reserve with new items (validates availability)
  // 3. Replace all SaleItems, apply recalculated totals
  // ---------------------------------------------------------------------------

  async updateSaleWithItems(
    saleId: string,
    sale: SaleWithDetails,
    items: PreparedSaleItem[],
    totals: SaleTotals,
    dto: UpdateSaleDto,
  ): Promise<SaleWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      for (const oldItem of sale.saleItems) {
        if (oldItem.productId) {
          await this.releaseProductStock(tx, oldItem.productId, Number(oldItem.quantity));
        }
      }

      for (const newItem of items) {
        await this.reserveProductStock(tx, newItem.productId, newItem.quantity);
      }

      await tx.saleItem.deleteMany({ where: { saleId } });

      return tx.sale.update({
        where: { id: saleId },
        data: {
          ...(dto.customerId !== undefined ? { customerId: dto.customerId } : {}),
          ...(dto.saleDate ? { saleDate: new Date(dto.saleDate) } : {}),
          subtotal: totals.subtotal,
          itemsDiscountAmount: totals.itemsDiscountAmount,
          taxPercentage: dto.taxPercentage ?? 0,
          taxAmount: dto.taxAmount ?? 0,
          totalTaxAmount: totals.totalTaxAmount,
          discountPercentage: dto.discountPercentage ?? 0,
          discountAmount: dto.discountAmount ?? 0,
          totalDiscountAmount: totals.totalDiscountAmount,
          totalAmount: totals.totalAmount,
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          saleItems: {
            create: items.map((item) => ({
              productId: item.productId,
              itemType: ItemType.PRODUCT,
              itemName: item.itemName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPrice: item.costPrice,
              lineSubtotal: item.lineSubtotal,
              itemDiscountPercentage: item.itemDiscountPercentage ?? 0,
              itemDiscountAmount: item.itemDiscountAmount,
              itemTotalDiscountAmount: item.itemTotalDiscountAmount,
              lineTotal: item.lineTotal,
              notes: item.notes,
            })),
          },
        },
        include: SALE_INCLUDE,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // CONFIRM
  //
  // Stock deduction and batch consumption now happen at dispatch DELIVERED, not
  // here. Confirm only updates the sale status and records the customer ledger
  // entry so AR is correct from the moment the sale is agreed.
  // ---------------------------------------------------------------------------

  async confirmSaleInDb(
    saleId: string,
    sale: SaleWithDetails,
    userId: string,
  ): Promise<SaleWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      const totalAmount = Number(sale.totalAmount);

      await tx.sale.update({
        where: { id: saleId },
        data: { status: SaleStatus.COMPLETED },
      });

      if (sale.customerId) {
        await tx.customerTransaction.create({
          data: {
            customerId: sale.customerId,
            date: sale.saleDate,
            type: CustomerTransactionType.SALE,
            reference: sale.saleNumber,
            // The ledger renders Reference and Description in separate columns, so
            // the Description must NOT just repeat the sale number (which is already
            // in Reference). Prefer the human sale note; otherwise summarise the
            // line items ("Sale of N item(s)") — a readable, distinct description.
            description: sale.notes?.trim()
              ? sale.notes.trim()
              : this.buildSaleDescription(sale),
            debit: totalAmount,
            credit: 0,
            createdById: userId,
          },
        });

        await tx.customer.update({
          where: { id: sale.customerId },
          data: { balance: { increment: totalAmount } },
        });
      }

      return tx.sale.findUnique({
        where: { id: saleId },
        include: SALE_INCLUDE,
      }) as Promise<SaleWithDetails>;
    });
  }

  // ---------------------------------------------------------------------------
  // CANCEL
  //
  // Releases any DRAFT dispatch batch allocations first, then releases the
  // product-level reservation. APPROVED/DELIVERED dispatches must be handled
  // at the service layer before calling this (service blocks if any exist).
  // ---------------------------------------------------------------------------

  async cancelSaleInDb(
    saleId: string,
    sale: SaleWithDetails,
    notes?: string,
  ): Promise<SaleWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      // Release batch-level allocations from any DRAFT dispatches
      const draftDispatches = await tx.saleDispatch.findMany({
        where: { saleId, status: SaleDispatchStatus.DRAFT },
        include: { items: true },
      });

      for (const dispatch of draftDispatches) {
        for (const dispatchItem of dispatch.items) {
          await tx.productBatch.update({
            where: { id: dispatchItem.productBatchId },
            data: {
              reservedQuantity: { decrement: dispatchItem.quantity },
              availableQuantity: { increment: dispatchItem.quantity },
            },
          });
          await syncProductBatchDerivedStatus(tx, dispatchItem.productBatchId);
        }
        await tx.saleDispatch.update({
          where: { id: dispatch.id },
          data: { status: SaleDispatchStatus.CANCELLED },
        });
      }

      // Release product-level reservations
      for (const item of sale.saleItems) {
        if (item.productId) {
          await this.releaseProductStock(tx, item.productId, Number(item.quantity));
        }
      }

      await tx.sale.update({
        where: { id: saleId },
        data: {
          status: SaleStatus.CANCELLED,
          ...(notes ? { notes } : {}),
        },
      });

      return tx.sale.findUnique({
        where: { id: saleId },
        include: SALE_INCLUDE,
      }) as Promise<SaleWithDetails>;
    });
  }

  // ---------------------------------------------------------------------------
  // RECORD PAYMENT
  // ---------------------------------------------------------------------------

  async recordPaymentInDb(
    saleId: string,
    sale: SaleWithDetails,
    dto: RecordPaymentDto,
    newAmountPaid: number,
    paymentStatus: PaymentStatus,
    userId: string,
  ): Promise<SaleWithDetails> {
    // Resolve the payment date ONCE so the Payment row and its matching
    // CustomerTransaction ledger entry share the exact same timestamp. Calling
    // `new Date()` twice previously produced a few-millisecond skew, which broke
    // the date-based match used when the payment is later edited (Issue B).
    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          saleId,
          paymentMethod: dto.paymentMethod,
          amount: dto.amount,
          referenceNumber: dto.referenceNumber,
          paymentDate,
          notes: dto.notes,
          processedById: userId,
        },
      });

      await tx.sale.update({
        where: { id: saleId },
        data: { amountPaid: newAmountPaid, paymentStatus },
      });

      if (sale.customerId) {
        await tx.customerTransaction.create({
          data: {
            customerId: sale.customerId,
            date: paymentDate,
            type: CustomerTransactionType.PAYMENT,
            reference: sale.saleNumber,
            description: `Payment for ${sale.saleNumber} — ${dto.paymentMethod}`,
            debit: 0,
            credit: dto.amount,
            notes: dto.notes,
            createdById: userId,
          },
        });

        await tx.customer.update({
          where: { id: sale.customerId },
          data: { balance: { decrement: dto.amount } },
        });
      }

      return tx.sale.findUnique({
        where: { id: saleId },
        include: SALE_INCLUDE,
      }) as Promise<SaleWithDetails>;
    });
  }

  // ---------------------------------------------------------------------------
  // UPDATE PAYMENT
  //
  // When only non-financial fields change, the sale total and customer ledger
  // are untouched. When the amount changes: adjusts sale.amountPaid and creates
  // an ADJUSTMENT CustomerTransaction to preserve the full audit trail.
  // ---------------------------------------------------------------------------

  async updatePaymentInDb(
    saleId: string,
    sale: SaleWithDetails,
    paymentId: string,
    dto: UpdatePaymentDto,
    amountDelta: number,
    userId: string,
  ): Promise<SaleWithDetails> {
    // Snapshot of the payment BEFORE mutation — used to locate the matching
    // PAYMENT ledger entry (there is no FK link between Payment and
    // CustomerTransaction, so we match on the payment's original date + amount).
    const existingPayment = sale.payments.find((p) => p.id === paymentId);

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
          ...(dto.paymentMethod !== undefined ? { paymentMethod: dto.paymentMethod } : {}),
          ...(dto.referenceNumber !== undefined ? { referenceNumber: dto.referenceNumber } : {}),
          ...(dto.paymentDate ? { paymentDate: new Date(dto.paymentDate) } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
      });

      // Keep the customer ledger in sync when the payment DATE is edited. The
      // ledger reads CustomerTransaction.date, so without this the ledger keeps
      // showing the old payment date.
      //
      // There is no FK linking Payment → CustomerTransaction, so we locate the
      // matching PAYMENT ledger entry heuristically. The previous match used an
      // EXACT timestamp equality (`date: existingPayment.paymentDate`), which
      // silently matched zero rows whenever the Payment and its ledger entry were
      // created by two separate `new Date()` calls a few ms apart (Issue B).
      //
      // Instead, narrow to the PAYMENT transactions for this sale whose original
      // amount matches, scoped to the SAME CALENDAR DAY as the payment's stored
      // date, then update the single best match by id. This is robust to the ms
      // skew (new and legacy rows) and to date-only vs timestamp representations.
      if (dto.paymentDate && sale.customerId && existingPayment) {
        const newDate = new Date(dto.paymentDate);
        const newMethod = dto.paymentMethod ?? existingPayment.paymentMethod;

        const origDate = new Date(existingPayment.paymentDate);
        const dayStart = new Date(origDate);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

        const baseWhere = {
          customerId: sale.customerId,
          type: CustomerTransactionType.PAYMENT,
          reference: sale.saleNumber,
          credit: Number(existingPayment.amount),
        };

        // Primary match: same calendar day as the payment's stored date (handles
        // the common case + the ms skew from legacy rows). If nothing matches
        // (e.g. a row already orphaned onto a different day by the old buggy
        // edit), fall back to any same-sale PAYMENT tx of this amount.
        let candidates = await tx.customerTransaction.findMany({
          where: { ...baseWhere, date: { gte: dayStart, lt: dayEnd } },
          orderBy: { date: "asc" },
        });
        if (candidates.length === 0) {
          candidates = await tx.customerTransaction.findMany({
            where: baseWhere,
            orderBy: { date: "asc" },
          });
        }

        // Prefer the entry closest in time to the payment's original timestamp
        // (handles the rare case of several same-amount payments on one day).
        const target = candidates.reduce<(typeof candidates)[number] | null>((best, cur) => {
          if (!best) return cur;
          const dBest = Math.abs(new Date(best.date).getTime() - origDate.getTime());
          const dCur = Math.abs(new Date(cur.date).getTime() - origDate.getTime());
          return dCur < dBest ? cur : best;
        }, null);

        if (target) {
          await tx.customerTransaction.update({
            where: { id: target.id },
            data: {
              date: newDate,
              description: `Payment for ${sale.saleNumber} — ${newMethod}`,
            },
          });
        }
      }

      if (amountDelta !== 0) {
        const newAmountPaid = Number(sale.amountPaid) + amountDelta;
        const totalAmount = Number(sale.totalAmount);
        const newPaymentStatus =
          Math.abs(newAmountPaid - totalAmount) < 0.001
            ? PaymentStatus.PAID
            : PaymentStatus.PARTIAL;

        await tx.sale.update({
          where: { id: saleId },
          data: { amountPaid: newAmountPaid, paymentStatus: newPaymentStatus },
        });

        if (sale.customerId) {
          await tx.customerTransaction.create({
            data: {
              customerId: sale.customerId,
              date: new Date(),
              type: CustomerTransactionType.ADJUSTMENT,
              reference: sale.saleNumber,
              description: `Payment adjustment for ${sale.saleNumber} (${amountDelta > 0 ? "+" : ""}${amountDelta.toFixed(2)})`,
              // amountDelta > 0 → more money received → credit (reduces debt)
              // amountDelta < 0 → less money received → debit (increases debt)
              debit: amountDelta < 0 ? Math.abs(amountDelta) : 0,
              credit: amountDelta > 0 ? amountDelta : 0,
              createdById: userId,
            },
          });

          await tx.customer.update({
            where: { id: sale.customerId },
            data: { balance: { decrement: amountDelta } },
          });
        }
      }

      return tx.sale.findUnique({
        where: { id: saleId },
        include: SALE_INCLUDE,
      }) as Promise<SaleWithDetails>;
    });
  }

  // ---------------------------------------------------------------------------
  // CREATE RETURN
  //
  // Restores stock into the most recent active batch (LIFO for returns — goods
  // typically go back into the latest batch).
  // StockTransaction type is ADJUSTMENT (not SALE) — goods are coming back IN.
  // ---------------------------------------------------------------------------

  async createReturnInDb(
    saleId: string,
    sale: SaleWithDetails,
    dto: CreateCustomerSaleReturnDto,
    returnNumber: string,
    userId: string,
  ): Promise<SaleWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      let returnTotal = 0;

      // Distribute sale-level discount and tax proportionally across items.
      // saleItem.lineTotal covers only item-level discounts; the sale-level
      // discount and tax sit on top. scaleFactor = totalAmount / netSubtotal
      // converts each item's lineTotal share into its effective paid amount.
      const netSubtotal = Number(sale.subtotal) - Number(sale.itemsDiscountAmount);
      const scaleFactor = netSubtotal > 0 ? Number(sale.totalAmount) / netSubtotal : 1;

      const returnItems = await Promise.all(
        dto.items.map(async (item) => {
          const saleItem = sale.saleItems.find((si) => si.id === item.saleItemId);
          if (!saleItem) throw new NotFoundException(`Sale item ${item.saleItemId} not found`);

          const alreadyReturned = await tx.saleReturnItem.aggregate({
            where: { originalSaleItemId: item.saleItemId },
            _sum: { quantityReturned: true },
          });
          const maxReturnable =
            Number(saleItem.dispatchedQuantity) -
            Number(alreadyReturned._sum.quantityReturned ?? 0);
          if (item.quantity > maxReturnable + 0.001) {
            throw new BadRequestException(
              `Cannot return ${item.quantity} of "${saleItem.itemName}" — only ${maxReturnable} returnable`,
            );
          }

          const origLineTotal = Number(saleItem.lineTotal);
          const itemReturnAmount =
            ((origLineTotal * scaleFactor) / Number(saleItem.quantity)) * item.quantity;
          returnTotal += itemReturnAmount;

          if (saleItem.productId) {
            await tx.product.update({
              where: { id: saleItem.productId },
              data: { currentStock: { increment: item.quantity } },
            });

            // Restore into the most recent active batch (LIFO for returns)
            const latestBatch = await tx.productBatch.findFirst({
              where: { productId: saleItem.productId, status: "ACTIVE" },
              orderBy: { createdAt: "desc" },
            });
            if (latestBatch) {
              await tx.productBatch.update({
                where: { id: latestBatch.id },
                data: {
                  availableQuantity: { increment: item.quantity },
                  consumedQuantity: { decrement: item.quantity },
                  returnedQuantity: { increment: item.quantity },
                },
              });
              await syncProductBatchDerivedStatus(tx, latestBatch.id);
            }

            await tx.stockTransaction.create({
              data: {
                productId: saleItem.productId,
                type: TransactionType.ADJUSTMENT,
                quantity: item.quantity,
                referenceNo: returnNumber,
                remarks: `Return ${returnNumber} — ${saleItem.itemName} (restocked)`,
                createdById: userId,
              },
            });
          }

          const discountPer = Number(saleItem.itemDiscountAmount) / Number(saleItem.quantity);
          const returnLineSubtotal = Number(saleItem.unitPrice) * item.quantity;
          const returnLineDiscount = discountPer * item.quantity;
          // lineTotal reflects what the customer effectively paid for this return
          // line, after item discount, sale-level discount, and tax are all applied.
          const returnLineTotal = itemReturnAmount;

          return {
            originalSaleItemId: item.saleItemId,
            productId: saleItem.productId,
            itemType: saleItem.itemType,
            itemName: saleItem.itemName,
            sku: saleItem.sku,
            quantityReturned: item.quantity,
            originalQuantity: Number(saleItem.quantity),
            unitPrice: Number(saleItem.unitPrice),
            lineSubtotal: returnLineSubtotal,
            itemDiscountAmount: returnLineDiscount,
            lineTotal: returnLineTotal,
            notes: item.reason,
          };
        }),
      );

      await tx.saleReturn.create({
        data: {
          returnNumber,
          originalSaleId: saleId,
          reason: dto.reason,
          refundMethod: dto.refundMethod,
          returnDate: dto.returnDate ? new Date(dto.returnDate) : new Date(),
          subtotal: returnTotal,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: returnTotal,
          status: SaleReturnStatus.PROCESSED,
          refundStatus: RefundStatus.PENDING,
          notes: dto.notes,
          processedById: userId,
          refundedAt: new Date(),
          returnItems: { create: returnItems },
        },
      });

      if (sale.customerId) {
        await tx.customerTransaction.create({
          data: {
            customerId: sale.customerId,
            date: new Date(),
            type: CustomerTransactionType.RETURN,
            reference: returnNumber,
            description: `Return ${returnNumber} for sale ${sale.saleNumber}`,
            debit: 0,
            credit: returnTotal,
            notes: dto.notes,
            createdById: userId,
          },
        });

        await tx.customer.update({
          where: { id: sale.customerId },
          data: { balance: { decrement: returnTotal } },
        });
      }

      return tx.sale.findUnique({
        where: { id: saleId },
        include: SALE_INCLUDE,
      }) as Promise<SaleWithDetails>;
    });
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  // Human-readable ledger description for a SALE when the user left the notes
  // blank. Summarises the item lines instead of echoing the sale number (which
  // already lives in the ledger's Reference column). e.g. "Sale of 2 items
  // (Ledger Test Prod, Widget)".
  private buildSaleDescription(sale: SaleWithDetails): string {
    const items = sale.saleItems ?? [];
    const count = items.length;
    if (count === 0) return "Sale";
    const names = items
      .map((i) => i.itemName)
      .filter(Boolean)
      .slice(0, 3);
    const namePart = names.length
      ? ` (${names.join(", ")}${count > names.length ? ", …" : ""})`
      : "";
    return `Sale of ${count} item${count === 1 ? "" : "s"}${namePart}`;
  }

  // Sale DRAFT: reserve at product level only. Batch allocation happens later
  // when dispatches are generated. Throws if product-level stock is insufficient.
  private async reserveProductStock(
    tx: Pick<PrismaService, "product">,
    productId: string,
    qty: number,
  ): Promise<void> {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { name: true, currentStock: true, reservedStock: true },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const available = product.currentStock - product.reservedStock;
    if (available < qty - 0.001) {
      throw new BadRequestException(
        `Insufficient stock for "${product.name}": available ${available.toFixed(3)}, requested ${qty}`,
      );
    }

    await tx.product.update({
      where: { id: productId },
      data: { reservedStock: { increment: qty } },
    });
  }

  // Sale CANCEL: release the product-level reservation only.
  // Batch-level allocations (from dispatches) are released separately in cancelSaleInDb.
  private async releaseProductStock(
    tx: Pick<PrismaService, "product">,
    productId: string,
    qty: number,
  ): Promise<void> {
    await tx.product.update({
      where: { id: productId },
      data: { reservedStock: { decrement: qty } },
    });
  }
}
