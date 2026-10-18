import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";
import { AuditService } from "../audit/audit.service";
import { ActorType } from "../audit/utils/types";

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private auditService: AuditService) {}

  /**
   * Generate invoice for a sale (called when sale is confirmed/completed)
   */
  async generateInvoiceForSale(
    tenantClient: PrismaClient,
    saleId: string,
    userId: string,
    tenantId: string,
  ) {
    const sale = await tenantClient.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        saleItems: { include: { product: true } },
      },
    });

    if (!sale) {
      throw new NotFoundException("Sale not found");
    }

    // Check if invoice already exists
    if (sale.invoiceId) {
      this.logger.warn(`Invoice already exists for sale ${saleId}`);
      return await this.findOne(tenantClient, sale.invoiceId);
    }

    // Calculate invoice amounts
    const subtotal = sale.subtotal;
    const taxAmount = sale.taxAmount;
    const totalAmount = sale.totalAmount;

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(tenantClient);

    // Calculate due date (Net 15 days default)
    const dueDate = new Date(sale.saleDate);
    dueDate.setDate(dueDate.getDate() + 15);

    // Create invoice in transaction
    const invoice = await tenantClient.$transaction(async (tx) => {
      // Create invoice
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          saleId: sale.id,
          customerId: sale.customerId,
          invoiceDate: sale.saleDate,
          dueDate,
          subtotal,
          taxAmount,
          totalAmount,
          balanceDue: totalAmount,
          status: "PENDING",
          createdById: userId,
        },
      });

      // Link invoice to sale
      await tx.sale.update({
        where: { id: saleId },
        data: { invoiceId: newInvoice.id },
      });

      return newInvoice;
    });

    // Audit log
    await this.auditService.log(tenantClient, {
      actorId: userId,
      actorType: ActorType.USER,
      entityName: "Invoice",
      entityId: invoice.id,
      action: "CREATE",
      newValue: {
        invoiceNumber: invoice.invoiceNumber,
        saleId: invoice.saleId,
        totalAmount: invoice.totalAmount,
      },
    });

    this.logger.log(`Invoice generated: ${invoice.invoiceNumber} for sale ${sale.saleNumber}`);

    return invoice;
  }

  /**
   * Record payment against invoice
   */
  async recordPayment(
    tenantClient: PrismaClient,
    invoiceId: string,
    paymentAmount: number,
    paymentMethod: string,
    userId: string,
  ) {
    const invoice = await tenantClient.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    const payment = Number(paymentAmount);
    const newBalanceDue = Number(invoice.balanceDue) - payment;
    const newStatus = newBalanceDue <= 0 ? "PAID" : "PARTIAL";

    // Update invoice and sale in transaction
    const result = await tenantClient.$transaction(async (tx) => {
      // Update invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paymentReceived: Number(invoice.paymentReceived) + payment,
          balanceDue: newBalanceDue < 0 ? 0 : newBalanceDue,
          status: newStatus as any,
        },
      });

      // Create payment record
      const paymentRecord = await tx.customerPayment.create({
        data: {
          saleId: invoice.saleId,
          invoiceId: invoice.id,
          amount: payment,
          paymentMethod,
          paymentDate: new Date(),
          processedById: userId,
        },
      });

      // Update sale payment status and amount
      await tx.sale.update({
        where: { id: invoice.saleId },
        data: {
          amountPaid: { increment: payment },
          paymentStatus: newStatus === "PAID" ? "PAID" : "PARTIAL",
        },
      });

      return { invoice: updatedInvoice, payment: paymentRecord };
    });

    // Audit log
    await this.auditService.log(tenantClient, {
      actorId: userId,
      actorType: ActorType.USER,
      entityName: "Invoice",
      entityId: invoiceId,
      action: "PAYMENT_RECORDED",
      oldValue: {
        balanceDue: invoice.balanceDue.toString(),
        status: invoice.status,
      },
      newValue: {
        balanceDue: result.invoice.balanceDue.toString(),
        status: result.invoice.status,
      },
    });

    this.logger.log(`Payment recorded: ${payment} for invoice ${invoice.invoiceNumber}`);

    return result.invoice;
  }

  /**
   * Get invoice details
   */
  async findOne(tenantClient: PrismaClient, invoiceId: string) {
    const invoice = await tenantClient.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        sale: { include: { saleItems: { include: { product: true } } } },
        customer: true,
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    return invoice;
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(tenantClient: PrismaClient): Promise<string> {
    const latestInvoice = await tenantClient.invoice.findFirst({
      orderBy: { createdAt: "desc" },
      select: { invoiceNumber: true },
    });

    let nextNumber = 1;
    if (latestInvoice) {
      const match = latestInvoice.invoiceNumber.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    return `INV-${year}${month}-${String(nextNumber).padStart(6, "0")}`;
  }
}
