import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma, PrismaClient, ReceiptFormat, ReceiptType } from "@prisma/tenant-client";
import { PDFReceiptTemplate } from "./receipt-templates/pdf-template";
import { ThermalReceiptTemplate } from "./receipt-templates/thermal-template";
import { EmailReceiptDto } from "./dto/email-receipt.dto";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import * as nodemailer from "nodemailer";
import { MasterPrismaService } from "../master-prisma/master-prisma.service";
import { InvoiceSettingsService } from "../invoice-settings/invoice-settings.service";
import { currencySymbol } from "../common/utils/currency.util";

@Injectable()
export class ReceiptsService {
  private readonly receiptsDir = join(process.cwd(), "temp", "receipts");

  constructor(
    private readonly masterPrisma: MasterPrismaService,
    private readonly invoiceSettingsService: InvoiceSettingsService,
  ) {
    // Ensure receipts directory exists
    if (!existsSync(this.receiptsDir)) {
      mkdirSync(this.receiptsDir, { recursive: true });
    }
  }

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

  private getPrisma(tenantClient?: PrismaClient | Prisma.TransactionClient) {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for receipt operations");
    }

    return tenantClient;
  }

  /** Resolve the tenant's configured currency symbol from Settings (defaults to "Rs."). */
  private async getCurrencySymbol(
    prisma: PrismaClient | Prisma.TransactionClient,
  ): Promise<string> {
    try {
      const settings = await prisma.settings.findFirst({ select: { currency: true } });
      return currencySymbol(settings?.currency);
    } catch {
      return currencySymbol(null);
    }
  }

  async generatePDF(
    tenantClient: PrismaClient,
    tenantId: string,
    saleId: string,
    userId: string,
  ): Promise<{ receipt: any; filePath: string | null; fileName: string }> {
    const prisma = this.getPrisma(tenantClient);
    const sale = await this.getSaleWithRelations(prisma, saleId);
    const brandingName = await this.getBrandingName(tenantId);
    const invoiceSettings = await this.invoiceSettingsService.getSettings(tenantClient);
    const symbol = await this.getCurrencySymbol(prisma);

    // Check if a PDF receipt already exists for this sale
    const existingReceipt = await prisma.receipt.findFirst({
      where: {
        saleId,
        format: ReceiptFormat.PDF,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // If receipt exists, return it (but update the PDF file to ensure latest data)
    if (existingReceipt) {
      const template = new PDFReceiptTemplate(brandingName, invoiceSettings, symbol);
      const doc = template.generateReceipt(sale);

      // Update the PDF file with latest data
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));

      return new Promise<{
        receipt: any;
        filePath: string | null;
        fileName: string;
      }>((resolve, reject) => {
        doc.on("end", async () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            if (existingReceipt.filePath) {
              writeFileSync(existingReceipt.filePath, pdfBuffer);
            }

            resolve({
              receipt: existingReceipt,
              filePath: existingReceipt.filePath,
              fileName: `receipt-${existingReceipt.receiptNumber}.pdf`,
            });
          } catch (error) {
            reject(error);
          }
        });

        doc.on("error", reject);
        doc.end();
      });
    }

    // No existing receipt, create a new one
    const template = new PDFReceiptTemplate(brandingName, invoiceSettings, symbol);
    const doc = template.generateReceipt(sale);

    // Generate receipt number
    const receiptNumber = await this.generateReceiptNumber(prisma);

    // Create file path
    const fileName = `receipt-${receiptNumber}.pdf`;
    const filePath = join(this.receiptsDir, fileName);

    // Write PDF to file
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    return new Promise<{ receipt: any; filePath: string; fileName: string }>((resolve, reject) => {
      doc.on("end", async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          writeFileSync(filePath, pdfBuffer);

          // Create receipt record
          const receipt = await prisma.receipt.create({
            data: {
              saleId,
              receiptNumber,
              receiptType: ReceiptType.ORIGINAL,
              format: ReceiptFormat.PDF,
              filePath,
              generatedBy: userId,
            },
          });

          resolve({
            receipt,
            filePath,
            fileName,
          });
        } catch (error) {
          reject(error);
        }
      });

      doc.on("error", reject);
      doc.end();
    });
  }

  async generateThermal(
    tenantClient: PrismaClient,
    tenantId: string,
    saleId: string,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);
    const sale = await this.getSaleWithRelations(prisma, saleId);
    const brandingName = await this.getBrandingName(tenantId);
    const symbol = await this.getCurrencySymbol(prisma);

    // Check if a thermal receipt already exists for this sale
    const existingReceipt = await prisma.receipt.findFirst({
      where: {
        saleId,
        format: ReceiptFormat.THERMAL,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Generate thermal text (always regenerate to ensure latest data)
    const template = new ThermalReceiptTemplate();
    const thermalText = template.generateReceipt(sale, brandingName, symbol);

    // If receipt exists, return it with updated thermal text
    if (existingReceipt) {
      return {
        receipt: existingReceipt,
        thermalText,
      };
    }

    // No existing receipt, create a new one
    // Generate receipt number
    const receiptNumber = await this.generateReceiptNumber(prisma);

    // Create receipt record (no file path for thermal)
    const receipt = await prisma.receipt.create({
      data: {
        saleId,
        receiptNumber,
        receiptType: ReceiptType.ORIGINAL,
        format: ReceiptFormat.THERMAL,
        generatedBy: userId,
      },
    });

    return {
      receipt,
      thermalText,
    };
  }

  async emailReceipt(
    tenantClient: PrismaClient,
    tenantId: string,
    saleId: string,
    emailReceiptDto: EmailReceiptDto,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);
    const sale = await this.getSaleWithRelations(prisma, saleId);

    if (!sale.customer?.email && !emailReceiptDto.emailAddress) {
      throw new BadRequestException("No email address available for customer");
    }

    const emailAddress = emailReceiptDto.emailAddress || sale.customer!.email!;
    const symbol = await this.getCurrencySymbol(prisma);

    // Generate PDF receipt
    const { receipt, filePath, fileName } = await this.generatePDF(
      tenantClient,
      tenantId,
      saleId,
      userId,
    );

    // Create email transporter (configure with your SMTP settings)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.SMTP_FROM || "noreply@malindtech.com",
      to: emailAddress,
      subject: `Receipt for Sale ${sale.saleNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank you for your purchase!</h2>
          <p>Please find your receipt attached for sale <strong>${sale.saleNumber}</strong>.</p>
          <p><strong>Sale Details:</strong></p>
          <ul>
            <li>Date: ${new Date(sale.saleDate).toLocaleDateString()}</li>
            <li>Total Amount: ${symbol} ${Number(sale.totalAmount).toFixed(2)}</li>
          </ul>
          <p>If you have any questions about this receipt, please contact us.</p>
          <p>Best regards,<br>Malind Tech Solutions</p>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          path: filePath,
        },
      ],
    };

    try {
      const result = await transporter.sendMail(mailOptions);

      // Update receipt record with email info
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          emailedTo: emailAddress,
          emailedAt: new Date(),
        },
      });

      return {
        success: true,
        messageId: result.messageId,
        emailAddress,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  async getReceiptsBySale(tenantClient: PrismaClient, saleId: string) {
    const prisma = this.getPrisma(tenantClient);
    return prisma.receipt.findMany({
      where: { saleId },
      include: {},
      orderBy: { createdAt: "desc" },
    });
  }

  async downloadReceipt(tenantClient: PrismaClient, receiptId: string) {
    const prisma = this.getPrisma(tenantClient);
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
    });

    if (!receipt) {
      throw new NotFoundException("Receipt not found");
    }

    if (receipt.format !== ReceiptFormat.PDF) {
      throw new BadRequestException("Only PDF receipts can be downloaded");
    }

    if (!receipt.filePath) {
      throw new BadRequestException("Receipt file not found");
    }

    // Increment print count
    await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        printCount: { increment: 1 },
        printedAt: new Date(),
      },
    });

    return {
      filePath: receipt.filePath,
      fileName: `receipt-${receipt.receiptNumber}.pdf`,
    };
  }

  async getThermalReceipt(tenantClient: PrismaClient, tenantId: string, receiptId: string) {
    const prisma = this.getPrisma(tenantClient);
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
    });

    if (!receipt) {
      throw new NotFoundException("Receipt not found");
    }

    if (receipt.format !== ReceiptFormat.THERMAL) {
      throw new BadRequestException("Only thermal receipts can be retrieved as text");
    }

    // Get sale data and generate thermal text
    const sale = await this.getSaleWithRelations(prisma, receipt.saleId);
    const brandingName = await this.getBrandingName(tenantId);
    const symbol = await this.getCurrencySymbol(prisma);
    const template = new ThermalReceiptTemplate();
    const thermalText = template.generateReceipt(sale, brandingName, symbol);

    // Increment print count
    await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        printCount: { increment: 1 },
        printedAt: new Date(),
      },
    });

    return {
      thermalText,
      receiptNumber: receipt.receiptNumber,
    };
  }

  private async getSaleWithRelations(
    prisma: PrismaClient | Prisma.TransactionClient,
    saleId: string,
  ) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        saleItems: {
          include: { product: true },
        },
        payments: true,
      },
    });

    if (!sale) {
      throw new NotFoundException("Sale not found");
    }

    return sale;
  }

  private async generateReceiptNumber(
    prisma: PrismaClient | Prisma.TransactionClient,
  ): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    const lastReceipt = await prisma.receipt.findFirst({
      where: {
        receiptNumber: {
          startsWith: `RCP-${dateStr}`,
        },
      },
      orderBy: { receiptNumber: "desc" },
    });

    let sequence = 1;
    if (lastReceipt) {
      const lastSequence = parseInt(lastReceipt.receiptNumber.split("-")[2]);
      sequence = lastSequence + 1;
    }

    return `RCP-${dateStr}-${sequence.toString().padStart(4, "0")}`;
  }
}
