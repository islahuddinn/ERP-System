import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaymentStatus, SaleStatus } from "@prisma/tenant-client";
import {
  SalesRepository,
  SaleWithDetails,
  SaleWithRemaining,
  SaleProduct,
  PreparedSaleItem,
  SaleTotals,
} from "./sales.repository";
import { CreateCustomerSaleDto } from "./dto/create-sale.dto";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";
import { SaleQueryDto } from "./dto/sale-query.dto";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { CreateCustomerSaleReturnDto } from "./dto/create-sale-return.dto";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { AuditContextService } from "../audit/audit-context.service";

type SaleCalculationInput = {
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    itemDiscountPercentage?: number;
    itemDiscountAmount?: number;
    notes?: string;
  }>;
  discountPercentage?: number;
  discountAmount?: number;
  taxPercentage?: number;
  taxAmount?: number;
};

@Injectable()
export class SalesService {
  constructor(
    private readonly salesRepository: SalesRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async create(dto: CreateCustomerSaleDto, userId: string): Promise<SaleWithDetails> {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.salesRepository.findProductsByIds(productIds);

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of dto.items) {
      if (!productMap.has(item.productId)) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
    }

    const saleNumber = await this.salesRepository.generateSaleNumber();

    const { items, ...totals } = this.calculateTotals(dto, productMap);

    return this.salesRepository.createSaleRecord(saleNumber, dto, items, totals, userId);
  }

  async findAll(dto: SaleQueryDto): Promise<PaginatedResponse<SaleWithDetails>> {
    return this.salesRepository.findAll(dto);
  }

  async findOne(saleId: string): Promise<SaleWithRemaining> {
    return this.salesRepository.findById(saleId);
  }

  async updateSale(saleId: string, updateSaleDto: UpdateSaleDto): Promise<SaleWithDetails> {
    const sale = await this.salesRepository.findById(saleId);

    this.auditContext.setOldValue(sale);
    this.auditContext.setEntityLabel(sale.saleNumber);

    const {
      items,
      customerId,
      saleDate,
      notes,
      discountPercentage,
      discountAmount,
      taxPercentage,
      taxAmount,
    } = updateSaleDto;

    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException("Cancelled sales cannot be modified");
    }

    // COMPLETED: only notes can change
    if (sale.status === SaleStatus.COMPLETED) {
      const hasLockedFields =
        items ||
        customerId !== undefined ||
        saleDate !== undefined ||
        discountPercentage !== undefined ||
        discountAmount !== undefined ||
        taxPercentage !== undefined ||
        taxAmount !== undefined;

      if (hasLockedFields) {
        throw new BadRequestException(
          "Only notes can be updated on a confirmed sale — use a return to reverse items",
        );
      }

      return this.salesRepository.updateSaleMeta(saleId, { notes });
    }

    // DRAFT — metadata only (no items in body)
    if (!items) {
      const hasPricingFields =
        discountPercentage !== undefined ||
        discountAmount !== undefined ||
        taxPercentage !== undefined ||
        taxAmount !== undefined;

      if (hasPricingFields) {
        throw new BadRequestException(
          "Provide items when changing discount or tax — totals must be recalculated from item lines",
        );
      }

      return this.salesRepository.updateSaleMeta(saleId, {
        customerId,
        saleDate,
        notes,
      });
    }

    // DRAFT — full update: validate products, recalculate totals, replace items
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await this.salesRepository.findProductsByIds(productIds);

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      if (!productMap.has(item.productId)) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
    }

    const { items: updatedItems, ...totals } = this.calculateTotals(
      {
        items,
        discountPercentage,
        discountAmount,
        taxPercentage,
        taxAmount,
      },
      productMap,
    );

    return this.salesRepository.updateSaleWithItems(
      saleId,
      sale,
      updatedItems,
      totals,
      updateSaleDto,
    );
  }

  async confirmSale(saleId: string, userId: string): Promise<SaleWithDetails> {
    const sale = await this.salesRepository.findById(saleId);

    if (sale.status !== SaleStatus.DRAFT) {
      throw new BadRequestException(`Sale cannot be confirmed — current status: ${sale.status}`);
    }

    if (!sale.saleItems.length) {
      throw new BadRequestException("Cannot confirm a sale with no items");
    }

    this.auditContext.setOldValue(sale);
    this.auditContext.setEntityLabel(sale.saleNumber);

    return this.salesRepository.confirmSaleInDb(saleId, sale, userId);
  }

  async cancelSale(saleId: string, notes?: string): Promise<SaleWithDetails> {
    const sale = await this.salesRepository.findById(saleId);

    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException("Sale is already cancelled");
    }

    if (sale.status === SaleStatus.COMPLETED) {
      throw new BadRequestException(
        "Confirmed sales cannot be cancelled — create a return instead",
      );
    }

    this.auditContext.setOldValue(sale);
    this.auditContext.setEntityLabel(sale.saleNumber);

    return this.salesRepository.cancelSaleInDb(saleId, sale, notes);
  }

  async recordPayment(
    saleId: string,
    dto: RecordPaymentDto,
    userId: string,
  ): Promise<SaleWithDetails> {
    const sale = await this.salesRepository.findById(saleId);

    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException("Payments can only be recorded on confirmed sales");
    }

    this.assertPaymentDateNotBeforeSale(dto.paymentDate, sale.saleDate);

    const totalAmount = Number(sale.totalAmount);
    const alreadyPaid = Number(sale.amountPaid);
    const remaining = totalAmount - alreadyPaid;

    if (dto.amount > remaining + 0.001) {
      throw new BadRequestException(
        `Payment amount ${dto.amount} exceeds remaining balance ${remaining.toFixed(2)}`,
      );
    }

    const newAmountPaid = alreadyPaid + dto.amount;
    const paymentStatus =
      Math.abs(newAmountPaid - totalAmount) < 0.001 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

    this.auditContext.setOldValue(sale);
    this.auditContext.setEntityLabel(sale.saleNumber);

    return this.salesRepository.recordPaymentInDb(
      saleId,
      sale,
      dto,
      newAmountPaid,
      paymentStatus,
      userId,
    );
  }

  async updatePayment(
    saleId: string,
    paymentId: string,
    dto: UpdatePaymentDto,
    userId: string,
  ): Promise<SaleWithDetails> {
    const sale = await this.salesRepository.findById(saleId);

    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException("Payments can only be updated on confirmed sales");
    }

    const payment = sale.payments.find((p) => p.id === paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found on sale ${saleId}`);
    }

    this.assertPaymentDateNotBeforeSale(dto.paymentDate, sale.saleDate);

    this.auditContext.setOldValue(sale);
    this.auditContext.setEntityLabel(sale.saleNumber);

    const oldAmount = Number(payment.amount);
    const newAmount = dto.amount ?? oldAmount;
    const amountDelta = newAmount - oldAmount;

    if (amountDelta !== 0) {
      const newAmountPaid = Number(sale.amountPaid) + amountDelta;
      const totalAmount = Number(sale.totalAmount);

      if (newAmountPaid > totalAmount + 0.001) {
        const maxAllowed = oldAmount + (totalAmount - Number(sale.amountPaid));
        throw new BadRequestException(
          `Updated amount would exceed sale total — max allowed for this payment: ${maxAllowed.toFixed(2)}`,
        );
      }
    }

    return this.salesRepository.updatePaymentInDb(
      saleId,
      sale,
      paymentId,
      dto,
      amountDelta,
      userId,
    );
  }

  async createReturn(
    saleId: string,
    dto: CreateCustomerSaleReturnDto,
    userId: string,
  ): Promise<SaleWithDetails> {
    const sale = await this.salesRepository.findById(saleId);

    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException("Returns can only be created for confirmed sales");
    }

    const anyDelivered = sale.saleItems.some((si) => Number(si.dispatchedQuantity) > 0);
    if (!anyDelivered) {
      throw new BadRequestException(
        "Returns can only be created after at least one dispatch has been delivered",
      );
    }

    // A return can never predate the sale it belongs to. Compare on the calendar
    // day (ISO date portion) so both sides are evaluated in the same UTC frame.
    if (dto.returnDate) {
      const returnDay = dto.returnDate.slice(0, 10);
      const saleDay = new Date(sale.saleDate).toISOString().slice(0, 10);
      if (returnDay < saleDay) {
        throw new BadRequestException(
          "Return date cannot be earlier than the sale date",
        );
      }
    }

    const returnNumber = await this.salesRepository.generateReturnNumber();

    return this.salesRepository.createReturnInDb(saleId, sale, dto, returnNumber, userId);
  }

  // ---------------------------------------------------------------------------
  // GUARDS
  // ---------------------------------------------------------------------------

  // A payment can never be dated before the sale it belongs to. Compares on the
  // calendar day (yyyy-MM-dd) so timezone offsets don't cause false rejections.
  private assertPaymentDateNotBeforeSale(
    paymentDate: string | undefined,
    saleDate: Date,
  ): void {
    if (!paymentDate) return;
    const paymentDay = paymentDate.slice(0, 10);
    const saleDay = new Date(saleDate).toISOString().slice(0, 10);
    if (paymentDay < saleDay) {
      throw new BadRequestException(
        `Payment date (${paymentDay}) cannot be earlier than the sale date (${saleDay})`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // TOTALS CALCULATOR
  // ---------------------------------------------------------------------------

  private calculateTotals(
    dto: SaleCalculationInput,
    productMap: Map<string, SaleProduct>,
  ): SaleTotals & { items: PreparedSaleItem[] } {
    // ── Line level: discount only (no line-level tax) ──────────────────────────
    const items: PreparedSaleItem[] = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;

      const lineSubtotal = item.unitPrice * item.quantity;
      const itemDiscountFromPct = (lineSubtotal * (item.itemDiscountPercentage ?? 0)) / 100;
      const itemDiscountFromAmt = item.itemDiscountAmount ?? 0;
      const itemTotalDiscountAmount = itemDiscountFromPct + itemDiscountFromAmt;
      const lineTotal = lineSubtotal - itemTotalDiscountAmount;

      if (lineTotal < -0.001) {
        throw new BadRequestException(
          `Item discounts for "${product.name}" (${itemTotalDiscountAmount.toFixed(2)}) exceed the line subtotal (${lineSubtotal.toFixed(2)})`,
        );
      }

      return {
        productId: item.productId,
        itemName: product.name,
        sku: product.code,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: product.costPrice ?? 0,
        lineSubtotal,
        itemDiscountPercentage: item.itemDiscountPercentage,
        itemDiscountAmount: itemDiscountFromAmt,
        itemTotalDiscountAmount,
        lineTotal,
        notes: item.notes,
      };
    });

    // ── Sale level: discount first, then tax on what remains ───────────────────
    const subtotal = items.reduce((s, i) => s + i.lineSubtotal, 0);
    const itemsDiscountAmount = items.reduce((s, i) => s + i.itemTotalDiscountAmount, 0);
    const netSubtotal = subtotal - itemsDiscountAmount; // base for sale-level discount %

    const saleDiscountFromPct = (netSubtotal * (dto.discountPercentage ?? 0)) / 100;
    const saleDiscountFromAmt = dto.discountAmount ?? 0;
    const totalSaleDiscountAmount = saleDiscountFromPct + saleDiscountFromAmt;
    const totalDiscountAmount = itemsDiscountAmount + totalSaleDiscountAmount;

    const taxableAmount = netSubtotal - totalSaleDiscountAmount;
    if (taxableAmount < -0.001) {
      throw new BadRequestException(
        `Sale discounts (${totalSaleDiscountAmount.toFixed(2)}) exceed the net subtotal (${netSubtotal.toFixed(2)}). Please reduce the discount.`,
      );
    }

    const taxFromPct = (taxableAmount * (dto.taxPercentage ?? 0)) / 100;
    const taxFromAmt = dto.taxAmount ?? 0;
    const totalTaxAmount = taxFromPct + taxFromAmt;

    const totalAmount = taxableAmount + totalTaxAmount;

    return {
      subtotal,
      itemsDiscountAmount,
      discountAmount: saleDiscountFromAmt,
      totalDiscountAmount,
      taxAmount: taxFromAmt,
      totalTaxAmount,
      totalAmount,
      items,
    };
  }
}
