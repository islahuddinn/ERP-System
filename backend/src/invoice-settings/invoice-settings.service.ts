import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaClient, InvoiceSettings } from "@prisma/tenant-client";
import { UpdateInvoiceSettingsDto } from "./dto/update-invoice-settings.dto";

@Injectable()
export class InvoiceSettingsService {
  private readonly logger = new Logger(InvoiceSettingsService.name);

  private getPrisma(tenantClient?: PrismaClient): PrismaClient {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for invoice settings operations");
    }
    return tenantClient;
  }

  /**
   * Get default invoice settings matching current hardcoded values
   */
  getDefaultSettings(): Omit<InvoiceSettings, "id" | "createdAt" | "updatedAt"> {
    return {
      // Page Settings
      pageSize: "A4",
      pageOrientation: "portrait",
      customPageWidth: null,
      customPageHeight: null,
      margin: 16,

      // Header Settings
      showLogo: false,
      logoSize: 50,
      logoPosition: "center",
      brandNameFontSize: 19,
      brandNameColor: "#111827",
      receiptTitle: "SALES RECEIPT",
      receiptTitleFontSize: 11,
      showLocationAddress: true,

      // Content Settings
      showCustomerInfo: true,
      customerInfoFontSize: 11,
      showItemsTable: true,
      itemsTableFontSize: 9,
      showPayments: true,
      paymentsFontSize: 9,

      // Footer Settings
      footerText: null,
      showFooter: true,
      footerFontSize: 8,
      footerColor: "#9ca3af",

      // Color Scheme
      dividerColor: "#d1d5db",
      dividerStyle: "dashed",
      backgroundColor: null,
      textColor: "#111827",
    };
  }

  /**
   * Get current invoice settings, creating default if none exist
   */
  async getSettings(tenantClient: PrismaClient): Promise<InvoiceSettings> {
    const prisma = this.getPrisma(tenantClient);

    // Try to find existing settings
    const existingSettings = await prisma.invoiceSettings.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (existingSettings) {
      return existingSettings;
    }

    // No settings exist, create default
    this.logger.log("No invoice settings found, creating default settings");
    const defaultSettings = this.getDefaultSettings();

    const newSettings = await prisma.invoiceSettings.create({
      data: defaultSettings,
    });

    return newSettings;
  }

  /**
   * Update invoice settings
   */
  async updateSettings(
    tenantClient: PrismaClient,
    updateDto: UpdateInvoiceSettingsDto,
  ): Promise<InvoiceSettings> {
    const prisma = this.getPrisma(tenantClient);

    // Get or create settings
    const existingSettings = await this.getSettings(tenantClient);

    // Update settings
    const updatedSettings = await prisma.invoiceSettings.update({
      where: { id: existingSettings.id },
      data: {
        // Page Settings
        pageSize: updateDto.pageSize ?? existingSettings.pageSize,
        pageOrientation: updateDto.pageOrientation ?? existingSettings.pageOrientation,
        customPageWidth:
          updateDto.customPageWidth !== undefined
            ? updateDto.customPageWidth
            : existingSettings.customPageWidth,
        customPageHeight:
          updateDto.customPageHeight !== undefined
            ? updateDto.customPageHeight
            : existingSettings.customPageHeight,
        margin: updateDto.margin ?? existingSettings.margin,

        // Header Settings
        showLogo: updateDto.showLogo ?? existingSettings.showLogo,
        logoSize: updateDto.logoSize ?? existingSettings.logoSize,
        logoPosition: updateDto.logoPosition ?? existingSettings.logoPosition,
        brandNameFontSize: updateDto.brandNameFontSize ?? existingSettings.brandNameFontSize,
        brandNameColor: updateDto.brandNameColor ?? existingSettings.brandNameColor,
        receiptTitle: updateDto.receiptTitle ?? existingSettings.receiptTitle,
        receiptTitleFontSize:
          updateDto.receiptTitleFontSize ?? existingSettings.receiptTitleFontSize,
        showLocationAddress: updateDto.showLocationAddress ?? existingSettings.showLocationAddress,

        // Content Settings
        showCustomerInfo: updateDto.showCustomerInfo ?? existingSettings.showCustomerInfo,
        customerInfoFontSize:
          updateDto.customerInfoFontSize ?? existingSettings.customerInfoFontSize,
        showItemsTable: updateDto.showItemsTable ?? existingSettings.showItemsTable,
        itemsTableFontSize: updateDto.itemsTableFontSize ?? existingSettings.itemsTableFontSize,
        showPayments: updateDto.showPayments ?? existingSettings.showPayments,
        paymentsFontSize: updateDto.paymentsFontSize ?? existingSettings.paymentsFontSize,

        // Footer Settings
        footerText:
          updateDto.footerText !== undefined ? updateDto.footerText : existingSettings.footerText,
        showFooter: updateDto.showFooter ?? existingSettings.showFooter,
        footerFontSize: updateDto.footerFontSize ?? existingSettings.footerFontSize,
        footerColor: updateDto.footerColor ?? existingSettings.footerColor,

        // Color Scheme
        dividerColor: updateDto.dividerColor ?? existingSettings.dividerColor,
        dividerStyle: updateDto.dividerStyle ?? existingSettings.dividerStyle,
        backgroundColor:
          updateDto.backgroundColor !== undefined
            ? updateDto.backgroundColor
            : existingSettings.backgroundColor,
        textColor: updateDto.textColor ?? existingSettings.textColor,
      },
    });

    this.logger.log("Invoice settings updated successfully");
    return updatedSettings;
  }
}
