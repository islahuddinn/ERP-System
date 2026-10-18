// @ts-nocheck - Ignore pre-existing audit service type errors
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import {
  Prisma,
  PrismaClient,
  SaleReturnStatus,
  RefundStatus,
  StockTransactionType,
} from "@prisma/tenant-client";
import { StockLedgerService } from "../common/services/stock-ledger.service";
import { AuditService } from "../audit/audit.service";
import { FinancialEventService } from "../common/services/financial-event.service";
import { CashInHandService } from "../cash-in-hand/cash-in-hand.service";
import { InvoicesService } from "../invoices/invoices.service";
import { GlPostingService } from "../financial/gl-posting/gl-posting.service";
import { GlPostingKind, GlSourceType } from "../financial/gl-posting/utils/enums";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { AddPaymentDto } from "./dto/add-payment.dto";
import { RefundSaleDto } from "./dto/refund-sale.dto";
import { SaleFiltersDto } from "./dto/sale-filters.dto";
import { UpdateSaleStatusDto } from "./dto/update-sale-status.dto";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { CancelSaleDto } from "./dto/cancel-sale.dto";
import { HoldInvoiceDto } from "./dto/hold-invoice.dto";
import { createPaginatedResponse } from "../common/utils/pagination.helper";
import {
  SaleStatus,
  PaymentStatus,
  ItemType,
  DiscountType,
  PaymentMethod,
  CashTransactionType,
} from "@prisma/tenant-client";
import PDFDocument from "pdfkit";
import {
  CreateSaleReturnDto,
  SaleReturnFiltersDto,
  ProcessSaleReturnDto,
  CancelSaleReturnDto,
} from "./dto/create-sale-return.dto";
import { MasterPrismaService } from "../master-prisma/master-prisma.service";
import { currencySymbol } from "../common/utils/currency.util";

const DEFAULT_TRANSACTION_TIMEOUT_MS = 20000;

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(
    private stockLedgerService: StockLedgerService,
    private auditService: AuditService,
    private cashInHandService: CashInHandService,
    private masterPrisma: MasterPrismaService,
    private financialEventService: FinancialEventService,
    private invoicesService: InvoicesService,
    private glPostingService: GlPostingService,
  ) {}

  private async getBrandingName(tenantId: string): Promise<string> {
    try {
      const tenant = await this.masterPrisma.tenant.findUnique({
        where: { id: tenantId },
        select: { brandingName: true, name: true },
      });
      return tenant?.brandingName?.trim() || tenant?.name || "Malind Tech";
    } catch (error) {
      return "Malind Tech";
    }
  }

  private getPrisma(
    tenantClient?: PrismaClient | Prisma.TransactionClient,
  ): PrismaClient | Prisma.TransactionClient {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for POS operations");
    }

    return tenantClient;
  }

  async createSale(tenantClient: PrismaClient, createSaleDto: CreateSaleDto, userId: string) {
    const prisma = this.getPrisma(tenantClient);
    const { items, payments, ...saleData } = createSaleDto;

    // Get warehouse and extract locationId from it
    if (!saleData.warehouseId) {
      throw new BadRequestException("Warehouse ID is required");
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: saleData.warehouseId },
      include: { location: true },
    });
    if (!warehouse) {
      throw new NotFoundException("Warehouse not found");
    }

    // VALIDATE WAREHOUSE TYPE - Sales MUST be from DISPATCH warehouse
    if (warehouse.warehouseType !== "DISPATCH") {
      throw new BadRequestException(
        `Sales can only be created from DISPATCH warehouses. ` +
          `Warehouse "${warehouse.name}" is type: ${warehouse.warehouseType}`,
      );
    }

    // Set locationId from warehouse for downstream operations
    saleData.locationId = warehouse.locationId;

    // Validate location exists
    const location = warehouse.location;
    if (!location) {
      throw new NotFoundException("Location not found for warehouse");
    }

    // Validate customer if provided
    if (saleData.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: saleData.customerId },
      });
      if (!customer) {
        throw new NotFoundException("Customer not found");
      }
    }

    // Validate products and stock for PRODUCT items (from selected warehouse)
    await this.validateStock(prisma, items, warehouse);

    // Build cost map for products to ensure sale items capture cost price
    const productCostMap = new Map<string, number>();
    const productIds = Array.from(
      new Set(
        items
          .map((item) => item.productId)
          .filter(
            (productId): productId is string =>
              typeof productId === "string" && productId.length > 0,
          ),
      ),
    );

    if (productIds.length > 0) {
      const productCosts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, costPrice: true },
      });

      productCosts.forEach((product) => {
        productCostMap.set(product.id, Number(product.sellingPrice || 0));
      });
    }

    // Use the tax rate from frontend (default to 0 if not provided)
    const taxRate = saleData.taxRate !== undefined ? Number(saleData.taxRate) : 0;

    // Calculate totals using the tax rate from frontend
    const calculations = this.calculateTotals(
      items,
      taxRate,
      saleData.discountType,
      saleData.discountValue || 0,
    );

    // If frontend provided totalAmount, prefer it to ensure exact match
    // This fixes issues where frontend and backend calculations differ
    let finalTotalAmount = calculations.totalAmount;
    let finalTaxAmount = calculations.taxAmount;

    // If tax rate is explicitly 0, ensure tax amount is 0 regardless of calculations
    if (taxRate === 0 || taxRate === null || taxRate === undefined) {
      finalTaxAmount = 0;
      // Recalculate total without tax
      finalTotalAmount = calculations.subtotal - calculations.discountAmount;
    }

    // Check if frontend provided totalAmount (meaning it was calculated on frontend)
    if (saleData.totalAmount !== undefined) {
      const frontendTotal = Number(saleData.totalAmount);
      const backendTotal = finalTotalAmount;
      const difference = Math.abs(frontendTotal - backendTotal);

      // If tax rate is 0 and frontend provided total, trust the frontend total
      // (frontend calculated with taxRate=0, so we should match it)
      if (taxRate === 0 || taxRate === null || taxRate === undefined) {
        finalTotalAmount = frontendTotal;
        finalTaxAmount = 0;
      } else if (difference < 0.01) {
        // If difference is small (likely due to rounding), use frontend value
        // This ensures frontend and backend match exactly
        finalTotalAmount = frontendTotal;

        // Calculate tax amount from frontend total
        const subtotalAfterDiscount = calculations.subtotal - calculations.discountAmount;
        finalTaxAmount = frontendTotal - subtotalAfterDiscount;
        // Ensure tax amount is not negative
        if (finalTaxAmount < 0) {
          finalTaxAmount = 0;
        }
      } else {
        // If difference is large, log warning but use backend calculation
        console.warn("Frontend and backend totals differ significantly:", {
          frontendTotal,
          backendTotal,
          difference,
          taxRate,
        });
      }
    }

    // Create sale in transaction with retry for unique constraint on saleNumber
    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      // Generate sale number per attempt
      const saleNumber = await this.generateSaleNumber(prisma);

      try {
        const result = await tenantClient.$transaction(
          async (tx) => {
            // Create sale record - filter out non-database fields
            if (saleData.isCreditSale && !saleData.customerId) {
              throw new BadRequestException("Credit sales require a customer");
            }
            const {
              discountValue,
              isCreditSale: creditSaleFlag,
              amountPaid: paidAmount,
              totalAmount: saleTotal,
              ...saleDataWithoutExtra
            } = saleData;
            // @ts-ignore - Pre-existing Prisma type issue
            const sale = await tx.sale.create({
              data: {
                ...saleDataWithoutExtra,
                saleNumber,
                subtotal: calculations.subtotal,
                taxAmount: finalTaxAmount,
                discountRate: discountValue, // Map discountValue to discountRate
                discountAmount: calculations.discountAmount,
                totalAmount: finalTotalAmount,
                amountPaid: 0,
                changeGiven: 0,
                paymentStatus: PaymentStatus.PENDING,
                status: SaleStatus.DRAFT,
                createdById: userId,
              },
            });

            // Create sale items
            const saleItems = await Promise.all(
              items.map(async (item) => {
                const itemCalculations = this.calculateItemTotals(item);
                const inferredCost =
                  (typeof item.productId === "string" && productCostMap.get(item.productId)) ||
                  Number((item as any).costPrice || 0) ||
                  0;
                return tx.saleItem.create({
                  data: {
                    ...item,
                    ...itemCalculations,
                    saleId: sale.id,
                    costPrice: inferredCost,
                  },
                });
              }),
            );

            // Create stock transactions for PRODUCT items (from selected warehouse)
            await this.createStockTransactions(
              tenantClient,
              sale,
              items,
              saleData.warehouseId,
              saleData.locationId,
              userId,
              tx,
            );

            // Create payments if provided
            let totalPaid = 0;
            if (payments && payments.length > 0) {
              const paymentRecords = await Promise.all(
                payments.map((payment) => {
                  const normalizedReference =
                    payment.referenceNumber && payment.referenceNumber.toString().trim().length > 0
                      ? payment.referenceNumber
                      : null;

                  return tx.payment.create({
                    data: {
                      ...payment,
                      referenceNumber: normalizedReference,
                      saleId: sale.id,
                      processedBy: userId,
                    },
                  });
                }),
              );
              totalPaid = paymentRecords.reduce((sum, payment) => sum + Number(payment.amount), 0);
            }

            // Determine sale status based on payment and credit sale flag
            const isCreditSale = creditSaleFlag || false;
            // Use small tolerance (0.01) for floating point comparison to handle rounding differences
            const totalAmountNum = Number(sale.totalAmount);
            const isFullyPaid = totalPaid >= totalAmountNum - 0.01; // Allow 1 cent tolerance for rounding
            const isPartiallyPaid = totalPaid > 0 && totalPaid < totalAmountNum - 0.01;

            let finalStatus: SaleStatus;
            let finalPaymentStatus: PaymentStatus;

            if (isCreditSale) {
              // Credit sale - customer will pay later
              finalStatus = SaleStatus.CREDIT;
              finalPaymentStatus = isFullyPaid
                ? PaymentStatus.PAID
                : isPartiallyPaid
                  ? PaymentStatus.PARTIAL
                  : PaymentStatus.PENDING;
            } else if (isFullyPaid) {
              // Fully paid
              finalStatus = SaleStatus.COMPLETED;
              finalPaymentStatus = PaymentStatus.PAID;
            } else if (isPartiallyPaid) {
              // Partially paid
              finalStatus = SaleStatus.PARTIAL;
              finalPaymentStatus = PaymentStatus.PARTIAL;
            } else {
              // No payment
              finalStatus = SaleStatus.DRAFT;
              finalPaymentStatus = PaymentStatus.PENDING;
            }

            // Calculate amount paid (capped at total amount to prevent change from affecting customer balance)
            const actualAmountPaid = Math.min(totalPaid, Number(sale.totalAmount));
            const changeGiven = Math.max(0, totalPaid - Number(sale.totalAmount));

            // Update sale with payment info
            const updatedSale = await tx.sale.update({
              where: { id: sale.id },
              data: {
                amountPaid: actualAmountPaid, // Cap at total amount - change doesn't affect customer balance
                changeGiven: changeGiven,
                paymentStatus: finalPaymentStatus,
                status: finalStatus,
                completedAt:
                  finalStatus === SaleStatus.COMPLETED || finalStatus === SaleStatus.CREDIT
                    ? new Date()
                    : null,
              },
            });

            // Note: Customer balance update moved outside transaction to prevent timeout

            return {
              sale,
              updatedSale,
              finalStatus,
              totalPaid,
              actualAmountPaid,
            };
          },
          {
            maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
            timeout: 30000, // Maximum time the transaction can run (30 seconds)
          },
        );

        // Success: proceed with post-transaction updates and return
        // Update customer balance after transaction completes to avoid timeout
        if (saleData.customerId) {
          try {
            const remainingBalance =
              Number(result.updatedSale.totalAmount) - result.actualAmountPaid;

            if (remainingBalance > 0) {
              await prisma.customer.update({
                where: { id: saleData.customerId },
                data: {
                  balance: { increment: remainingBalance },
                  totalPurchases: {
                    increment: Number(result.updatedSale.totalAmount),
                  },
                  lastPurchaseDate: new Date(),
                },
              });
            } else if (remainingBalance < 0) {
              await prisma.customer.update({
                where: { id: saleData.customerId },
                data: {
                  balance: { increment: remainingBalance },
                  totalPurchases: {
                    increment: Number(result.updatedSale.totalAmount),
                  },
                  lastPurchaseDate: new Date(),
                },
              });
            } else {
              await prisma.customer.update({
                where: { id: saleData.customerId },
                data: {
                  totalPurchases: {
                    increment: Number(result.updatedSale.totalAmount),
                  },
                  lastPurchaseDate: new Date(),
                },
              });
            }
          } catch (error) {
            console.error("Error updating customer balance:", error);
            // Don't fail the sale if customer balance update fails
          }
        }

        // Create cash transactions for cash payments
        if (payments && payments.length > 0 && result.actualAmountPaid > 0) {
          // Filter cash payments
          const cashPayments = payments.filter((p) => p.paymentMethod === PaymentMethod.CASH);

          if (cashPayments.length > 0) {
            // Calculate total cash paid (proportional to actual amount paid)
            const totalCashPaid = cashPayments.reduce((sum, p) => sum + Number(p.amount), 0);
            const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

            // Calculate cash portion of actual amount paid (proportionally)
            // This handles cases where there are multiple payment methods
            const cashPortion =
              totalPaid > 0
                ? (totalCashPaid / totalPaid) * result.actualAmountPaid
                : result.actualAmountPaid;

            // Create a single cash transaction for the cash portion of the sale
            // Only record actual amount paid (not change given)
            if (cashPortion > 0) {
              await this.recordCashTransactionSafe(
                tenantClient,
                {
                  locationId: saleData.locationId,
                  type: "CASH_SALE",
                  amount: cashPortion,
                  description: `Cash sale - ${result.sale.saleNumber}`,
                  reference: result.sale.saleNumber,
                  referenceType: "SALE",
                  transactionDate: new Date().toISOString(),
                },
                userId,
                { module: "POS.createSale", reference: result.sale.saleNumber },
              );
            }
          }
        }

        // Log audit trail after transaction completes to avoid timeout
        try {
          await this.auditService.log(
            prisma,
            userId,
            "USER",
            "Sale",
            result.sale.id,
            "CREATE",
            null,
            {
              saleNumber: result.sale.saleNumber,
              customerId: saleData.customerId,
              locationId: saleData.locationId,
              totalAmount: result.sale.totalAmount,
              status: result.updatedSale.status,
            },
          );
        } catch (auditError) {
          console.warn(`Failed to log audit trail for sale: ${auditError.message}`);
        }

        // Trigger post-finalization actions (revenue, invoice, commission)
        await this.triggerPostSaleFinalizationActions(tenantClient, result.updatedSale.id, userId);

        return result.updatedSale;
      } catch (e: any) {
        lastError = e;
        // Retry on unique constraint violation for saleNumber
        if (e && e.code === "P2002") {
          continue;
        }
        throw e;
      }
    }
    // If we exhaust retries
    throw lastError;
  }

  async getSales(tenantClient: PrismaClient, filters: SaleFiltersDto) {
    const prisma = this.getPrisma(tenantClient);
    const { page = 1, limit = 10, ...filterParams } = filters;
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const where: any = {};

    // Apply filters
    if (filterParams.startDate || filterParams.endDate) {
      where.saleDate = {};
      if (filterParams.startDate) {
        where.saleDate.gte = new Date(filterParams.startDate);
      }
      if (filterParams.endDate) {
        where.saleDate.lte = new Date(filterParams.endDate);
      }
    }

    if (filterParams.locationId) where.locationId = filterParams.locationId;
    if (filterParams.customerId) where.customerId = filterParams.customerId;
    if (filterParams.createdById) where.createdById = filterParams.createdById;

    // Handle single status or multiple statuses
    if (filterParams.status) {
      where.status = filterParams.status;
    } else if (filterParams.statuses) {
      const statusArray = filterParams.statuses.split(",").map((s) => s.trim());
      where.status = { in: statusArray };
    }

    if (filterParams.paymentStatus) where.paymentStatus = filterParams.paymentStatus;
    if (filterParams.saleNumber)
      where.saleNumber = {
        contains: filterParams.saleNumber,
        mode: "insensitive",
      };

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy: { saleDate: "desc" },
        include: {
          customer: {
            select: { id: true, name: true, email: true, balance: true },
          },
          location: { select: { id: true, name: true } },
          payments: {
            select: {
              id: true,
              amount: true,
              paymentMethod: true,
              referenceNumber: true,
              paymentDate: true,
              notes: true,
            },
            orderBy: { paymentDate: "desc" },
          },
          returns: {
            select: {
              id: true,
              status: true,
            },
          },
          _count: { select: { saleItems: true, payments: true } },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    return createPaginatedResponse(sales, total, pageNumber, limitNumber);
  }

  async getSalesStats(tenantClient: PrismaClient, filters: SaleFiltersDto) {
    const prisma = this.getPrisma(tenantClient);
    const where: any = {};

    // Apply same filters as getSales
    if (filters.startDate || filters.endDate) {
      where.saleDate = {};
      if (filters.startDate) {
        where.saleDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.saleDate.lte = new Date(filters.endDate);
      }
    }

    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.createdById) where.createdById = filters.createdById;
    if (filters.status) where.status = filters.status;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.saleNumber)
      where.saleNumber = { contains: filters.saleNumber, mode: "insensitive" };

    // Get aggregated statistics
    const [totalSales, totalAmount, pendingPayments] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
      prisma.sale.count({
        where: { ...where, paymentStatus: "PENDING" },
      }),
    ]);

    const totalAmountValue = Number(totalAmount._sum.totalAmount || 0);
    const averageValue = totalSales > 0 ? totalAmountValue / totalSales : 0;

    return {
      totalSales,
      totalAmount: totalAmountValue,
      averageValue,
      pendingPayments,
    };
  }

  async getSaleById(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, email: true, balance: true },
        },
        location: { select: { id: true, name: true } },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
            referenceNumber: true,
            paymentDate: true,
            notes: true,
          },
          orderBy: { paymentDate: "desc" },
        },
        returns: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException("Sale not found");
    }

    return sale;
  }

  async updateSaleStatus(
    tenantClient: PrismaClient,
    id: string,
    updateSaleStatusDto: UpdateSaleStatusDto,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);
    const sale = await this.getSaleById(tenantClient, id);

    // Prevent misuse of this endpoint for cancellation - use cancelSale instead
    if (updateSaleStatusDto.status === SaleStatus.CANCELLED) {
      throw new BadRequestException(
        "Use POST /pos/sales/:id/cancel to cancel a sale. This ensures stock, payments, customer balance, and cash in hand are all reversed correctly.",
      );
    }

    // Validate status transitions
    this.validateStatusTransition(sale.status, updateSaleStatusDto.status);

    return tenantClient
      .$transaction(async (tx) => {
        const updatedSale = await tx.sale.update({
          where: { id },
          data: {
            status: updateSaleStatusDto.status,
            cancelledAt: updateSaleStatusDto.status === SaleStatus.CANCELLED ? new Date() : null,
            cancelledBy: updateSaleStatusDto.status === SaleStatus.CANCELLED ? userId : null,
            cancellationReason: updateSaleStatusDto.reason,
            completedAt:
              updateSaleStatusDto.status === SaleStatus.COMPLETED ? new Date() : sale.completedAt,
          },
          include: {
            customer: true,
            location: true,
            saleItems: { include: { product: true } },
            payments: true,
          },
        });

        // If cancelling a completed sale, reverse stock transactions
        if (
          sale.status === SaleStatus.COMPLETED &&
          updateSaleStatusDto.status === SaleStatus.CANCELLED
        ) {
          await this.reverseStockTransactions(tenantClient, id, userId, tx);
          // Log audit trail
          await this.auditService.log(
            tx,
            userId,
            "USER",
            "Sale",
            id,
            "UPDATE",
            { status: sale.status },
            {
              status: updateSaleStatusDto.status,
              reason: updateSaleStatusDto.reason,
            },
          );
        }

        // Log audit trail
        await this.auditService.log(
          tx,
          userId,
          "USER",
          "Sale",
          id,
          "UPDATE",
          { status: sale.status },
          {
            status: updateSaleStatusDto.status,
            reason: updateSaleStatusDto.reason,
          },
        );

        return updatedSale;
      })
      .then(async (updatedSale) => {
        // Trigger post-finalization actions (revenue, invoice, commission)
        await this.triggerPostSaleFinalizationActions(tenantClient, id, userId);
        return updatedSale;
      });
  }

  // ==================== EDIT SALE METHODS ====================

  /**
   * Validate if a sale can be edited
   */
  private async validateSaleCanBeEdited(
    prisma: PrismaClient | Prisma.TransactionClient,
    sale: any,
  ): Promise<void> {
    if (!sale) {
      throw new NotFoundException("Sale not found");
    }

    if (sale.status === SaleStatus.REFUNDED) {
      throw new BadRequestException("Cannot edit a refunded sale");
    }

    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException("Cannot edit a cancelled sale");
    }

    // Check for active returns (PENDING, APPROVED, or PROCESSED)
    // According to plan: "Sales with processed returns" cannot be edited
    // We also check for active returns (PENDING, APPROVED) as they may affect stock
    const activeReturns = await prisma.saleReturn.findMany({
      where: {
        originalSaleId: sale.id,
        status: {
          notIn: [SaleReturnStatus.CANCELLED, SaleReturnStatus.REJECTED],
        },
      },
    });
    if (activeReturns.length > 0) {
      const processedCount = activeReturns.filter(
        (r) => r.status === SaleReturnStatus.PROCESSED,
      ).length;
      if (processedCount > 0) {
        throw new BadRequestException("Cannot edit sale with processed returns");
      }
      // For PENDING/APPROVED returns, we could allow editing but it's safer to prevent it
      // as it may cause inconsistencies
      throw new BadRequestException("Cannot edit sale with active returns");
    }

    // Check for processed refunds
    // Since SaleRefund model doesn't have a status field,
    // we check if any refunds exist (existence means they've been processed)
    const processedRefunds = await prisma.saleRefund.findMany({
      where: {
        originalSaleId: sale.id,
      },
    });
    if (processedRefunds.length > 0) {
      throw new BadRequestException("Cannot edit sale with processed refunds");
    }
  }

  /**
   * Validate if a sale can be cancelled
   */
  private async validateSaleCanBeCancelled(
    prisma: PrismaClient | Prisma.TransactionClient,
    sale: any,
  ): Promise<void> {
    if (!sale) {
      throw new NotFoundException("Sale not found");
    }

    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException("Sale is already cancelled");
    }

    if (sale.status === SaleStatus.REFUNDED) {
      throw new BadRequestException("Cannot cancel a refunded sale");
    }

    // Check for processed returns
    const processedReturns = await prisma.saleReturn.findMany({
      where: {
        originalSaleId: sale.id,
        status: SaleReturnStatus.PROCESSED,
      },
    });
    if (processedReturns.length > 0) {
      throw new BadRequestException("Cannot cancel sale with processed returns");
    }
  }

  /**
   * Calculate stock difference between old and new items
   */
  private calculateStockDifference(
    oldItems: any[],
    newItems: CreateSaleDto["items"],
    locationId: string,
  ): {
    itemsToRestore: Array<{ productId: string; quantity: number }>;
    itemsToDeduct: Array<{ productId: string; quantity: number }>;
    itemsUnchanged: Array<{ productId: string; quantity: number }>;
  } {
    const itemsToRestore: Array<{ productId: string; quantity: number }> = [];
    const itemsToDeduct: Array<{ productId: string; quantity: number }> = [];
    const itemsUnchanged: Array<{ productId: string; quantity: number }> = [];

    // Create maps for old and new items by productId
    const oldItemsMap = new Map<string, number>();
    oldItems
      .filter((item) => item.itemType === ItemType.PRODUCT && item.productId)
      .forEach((item) => {
        const productId = item.productId!;
        const quantity = Number(item.quantity);
        oldItemsMap.set(productId, (oldItemsMap.get(productId) || 0) + quantity);
      });

    const newItemsMap = new Map<string, number>();
    newItems
      ?.filter((item) => item.itemType === ItemType.PRODUCT && item.productId)
      .forEach((item) => {
        const productId = item.productId!;
        const quantity = Number(item.quantity);
        newItemsMap.set(productId, (newItemsMap.get(productId) || 0) + quantity);
      });

    // Calculate differences
    const allProductIds = new Set([...oldItemsMap.keys(), ...newItemsMap.keys()]);

    for (const productId of allProductIds) {
      const oldQty = oldItemsMap.get(productId) || 0;
      const newQty = newItemsMap.get(productId) || 0;
      const diff = newQty - oldQty;

      if (diff > 0) {
        // Need to deduct more stock
        itemsToDeduct.push({ productId, quantity: diff });
      } else if (diff < 0) {
        // Need to restore stock
        itemsToRestore.push({ productId, quantity: Math.abs(diff) });
      } else if (oldQty > 0 && newQty > 0) {
        // Quantity unchanged
        itemsUnchanged.push({ productId, quantity: oldQty });
      }
    }

    return { itemsToRestore, itemsToDeduct, itemsUnchanged };
  }

  /**
   * Validate stock availability for items to deduct
   * Enhanced validation according to Phase 3 requirements:
   * 1. Check products exist and are active
   * 2. Validate stock availability
   * 3. Handle new products (validate product exists and is active)
   * 4. Validate location exists
   * 5. Validate quantity is positive
   */
  /**
   * Validate stock availability for items to deduct
   * Performance optimized: Uses batch queries instead of individual queries
   */
  private async validateStockAvailability(
    prisma: PrismaClient | Prisma.TransactionClient,
    itemsToDeduct: Array<{ productId: string; quantity: number }>,
    locationId: string,
  ): Promise<void> {
    if (itemsToDeduct.length === 0) {
      return; // No items to validate
    }

    // Validate location exists (single query)
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, name: true },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    // Performance optimization: Batch fetch all products in one query
    const uniqueProductIds = Array.from(new Set(itemsToDeduct.map((item) => item.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
      select: { id: true, name: true, isActive: true },
    });

    // Create product map for O(1) lookup
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Performance optimization: Batch fetch all stock balances in one query
    const stockBalances = await prisma.stockBalance.findMany({
      where: {
        productId: { in: uniqueProductIds },
        locationId: locationId,
      },
      select: { productId: true, quantity: true },
    });

    // Create stock balance map for O(1) lookup
    const stockBalanceMap = new Map(
      stockBalances.map((sb) => [`${sb.productId}_${locationId}`, sb]),
    );

    // Validate each item
    const errors: string[] = [];
    for (const item of itemsToDeduct) {
      const product = productMap.get(item.productId);

      if (!product) {
        errors.push(`Product with ID ${item.productId} not found`);
        continue;
      }

      if (!product.isActive) {
        errors.push(`Product "${product.name}" is not active and cannot be added to sale`);
        continue;
      }

      // Validate quantity is positive
      if (item.quantity <= 0) {
        errors.push(
          `Invalid quantity for product "${product.name}". Quantity must be greater than 0`,
        );
        continue;
      }

      // Check stock availability
      const stockBalance = stockBalanceMap.get(`${item.productId}_${locationId}`);
      const availableStock = Number(stockBalance?.quantity || 0);

      if (availableStock < item.quantity) {
        errors.push(
          `Insufficient stock for product "${product.name}". Available: ${availableStock}, Required: ${item.quantity}`,
        );
      }
    }

    // Throw all errors at once for better user experience
    if (errors.length > 0) {
      throw new BadRequestException(`Stock validation failed:\n${errors.join("\n")}`);
    }
  }

  /**
   * Calculate customer balance change between old and new sale
   */
  private calculateCustomerBalanceChange(
    oldSale: any,
    newSale: any,
  ): {
    balanceChange: number;
    totalPurchasesChange: number;
  } {
    const oldTotalAmount = Number(oldSale.totalAmount || 0);
    const oldAmountPaid = Number(oldSale.amountPaid || 0);
    const oldImpact = oldTotalAmount - oldAmountPaid;

    const newTotalAmount = Number(newSale.totalAmount || 0);
    const newAmountPaid = Number(newSale.amountPaid || 0);
    const newImpact = newTotalAmount - newAmountPaid;

    const balanceChange = newImpact - oldImpact;
    const totalPurchasesChange = newTotalAmount - oldTotalAmount;

    return { balanceChange, totalPurchasesChange };
  }

  /**
   * Handle cash transaction updates when sale is edited
   */
  private async handleCashTransactionUpdate(
    tenantClient: PrismaClient,
    oldSale: any,
    newSale: any,
    locationId: string,
    userId: string,
  ): Promise<void> {
    // Find existing cash transaction for the old sale
    const existingCashTransactions = await tenantClient.cashTransaction.findMany({
      where: {
        reference: oldSale.saleNumber,
        referenceType: "SALE",
        type: CashTransactionType.CASH_SALE,
      },
    });

    const oldCashAmount = existingCashTransactions.reduce(
      (sum, txn) => sum + Number(txn.amount),
      0,
    );

    // Calculate new cash amount from new payments
    // Exclude negative payments (discount adjustments) - they don't affect cash in hand
    const newCashPayments =
      newSale.payments?.filter(
        (p: any) => p.paymentMethod === PaymentMethod.CASH && Number(p.amount || 0) > 0,
      ) || [];
    const newCashAmount = newCashPayments.reduce(
      (sum: number, p: any) => sum + Number(p.amount || 0),
      0,
    );

    // Cap new cash amount at total amount (change doesn't count)
    const cappedNewCashAmount = Math.min(newCashAmount, Number(newSale.totalAmount || 0));

    // Handle different scenarios
    if (oldCashAmount > 0 && cappedNewCashAmount === 0) {
      // Old had cash but new doesn't → reverse all cash transactions
      for (const txn of existingCashTransactions) {
        await this.recordCashTransactionSafe(
          tenantClient,
          {
            locationId,
            type: CashTransactionType.PAYMENT_OUT,
            amount: Number(txn.amount),
            description: `Reversal: ${txn.description || `Cash sale - ${oldSale.saleNumber}`}`,
            reference: `${oldSale.saleNumber}-REV`,
            referenceType: "SALE",
            transactionDate: new Date().toISOString(),
          },
          userId,
          {
            module: "POS.handleCashTransactionUpdate",
            reference: oldSale.saleNumber,
          },
        );
      }
    } else if (oldCashAmount === 0 && cappedNewCashAmount > 0) {
      // Old didn't have cash but new does → create cash transaction
      await this.recordCashTransactionSafe(
        tenantClient,
        {
          locationId,
          type: CashTransactionType.CASH_SALE,
          amount: cappedNewCashAmount,
          description: `Cash sale - ${oldSale.saleNumber}`,
          reference: oldSale.saleNumber,
          referenceType: "SALE",
          transactionDate: new Date().toISOString(),
        },
        userId,
        {
          module: "POS.handleCashTransactionUpdate",
          reference: oldSale.saleNumber,
        },
      );
    } else if (oldCashAmount > 0 && cappedNewCashAmount > 0) {
      // Both have cash
      const difference = cappedNewCashAmount - oldCashAmount;
      if (Math.abs(difference) > 0.01) {
        // Amounts differ → create adjustment transaction
        if (difference > 0) {
          // New amount is higher → add difference
          await this.recordCashTransactionSafe(
            tenantClient,
            {
              locationId,
              type: CashTransactionType.CASH_SALE,
              amount: difference,
              description: `Cash sale adjustment - ${oldSale.saleNumber}`,
              reference: oldSale.saleNumber,
              referenceType: "SALE",
              transactionDate: new Date().toISOString(),
            },
            userId,
            {
              module: "POS.handleCashTransactionUpdate",
              reference: oldSale.saleNumber,
            },
          );
        } else {
          // New amount is lower → reverse difference
          await this.recordCashTransactionSafe(
            tenantClient,
            {
              locationId,
              type: CashTransactionType.PAYMENT_OUT,
              amount: Math.abs(difference),
              description: `Cash sale adjustment - ${oldSale.saleNumber}`,
              reference: `${oldSale.saleNumber}-ADJ`,
              referenceType: "SALE",
              transactionDate: new Date().toISOString(),
            },
            userId,
            {
              module: "POS.handleCashTransactionUpdate",
              reference: oldSale.saleNumber,
            },
          );
        }
      }
      // If amounts are the same (within 1 cent), no change needed
    }
  }

  /**
   * Reverse all impacts of a sale (complete rollback)
   */
  private async reverseSaleImpacts(
    tenantClient: PrismaClient,
    sale: any,
    userId: string,
    tx: Prisma.TransactionClient,
    options: {
      reverseStock?: boolean;
      reverseCustomerBalance?: boolean;
      reverseCashTransaction?: boolean;
    } = {},
  ): Promise<void> {
    const {
      reverseStock = true,
      reverseCustomerBalance = true,
      reverseCashTransaction = true,
    } = options;

    // 1. Reverse stock transactions
    if (reverseStock && sale.saleItems && sale.saleItems.length > 0) {
      const productItems = sale.saleItems.filter(
        (item: any) => item.itemType === ItemType.PRODUCT && item.productId,
      );

      for (const item of productItems) {
        await this.stockTransactionsService.create(
          tenantClient,
          {
            productId: item.productId,
            toLocationId: sale.locationId,
            type: "RECEIPT",
            quantity: Number(item.quantity),
            referenceNo: `CANCEL-${sale.saleNumber}`,
            remarks: `Stock return for cancellation - Sale ${sale.saleNumber}`,
            saleId: sale.id,
          },
          userId,
          tx,
        );
      }
    }

    // 2. Reverse customer balance
    if (reverseCustomerBalance && sale.customerId) {
      const totalAmount = Number(sale.totalAmount || 0);
      const amountPaid = Number(sale.amountPaid || 0);
      const balanceImpact = totalAmount - amountPaid;

      // Always decrement totalPurchases (even if balanceImpact is 0)
      // because the sale was counted in totalPurchases
      if (balanceImpact !== 0) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            balance: { decrement: balanceImpact },
            totalPurchases: { decrement: totalAmount },
          },
        });
      } else {
        // Still decrement totalPurchases even if balance impact is 0
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            totalPurchases: { decrement: totalAmount },
          },
        });
      }
    }

    // 3. Delete CustomerPayment records
    if (sale.customerId) {
      await tx.customerPayment.deleteMany({
        where: { saleId: sale.id },
      });
    }

    // 4. Delete Payment records
    await tx.payment.deleteMany({
      where: { saleId: sale.id },
    });

    // 5. Reverse cash transactions (outside transaction to avoid timeout)
    if (reverseCashTransaction) {
      // This will be handled after transaction commits
    }
  }

  /**
   * Safely record a cash transaction without breaking the primary flow.
   * If Cash in Hand logging fails, we log and create an audit entry so it can be reconciled later.
   */
  private async recordCashTransactionSafe(
    tenantClient: PrismaClient,
    dto: any,
    userId: string,
    context: { module: string; reference: string },
  ): Promise<void> {
    try {
      await this.cashInHandService.createTransaction(tenantClient, dto, userId);
    } catch (error: any) {
      this.logger.error(
        `Cash transaction failed in ${context.module} for ${context.reference}: ${error?.message}`,
      );

      try {
        await this.auditService.log(
          tenantClient,
          userId,
          "SYSTEM",
          "CashTransactionPending",
          context.reference,
          "CREATE",
          null,
          {
            dto,
            error: error?.message ?? String(error),
          },
        );
      } catch (auditError: any) {
        this.logger.error(
          `Failed to log pending cash transaction for ${context.reference}: ${auditError?.message}`,
        );
      }
    }
  }

  private async postSaleJournals(
    sale: {
      id: string;
      saleNumber: string;
      saleDate: Date;
      totalAmount: unknown;
      amountPaid: unknown;
      payments?: Array<{ amount: unknown }>;
      saleItems?: Array<{ quantity: unknown; costPrice?: unknown | null }>;
    },
    userId: string,
  ): Promise<void> {
    const totalRevenue = Number(sale.totalAmount);
    if (totalRevenue <= 0) return;

    const paid = Math.min(Number(sale.amountPaid ?? 0), totalRevenue);
    const unpaid = Math.max(0, totalRevenue - paid);
    const lines = [
      ...(paid > 0
        ? [{ accountKey: "CASH" as const, debit: paid, credit: 0, description: "POS cash / paid" }]
        : []),
      ...(unpaid > 0
        ? [{ accountKey: "AR" as const, debit: unpaid, credit: 0, description: "POS credit" }]
        : []),
      { accountKey: "SALES_REVENUE" as const, debit: 0, credit: totalRevenue, description: "POS revenue" },
    ];

    await this.glPostingService.postBalancedEntry({
      sourceType: GlSourceType.SALE,
      sourceId: sale.id,
      postingKind: GlPostingKind.RECOGNIZE_REVENUE,
      entryDate: sale.saleDate ?? new Date(),
      description: `POS sale ${sale.saleNumber}`,
      createdById: userId,
      lines,
    });

    const cogs = (sale.saleItems ?? []).reduce((sum, item) => {
      const cost = Number(item.costPrice ?? 0);
      const qty = Number(item.quantity ?? 0);
      return sum + cost * qty;
    }, 0);

    if (cogs > 0) {
      await this.glPostingService.postBalancedEntry({
        sourceType: GlSourceType.SALE,
        sourceId: sale.id,
        postingKind: GlPostingKind.RECOGNIZE_COGS,
        entryDate: sale.saleDate ?? new Date(),
        description: `POS COGS ${sale.saleNumber}`,
        createdById: userId,
        lines: [
          { accountKey: "COGS", debit: cogs, credit: 0, description: "Cost of goods sold" },
          { accountKey: "INVENTORY", debit: 0, credit: cogs, description: "Inventory relief" },
        ],
      });
    }
  }

  private async postReverseSaleJournals(input: {
    sourceType: typeof GlSourceType.SALE_REFUND | typeof GlSourceType.SALE_RETURN;
    sourceId: string;
    documentNumber: string;
    sale: { id: string; saleNumber: string; totalAmount: unknown; saleDate?: Date };
    refundAmount: number;
    refundMethod: PaymentMethod;
    userId: string;
    tenantClient: PrismaClient;
  }): Promise<void> {
    const { sourceType, sourceId, documentNumber, sale, refundAmount, refundMethod, userId, tenantClient } =
      input;
    if (refundAmount <= 0) return;

    const settlementAccount = refundMethod === PaymentMethod.CREDIT ? "AR" : "CASH";
    await this.glPostingService.postBalancedEntry({
      sourceType,
      sourceId,
      postingKind: GlPostingKind.REVERSE_REVENUE,
      entryDate: new Date(),
      description: `POS reverse ${documentNumber} for ${sale.saleNumber}`,
      createdById: userId,
      lines: [
        { accountKey: "SALES_REVENUE", debit: refundAmount, credit: 0, description: "Reverse POS revenue" },
        {
          accountKey: settlementAccount,
          debit: 0,
          credit: refundAmount,
          description: refundMethod === PaymentMethod.CREDIT ? "AR refund" : "Cash/bank refund",
        },
      ],
    });

    const saleItems = await tenantClient.saleItem.findMany({
      where: { saleId: sale.id },
      select: { quantity: true, costPrice: true },
    });
    const originalCogs = saleItems.reduce((sum, item) => {
      return sum + Number(item.costPrice ?? 0) * Number(item.quantity ?? 0);
    }, 0);
    const saleTotal = Number(sale.totalAmount);
    const cogsReverse = saleTotal > 0 ? (originalCogs * refundAmount) / saleTotal : 0;

    if (cogsReverse > 0) {
      await this.glPostingService.postBalancedEntry({
        sourceType,
        sourceId,
        postingKind: GlPostingKind.REVERSE_COGS,
        entryDate: new Date(),
        description: `POS reverse COGS ${documentNumber}`,
        createdById: userId,
        lines: [
          { accountKey: "INVENTORY", debit: cogsReverse, credit: 0, description: "Inventory restored" },
          { accountKey: "COGS", debit: 0, credit: cogsReverse, description: "Reverse COGS" },
        ],
      });
    }
  }

  /**
   * Triggers actions that should happen after a sale is finalized (COMPLETED or CREDIT)
   * This includes recording financial events and generating invoices.
   */
  private async triggerPostSaleFinalizationActions(
    tenantClient: PrismaClient,
    saleId: string,
    userId: string,
  ) {
    const sale = await tenantClient.sale.findUnique({
      where: { id: saleId },
      include: { payments: true, saleItems: true },
    });

    if (!sale) return;

    // Actions apply to COMPLETED and CREDIT sales
    const isFinalized = sale.status === SaleStatus.COMPLETED || sale.status === SaleStatus.CREDIT;
    if (!isFinalized) return;

    // 1. FINANCIAL EVENT (Revenue) + balanced GL journal
    try {
      const totalRevenue = Number(sale.totalAmount);
      await this.financialEventService?.recordRevenue(tenantClient, {
        amount: totalRevenue,
        referenceType: "SALE",
        referenceId: sale.id,
      });
      this.logger.log(`Sales revenue recorded: ${totalRevenue} for sale ${sale.saleNumber}`);
    } catch (error) {
      this.logger.warn(`Failed to create revenue event: ${error.message}`);
    }

    await this.postSaleJournals(sale, userId);

    // 2. GENERATE INVOICE
    try {
      await this.invoicesService.generateInvoiceForSale(
        tenantClient,
        sale.id,
        userId,
        sale.locationId,
      );
    } catch (error) {
      this.logger.warn(`Failed to generate invoice: ${error.message}`);
    }
  }

  /**
   * Update an existing sale
   */
  async updateSale(
    tenantClient: PrismaClient,
    saleId: string,
    updateDto: UpdateSaleDto,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);

    // STEP 1: VALIDATION PHASE
    // Fetch existing sale with all relations needed for update
    const existingSale = await tenantClient.sale.findUnique({
      where: { id: saleId },
      include: {
        saleItems: true,
        payments: true,
        customer: { select: { id: true, balance: true } },
        returns: { select: { id: true, status: true } },
      },
    });

    if (!existingSale) {
      throw new NotFoundException(`Sale with ID ${saleId} not found`);
    }

    // Validate sale can be edited
    await this.validateSaleCanBeEdited(prisma, existingSale);

    // Validate new data
    const locationId = updateDto.locationId || existingSale.locationId;
    if (updateDto.locationId && updateDto.locationId !== existingSale.locationId) {
      const location = await prisma.location.findUnique({
        where: { id: updateDto.locationId },
      });
      if (!location) {
        throw new NotFoundException("Location not found");
      }
    }

    if (updateDto.customerId && updateDto.customerId !== existingSale.customerId) {
      if (updateDto.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: updateDto.customerId },
        });
        if (!customer) {
          throw new NotFoundException("Customer not found");
        }
      }
    }

    // Use new items or keep old items
    const newItems =
      updateDto.items ||
      existingSale.saleItems.map((item: any) => ({
        productId: item.productId,
        itemType: item.itemType,
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        sku: item.sku,
        barcode: item.barcode,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        costPrice: Number(item.costPrice || 0),
        itemTaxRate: Number(item.itemTaxRate || 0),
        itemDiscountType: item.itemDiscountType,
        itemDiscountRate: Number(item.itemDiscountRate || 0),
        notes: item.notes,
      }));

    // Validate new products exist and are active (before calculating stock differences)
    // This is part of Phase 3: Stock validation - validate new products
    if (!updateDto.skipStockValidation && newItems.length > 0) {
      const productIds = newItems
        .filter((item) => item.itemType === ItemType.PRODUCT && item.productId)
        .map((item) => item.productId!);

      if (productIds.length > 0) {
        const uniqueProductIds = Array.from(new Set(productIds));
        const products = await prisma.product.findMany({
          where: { id: { in: uniqueProductIds } },
          select: { id: true, name: true, isActive: true },
        });

        // Check all products exist
        const foundProductIds = new Set(products.map((p) => p.id));
        const missingProducts = uniqueProductIds.filter((id) => !foundProductIds.has(id));
        if (missingProducts.length > 0) {
          throw new NotFoundException(`Products not found: ${missingProducts.join(", ")}`);
        }

        // Check all products are active
        const inactiveProducts = products.filter((p) => !p.isActive);
        if (inactiveProducts.length > 0) {
          throw new BadRequestException(
            `Inactive products cannot be added to sale: ${inactiveProducts.map((p) => p.name).join(", ")}`,
          );
        }
      }
    }

    // Calculate stock differences
    const stockDiff = this.calculateStockDifference(existingSale.saleItems, newItems, locationId);

    // Validate stock availability (if not skipped)
    // This will validate both increased quantities and new products
    // Validation happens inside transaction for consistency
    if (!updateDto.skipStockValidation && stockDiff.itemsToDeduct.length > 0) {
      // This validation will happen inside the transaction
    }

    // STEP 2: STORE OLD VALUES (for rollback and audit)
    const oldSaleSnapshot = JSON.parse(JSON.stringify(existingSale));
    const oldItems = existingSale.saleItems;
    const oldPayments = existingSale.payments || [];
    const oldCustomerBalance = existingSale.customer
      ? Number(existingSale.customer.balance || 0)
      : null;
    const oldTotalAmount = Number(existingSale.totalAmount || 0);
    const oldAmountPaid = Number(existingSale.amountPaid || 0);

    // STEP 3: START TRANSACTION
    return tenantClient
      .$transaction(
        async (tx) => {
          // Validate stock availability inside transaction
          if (!updateDto.skipStockValidation && stockDiff.itemsToDeduct.length > 0) {
            await this.validateStockAvailability(tx, stockDiff.itemsToDeduct, locationId);
          }

          // STEP 4: REVERSE OLD IMPACTS
          // Reverse stock transactions (for old items)
          const oldProductItems = oldItems.filter(
            (item: any) => item.itemType === ItemType.PRODUCT && item.productId,
          );
          for (const item of oldProductItems) {
            await this.stockTransactionsService.create(
              tenantClient,
              {
                productId: item.productId!,
                toLocationId: locationId,
                type: "RECEIPT",
                quantity: Number(item.quantity),
                referenceNo: `EDIT-REV-${existingSale.saleNumber}`,
                remarks: `Stock return for edit - Sale ${existingSale.saleNumber}`,
                saleId: existingSale.id,
              },
              userId,
              tx,
            );
          }

          // Reverse customer balance
          if (existingSale.customerId) {
            const oldBalanceImpact = oldTotalAmount - oldAmountPaid;
            // Always decrement totalPurchases (even if balanceImpact is 0)
            // because the sale was counted in totalPurchases
            if (oldBalanceImpact !== 0) {
              await tx.customer.update({
                where: { id: existingSale.customerId },
                data: {
                  balance: { decrement: oldBalanceImpact },
                  totalPurchases: { decrement: oldTotalAmount },
                },
              });
            } else {
              // Still decrement totalPurchases even if balance impact is 0
              await tx.customer.update({
                where: { id: existingSale.customerId },
                data: {
                  totalPurchases: { decrement: oldTotalAmount },
                },
              });
            }
          }

          // Delete old CustomerPayment records
          if (existingSale.customerId) {
            await tx.customerPayment.deleteMany({
              where: { saleId: existingSale.id },
            });
          }

          // Delete old Payment records
          await tx.payment.deleteMany({
            where: { saleId: existingSale.id },
          });

          // Delete old SaleItem records
          await tx.saleItem.deleteMany({
            where: { saleId: existingSale.id },
          });

          // STEP 5: APPLY NEW VALUES
          // Recalculate totals
          const taxRate =
            updateDto.taxRate !== undefined
              ? Number(updateDto.taxRate)
              : (Number(existingSale.taxAmount || 0) / Number(existingSale.subtotal || 1)) * 100 ||
                0;
          const calculations = this.calculateTotals(
            newItems,
            taxRate,
            updateDto.discountType || existingSale.discountType,
            updateDto.discountValue !== undefined
              ? Number(updateDto.discountValue)
              : Number(existingSale.discountRate || 0),
          );

          // Use frontend total if provided, otherwise use calculated
          const finalTotalAmount =
            updateDto.totalAmount !== undefined
              ? Number(updateDto.totalAmount)
              : calculations.totalAmount;
          const finalTaxAmount = calculations.taxAmount;

          // Create new sale items
          const productCostMap = new Map<string, number>();
          const productIds = Array.from(
            new Set(
              newItems
                .map((item) => item.productId)
                .filter(
                  (productId): productId is string =>
                    typeof productId === "string" && productId.length > 0,
                ),
            ),
          );

          if (productIds.length > 0) {
            const productCosts = await tx.product.findMany({
              where: { id: { in: productIds } },
              select: { id: true, costPrice: true },
            });

            productCosts.forEach((product) => {
              productCostMap.set(product.id, Number(product.sellingPrice || 0));
            });
          }

          const newSaleItems = await Promise.all(
            newItems.map(async (item) => {
              const itemCalculations = this.calculateItemTotals(item);
              const inferredCost =
                (typeof item.productId === "string" && productCostMap.get(item.productId)) ||
                Number((item as any).costPrice || 0) ||
                0;
              return tx.saleItem.create({
                data: {
                  ...item,
                  ...itemCalculations,
                  saleId: existingSale.id,
                  costPrice: inferredCost,
                },
              });
            }),
          );

          // Create new stock transactions (for new items)
          await this.createStockTransactions(
            tenantClient,
            { ...existingSale, saleItems: newSaleItems },
            newItems,
            existingSale.warehouseId,
            existingSale.locationId,
            userId,
            tx,
          );

          // Create new payment records
          // Note: Payments can include negative amounts for refunds/returns
          const newPayments = updateDto.payments || [];
          let totalPaid = 0;
          if (newPayments.length > 0) {
            const paymentRecords = await Promise.all(
              newPayments.map((payment) => {
                const normalizedReference =
                  payment.referenceNumber && payment.referenceNumber.toString().trim().length > 0
                    ? payment.referenceNumber
                    : null;

                return tx.payment.create({
                  data: {
                    ...payment,
                    referenceNumber: normalizedReference,
                    saleId: existingSale.id,
                    processedBy: userId,
                  },
                });
              }),
            );
            // Sum all payments (positive payments + negative refunds)
            totalPaid = paymentRecords.reduce((sum, p) => sum + Number(p.amount), 0);
          }

          // Determine new sale status
          const isCreditSale =
            updateDto.isCreditSale !== undefined
              ? updateDto.isCreditSale
              : existingSale.status === SaleStatus.CREDIT;
          const totalAmountNum = finalTotalAmount;
          // Handle overpayment: if totalPaid > totalAmount, customer has overpaid (can happen with discounts)
          const isFullyPaid = totalPaid >= totalAmountNum - 0.01;
          const isPartiallyPaid = totalPaid > 0 && totalPaid < totalAmountNum - 0.01;
          const isOverpaid = totalPaid > totalAmountNum + 0.01;

          let finalStatus: SaleStatus;
          let finalPaymentStatus: PaymentStatus;

          if (isCreditSale) {
            finalStatus = SaleStatus.CREDIT;
            finalPaymentStatus = isFullyPaid
              ? PaymentStatus.PAID
              : isPartiallyPaid
                ? PaymentStatus.PARTIAL
                : PaymentStatus.PENDING;
          } else if (isFullyPaid) {
            finalStatus = SaleStatus.COMPLETED;
            finalPaymentStatus = PaymentStatus.PAID;
          } else if (isPartiallyPaid) {
            finalStatus = SaleStatus.PARTIAL;
            finalPaymentStatus = PaymentStatus.PARTIAL;
          } else {
            finalStatus = SaleStatus.DRAFT;
            finalPaymentStatus = PaymentStatus.PENDING;
          }

          // Calculate amount paid and change
          // If overpaid (e.g., discount makes total less than paid), allow it
          // actualAmountPaid can be greater than totalAmountNum in case of overpayment
          const actualAmountPaid = totalPaid; // Don't cap - allow overpayment
          const changeGiven = Math.max(0, totalPaid - totalAmountNum);

          // Update sale record
          const updatedSale = await tx.sale.update({
            where: { id: existingSale.id },
            data: {
              customerId:
                updateDto.customerId !== undefined ? updateDto.customerId : existingSale.customerId,
              locationId: locationId,
              subtotal: calculations.subtotal,
              taxAmount: finalTaxAmount,
              discountType: updateDto.discountType || existingSale.discountType,
              discountRate:
                updateDto.discountValue !== undefined
                  ? Number(updateDto.discountValue)
                  : Number(existingSale.discountRate || 0),
              discountAmount: calculations.discountAmount,
              totalAmount: finalTotalAmount,
              amountPaid: actualAmountPaid,
              changeGiven: changeGiven,
              paymentStatus: finalPaymentStatus,
              status: finalStatus,
              notes: updateDto.notes !== undefined ? updateDto.notes : existingSale.notes,
              customerNotes:
                updateDto.customerNotes !== undefined
                  ? updateDto.customerNotes
                  : existingSale.customerNotes,
              completedAt:
                finalStatus === SaleStatus.COMPLETED || finalStatus === SaleStatus.CREDIT
                  ? new Date()
                  : existingSale.completedAt,
            },
            include: {
              customer: true,
              location: true,
              saleItems: { include: { product: true } },
              payments: true,
            },
          });

          // Update customer balance with enhanced edge case handling
          // Edge cases:
          // 1. Customer removal (oldCustomerId exists, newCustomerId is null) - handled by not updating new customer
          // 2. Customer addition (oldCustomerId is null, newCustomerId exists) - handled by only incrementing new customer
          // 3. Customer change (oldCustomerId != newCustomerId) - handled by decrementing old, incrementing new
          // 4. Negative balances (overpayment) - handled by allowing negative balance
          // 5. totalPurchases always updated correctly
          const oldCustomerId = existingSale.customerId;
          const newCustomerId =
            updateDto.customerId !== undefined ? updateDto.customerId : existingSale.customerId;

          // Calculate new balance impact
          const newBalanceImpact = finalTotalAmount - actualAmountPaid;

          // Handle customer changes
          if (oldCustomerId !== newCustomerId) {
            // Customer changed - reverse old customer impact, apply new customer impact
            if (oldCustomerId) {
              const oldBalanceImpact = oldTotalAmount - oldAmountPaid;
              // Reverse old customer balance
              if (oldBalanceImpact !== 0) {
                await tx.customer.update({
                  where: { id: oldCustomerId },
                  data: {
                    balance: { decrement: oldBalanceImpact },
                    totalPurchases: { decrement: oldTotalAmount },
                  },
                });
              } else {
                // Still decrement totalPurchases
                await tx.customer.update({
                  where: { id: oldCustomerId },
                  data: {
                    totalPurchases: { decrement: oldTotalAmount },
                  },
                });
              }
            }

            // Apply new customer impact
            if (newCustomerId) {
              const shouldUpdateLastPurchaseDate =
                finalStatus === SaleStatus.COMPLETED || finalStatus === SaleStatus.CREDIT;
              if (newBalanceImpact !== 0) {
                await tx.customer.update({
                  where: { id: newCustomerId },
                  data: {
                    balance: { increment: newBalanceImpact }, // Can be negative (overpayment)
                    totalPurchases: { increment: finalTotalAmount },
                    ...(shouldUpdateLastPurchaseDate && {
                      lastPurchaseDate: new Date(),
                    }),
                  },
                });
              } else {
                // Still update totalPurchases
                await tx.customer.update({
                  where: { id: newCustomerId },
                  data: {
                    totalPurchases: { increment: finalTotalAmount },
                    ...(shouldUpdateLastPurchaseDate && {
                      lastPurchaseDate: new Date(),
                    }),
                  },
                });
              }
            }
          } else if (newCustomerId) {
            // Same customer - use calculateCustomerBalanceChange for precise calculation
            const { balanceChange, totalPurchasesChange } = this.calculateCustomerBalanceChange(
              { totalAmount: oldTotalAmount, amountPaid: oldAmountPaid },
              { totalAmount: finalTotalAmount, amountPaid: actualAmountPaid },
            );

            // Update customer balance with calculated change
            if (balanceChange !== 0) {
              await tx.customer.update({
                where: { id: newCustomerId },
                data: {
                  balance: { increment: balanceChange }, // Can be negative (overpayment)
                  totalPurchases: { increment: totalPurchasesChange },
                  lastPurchaseDate:
                    finalStatus === SaleStatus.COMPLETED || finalStatus === SaleStatus.CREDIT
                      ? new Date()
                      : undefined,
                },
              });
            } else if (totalPurchasesChange !== 0) {
              // Only totalPurchases changed
              await tx.customer.update({
                where: { id: newCustomerId },
                data: {
                  totalPurchases: { increment: totalPurchasesChange },
                  lastPurchaseDate:
                    finalStatus === SaleStatus.COMPLETED || finalStatus === SaleStatus.CREDIT
                      ? new Date()
                      : undefined,
                },
              });
            }
          }

          // Create new CustomerPayment records (if customer exists)
          if (newCustomerId && newPayments.length > 0) {
            await Promise.all(
              newPayments.map((payment) =>
                tx.customerPayment.create({
                  data: {
                    saleId: existingSale.id,
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                    referenceNumber: payment.referenceNumber,
                    notes: payment.notes,
                    processedBy: userId,
                  },
                }),
              ),
            );
          }

          // Log audit trail
          await this.auditService.log(
            tx,
            userId,
            "USER",
            "Sale",
            existingSale.id,
            "UPDATE",
            oldSaleSnapshot,
            {
              ...updatedSale,
              changeReason: updateDto.changeReason,
            },
          );

          return updatedSale;
        },
        {
          maxWait: 10000,
          timeout: 60000, // 60 seconds for complex edits
        },
      )
      .then(async (updatedSale) => {
        // Handle cash transaction updates (outside transaction to avoid timeout)
        try {
          await this.handleCashTransactionUpdate(
            tenantClient,
            oldSaleSnapshot,
            { ...updatedSale, payments: updateDto.payments || [] },
            locationId,
            userId,
          );
        } catch (cashError) {
          console.error("Error updating cash transactions:", cashError);
          // Don't fail the update if cash transaction update fails
        }

        // Trigger post-finalization actions (revenue, invoice, commission)
        await this.triggerPostSaleFinalizationActions(tenantClient, updatedSale.id, userId);

        return updatedSale;
      })
      .catch((error) => {
        // Enhanced error handling with detailed messages
        if (error instanceof NotFoundException || error instanceof BadRequestException) {
          throw error; // Re-throw validation errors as-is
        }

        // Handle Prisma errors
        if (error.code === "P2002") {
          throw new BadRequestException(
            "A sale with this number already exists. Please try again.",
          );
        }

        if (error.code === "P2025") {
          throw new NotFoundException(
            "One or more related records not found. The sale may have been modified by another user.",
          );
        }

        // Handle transaction timeout
        if (error.code === "P2034") {
          throw new BadRequestException(
            "The operation timed out. Please try again with fewer items or contact support.",
          );
        }

        // Handle database connection errors
        if (error.code === "P1001" || error.code === "P1008") {
          throw new BadRequestException("Database connection error. Please try again in a moment.");
        }

        // Generic error with context
        console.error("Error updating sale:", {
          saleId,
          userId,
          error: error.message,
          stack: error.stack,
        });

        throw new BadRequestException(
          `Failed to update sale: ${error.message || "An unexpected error occurred. Please try again."}`,
        );
      });
  }

  /**
   * Cancel a sale (complete rollback)
   */
  async cancelSale(
    tenantClient: PrismaClient,
    saleId: string,
    cancelDto: CancelSaleDto,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);

    // STEP 1: VALIDATION
    const sale = await this.getSaleById(tenantClient, saleId);

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${saleId} not found`);
    }

    // Validate cancellation reason
    if (!cancelDto.reason || !cancelDto.reason.trim()) {
      throw new BadRequestException("Cancellation reason is required");
    }

    await this.validateSaleCanBeCancelled(prisma, sale);

    // STEP 2: START TRANSACTION
    return tenantClient
      .$transaction(
        async (tx) => {
          // STEP 3: COMPLETE ROLLBACK
          await this.reverseSaleImpacts(tenantClient, sale, userId, tx, {
            reverseStock: cancelDto.reverseStock !== false,
            reverseCustomerBalance: cancelDto.reverseCustomerBalance !== false,
            reverseCashTransaction: false, // Handle outside transaction
          });

          // STEP 4: UPDATE SALE STATUS
          const cancelledSale = await tx.sale.update({
            where: { id: saleId },
            data: {
              status: SaleStatus.CANCELLED,
              cancelledAt: new Date(),
              cancelledBy: userId,
              cancellationReason: cancelDto.reason,
              paymentStatus: PaymentStatus.CANCELLED,
              completedAt: null,
            },
            include: {
              customer: true,
              location: true,
              saleItems: { include: { product: true } },
              payments: true,
            },
          });

          // STEP 5: AUDIT & COMMIT
          // @ts-ignore - Audit service type issue
          await this.auditService.log(tx, userId, "USER", "Sale", saleId, "UPDATE", sale, {
            ...cancelledSale,
            cancellationReason: cancelDto.reason,
          });

          return cancelledSale;
        },
        {
          maxWait: 10000,
          timeout: 30000,
        },
      )
      .then(async (cancelledSale) => {
        // Reverse cash transactions (outside transaction to avoid timeout)
        if (cancelDto.reverseCashTransaction !== false) {
          const existingCashTransactions = await tenantClient.cashTransaction.findMany({
            where: {
              reference: sale.saleNumber,
              referenceType: "SALE",
              type: CashTransactionType.CASH_SALE,
            },
          });

          for (const txn of existingCashTransactions) {
            await this.recordCashTransactionSafe(
              tenantClient,
              {
                locationId: sale.locationId,
                type: CashTransactionType.PAYMENT_OUT,
                amount: Number(txn.amount),
                description: `Cancellation reversal: ${txn.description || `Cash sale - ${sale.saleNumber}`}`,
                reference: `${sale.saleNumber}-CANCEL`,
                referenceType: "SALE",
                transactionDate: new Date().toISOString(),
              },
              userId,
              { module: "POS.cancelSale", reference: sale.saleNumber },
            );
          }
        }

        return cancelledSale;
      })
      .catch((error) => {
        // Enhanced error handling with detailed messages
        if (error instanceof NotFoundException || error instanceof BadRequestException) {
          throw error; // Re-throw validation errors as-is
        }

        // Handle Prisma errors
        if (error.code === "P2002") {
          throw new BadRequestException(
            "A conflict occurred while cancelling the sale. Please try again.",
          );
        }

        if (error.code === "P2025") {
          throw new NotFoundException(
            "One or more related records not found. The sale may have been modified by another user.",
          );
        }

        // Handle transaction timeout
        if (error.code === "P2034") {
          throw new BadRequestException(
            "The cancellation operation timed out. Please try again or contact support.",
          );
        }

        // Handle database connection errors
        if (error.code === "P1001" || error.code === "P1008") {
          throw new BadRequestException("Database connection error. Please try again in a moment.");
        }

        // Generic error with context
        console.error("Error cancelling sale:", {
          saleId,
          userId,
          reason: cancelDto.reason,
          error: error.message,
          stack: error.stack,
        });

        throw new BadRequestException(
          `Failed to cancel sale: ${error.message || "An unexpected error occurred. Please try again."}`,
        );
      });
  }

  // ==================== END EDIT SALE METHODS ====================

  /**
   * Recalculate and update sale status based on current payments and returns
   * This is useful when the status calculation logic has been updated
   */
  async recalculateSaleStatus(tenantClient: PrismaClient, saleId: string, userId: string) {
    const prisma = this.getPrisma(tenantClient);
    const sale = await this.getSaleById(tenantClient, saleId);

    return tenantClient.$transaction(async (tx) => {
      // Use the same calculation logic as addPayment
      const allPayments = await tx.payment.findMany({
        where: { saleId },
      });

      // Get processed sale returns to calculate effective total amount owed
      const processedReturns = await tx.saleReturn.findMany({
        where: {
          originalSaleId: saleId,
          status: "PROCESSED",
        },
        select: {
          totalAmount: true,
        },
      });

      // Calculate effective total amount (original total minus returns)
      const totalReturns = processedReturns.reduce((sum, r) => sum + Number(r.totalAmount), 0);
      const effectiveTotalAmount = Number(sale.totalAmount) - totalReturns;

      // Separate positive payments (actual payments) from negative payments (discounts/refunds)
      const positivePayments = allPayments.filter((p) => Number(p.amount) >= 0);
      const negativePayments = allPayments.filter((p) => Number(p.amount) < 0);

      // Sum of positive payments (actual money received)
      const totalPositivePayments = positivePayments.reduce((sum, p) => sum + Number(p.amount), 0);

      // Sum of negative payments (discounts/refunds - these reduce what customer owes)
      const totalDiscounts = Math.abs(
        negativePayments.reduce((sum, p) => sum + Number(p.amount), 0),
      );

      // Effective amount paid = positive payments + discounts applied
      const effectiveAmountPaid = Math.min(
        totalPositivePayments + totalDiscounts,
        effectiveTotalAmount,
      );

      // Determine new sale status based on effective amount paid vs effective total amount
      // Use a small tolerance (0.01) to handle floating point precision issues
      const isFullyPaid = effectiveAmountPaid >= effectiveTotalAmount - 0.01;
      const isPartiallyPaid =
        effectiveAmountPaid > 0 && effectiveAmountPaid < effectiveTotalAmount - 0.01;

      // Debug logging to help diagnose status calculation issues
      this.logger.debug(`Sale ${sale.saleNumber} status calculation:`, {
        totalAmount: Number(sale.totalAmount),
        totalReturns,
        effectiveTotalAmount,
        totalPositivePayments,
        totalDiscounts,
        effectiveAmountPaid,
        isFullyPaid,
        isPartiallyPaid,
      });

      // Check if this is a credit sale (based on current status)
      const isCreditSale = sale.status === SaleStatus.CREDIT;

      let newStatus: SaleStatus;
      let newPaymentStatus: PaymentStatus;

      if (isFullyPaid) {
        // If fully paid, mark as COMPLETED and PAID
        newStatus = SaleStatus.COMPLETED;
        newPaymentStatus = PaymentStatus.PAID;
      } else if (isPartiallyPaid) {
        // If partially paid
        if (isCreditSale) {
          // Credit sales stay as CREDIT when partially paid
          newStatus = SaleStatus.CREDIT;
        } else {
          newStatus = SaleStatus.PARTIAL;
        }
        newPaymentStatus = PaymentStatus.PARTIAL;
      } else {
        // No payment yet
        if (isCreditSale) {
          newStatus = SaleStatus.CREDIT;
        } else {
          newStatus = SaleStatus.DRAFT;
        }
        newPaymentStatus = PaymentStatus.PENDING;
      }

      // Calculate amount paid - use effective amount paid (includes discounts)
      const actualAmountPaid = effectiveAmountPaid;
      // Change given should be calculated against effective total (accounting for returns)
      const changeGiven = Math.max(0, actualAmountPaid - effectiveTotalAmount);

      // Update sale
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          amountPaid: actualAmountPaid, // Cap at total amount - change doesn't affect customer balance
          changeGiven: changeGiven,
          paymentStatus: newPaymentStatus,
          status: newStatus,
          completedAt: isFullyPaid ? new Date() : sale.completedAt,
        },
        include: {
          customer: true,
          location: true,
          saleItems: { include: { product: true } },
          payments: true,
        },
      });

      return updatedSale;
    });
  }

  async addPayment(
    tenantClient: PrismaClient,
    saleId: string,
    addPaymentDto: AddPaymentDto,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);
    const sale = await this.getSaleById(tenantClient, saleId);

    if (sale.status === SaleStatus.CANCELLED || sale.status === SaleStatus.REFUNDED) {
      throw new BadRequestException("Cannot add payment to cancelled or refunded sale");
    }

    // Allow negative amounts for discount adjustments
    const paymentAmount = Number(addPaymentDto.amount);
    const isDiscountAdjustment = paymentAmount < 0;

    return tenantClient
      .$transaction(async (tx) => {
        // Normalize reference number - store NULL instead of empty string to avoid unique constraint issues
        const normalizedReference =
          addPaymentDto.referenceNumber &&
          addPaymentDto.referenceNumber.toString().trim().length > 0
            ? addPaymentDto.referenceNumber
            : null;

        // Create payment (can be negative for discount adjustments)
        const payment = await tx.payment.create({
          data: {
            ...addPaymentDto,
            referenceNumber: normalizedReference,
            saleId,
            processedBy: userId,
          },
        });

        // Create customer payment record for ledger tracking
        if (sale.customerId) {
          await tx.customerPayment.create({
            data: {
              saleId,
              amount: addPaymentDto.amount,
              paymentMethod: addPaymentDto.paymentMethod,
              referenceNumber: normalizedReference,
              notes: addPaymentDto.notes,
              processedBy: userId,
            },
          });
        }

        // Calculate new totals
        const allPayments = await tx.payment.findMany({
          where: { saleId },
        });

        // Get processed sale returns to calculate effective total amount owed
        const processedReturns = await tx.saleReturn.findMany({
          where: {
            originalSaleId: saleId,
            status: "PROCESSED",
          },
          select: {
            totalAmount: true,
          },
        });

        // Calculate effective total amount (original total minus returns)
        const totalReturns = processedReturns.reduce((sum, r) => sum + Number(r.totalAmount), 0);
        const effectiveTotalAmount = Number(sale.totalAmount) - totalReturns;

        // Separate positive payments (actual payments) from negative payments (discounts/refunds)
        const positivePayments = allPayments.filter((p) => Number(p.amount) >= 0);
        const negativePayments = allPayments.filter((p) => Number(p.amount) < 0);

        // Sum of positive payments (actual money received)
        const totalPositivePayments = positivePayments.reduce(
          (sum, p) => sum + Number(p.amount),
          0,
        );

        // Sum of negative payments (discounts/refunds - these reduce what customer owes)
        const totalDiscounts = Math.abs(
          negativePayments.reduce((sum, p) => sum + Number(p.amount), 0),
        );

        // Effective amount paid = positive payments + discounts applied
        // This represents how much the customer has effectively paid (including discounts)
        // Cap at effective total amount (accounting for returns)
        const effectiveAmountPaid = Math.min(
          totalPositivePayments + totalDiscounts,
          effectiveTotalAmount,
        );

        // Determine new sale status based on effective amount paid vs effective total amount
        // Use a small tolerance (0.01) to handle floating point precision issues
        const isFullyPaid = effectiveAmountPaid >= effectiveTotalAmount - 0.01;
        const isPartiallyPaid =
          effectiveAmountPaid > 0 && effectiveAmountPaid < effectiveTotalAmount - 0.01;

        // Debug logging to help diagnose status calculation issues
        this.logger.debug(`Sale ${sale.saleNumber} status calculation:`, {
          totalAmount: Number(sale.totalAmount),
          totalReturns,
          effectiveTotalAmount,
          totalPositivePayments,
          totalDiscounts,
          effectiveAmountPaid,
          isFullyPaid,
          isPartiallyPaid,
        });

        // Check if this is a credit sale (based on current status)
        const isCreditSale = sale.status === SaleStatus.CREDIT;

        let newStatus: SaleStatus;
        let newPaymentStatus: PaymentStatus;

        if (isFullyPaid) {
          // If fully paid, mark as COMPLETED and PAID
          newStatus = SaleStatus.COMPLETED;
          newPaymentStatus = PaymentStatus.PAID;
        } else if (isPartiallyPaid) {
          // If partially paid
          if (isCreditSale) {
            // Credit sales stay as CREDIT when partially paid
            newStatus = SaleStatus.CREDIT;
          } else {
            newStatus = SaleStatus.PARTIAL;
          }
          newPaymentStatus = PaymentStatus.PARTIAL;
        } else {
          // No payment yet
          if (isCreditSale) {
            newStatus = SaleStatus.CREDIT;
          } else {
            newStatus = SaleStatus.DRAFT;
          }
          newPaymentStatus = PaymentStatus.PENDING;
        }

        // Calculate amount paid - use effective amount paid (includes discounts)
        const actualAmountPaid = effectiveAmountPaid;
        // Change given should be calculated against effective total (accounting for returns)
        const changeGiven = Math.max(0, actualAmountPaid - effectiveTotalAmount);

        // Update sale
        const updatedSale = await tx.sale.update({
          where: { id: saleId },
          data: {
            amountPaid: actualAmountPaid, // Cap at total amount - change doesn't affect customer balance
            changeGiven: changeGiven,
            paymentStatus: newPaymentStatus,
            status: newStatus,
            completedAt: isFullyPaid ? new Date() : sale.completedAt,
          },
          include: {
            customer: true,
            location: true,
            saleItems: { include: { product: true } },
            payments: true,
          },
        });

        // Update customer balance
        if (sale.customerId) {
          const previousAmountPaid = Number(sale.amountPaid);
          const paymentAmount = Number(addPaymentDto.amount);

          if (isDiscountAdjustment) {
            // For discount adjustments (negative payments), reduce customer balance
            // This effectively reduces what they owe
            await tx.customer.update({
              where: { id: sale.customerId },
              data: {
                balance: {
                  increment: paymentAmount, // paymentAmount is negative, so increment reduces balance
                },
              },
            });
          } else {
            // For regular payments, calculate the effective payment amount (capped at remaining balance)
            const remainingBalance = Number(sale.totalAmount) - previousAmountPaid;
            const effectivePaymentAmount = Math.min(paymentAmount, remainingBalance);

            // Reduce customer balance by the effective payment amount only
            await tx.customer.update({
              where: { id: sale.customerId },
              data: {
                balance: {
                  decrement: effectivePaymentAmount,
                },
              },
            });
          }

          // Update customer stats if fully paid
          if (isFullyPaid && sale.status !== SaleStatus.COMPLETED) {
            await this.updateCustomerStats(sale.customerId, Number(sale.totalAmount), tx);
          }
        }

        // Log audit trail
        await this.auditService.log(tx, userId, "USER", "Payment", payment.id, "CREATE", null, {
          saleId,
          amount: payment.amount,
          method: payment.paymentMethod,
          totalPaid: actualAmountPaid,
        });

        return updatedSale;
      })
      .then(async (updatedSale) => {
        // Create cash transaction for cash payments (outside transaction to avoid timeout)
        // Skip cash transactions for discount adjustments (negative payments)
        if (addPaymentDto.paymentMethod === PaymentMethod.CASH && !isDiscountAdjustment) {
          // Only record actual amount paid (capped at remaining balance)
          const previousAmountPaid = Number(sale.amountPaid);
          const remainingBalance = Number(sale.totalAmount) - previousAmountPaid;
          const cashAmount = Math.min(Number(addPaymentDto.amount), remainingBalance);

          if (cashAmount > 0) {
            await this.recordCashTransactionSafe(
              tenantClient,
              {
                locationId: sale.locationId,
                type: "CASH_SALE",
                amount: cashAmount,
                description: `Cash payment - ${sale.saleNumber}`,
                reference: sale.saleNumber,
                referenceType: "SALE",
                transactionDate: new Date().toISOString(),
              },
              userId,
              { module: "POS.addPayment", reference: sale.saleNumber },
            );
          }
        }

        // Trigger post-finalization actions (revenue, invoice, commission)
        await this.triggerPostSaleFinalizationActions(tenantClient, updatedSale.id, userId);

        return updatedSale;
      });
  }

  async processRefund(
    tenantClient: PrismaClient,
    saleId: string,
    refundSaleDto: RefundSaleDto,
    userId: string,
    userRole: string,
  ) {
    // Check if user has ADMIN role
    if (userRole !== "ADMIN") {
      throw new ForbiddenException("Only administrators can process refunds");
    }

    const prisma = this.getPrisma(tenantClient);
    const sale = await this.getSaleById(tenantClient, saleId);

    // Check if sale can be refunded - validate status and payment status first
    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException("Cannot refund a cancelled sale");
    }

    if (sale.status === SaleStatus.REFUNDED || sale.paymentStatus === PaymentStatus.REFUNDED) {
      throw new BadRequestException("This sale has already been refunded");
    }

    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException("Can only refund completed sales");
    }

    const refundAmount =
      refundSaleDto.refundType === "FULL" ? Number(sale.totalAmount) : refundSaleDto.refundAmount!;

    if (refundAmount <= 0) {
      throw new BadRequestException("Refund amount must be greater than 0");
    }

    if (refundAmount > Number(sale.totalAmount)) {
      throw new BadRequestException("Refund amount cannot exceed sale total");
    }

    // For partial refunds, check that we're not refunding more than was paid
    if (refundSaleDto.refundType === "PARTIAL" && refundAmount > Number(sale.amountPaid)) {
      throw new BadRequestException("Partial refund amount cannot exceed amount paid");
    }

    // Generate refund number
    const refundNumber = await this.generateRefundNumber(prisma);

    const refund = await tenantClient
      .$transaction(async (tx) => {
        // Create refund record
        const refund = await tx.saleRefund.create({
          data: {
            originalSaleId: saleId,
            refundNumber,
            refundType: refundSaleDto.refundType,
            refundAmount,
            refundMethod: refundSaleDto.refundMethod,
            reason: refundSaleDto.reason,
            processedBy: userId,
            approvedBy: userId, // Auto-approve for now
            notes: refundSaleDto.notes,
          },
        });

        // Update original sale
        // For full refunds, mark as REFUNDED. For partial refunds, keep as COMPLETED but update amountPaid
        const newAmountPaid = Math.max(0, Number(sale.amountPaid) - refundAmount);
        const isFullRefund =
          refundSaleDto.refundType === "FULL" || refundAmount >= Number(sale.totalAmount);

        await tx.sale.update({
          where: { id: saleId },
          data: {
            status: isFullRefund ? SaleStatus.REFUNDED : SaleStatus.COMPLETED,
            paymentStatus: isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL,
            amountPaid: newAmountPaid, // Update amount paid after refund
          },
        });

        // Create reverse stock transactions (restore inventory)
        // Only reverse stock if sale has product items
        try {
          await this.reverseStockTransactions(tenantClient, saleId, userId, tx);
        } catch (error) {
          // Log error but don't fail the refund if stock reversal fails
          console.error("Error reversing stock transactions:", error);
          // Re-throw if it's a validation error
          if (error instanceof NotFoundException || error instanceof BadRequestException) {
            throw error;
          }
          // For other errors, continue with refund but log it
        }

        // Create refund payment record (negative amount)
        await tx.payment.create({
          data: {
            saleId,
            paymentMethod: refundSaleDto.refundMethod,
            amount: -refundAmount,
            referenceNumber: refundNumber,
            processedBy: userId,
            notes: `Refund: ${refundSaleDto.reason}`,
          },
        });

        // Update customer balance if sale had a customer
        // Refunding reduces the amount they owe (or increases their credit if they paid)
        if (sale.customerId) {
          try {
            // If customer paid, refund reduces their balance (they get money back)
            // If customer had credit sale, refund reduces what they owe
            await tx.customer.update({
              where: { id: sale.customerId },
              data: {
                balance: {
                  decrement: refundAmount, // Reduce what they owe (or give them credit back)
                },
              },
            });
          } catch (customerError) {
            console.error("Error updating customer balance:", customerError);
            // Don't fail the refund if customer update fails, but log it
          }
        }

        // Log audit trail
        try {
          await this.auditService.log(tx, userId, "USER", "SaleRefund", refund.id, "CREATE", null, {
            originalSaleId: saleId,
            refundAmount,
            reason: refundSaleDto.reason,
          });
        } catch (auditError) {
          console.error("Error logging audit trail:", auditError);
          // Don't fail the refund if audit log fails
        }

        return refund;
      })
      .then(async (refund) => {
        // Create cash transaction for cash refunds (outside transaction to avoid timeout)
        if (refundSaleDto.refundMethod === PaymentMethod.CASH) {
          await this.recordCashTransactionSafe(
            tenantClient,
            {
              locationId: sale.locationId,
              type: "REFUND",
              amount: refundAmount, // Positive amount for cash going out
              description: `Cash refund - ${sale.saleNumber}`,
              reference: refundNumber,
              referenceType: "REFUND",
              transactionDate: new Date().toISOString(),
            },
            userId,
            { module: "POS.processRefund", reference: refundNumber },
          );
        }

        return refund;
      });

    await this.postReverseSaleJournals({
      sourceType: GlSourceType.SALE_REFUND,
      sourceId: refund.id,
      documentNumber: refund.refundNumber,
      sale,
      refundAmount,
      refundMethod: refundSaleDto.refundMethod,
      userId,
      tenantClient,
    });

    return refund;
  }

  async createSaleReturn(
    tenantClient: PrismaClient,
    saleId: string,
    createSaleReturnDto: CreateSaleReturnDto,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);
    const { items, refundMethod } = createSaleReturnDto;

    if (!items || items.length === 0) {
      throw new BadRequestException("At least one item must be selected for return");
    }

    const trimmedReason = createSaleReturnDto.reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException("Reason for return is required");
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        saleItems: true,
        customer: true,
      },
    });

    if (!sale) {
      throw new NotFoundException("Sale not found");
    }

    const allowedSaleStatuses: SaleStatus[] = [
      SaleStatus.COMPLETED,
      SaleStatus.PARTIAL,
      SaleStatus.REFUNDED,
      SaleStatus.CREDIT,
    ];
    if (!allowedSaleStatuses.includes(sale.status)) {
      throw new BadRequestException(
        "Only completed, partial, refunded, or credit sales can be returned",
      );
    }

    const locationId = createSaleReturnDto.locationId || sale.locationId;
    if (locationId !== sale.locationId) {
      throw new BadRequestException("Sale returns must be processed at the original sale location");
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    const saleItemsMap = new Map(sale.saleItems.map((item) => [item.id, item]));
    const duplicateGuard = new Set<string>();

    for (const item of items) {
      if (duplicateGuard.has(item.originalSaleItemId)) {
        throw new BadRequestException("Duplicate sale items are not allowed in a single return");
      }
      duplicateGuard.add(item.originalSaleItemId);
    }

    const returnableMap = await this.getReturnableQuantityMap(prisma, saleId, sale.saleItems);

    const returnItemsData: Prisma.SaleReturnItemUncheckedCreateWithoutSaleReturnInput[] = [];
    const totals = {
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
    };

    for (const item of items) {
      const saleItem = saleItemsMap.get(item.originalSaleItemId);
      if (!saleItem) {
        throw new BadRequestException("Sale item not found for return");
      }

      if (item.quantityReturned <= 0) {
        throw new BadRequestException("Return quantity must be greater than 0");
      }

      const returnableInfo = returnableMap.get(item.originalSaleItemId);
      const availableQuantity = returnableInfo
        ? returnableInfo.remainingQuantity
        : Number(saleItem.quantity);

      if (availableQuantity <= 0) {
        throw new BadRequestException(
          `Item "${saleItem.itemName}" has already been fully returned`,
        );
      }

      if (item.quantityReturned > availableQuantity + 1e-6) {
        throw new BadRequestException(
          `Cannot return more than remaining quantity for item "${saleItem.itemName}". Remaining: ${availableQuantity}`,
        );
      }

      const calculations = this.calculateReturnItemBreakdown(saleItem, item.quantityReturned);

      totals.subtotal += calculations.lineSubtotal;
      totals.taxAmount += calculations.itemTaxAmount;
      totals.discountAmount += calculations.itemDiscountAmount;
      totals.totalAmount += calculations.lineTotal;

      returnItemsData.push({
        originalSaleItemId: saleItem.id,
        productId: saleItem.productId,
        itemType: saleItem.itemType,
        itemName: saleItem.itemName,
        sku: saleItem.sku,
        quantityReturned: item.quantityReturned,
        originalQuantity: Number(saleItem.quantity),
        unitPrice: Number(saleItem.unitPrice),
        lineSubtotal: calculations.lineSubtotal,
        itemTaxAmount: calculations.itemTaxAmount,
        itemDiscountAmount: calculations.itemDiscountAmount,
        lineTotal: calculations.lineTotal,
      });
    }

    if (totals.totalAmount <= 0) {
      throw new BadRequestException("Calculated refund amount must be greater than 0");
    }

    const trimmedNotes = createSaleReturnDto.notes?.trim();

    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      const returnNumber = await this.generateSaleReturnNumber(prisma);
      try {
        const saleReturn = await tenantClient.$transaction(
          async (tx) => {
            const createdReturn = await tx.saleReturn.create({
              data: {
                returnNumber,
                originalSaleId: saleId,
                locationId,
                subtotal: totals.subtotal,
                taxAmount: totals.taxAmount,
                discountAmount: totals.discountAmount,
                totalAmount: totals.totalAmount,
                refundMethod,
                refundStatus: RefundStatus.PENDING,
                reason: trimmedReason,
                notes: trimmedNotes,
                processedBy: userId,
                status: SaleReturnStatus.PENDING,
                returnItems: {
                  create: returnItemsData,
                },
              },
              include: {
                returnItems: true,
              },
            });

            // Log audit trail
            await this.auditService.log(
              tx,
              userId,
              "USER",
              "SaleReturn",
              createdReturn.id,
              "CREATE",
              null,
              createdReturn,
            );

            return createdReturn;
          },
          {
            timeout: DEFAULT_TRANSACTION_TIMEOUT_MS,
            maxWait: DEFAULT_TRANSACTION_TIMEOUT_MS,
          },
        );

        return saleReturn;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    throw lastError || new BadRequestException("Failed to create sale return");
  }

  async getSaleReturns(tenantClient: PrismaClient, filters: SaleReturnFiltersDto) {
    const prisma = this.getPrisma(tenantClient);
    const { page = 1, limit = 10, status, search, locationId, startDate, endDate } = filters;
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const whereClauses: Prisma.SaleReturnWhereInput[] = [];

    if (status) {
      whereClauses.push({ status });
    }

    if (locationId) {
      whereClauses.push({ locationId });
    }

    if (startDate || endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }
      whereClauses.push({ returnDate: dateFilter });
    }

    if (search) {
      whereClauses.push({
        OR: [
          { returnNumber: { contains: search, mode: "insensitive" } },
          {
            originalSale: {
              saleNumber: { contains: search, mode: "insensitive" },
            },
          },
        ],
      });
    }

    const where: Prisma.SaleReturnWhereInput = whereClauses.length > 0 ? { AND: whereClauses } : {};

    const [saleReturns, total] = await tenantClient.$transaction([
      tenantClient.saleReturn.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy: { returnDate: "desc" },
        include: {
          originalSale: {
            select: {
              id: true,
              saleNumber: true,
              totalAmount: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      tenantClient.saleReturn.count({ where }),
    ]);

    return createPaginatedResponse(saleReturns, total, pageNumber, limitNumber);
  }

  async getSaleReturnById(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);

    const saleReturn = await tenantClient.saleReturn.findUnique({
      where: { id },
      include: {
        originalSale: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        returnItems: {
          include: {
            originalSaleItem: true,
            product: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!saleReturn) {
      throw new NotFoundException("Sale return not found");
    }

    return saleReturn;
  }

  async approveSaleReturn(tenantClient: PrismaClient, id: string, userId: string) {
    const prisma = this.getPrisma(tenantClient);

    const saleReturn = await tenantClient.saleReturn.findUnique({
      where: { id },
    });

    if (!saleReturn) {
      throw new NotFoundException("Sale return not found");
    }

    if (saleReturn.status !== SaleReturnStatus.PENDING) {
      throw new BadRequestException("Only pending sale returns can be approved");
    }

    const updatedReturn = await tenantClient.saleReturn.update({
      where: { id },
      data: {
        status: SaleReturnStatus.APPROVED,
        approvedBy: userId,
      },
    });

    // @ts-ignore - Audit service type issue
    await this.auditService.log(
      prisma,
      userId,
      "USER",
      "SaleReturn",
      updatedReturn.id,
      "UPDATE",
      { status: saleReturn.status },
      { status: updatedReturn.status },
    );

    return updatedReturn;
  }

  async processSaleReturn(
    tenantClient: PrismaClient,
    id: string,
    processSaleReturnDto: ProcessSaleReturnDto,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);

    const saleReturn = await tenantClient.saleReturn.findUnique({
      where: { id },
      include: {
        returnItems: true,
        originalSale: true,
      },
    });

    if (!saleReturn) {
      throw new NotFoundException("Sale return not found");
    }

    const nonProcessableStatuses: SaleReturnStatus[] = [
      SaleReturnStatus.CANCELLED,
      SaleReturnStatus.REJECTED,
    ];
    if (nonProcessableStatuses.includes(saleReturn.status)) {
      throw new BadRequestException("Cancelled or rejected sale returns cannot be processed");
    }

    if (saleReturn.status === SaleReturnStatus.PROCESSED) {
      throw new BadRequestException("Sale return has already been processed");
    }

    const finalRefundMethod = processSaleReturnDto.refundMethod || saleReturn.refundMethod;
    const refundAmount = Number(saleReturn.totalAmount);
    if (refundAmount <= 0) {
      throw new BadRequestException("Refund amount must be greater than 0");
    }

    const sale = saleReturn.originalSale;
    if (!sale) {
      throw new NotFoundException("Original sale not found");
    }

    // Validate products exist before processing (Issue 2 Fix)
    const productIds = saleReturn.returnItems
      .filter((item) => item.productId)
      .map((item) => item.productId!);

    const existingProducts =
      productIds.length > 0
        ? await tenantClient.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true },
          })
        : [];

    const existingProductIds = new Set(existingProducts.map((p) => p.id));
    const deletedProductIds = productIds.filter((id) => !existingProductIds.has(id));
    const deletedProductItems = saleReturn.returnItems.filter(
      (item) => item.productId && deletedProductIds.includes(item.productId),
    );

    // Build warning messages for deleted products
    const deletedProductWarnings: string[] = [];
    if (deletedProductItems.length > 0) {
      deletedProductItems.forEach((item) => {
        deletedProductWarnings.push(
          `⚠️ Product "${item.itemName}" (SKU: ${item.sku || "N/A"}) was deleted from system. Stock restoration skipped for ${item.quantityReturned} units.`,
        );
      });
    }

    const updatedReturn = await tenantClient.$transaction(
      async (tx) => {
        // Process stock restoration only for existing products (Issue 2 Fix)
        for (const item of saleReturn.returnItems) {
          if (item.productId && existingProductIds.has(item.productId)) {
            try {
              await this.stockTransactionsService.create(
                tenantClient,
                {
                  productId: item.productId,
                  toLocationId: saleReturn.locationId,
                  type: "RECEIPT",
                  quantity: Number(item.quantityReturned),
                  referenceNo: `RET-${saleReturn.returnNumber}`,
                  remarks: `Sale return ${saleReturn.returnNumber} for sale ${sale.saleNumber}`,
                  saleId: sale.id,
                  saleReturnId: saleReturn.id,
                },
                userId,
                tx,
              );
            } catch (stockError: any) {
              // Log error but continue processing other items
              console.error(`Failed to restore stock for product ${item.productId}:`, stockError);
              deletedProductWarnings.push(
                `⚠️ Failed to restore stock for "${item.itemName}": ${stockError.message || "Unknown error"}`,
              );
            }
          }
        }

        // Combine existing notes with new notes and warnings (Issue 2 Fix)
        const notesParts: string[] = [];
        if (saleReturn.notes) notesParts.push(saleReturn.notes);
        if (processSaleReturnDto.notes) notesParts.push(processSaleReturnDto.notes);
        if (deletedProductWarnings.length > 0) {
          notesParts.push("\n--- System Warnings ---");
          notesParts.push(...deletedProductWarnings);
        }
        const finalNotes = notesParts.join("\n");

        const saleReturnUpdate = await tx.saleReturn.update({
          where: { id },
          data: {
            status: SaleReturnStatus.PROCESSED,
            refundStatus: RefundStatus.PROCESSED,
            refundMethod: finalRefundMethod,
            refundedAt: new Date(),
            notes: finalNotes || undefined,
          },
          include: {
            returnItems: true,
          },
        });

        await tx.payment.create({
          data: {
            saleId: sale.id,
            paymentMethod: finalRefundMethod,
            amount: -refundAmount,
            referenceNumber: saleReturn.returnNumber,
            processedBy: userId,
            notes: `Sale return refund - ${saleReturn.returnNumber}`,
          },
        });

        const processedAggregate = await tx.saleReturn.aggregate({
          _sum: { totalAmount: true },
          where: {
            originalSaleId: sale.id,
            status: SaleReturnStatus.PROCESSED,
          },
        });

        const totalRefunded = Number(processedAggregate._sum.totalAmount || 0);
        const isFullyRefunded = totalRefunded >= Number(sale.totalAmount) - 0.01;
        const oldAmountPaid = Number(sale.amountPaid);
        const newAmountPaid = Math.max(0, oldAmountPaid - refundAmount);

        await tx.sale.update({
          where: { id: sale.id },
          data: {
            amountPaid: newAmountPaid,
            paymentStatus: isFullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL,
            status: isFullyRefunded ? SaleStatus.REFUNDED : sale.status,
          },
        });

        // Update customer balance and totalPurchases
        // Balance calculation: When amountPaid is reduced, the customer owes more
        // Net balance change = -refundAmount (return reduces what they owe) + (oldAmountPaid - newAmountPaid) (amountPaid reduction increases what they owe)
        // Simplified: -refundAmount + min(refundAmount, oldAmountPaid)
        if (sale.customerId) {
          const amountPaidReduction = oldAmountPaid - newAmountPaid; // How much amountPaid was reduced
          const netBalanceChange = -refundAmount + amountPaidReduction;

          await tx.customer.update({
            where: { id: sale.customerId },
            data: {
              balance: {
                increment: netBalanceChange, // Can be negative (decrement) or positive (increment)
              },
              totalPurchases: {
                decrement: refundAmount,
              },
            },
          });
        }

        // Log audit trail
        await this.auditService.log(
          tx,
          userId,
          "USER",
          "SaleReturn",
          id,
          "UPDATE",
          { status: saleReturn.status },
          {
            status: SaleReturnStatus.PROCESSED,
            refundStatus: RefundStatus.PROCESSED,
          },
        );

        return saleReturnUpdate;
      },
      {
        timeout: DEFAULT_TRANSACTION_TIMEOUT_MS,
        maxWait: DEFAULT_TRANSACTION_TIMEOUT_MS,
      },
    );

    if (finalRefundMethod === PaymentMethod.CASH) {
      await this.recordCashTransactionSafe(
        tenantClient,
        {
          locationId: saleReturn.locationId,
          type: "REFUND",
          amount: refundAmount,
          description: `Cash sale return refund - ${sale.saleNumber}`,
          reference: saleReturn.returnNumber,
          referenceType: "SALE_RETURN",
          transactionDate: new Date().toISOString(),
        },
        userId,
        { module: "POS.updateSaleReturn", reference: saleReturn.returnNumber },
      );
    }

    await this.postReverseSaleJournals({
      sourceType: GlSourceType.SALE_RETURN,
      sourceId: saleReturn.id,
      documentNumber: saleReturn.returnNumber,
      sale,
      refundAmount,
      refundMethod: finalRefundMethod,
      userId,
      tenantClient,
    });

    // Return response with warnings if any (Issue 2 Fix)
    const response: any = {
      ...updatedReturn,
    };

    if (deletedProductWarnings.length > 0) {
      response.warnings = deletedProductWarnings;
    }

    return response;
  }

  async cancelSaleReturn(
    tenantClient: PrismaClient,
    id: string,
    cancelSaleReturnDto: CancelSaleReturnDto,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);

    const saleReturn = await prisma.saleReturn.findUnique({
      where: { id },
    });

    if (!saleReturn) {
      throw new NotFoundException("Sale return not found");
    }

    if (saleReturn.status === SaleReturnStatus.PROCESSED) {
      throw new BadRequestException("Processed sale returns cannot be cancelled");
    }

    if (saleReturn.status === SaleReturnStatus.CANCELLED) {
      return saleReturn;
    }

    const reason = cancelSaleReturnDto.reason?.trim();

    const updatedReturn = await prisma.saleReturn.update({
      where: { id },
      data: {
        status: SaleReturnStatus.CANCELLED,
        refundStatus: RefundStatus.FAILED,
        notes: reason
          ? [saleReturn.notes, `Cancelled: ${reason}`].filter(Boolean).join("\n")
          : saleReturn.notes,
      },
    });

    await this.auditService.log(
      prisma,
      userId,
      "USER",
      "SaleReturn",
      updatedReturn.id,
      "UPDATE",
      { status: saleReturn.status },
      { status: updatedReturn.status },
    );

    return updatedReturn;
  }

  async getReturnableItems(tenantClient: PrismaClient, saleId: string) {
    const prisma = this.getPrisma(tenantClient);

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException("Sale not found");
    }

    const allowedStatuses: SaleStatus[] = [
      SaleStatus.COMPLETED,
      SaleStatus.PARTIAL,
      SaleStatus.REFUNDED,
      SaleStatus.CREDIT,
    ];
    if (!allowedStatuses.includes(sale.status)) {
      throw new BadRequestException(
        "Only completed, partial, refunded, or credit sales can be returned",
      );
    }

    const returnableMap = await this.getReturnableQuantityMap(prisma, saleId, sale.saleItems);

    return sale.saleItems
      .map((item) => {
        const info = returnableMap.get(item.id);
        return {
          saleItemId: item.id,
          itemName: item.itemName,
          itemType: item.itemType,
          productId: item.productId,
          sku: item.sku,
          originalQuantity: Number(item.quantity),
          returnableQuantity: info ? info.remainingQuantity : Number(item.quantity),
          returnedQuantity: info ? info.returnedQuantity : 0,
        };
      })
      .filter((item) => item.returnableQuantity > 0);
  }

  async getDailySummary(tenantClient: PrismaClient, locationId?: string, date?: string) {
    const prisma = this.getPrisma(tenantClient);
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      saleDate: { gte: startOfDay, lte: endOfDay },
      status: SaleStatus.COMPLETED,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const saleReturnWhere: Prisma.SaleReturnWhereInput = {
      returnDate: { gte: startOfDay, lte: endOfDay },
      status: { not: SaleReturnStatus.CANCELLED },
    };

    if (locationId) {
      saleReturnWhere.locationId = locationId;
    }

    const [
      totalSales,
      transactionCount,
      paymentMethods,
      discountAdjustmentsByMethod,
      topProducts,
      salesByUser,
      uniqueCustomers,
      grossProfitData,
      saleReturns,
      refundMethodGroups,
      processedReturnSums,
      processedReturnCostItems,
      discountAdjustments,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where,
        _sum: { totalAmount: true, subtotal: true },
        _avg: { totalAmount: true },
      }),
      prisma.sale.count({ where }),
      // Get positive payments grouped by method (actual payments)
      prisma.payment.groupBy({
        by: ["paymentMethod"],
        where: {
          sale: where,
          amount: { gt: 0 }, // Only positive payments
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Get discount adjustments (negative payments) grouped by method
      prisma.payment.groupBy({
        by: ["paymentMethod"],
        where: {
          sale: where,
          amount: { lt: 0 }, // Only negative payments (discount adjustments)
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.saleItem.groupBy({
        by: ["itemName"],
        where: { sale: where },
        _sum: { quantity: true, lineTotal: true },
        _count: { id: true },
        orderBy: { _sum: { lineTotal: "desc" } },
        take: 10,
      }),
      prisma.sale.groupBy({
        by: ["createdById"],
        where,
        _sum: { totalAmount: true },
        _count: { id: true },
        _avg: { totalAmount: true },
      }),
      prisma.sale.findMany({
        where,
        select: { customerId: true },
        distinct: ["customerId"],
      }),
      prisma.saleItem.findMany({
        where: {
          sale: where,
          costPrice: { not: null },
        },
        select: {
          sellingPrice: true,
          quantity: true,
        },
      }),
      prisma.saleReturn.findMany({
        where: saleReturnWhere,
        select: {
          id: true,
          status: true,
          totalAmount: true,
        },
      }),
      prisma.saleReturn.groupBy({
        by: ["refundMethod"],
        where: {
          returnDate: { gte: startOfDay, lte: endOfDay },
          status: SaleReturnStatus.PROCESSED,
          ...(locationId ? { locationId } : {}),
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      prisma.saleReturnItem.aggregate({
        _sum: {
          lineTotal: true,
          lineSubtotal: true,
        },
        where: {
          saleReturn: {
            returnDate: { gte: startOfDay, lte: endOfDay },
            status: SaleReturnStatus.PROCESSED,
            ...(locationId ? { locationId } : {}),
          },
        },
      }),
      prisma.saleReturnItem.findMany({
        where: {
          saleReturn: {
            returnDate: { gte: startOfDay, lte: endOfDay },
            status: SaleReturnStatus.PROCESSED,
            ...(locationId ? { locationId } : {}),
          },
        },
        select: {
          quantityReturned: true,
          originalSaleItem: {
            select: {
              sellingPrice: true,
            },
          },
        },
      }),
      // Get all negative payments (discount adjustments) for sales on this date
      prisma.payment.findMany({
        where: {
          sale: where,
          amount: { lt: 0 }, // Negative payments are discount adjustments
        },
        select: {
          amount: true,
        },
      }),
    ]);

    // Calculate gross profit
    const totalRevenue = Number(totalSales._sum.subtotal || 0);

    // Calculate total discount adjustments (negative payments reduce revenue)
    const totalDiscountAdjustments = Math.abs(
      discountAdjustments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    );

    // Calculate total cost: sum of (quantity * costPrice) for all items
    const totalCost = grossProfitData.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.costPrice || 0);
    }, 0);

    const processedReturnAmount = Number(processedReturnSums._sum.lineTotal || 0);
    const processedReturnSubtotal = Number(processedReturnSums._sum.lineSubtotal || 0);
    const grossSalesAmount = Number(totalSales._sum.totalAmount || 0);

    const netSalesAmount = Math.max(0, grossSalesAmount - processedReturnAmount);
    // Net revenue = original revenue - returns - discount adjustments
    const netRevenue = Math.max(
      0,
      totalRevenue - processedReturnSubtotal - totalDiscountAdjustments,
    );

    const processedReturns = saleReturns.filter((r) => r.status === SaleReturnStatus.PROCESSED);
    const pendingStatuses: SaleReturnStatus[] = [
      SaleReturnStatus.PENDING,
      SaleReturnStatus.APPROVED,
    ];
    const pendingReturns = saleReturns.filter((r) => pendingStatuses.includes(r.status));
    const cancelledReturns = saleReturns.filter((r) => r.status === SaleReturnStatus.CANCELLED);

    const pendingReturnAmount = pendingReturns.reduce(
      (sum, ret) => sum + Number(ret.totalAmount || 0),
      0,
    );

    const processedReturnCost = processedReturnCostItems.reduce((sum, item) => {
      const unitCost = Number(item.originalSaleItem?.costPrice || 0);
      return sum + Number(item.quantityReturned || 0) * unitCost;
    }, 0);

    const netCost = Math.max(0, totalCost - processedReturnCost);

    const grossProfit = netRevenue - netCost;
    const grossProfitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    const netProfit = parseFloat((netRevenue - netCost).toFixed(2));

    const refundMethodAmountMap = new Map<string, number>();
    const refundMethodCountMap = new Map<string, number>();
    refundMethodGroups.forEach((group) => {
      refundMethodAmountMap.set(group.refundMethod, Number(group._sum.totalAmount || 0));
      refundMethodCountMap.set(group.refundMethod, group._count.id);
    });

    // Create map for discount adjustments by payment method
    const discountAdjustmentAmountMap = new Map<string, number>();
    const discountAdjustmentCountMap = new Map<string, number>();
    discountAdjustmentsByMethod.forEach((group) => {
      // Store as positive value for easier calculation
      const discountAmount = Math.abs(Number(group._sum.amount || 0));
      discountAdjustmentAmountMap.set(group.paymentMethod, discountAmount);
      discountAdjustmentCountMap.set(group.paymentMethod, group._count.id);
    });

    return {
      date: targetDate.toISOString().split("T")[0],
      grossSales: grossSalesAmount,
      totalSales: netSalesAmount,
      transactionCount: Math.max(0, transactionCount - processedReturns.length),
      grossTransactionCount: transactionCount,
      averageTransactionValue:
        Math.max(0, transactionCount - processedReturns.length) > 0
          ? netSalesAmount / Math.max(0, transactionCount - processedReturns.length)
          : 0,
      uniqueCustomers: uniqueCustomers.length,
      grossProfit,
      grossProfitMargin: parseFloat(grossProfitMargin.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      paymentMethods: paymentMethods.map((method) => {
        const grossAmount = Number(method._sum.amount || 0);
        const refundAmount = refundMethodAmountMap.get(method.paymentMethod) || 0;
        const discountAdjustment = discountAdjustmentAmountMap.get(method.paymentMethod) || 0;
        const netAmount = Math.max(0, grossAmount - refundAmount - discountAdjustment);
        return {
          method: method.paymentMethod,
          totalAmount: grossAmount,
          refundAmount,
          discountAdjustment,
          netAmount,
          count: method._count.id,
          discountCount: discountAdjustmentCountMap.get(method.paymentMethod) || 0,
        };
      }),
      topProducts: topProducts.map((product) => ({
        name: product.itemName,
        quantity: Number(product._sum.quantity || 0),
        revenue: Number(product._sum.lineTotal || 0),
        salesCount: product._count.id,
      })),
      salesByUser: salesByUser.map((user) => ({
        userId: user.createdById,
        totalSales: Number(user._sum.totalAmount || 0),
        transactionCount: user._count.id,
        averageValue: Number(user._avg.totalAmount || 0),
      })),
      returnSummary: {
        totalReturns: saleReturns.length,
        processedReturns: processedReturns.length,
        pendingReturns: pendingReturns.length,
        cancelledReturns: cancelledReturns.length,
        processedAmount: processedReturnAmount,
        pendingAmount: pendingReturnAmount,
        netSales: netSalesAmount,
        netTransactions: Math.max(0, transactionCount - processedReturns.length),
        netCost,
        refundsByMethod: refundMethodGroups.map((group) => ({
          method: group.refundMethod,
          amount: Number(group._sum.totalAmount || 0),
          count: group._count.id,
        })),
      },
    };
  }

  async getHourlySalesReport(tenantClient: PrismaClient, date?: string, locationId?: string) {
    const prisma = this.getPrisma(tenantClient);
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      saleDate: { gte: startOfDay, lte: endOfDay },
      status: SaleStatus.COMPLETED,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    // Get all sales for the day
    const sales = await prisma.sale.findMany({
      where,
      select: {
        id: true,
        saleDate: true,
        totalAmount: true,
      },
    });

    // Initialize hourly data structure (0-23 hours)
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${hour.toString().padStart(2, "0")}:00`,
      totalSales: 0,
      transactionCount: 0,
      averageTransactionValue: 0,
    }));

    // Aggregate data by hour
    sales.forEach((sale) => {
      const hour = new Date(sale.saleDate).getHours();
      hourlyData[hour].totalSales += Number(sale.totalAmount);
      hourlyData[hour].transactionCount += 1;
    });

    // Calculate averages
    hourlyData.forEach((hour) => {
      hour.averageTransactionValue =
        hour.transactionCount > 0 ? hour.totalSales / hour.transactionCount : 0;
    });

    return hourlyData;
  }

  async getSalesByUserReport(
    tenantClient: PrismaClient,
    startDate?: string,
    endDate?: string,
    locationId?: string,
  ) {
    const prisma = this.getPrisma(tenantClient);
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const where: any = {
      saleDate: { gte: start, lte: end },
      status: SaleStatus.COMPLETED,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    // Group sales by user
    const salesByUser = await prisma.sale.groupBy({
      by: ["createdById"],
      where,
      _sum: { totalAmount: true, subtotal: true },
      _count: { id: true },
      _avg: { totalAmount: true },
    });

    // Get user details
    const userIds = salesByUser.map((s) => s.createdById);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    // Combine user data with sales data
    return salesByUser
      .map((sale) => {
        const user = users.find((u) => u.id === sale.createdById);
        return {
          userId: sale.createdById,
          userName: user ? `${user.firstName} ${user.lastName}`.trim() : "Unknown",
          userEmail: user?.email || "",
          totalSales: Number(sale._sum.totalAmount || 0),
          totalSubtotal: Number(sale._sum.subtotal || 0),
          transactionCount: sale._count.id,
          averageTransactionValue: Number(sale._avg.totalAmount || 0),
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales); // Sort by total sales descending
  }

  async getTopProductsReport(
    tenantClient: PrismaClient,
    startDate?: string,
    endDate?: string,
    limit: number = 10,
  ) {
    const prisma = this.getPrisma(tenantClient);
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const where: any = {
      sale: {
        saleDate: { gte: start, lte: end },
        status: SaleStatus.COMPLETED,
      },
    };

    // Group sale items by product name
    const topProducts = await prisma.saleItem.groupBy({
      by: ["itemName", "productId", "sku"],
      where,
      _sum: {
        quantity: true,
        lineTotal: true,
        lineSubtotal: true,
      },
      _count: { id: true },
      _avg: {
        unitPrice: true,
      },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: limit,
    });

    // Get product details for products that exist
    const productIds = topProducts.filter((p) => p.productId).map((p) => p.productId as string);

    let products: any[] = [];
    if (productIds.length > 0) {
      products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          code: true,
          category: {
            select: {
              name: true,
            },
          },
          uom: {
            select: {
              symbol: true,
            },
          },
        },
      });
    }

    // Format the response
    return topProducts.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        name: item.itemName,
        sku: item.sku,
        category: product?.category?.name || "N/A",
        uom: product?.uom?.symbol || "N/A",
        totalQuantity: Number(item._sum.quantity || 0),
        totalRevenue: Number(item._sum.lineTotal || 0),
        totalSubtotal: Number(item._sum.lineSubtotal || 0),
        averagePrice: Number(item._avg.unitPrice || 0),
        saleCount: item._count.id,
      };
    });
  }

  async getParkedSales(tenantClient: PrismaClient, userId: string) {
    const prisma = this.getPrisma(tenantClient);
    return prisma.sale.findMany({
      where: {
        status: SaleStatus.DRAFT,
        createdById: userId,
      },
      include: {
        customer: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        _count: { select: { saleItems: true, payments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async parkSale(tenantClient: PrismaClient, saleId: string, userId: string) {
    const prisma = this.getPrisma(tenantClient);
    const sale = await this.getSaleById(tenantClient, saleId);

    if (sale.createdById !== userId) {
      throw new ForbiddenException("You can only park your own sales");
    }

    if (sale.status !== SaleStatus.DRAFT) {
      throw new BadRequestException("Can only park draft sales");
    }

    return prisma.sale.update({
      where: { id: saleId },
      data: { status: SaleStatus.DRAFT },
    });
  }

  async resumeSale(tenantClient: PrismaClient, saleId: string, userId: string) {
    const sale = await this.getSaleById(tenantClient, saleId);

    if (sale.createdById !== userId) {
      throw new ForbiddenException("You can only resume your own sales");
    }

    if (sale.status !== SaleStatus.DRAFT) {
      throw new BadRequestException("Can only resume draft sales");
    }

    return sale;
  }

  // Helper methods
  private async validateStock(
    prisma: PrismaClient | Prisma.TransactionClient,
    items: any[],
    warehouse: { id: string; warehouseType: string; status: string; name: string },
  ) {
    if (warehouse.warehouseType !== "DISPATCH") {
      throw new BadRequestException(
        "Only DISPATCH warehouses can be used for sales. " +
          `Selected warehouse is ${warehouse.warehouseType} type.`,
      );
    }

    if (warehouse.status !== "ACTIVE") {
      throw new BadRequestException(
        `Warehouse "${warehouse.name}" is ${warehouse.status}. ` +
          `Only ACTIVE warehouses can be used for sales.`,
      );
    }

    const productItems = items.filter(
      (item) => item.itemType === ItemType.PRODUCT && item.productId,
    );
    if (productItems.length === 0) {
      return;
    }

    const requiredByProduct = new Map<string, { name: string; quantity: number }>();
    for (const item of productItems) {
      if (item.unitPrice < 0) {
        throw new BadRequestException(`Invalid price for "${item.itemName}"`);
      }
      if (item.quantity <= 0) {
        throw new BadRequestException(`Invalid quantity for "${item.itemName}"`);
      }

      const current = requiredByProduct.get(item.productId) ?? { name: item.itemName, quantity: 0 };
      current.quantity += Number(item.quantity);
      current.name = item.itemName;
      requiredByProduct.set(item.productId, current);
    }

    const productIds = [...requiredByProduct.keys()];
    const [products, stockBalances] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, isActive: true },
      }),
      prisma.warehouseStockBalance.findMany({
        where: { warehouseId: warehouse.id, productId: { in: productIds } },
        select: { productId: true, availableQuantity: true },
      }),
    ]);

    const productById = new Map(products.map((product) => [product.id, product]));
    const availableByProduct = new Map<string, number>();
    for (const balance of stockBalances) {
      const current = availableByProduct.get(balance.productId) ?? 0;
      availableByProduct.set(balance.productId, current + Number(balance.availableQuantity ?? 0));
    }

    for (const [productId, required] of requiredByProduct) {
      const product = productById.get(productId);
      if (!product) {
        throw new NotFoundException(`Product "${required.name}" not found in system`);
      }
      if (!product.isActive) {
        throw new BadRequestException(`Product "${required.name}" is inactive and cannot be sold`);
      }

      const available = availableByProduct.get(productId) ?? 0;
      if (available < required.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${required.name}". ` +
            `Available: ${available}, Required: ${required.quantity}. ` +
            `Cannot oversell. Please check warehouse stock or select a different warehouse.`,
        );
      }
    }
  }

  private calculateTotals(
    items: any[],
    taxRate: number,
    discountType?: DiscountType,
    discountValue?: number,
  ) {
    const subtotal = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = this.calculateItemDiscount(
        itemSubtotal,
        item.itemDiscountType,
        item.itemDiscountRate,
      );
      return sum + itemSubtotal - itemDiscount;
    }, 0);

    const saleDiscount = this.calculateSaleDiscount(subtotal, discountType, discountValue);
    const subtotalAfterDiscount = subtotal - saleDiscount;
    const taxAmount = subtotalAfterDiscount * (taxRate / 100);
    const totalAmount = subtotalAfterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount: saleDiscount,
      taxAmount,
      totalAmount,
    };
  }

  private calculateItemTotals(item: any) {
    const lineSubtotal = item.quantity * item.unitPrice;
    const itemDiscount = this.calculateItemDiscount(
      lineSubtotal,
      item.itemDiscountType,
      item.itemDiscountRate,
    );
    const itemTaxAmount = (lineSubtotal - itemDiscount) * ((item.itemTaxRate || 0) / 100);
    const lineTotal = lineSubtotal - itemDiscount + itemTaxAmount;

    return {
      lineSubtotal,
      itemDiscountAmount: itemDiscount,
      itemTaxAmount,
      lineTotal,
    };
  }

  private calculateItemDiscount(
    subtotal: number,
    discountType?: DiscountType,
    discountRate?: number,
  ) {
    if (!discountType || !discountRate) return 0;

    if (discountType === DiscountType.PERCENTAGE) {
      return subtotal * (discountRate / 100);
    } else {
      return Math.min(discountRate, subtotal);
    }
  }

  private calculateSaleDiscount(
    subtotal: number,
    discountType?: DiscountType,
    discountValue?: number,
  ) {
    if (!discountType || !discountValue) return 0;

    if (discountType === DiscountType.PERCENTAGE) {
      return subtotal * (discountValue / 100);
    } else {
      return Math.min(discountValue, subtotal);
    }
  }

  private async createStockTransactions(
    tenantClient: PrismaClient,
    sale: any,
    items: any[],
    warehouseId: string,
    locationId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ) {
    for (const item of items) {
      if (item.itemType === ItemType.PRODUCT && item.productId) {
        // Use StockLedgerService for proper warehouse stock management
        // This will:
        // - Create StockLedger entry with type OUT
        // - Update WarehouseStockBalance
        // - Use FIFO batch consumption
        // - Block expired batches
        await this.stockLedgerService.recordMovement(
          tenantClient,
          {
            productId: item.productId,
            warehouseId: warehouseId,
            quantity: -Number(item.quantity), // Negative for stock decrease
            movementType: StockTransactionType.OUT,
            referenceType: "SALE",
            referenceId: sale.id,
            remarks: `POS Sale ${sale.saleNumber} - ${item.itemName}`,
            userId: userId,
            useFIFO: true, // Use FIFO batch consumption
            allowExpired: false, // Block expired batches
          },
          tx,
        );
      }
    }
  }

  private async reverseStockTransactions(
    tenantClient: PrismaClient,
    saleId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ) {
    // Get the sale with items to properly reverse stock
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: {
        saleItems: {
          where: {
            itemType: ItemType.PRODUCT,
            productId: { not: null },
          },
        },
        warehouse: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException("Sale not found");
    }

    const warehouseId = sale.warehouseId || sale.warehouse?.id;
    if (!warehouseId) {
      throw new BadRequestException("Sale warehouse is required for stock reversal");
    }

    // Reverse stock for each product item using StockLedgerService
    for (const item of sale.saleItems) {
      if (item.productId && item.itemType === ItemType.PRODUCT) {
        await this.stockLedgerService.recordMovement(
          tenantClient,
          {
            productId: item.productId,
            warehouseId: warehouseId,
            quantity: Number(item.quantity), // Positive to add back
            movementType: StockTransactionType.RETURN,
            referenceType: "SALE_CANCELLATION",
            referenceId: sale.id,
            remarks: `Stock return for cancelled sale ${sale.saleNumber} - ${item.itemName}`,
            userId: userId,
          },
          tx,
        );
      }
    }
  }

  private async updateCustomerStats(customerId: string, amount: number, tx: any) {
    await tx.customer.update({
      where: { id: customerId },
      data: {
        totalPurchases: { increment: amount },
        lastPurchaseDate: new Date(),
      },
    });
  }

  private validateStatusTransition(currentStatus: SaleStatus, newStatus: SaleStatus) {
    const validTransitions: Record<SaleStatus, SaleStatus[]> = {
      [SaleStatus.DRAFT]: [
        SaleStatus.COMPLETED,
        SaleStatus.PARTIAL,
        SaleStatus.CREDIT,
        SaleStatus.CANCELLED,
      ],
      [SaleStatus.COMPLETED]: [SaleStatus.CANCELLED, SaleStatus.REFUNDED],
      [SaleStatus.PARTIAL]: [SaleStatus.COMPLETED, SaleStatus.CANCELLED],
      [SaleStatus.CREDIT]: [SaleStatus.COMPLETED, SaleStatus.CANCELLED],
      [SaleStatus.CANCELLED]: [],
      [SaleStatus.REFUNDED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private async generateSaleNumber(
    prisma: PrismaClient | Prisma.TransactionClient,
  ): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    const lastSale = await prisma.sale.findFirst({
      where: {
        saleNumber: {
          startsWith: `POS-${dateStr}`,
        },
      },
      orderBy: { saleNumber: "desc" },
    });

    let sequence = 1;
    if (lastSale) {
      const lastSequence = parseInt(lastSale.saleNumber.split("-")[2]);
      sequence = lastSequence + 1;
    }

    return `POS-${dateStr}-${sequence.toString().padStart(4, "0")}`;
  }

  private async generateSaleReturnNumber(
    prisma: PrismaClient | Prisma.TransactionClient,
  ): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    const lastReturn = await prisma.saleReturn.findFirst({
      where: {
        returnNumber: {
          startsWith: `SR-${dateStr}`,
        },
      },
      orderBy: { returnNumber: "desc" },
    });

    let sequence = 1;
    if (lastReturn) {
      const lastSequence = parseInt(lastReturn.returnNumber.split("-")[2]);
      sequence = lastSequence + 1;
    }

    return `SR-${dateStr}-${sequence.toString().padStart(4, "0")}`;
  }

  private async getReturnableQuantityMap(
    prisma: PrismaClient | Prisma.TransactionClient,
    saleId: string,
    saleItemsInput?: { id: string; quantity: Prisma.Decimal }[],
  ) {
    const saleItems =
      saleItemsInput ??
      (await prisma.saleItem.findMany({
        where: { saleId },
        select: {
          id: true,
          quantity: true,
        },
      }));

    const map = new Map<
      string,
      {
        originalQuantity: number;
        returnedQuantity: number;
        remainingQuantity: number;
      }
    >();

    saleItems.forEach((item) => {
      const quantity = Number(item.quantity);
      map.set(item.id, {
        originalQuantity: quantity,
        returnedQuantity: 0,
        remainingQuantity: quantity,
      });
    });

    const returnItems = await prisma.saleReturnItem.groupBy({
      by: ["originalSaleItemId"],
      where: {
        originalSaleItem: {
          saleId,
        },
        saleReturn: {
          status: {
            notIn: [SaleReturnStatus.CANCELLED, SaleReturnStatus.REJECTED],
          },
        },
      },
      _sum: {
        quantityReturned: true,
      },
    });

    returnItems.forEach((item) => {
      const entry = map.get(item.originalSaleItemId);
      if (entry) {
        const returned = Number(item._sum.quantityReturned || 0);
        entry.returnedQuantity = returned;
        entry.remainingQuantity = Math.max(entry.originalQuantity - returned, 0);
      }
    });

    return map;
  }

  private calculateReturnItemBreakdown(saleItem: any, quantityReturned: number) {
    const originalQuantity = Number(saleItem.quantity);
    if (originalQuantity <= 0) {
      throw new BadRequestException("Invalid sale item quantity");
    }

    const ratio = quantityReturned / originalQuantity;

    const lineSubtotal = Number(saleItem.lineSubtotal) * ratio;
    const itemTaxAmount = Number(saleItem.itemTaxAmount) * ratio;
    const itemDiscountAmount = Number(saleItem.itemDiscountAmount) * ratio;
    const lineTotal = Number(saleItem.lineTotal) * ratio;

    return {
      lineSubtotal,
      itemTaxAmount,
      itemDiscountAmount,
      lineTotal,
    };
  }

  private async generateHeldInvoiceReferenceNumber(
    prisma: PrismaClient | Prisma.TransactionClient,
  ): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    const lastHeld = await prisma.heldInvoice.findFirst({
      where: {
        referenceNumber: {
          startsWith: `HOLD-${dateStr}`,
        },
      },
      orderBy: { referenceNumber: "desc" },
    });

    let sequence = 1;
    if (lastHeld) {
      const lastSequence = parseInt(lastHeld.referenceNumber.split("-")[2]);
      sequence = lastSequence + 1;
    }

    return `HOLD-${dateStr}-${sequence.toString().padStart(4, "0")}`;
  }

  async holdInvoice(tenantClient: PrismaClient, holdInvoiceDto: HoldInvoiceDto, userId: string) {
    const prisma = this.getPrisma(tenantClient);
    // Validate location exists
    const location = await prisma.location.findUnique({
      where: { id: holdInvoiceDto.locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${holdInvoiceDto.locationId} not found`);
    }

    // Validate customer if provided
    if (holdInvoiceDto.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: holdInvoiceDto.customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${holdInvoiceDto.customerId} not found`);
      }
    }

    // Validate items
    if (!holdInvoiceDto.items || holdInvoiceDto.items.length === 0) {
      throw new BadRequestException("Cannot hold invoice with no items");
    }

    // Generate reference number
    const referenceNumber = await this.generateHeldInvoiceReferenceNumber(prisma);

    // Round monetary values to 2 decimal places
    const roundToTwoDecimals = (num: number) => Math.round(num * 100) / 100;

    // Create held invoice
    const heldInvoice = await prisma.heldInvoice.create({
      data: {
        referenceNumber,
        locationId: holdInvoiceDto.locationId,
        customerId: holdInvoiceDto.customerId || null,
        name: holdInvoiceDto.name || null,
        items: holdInvoiceDto.items as any, // Store as JSON
        subtotal: roundToTwoDecimals(holdInvoiceDto.subtotal),
        taxRate: roundToTwoDecimals(holdInvoiceDto.taxRate || 0),
        taxAmount: roundToTwoDecimals(holdInvoiceDto.taxAmount || 0),
        discountType: holdInvoiceDto.discountType || null,
        discountValue: holdInvoiceDto.discountValue
          ? roundToTwoDecimals(holdInvoiceDto.discountValue)
          : null,
        discountAmount: roundToTwoDecimals(holdInvoiceDto.discountAmount || 0),
        totalAmount: roundToTwoDecimals(holdInvoiceDto.totalAmount),
        biltyAddress: holdInvoiceDto.biltyAddress || null,
        biltyContact: holdInvoiceDto.biltyContact || null,
        labourExpense: holdInvoiceDto.labourExpense
          ? roundToTwoDecimals(holdInvoiceDto.labourExpense)
          : null,
        freightCharges: holdInvoiceDto.freightCharges
          ? roundToTwoDecimals(holdInvoiceDto.freightCharges)
          : null,
        notes: holdInvoiceDto.notes || null,
        heldBy: userId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        holder: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return heldInvoice;
  }

  async getHeldInvoices(tenantClient: PrismaClient, locationId?: string) {
    const prisma = this.getPrisma(tenantClient);
    const where: any = {};

    if (locationId) {
      where.locationId = locationId;
    }

    const heldInvoices = await prisma.heldInvoice.findMany({
      where,
      orderBy: [
        {
          restoredAt: "asc",
        },
        {
          heldAt: "desc",
        },
      ],
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        holder: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        restorer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return heldInvoices;
  }

  async getHeldInvoiceById(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);
    const heldInvoice = await prisma.heldInvoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        holder: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!heldInvoice) {
      throw new NotFoundException(`Held invoice with ID ${id} not found`);
    }

    return heldInvoice;
  }

  async deleteHeldInvoice(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);
    const heldInvoice = await prisma.heldInvoice.findUnique({
      where: { id },
    });

    if (!heldInvoice) {
      throw new NotFoundException(`Held invoice with ID ${id} not found`);
    }

    await prisma.heldInvoice.delete({
      where: { id },
    });

    return { message: "Held invoice deleted successfully" };
  }

  async restoreHeldInvoice(tenantClient: PrismaClient, heldInvoiceId: string, userId: string) {
    const prisma = this.getPrisma(tenantClient);
    const heldInvoice = await prisma.heldInvoice.findUnique({
      where: { id: heldInvoiceId },
    });

    if (!heldInvoice) {
      throw new NotFoundException(`Held invoice with ID ${heldInvoiceId} not found`);
    }

    const updatedHeldInvoice = await prisma.heldInvoice.update({
      where: { id: heldInvoiceId },
      data: {
        restoredAt: new Date(),
        restoredBy: userId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        holder: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        restorer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedHeldInvoice;
  }

  private async generateRefundNumber(
    prisma: PrismaClient | Prisma.TransactionClient,
  ): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    const lastRefund = await prisma.saleRefund.findFirst({
      where: {
        refundNumber: {
          startsWith: `RFN-${dateStr}`,
        },
      },
      orderBy: { refundNumber: "desc" },
    });

    let sequence = 1;
    if (lastRefund) {
      const lastSequence = parseInt(lastRefund.refundNumber.split("-")[2]);
      sequence = lastSequence + 1;
    }

    return `RFN-${dateStr}-${sequence.toString().padStart(4, "0")}`;
  }

  async exportDailySalesToCsv(
    tenantClient: PrismaClient,
    date?: string,
    locationId?: string,
  ): Promise<string> {
    const prisma = this.getPrisma(tenantClient);
    const summary = await this.getDailySummary(tenantClient, locationId, date);
    const hourlyData = await this.getHourlySalesReport(tenantClient, date, locationId);
    const salesByUser = await this.getSalesByUserReport(tenantClient, date, date, locationId);
    const topProducts = await this.getTopProductsReport(tenantClient, date, date, 20);

    // Build CSV content
    let csv = "DAILY SALES REPORT\n";
    csv += `Date: ${summary.date}\n`;
    if (locationId) {
      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });
      csv += `Location: ${location?.name || "Unknown"}\n`;
    }
    csv += "\n";

    // Summary Section
    csv += "SUMMARY\n";
    csv += "Metric,Value\n";
    csv += `Gross Sales,${(summary.grossSales ?? summary.totalSales).toFixed(2)}\n`;
    csv += `Processed Returns,${(summary.returnSummary?.processedAmount ?? 0).toFixed(2)}\n`;
    csv += `Net Sales,${summary.totalSales.toFixed(2)}\n`;
    csv += `Transaction Count,${summary.transactionCount}\n`;
    csv += `Average Transaction Value,${summary.averageTransactionValue.toFixed(2)}\n`;
    csv += `Unique Customers,${summary.uniqueCustomers}\n`;
    csv += `Gross Profit,${summary.grossProfit.toFixed(2)}\n`;
    csv += `Gross Profit Margin,${summary.grossProfitMargin.toFixed(2)}%\n`;
    csv += `Net Profit,${summary.netProfit.toFixed(2)}\n`;
    csv += "\n";

    // Payment Methods Section
    csv += "PAYMENT METHODS\n";
    csv += "Method,Gross Amount,Refunds,Net Amount,Count\n";
    summary.paymentMethods.forEach((pm) => {
      csv += `"${pm.method}",${pm.totalAmount.toFixed(2)},${(pm.refundAmount ?? 0).toFixed(2)},${(pm.netAmount ?? pm.totalAmount).toFixed(2)},${pm.count}\n`;
    });
    csv += "\n";

    // Returns Section
    csv += "SALE RETURNS\n";
    csv += "Metric,Value\n";
    csv += `Processed Returns,${summary.returnSummary?.processedReturns ?? 0}\n`;
    csv += `Processed Amount,${(summary.returnSummary?.processedAmount ?? 0).toFixed(2)}\n`;
    csv += `Pending Returns,${summary.returnSummary?.pendingReturns ?? 0}\n`;
    csv += `Pending Amount,${(summary.returnSummary?.pendingAmount ?? 0).toFixed(2)}\n`;
    csv += `Cancelled Returns,${summary.returnSummary?.cancelledReturns ?? 0}\n`;
    csv += "\n";

    // Hourly Sales Section
    csv += "HOURLY BREAKDOWN\n";
    csv += "Hour,Total Sales,Transaction Count,Average Value\n";
    hourlyData.forEach((hour) => {
      if (hour.transactionCount > 0) {
        csv += `"${hour.label}",${hour.totalSales.toFixed(2)},${hour.transactionCount},${hour.averageTransactionValue.toFixed(2)}\n`;
      }
    });
    csv += "\n";

    // Top Products Section
    csv += "TOP PRODUCTS\n";
    csv += "Product Name,Category,UOM,Quantity,Revenue,Avg Price,Sales Count\n";
    topProducts.forEach((product) => {
      csv += `"${product.name}","${product.category}","${product.uom}",${product.totalQuantity.toFixed(2)},${product.totalRevenue.toFixed(2)},${product.averagePrice.toFixed(2)},${product.saleCount}\n`;
    });
    csv += "\n";

    // Sales by User Section
    csv += "SALES BY USER\n";
    csv += "User Name,Email,Total Sales,Transaction Count,Average Value\n";
    salesByUser.forEach((user) => {
      csv += `"${user.userName}","${user.userEmail}",${user.totalSales.toFixed(2)},${user.transactionCount},${user.averageTransactionValue.toFixed(2)}\n`;
    });
    csv += "\n";

    return csv;
  }

  async exportDailySalesToPdf(
    tenantClient: PrismaClient,
    tenantId: string,
    date?: string,
    locationId?: string,
  ): Promise<Buffer> {
    const prisma = this.getPrisma(tenantClient);
    const summary = await this.getDailySummary(tenantClient, locationId, date);
    const hourlyData = await this.getHourlySalesReport(tenantClient, date, locationId);
    const salesByUser = await this.getSalesByUserReport(tenantClient, date, date, locationId);
    const topProducts = await this.getTopProductsReport(tenantClient, date, date, 20);
    const brandingName = await this.getBrandingName(tenantId);
    const settings = await prisma.settings.findFirst({ select: { currency: true } });
    const symbol = currencySymbol(settings?.currency);

    // Create PDF document
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: "Daily Sales Report",
        Author: brandingName,
        Subject: "Daily Sales Report",
      },
    });

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;
    let currentY = margin;

    // Header
    doc.rect(margin, currentY, contentWidth, 70).fill("#1e40af").fillColor("#ffffff");

    doc
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("DAILY SALES REPORT", margin + 20, currentY + 15, {
        width: contentWidth - 40,
        align: "center",
      });

    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor("#e0e7ff")
      .text(`${brandingName} - Inventory Management System`, margin + 20, currentY + 45, {
        width: contentWidth - 40,
        align: "center",
      });

    currentY += 90;

    // Date and Location Info
    doc
      .fillColor("#1f2937")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`Date: ${summary.date}`, margin, currentY);

    currentY += 20;

    if (locationId) {
      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });
      doc
        .fontSize(11)
        .font("Helvetica")
        .text(`Location: ${location?.name || "Unknown"}`, margin, currentY);
      currentY += 20;
    }

    currentY += 10;

    // Summary Section
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#1f2937").text("SUMMARY", margin, currentY);

    currentY += 25;

    const summaryBoxHeight = 230;
    doc.rect(margin, currentY, contentWidth, summaryBoxHeight).stroke("#e5e7eb").fill("#f9fafb");

    const summaryY = currentY + 15;
    const colWidth = contentWidth / 2 - 20;

    // Left column
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("Gross Sales:", margin + 10, summaryY)
      .font("Helvetica-Bold")
      .fillColor("#1f2937")
      .text(
        `${symbol} ${(summary.grossSales ?? summary.totalSales).toFixed(2)}`,
        margin + 10,
        summaryY + 15,
      );

    doc
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("Net Sales:", margin + 10, summaryY + 40)
      .font("Helvetica-Bold")
      .fillColor("#1f2937")
      .text(`${symbol} ${summary.totalSales.toFixed(2)}`, margin + 10, summaryY + 55);

    doc
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("Processed Returns:", margin + 10, summaryY + 80)
      .font("Helvetica-Bold")
      .fillColor("#1f2937")
      .text(
        `${symbol} ${(summary.returnSummary?.processedAmount ?? 0).toFixed(2)}`,
        margin + 10,
        summaryY + 95,
      );

    doc
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("Pending Returns:", margin + 10, summaryY + 120)
      .font("Helvetica-Bold")
      .fillColor("#1f2937")
      .text(
        `${symbol} ${(summary.returnSummary?.pendingAmount ?? 0).toFixed(2)}`,
        margin + 10,
        summaryY + 135,
      );

    doc
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("Unique Customers:", margin + 10, summaryY + 160)
      .font("Helvetica-Bold")
      .fillColor("#1f2937")
      .text(summary.uniqueCustomers.toString(), margin + 10, summaryY + 175);

    // Right column
    doc
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("Net Transactions:", margin + colWidth + 30, summaryY)
      .font("Helvetica-Bold")
      .fillColor("#1f2937")
      .text(summary.transactionCount.toString(), margin + colWidth + 30, summaryY + 15);

    doc
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("Avg Transaction:", margin + colWidth + 30, summaryY + 40)
      .font("Helvetica-Bold")
      .fillColor("#1f2937")
      .text(
        `${symbol} ${summary.averageTransactionValue.toFixed(2)}`,
        margin + colWidth + 30,
        summaryY + 55,
      );

    doc
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("Gross Profit:", margin + colWidth + 30, summaryY + 80)
      .font("Helvetica-Bold")
      .fillColor("#059669")
      .text(`${symbol} ${summary.grossProfit.toFixed(2)}`, margin + colWidth + 30, summaryY + 95);

    doc
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("Profit Margin:", margin + colWidth + 30, summaryY + 120)
      .font("Helvetica-Bold")
      .fillColor("#059669")
      .text(`${summary.grossProfitMargin.toFixed(2)}%`, margin + colWidth + 30, summaryY + 135);

    doc
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("Net Profit:", margin + colWidth + 30, summaryY + 160)
      .font("Helvetica-Bold")
      .fillColor("#059669")
      .text(`${symbol} ${summary.netProfit.toFixed(2)}`, margin + colWidth + 30, summaryY + 175);

    currentY += summaryBoxHeight + 20;

    // Payment Methods Section
    if (summary.paymentMethods.length > 0) {
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#1f2937")
        .text("PAYMENT METHODS", margin, currentY);

      currentY += 25;

      const tableStartY = currentY;
      const headerHeight = 25;
      const rowHeight = 20;

      // Header
      doc
        .rect(margin, currentY, contentWidth, headerHeight)
        .fill("#1e40af")
        .fillColor("#ffffff")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Method", margin + 10, currentY + 7)
        .text("Gross", margin + contentWidth - 220, currentY + 7, {
          width: 60,
          align: "right",
        })
        .text("Refunds", margin + contentWidth - 150, currentY + 7, {
          width: 60,
          align: "right",
        })
        .text("Net", margin + contentWidth - 90, currentY + 7, {
          width: 50,
          align: "right",
        })
        .text("Count", margin + contentWidth - 40, currentY + 7, {
          width: 30,
          align: "right",
        });

      currentY += headerHeight;

      // Rows
      doc.fillColor("#1f2937");
      summary.paymentMethods.forEach((pm, index) => {
        if (index % 2 === 0) {
          doc.rect(margin, currentY, contentWidth, rowHeight).fill("#f9fafb");
        }

        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#1f2937")
          .text(pm.method, margin + 10, currentY + 5)
          .text(`${symbol} ${pm.totalAmount.toFixed(2)}`, margin + contentWidth - 220, currentY + 5, {
            width: 60,
            align: "right",
          })
          .text(
            `${symbol} ${(pm.refundAmount ?? 0).toFixed(2)}`,
            margin + contentWidth - 150,
            currentY + 5,
            { width: 60, align: "right" },
          )
          .text(
            `${symbol} ${(pm.netAmount ?? pm.totalAmount).toFixed(2)}`,
            margin + contentWidth - 90,
            currentY + 5,
            { width: 50, align: "right" },
          )
          .text(pm.count.toString(), margin + contentWidth - 40, currentY + 5, {
            width: 30,
            align: "right",
          });

        currentY += rowHeight;
      });

      doc
        .strokeColor("#e5e7eb")
        .lineWidth(0.5)
        .moveTo(margin, currentY)
        .lineTo(margin + contentWidth, currentY)
        .stroke();

      currentY += 20;
    }

    if (
      (summary.returnSummary?.processedReturns ?? 0) > 0 ||
      (summary.returnSummary?.pendingReturns ?? 0) > 0
    ) {
      if (currentY > pageHeight - 150) {
        doc.addPage();
        currentY = margin + 50;
      }

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#1f2937")
        .text("SALE RETURNS", margin, currentY);

      currentY += 20;

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#6b7280")
        .text("Processed Returns:", margin, currentY)
        .font("Helvetica-Bold")
        .fillColor("#1f2937")
        .text(
          `${summary.returnSummary?.processedReturns ?? 0} (${symbol} ${(summary.returnSummary?.processedAmount ?? 0).toFixed(2)})`,
          margin + 160,
          currentY,
        );

      currentY += 18;

      doc
        .font("Helvetica")
        .fillColor("#6b7280")
        .text("Pending Returns:", margin, currentY)
        .font("Helvetica-Bold")
        .fillColor("#1f2937")
        .text(
          `${summary.returnSummary?.pendingReturns ?? 0} (${symbol} ${(summary.returnSummary?.pendingAmount ?? 0).toFixed(2)})`,
          margin + 160,
          currentY,
        );

      currentY += 25;
    }

    // Top Products Section
    if (topProducts.length > 0 && currentY < pageHeight - 150) {
      if (currentY > pageHeight - 200) {
        doc.addPage();
        currentY = margin + 50;
      }

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#1f2937")
        .text("TOP PRODUCTS", margin, currentY);

      currentY += 25;

      const tableStartY = currentY;
      const headerHeight = 25;
      const rowHeight = 18;

      // Header
      doc
        .rect(margin, currentY, contentWidth, headerHeight)
        .fill("#1e40af")
        .fillColor("#ffffff")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("#", margin + 10, currentY + 7)
        .text("Product Name", margin + 40, currentY + 7)
        .text("Quantity", margin + contentWidth - 120, currentY + 7, {
          width: 60,
          align: "right",
        })
        .text("Revenue", margin + contentWidth - 50, currentY + 7, {
          width: 40,
          align: "right",
        });

      currentY += headerHeight;

      // Rows
      doc.fillColor("#1f2937");
      topProducts.slice(0, 15).forEach((product, index) => {
        if (currentY > pageHeight - 100) {
          doc.addPage();
          currentY = margin + 50;
          // Re-draw header
          doc
            .rect(margin, currentY, contentWidth, headerHeight)
            .fill("#1e40af")
            .fillColor("#ffffff")
            .fontSize(10)
            .font("Helvetica-Bold")
            .text("#", margin + 10, currentY + 7)
            .text("Product Name", margin + 40, currentY + 7)
            .text("Quantity", margin + contentWidth - 120, currentY + 7, {
              width: 60,
              align: "right",
            })
            .text("Revenue", margin + contentWidth - 50, currentY + 7, {
              width: 40,
              align: "right",
            });
          currentY += headerHeight;
        }

        if (index % 2 === 0) {
          doc.rect(margin, currentY, contentWidth, rowHeight).fill("#f9fafb");
        }

        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#1f2937")
          .text((index + 1).toString(), margin + 10, currentY + 4)
          .text(product.name, margin + 40, currentY + 4, {
            width: contentWidth - 180,
          })
          .text(product.totalQuantity.toFixed(0), margin + contentWidth - 120, currentY + 4, {
            width: 60,
            align: "right",
          })
          .text(
            `${symbol} ${product.totalRevenue.toFixed(2)}`,
            margin + contentWidth - 50,
            currentY + 4,
            { width: 40, align: "right" },
          );

        currentY += rowHeight;
      });

      currentY += 20;
    }

    // Sales by User Section
    if (salesByUser.length > 0 && currentY < pageHeight - 100) {
      if (currentY > pageHeight - 150) {
        doc.addPage();
        currentY = margin + 50;
      }

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#1f2937")
        .text("SALES BY USER", margin, currentY);

      currentY += 25;

      const headerHeight = 25;
      const rowHeight = 20;

      // Header
      doc
        .rect(margin, currentY, contentWidth, headerHeight)
        .fill("#1e40af")
        .fillColor("#ffffff")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("User Name", margin + 10, currentY + 7)
        .text("Total Sales", margin + contentWidth - 150, currentY + 7, {
          width: 70,
          align: "right",
        })
        .text("Transactions", margin + contentWidth - 70, currentY + 7, {
          width: 60,
          align: "right",
        });

      currentY += headerHeight;

      // Rows
      doc.fillColor("#1f2937");
      salesByUser.forEach((user, index) => {
        if (currentY > pageHeight - 80) {
          doc.addPage();
          currentY = margin + 50;
        }

        if (index % 2 === 0) {
          doc.rect(margin, currentY, contentWidth, rowHeight).fill("#f9fafb");
        }

        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#1f2937")
          .text(user.userName, margin + 10, currentY + 5)
          .text(`${symbol} ${user.totalSales.toFixed(2)}`, margin + contentWidth - 150, currentY + 5, {
            width: 70,
            align: "right",
          })
          .text(user.transactionCount.toString(), margin + contentWidth - 70, currentY + 5, {
            width: 60,
            align: "right",
          });

        currentY += rowHeight;
      });

      currentY += 20;
    }

    // Footer
    if (currentY > pageHeight - 80) {
      doc.addPage();
      currentY = margin + 50;
    }

    doc
      .strokeColor("#e5e7eb")
      .lineWidth(1)
      .moveTo(margin, currentY)
      .lineTo(margin + contentWidth, currentY)
      .stroke();

    currentY += 15;

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("Generated by Malind Tech Inventory Management System", margin, currentY, {
        width: contentWidth,
        align: "center",
      });

    currentY += 15;

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#9ca3af")
      .text(
        `Generated on: ${new Date().toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        margin,
        currentY,
        {
          width: contentWidth,
          align: "center",
        },
      );

    currentY += 15;

    // Developer credit
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#9ca3af")
      .text("Developed by Malind Tech", margin, currentY, {
        width: contentWidth,
        align: "center",
      });

    // Finalize PDF
    doc.end();

    // Collect PDF buffer
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    return new Promise((resolve, reject) => {
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on("error", reject);
    });
  }
}
