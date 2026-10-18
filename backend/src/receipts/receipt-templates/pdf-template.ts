import PDFDocument from "pdfkit";
import { Sale, Customer, SaleItem, Payment, InvoiceSettings } from "@prisma/tenant-client";

export interface SaleWithRelations extends Sale {
  customer?: Customer | null;
  saleItems: (SaleItem & { product?: any })[];
  payments: Payment[];
  customerBalanceDue?: number | null;
  projectedBalanceAfterInvoice?: number | null;
}

export class PDFReceiptTemplate {
  private doc: InstanceType<typeof PDFDocument>;
  private pageSize: [number, number];
  private brandingName: string;
  private settings: InvoiceSettings;
  private margin: number;
  private pageWidth: number;
  private pageHeight: number;
  private contentWidth: number;
  private currentY: number;
  private currencySymbol: string;

  constructor(
    brandingName: string = "Malind Tech",
    settings: InvoiceSettings,
    currencySymbol: string = "Rs.",
  ) {
    this.brandingName = brandingName;
    this.settings = settings;
    this.currencySymbol = currencySymbol;
    this.margin = settings.margin;

    // Calculate page size based on settings
    this.pageSize = this.calculatePageSize();

    this.doc = new PDFDocument({
      size: this.pageSize,
      margin: this.margin,
      layout: settings.pageOrientation as "portrait" | "landscape",
      info: {
        Title: "Sales Receipt",
        Author: brandingName,
        Subject: "Sales Receipt",
      },
    });

    this.pageWidth = this.doc.page.width;
    this.pageHeight = this.doc.page.height;
    this.contentWidth = this.pageWidth - this.margin * 2;
    this.currentY = this.margin;
  }

  private calculatePageSize(): [number, number] {
    // Standard page sizes in points (1 point = 1/72 inch)
    // For PDFKit, we need to convert mm to points: 1mm = 2.83465 points
    const mmToPoints = (mm: number) => mm * 2.83465;

    if (
      this.settings.pageSize === "CUSTOM" &&
      this.settings.customPageWidth &&
      this.settings.customPageHeight
    ) {
      return [
        mmToPoints(this.settings.customPageWidth),
        mmToPoints(this.settings.customPageHeight),
      ];
    }

    // Standard sizes
    switch (this.settings.pageSize) {
      case "A5":
        return this.settings.pageOrientation === "landscape"
          ? [595.28, 420.89] // A5 landscape
          : [420.89, 595.28]; // A5 portrait
      case "A6":
        return this.settings.pageOrientation === "landscape"
          ? [420.89, 297.64] // A6 landscape
          : [297.64, 420.89]; // A6 portrait
      case "A4":
      default:
        return this.settings.pageOrientation === "landscape"
          ? [841.89, 595.28] // A4 landscape
          : [595.28, 841.89]; // A4 portrait
    }
  }

  generateReceipt(sale: SaleWithRelations): InstanceType<typeof PDFDocument> {
    // Apply background color if set
    if (this.settings.backgroundColor) {
      this.doc.rect(0, 0, this.pageWidth, this.pageHeight).fill(this.settings.backgroundColor);
    }

    this.addHeader(sale);
    this.addSaleInfo(sale);

    if (this.settings.showCustomerInfo) {
      this.addCustomerInfo(sale.customer);
    }

    if (this.settings.showItemsTable) {
      this.addItemsTable(sale.saleItems);
    }

    this.addTotals(sale);

    if (this.settings.showPayments) {
      this.addPayments(sale.payments);
    }

    if (this.settings.showFooter) {
      this.addFooter();
    }

    return this.doc;
  }

  private ensureSpace(required: number) {
    if (this.currentY + required > this.pageHeight - this.margin) {
      this.doc.addPage({
        size: this.pageSize,
        margin: this.margin,
        layout: this.settings.pageOrientation as "portrait" | "landscape",
      });
      this.pageWidth = this.doc.page.width;
      this.pageHeight = this.doc.page.height;
      this.contentWidth = this.pageWidth - this.margin * 2;
      this.currentY = this.margin;
    }
  }

  private drawDivider() {
    const dashPattern =
      this.settings.dividerStyle === "solid"
        ? undefined
        : this.settings.dividerStyle === "dotted"
          ? { space: 1 }
          : { space: 2 };

    this.doc.save();

    if (dashPattern) {
      this.doc.dash(3, dashPattern);
    }

    this.doc
      .strokeColor(this.settings.dividerColor)
      .lineWidth(0.8)
      .moveTo(this.margin, this.currentY)
      .lineTo(this.margin + this.contentWidth, this.currentY)
      .stroke();

    if (dashPattern) {
      this.doc.undash();
    }

    this.doc.restore();
    this.currentY += 6;
  }

  private addHeader(sale: SaleWithRelations) {
    const brandLabel = this.brandingName?.toUpperCase?.() || this.brandingName;

    // Brand name
    this.doc
      .font("Helvetica-Bold")
      .fontSize(this.settings.brandNameFontSize)
      .fillColor(this.settings.brandNameColor)
      .text(brandLabel, this.margin, this.currentY, {
        width: this.contentWidth,
        align: "center",
      });
    this.currentY += this.settings.brandNameFontSize * 0.9;

    // Receipt title
    this.doc
      .font("Helvetica")
      .fontSize(this.settings.receiptTitleFontSize)
      .fillColor(this.settings.textColor)
      .text(this.settings.receiptTitle, this.margin, this.currentY, {
        width: this.contentWidth,
        align: "center",
      });
    this.currentY += 10;

    this.drawDivider();
  }

  private addSaleInfo(sale: SaleWithRelations) {
    const infoRows = [
      { label: "Receipt #", value: sale.saleNumber },
      {
        label: "Date",
        value: new Date(sale.saleDate).toLocaleDateString("en-US"),
      },
      {
        label: "Time",
        value: new Date(sale.saleDate).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ];

    const gap = 12;
    const cardWidth = (this.contentWidth - gap) / 2;
    const cardHeight = 24;

    for (let i = 0; i < infoRows.length; i += 2) {
      const rowPair = infoRows.slice(i, i + 2);
      let x = this.margin;

      rowPair.forEach((row) => {
        this.doc
          .save()
          .roundedRect(x, this.currentY, cardWidth, cardHeight, 6)
          .fill("#f3f4f6")
          .restore();

        this.doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#6b7280")
          .text(row.label, x + 8, this.currentY + 3);
        this.doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor(this.settings.textColor)
          .text(row.value, x + 8, this.currentY + 14, {
            width: cardWidth - 16,
          });

        x += cardWidth + gap;
      });

      this.currentY += cardHeight + 4;
    }

    this.currentY += 1;
    this.drawDivider();
  }

  private addCustomerInfo(customer: Customer | null | undefined) {
    const blockStartY = this.currentY;

    this.doc
      .font("Helvetica-Bold")
      .fontSize(this.settings.customerInfoFontSize)
      .fillColor(this.settings.textColor)
      .text("Buyer Details", this.margin, this.currentY);
    this.currentY += 10;

    const name = customer?.shopName || "Walk-in Customer";
    const phone = customer?.phone || "";
    const address = customer?.address || "";

    this.doc
      .font("Helvetica-Bold")
      .fontSize(this.settings.customerInfoFontSize)
      .fillColor(this.settings.textColor)
      .text(name, this.margin + 12, this.currentY);

    this.doc
      .font("Helvetica")
      .fontSize(this.settings.customerInfoFontSize * 0.95)
      .fillColor(this.settings.textColor)
      .text(phone || "—", this.margin + this.contentWidth / 2, this.currentY, {
        width: this.contentWidth / 2 - 12,
        align: "right",
      });

    this.currentY += 14;

    if (address.trim()) {
      this.doc
        .font("Helvetica")
        .fontSize(this.settings.customerInfoFontSize * 0.9)
        .fillColor("#6b7280")
        .text(address, this.margin + 12, this.currentY, {
          width: this.contentWidth - 24,
        });
      this.currentY += 14;
    } else {
      this.currentY += 4;
    }

    const blockHeight = this.currentY - blockStartY + 6;
    this.doc
      .save()
      .roundedRect(this.margin, blockStartY, this.contentWidth, blockHeight, 8)
      .lineWidth(1)
      .strokeColor(this.settings.dividerColor)
      .stroke()
      .restore();

    this.currentY += 10;
    this.drawDivider();
  }

  private addItemsTable(saleItems: (SaleItem & { product?: any })[]) {
    this.doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(this.settings.textColor)
      .text("Items", this.margin, this.currentY);
    this.currentY += 10;

    const columns = [
      {
        label: "Item",
        width: this.contentWidth * 0.35,
        align: "left" as const,
      },
      {
        label: "Qty",
        width: this.contentWidth * 0.12,
        align: "center" as const,
      },
      {
        label: "Rate",
        width: this.contentWidth * 0.17,
        align: "right" as const,
      },
      {
        label: "Disc",
        width: this.contentWidth * 0.16,
        align: "right" as const,
      },
      {
        label: "Value",
        width: this.contentWidth * 0.2,
        align: "right" as const,
      },
    ];

    this.doc
      .save()
      .roundedRect(this.margin, this.currentY - 2, this.contentWidth, 20, 4)
      .fill("#f3f4f6")
      .restore();

    this.doc.font("Helvetica-Bold").fontSize(8).fillColor(this.settings.textColor);
    let x = this.margin;
    columns.forEach((col) => {
      this.doc.text(col.label, x + 2, this.currentY + 2, {
        width: col.width - 4,
        align: col.align,
      });
      x += col.width;
    });
    this.currentY += 18;

    if (saleItems.length === 0) {
      this.doc
        .font("Helvetica")
        .fontSize(this.settings.itemsTableFontSize)
        .fillColor("#9ca3af")
        .text("No items found", this.margin, this.currentY);
      this.currentY += 12;
      this.drawDivider();
      return;
    }

    saleItems.forEach((item, itemIdx) => {
      this.ensureSpace(16);
      x = this.margin;
      const values = [
        item.itemName,
        item.quantity.toString(),
        `${this.currencySymbol} ${Number(item.unitPrice).toFixed(2)}`,
        item.itemDiscountAmount && Number(item.itemDiscountAmount) > 0
          ? `-${this.currencySymbol} ${Number(item.itemDiscountAmount).toFixed(2)}`
          : "-",
        `${this.currencySymbol} ${Number(item.lineTotal).toFixed(2)}`,
      ];
      const aligns = ["left", "center", "right", "right", "right"] as const;

      values.forEach((value, idx) => {
        this.doc
          .font("Helvetica")
          .fontSize(this.settings.itemsTableFontSize)
          .fillColor(this.settings.textColor)
          .text(value, x, this.currentY, {
            width: columns[idx].width - 4,
            align: aligns[idx],
          });
        x += columns[idx].width;
      });

      this.currentY += 14;

      if (itemIdx < saleItems.length - 1) {
        this.doc
          .strokeColor("#e5e7eb")
          .lineWidth(0.5)
          .moveTo(this.margin, this.currentY)
          .lineTo(this.margin + this.contentWidth, this.currentY)
          .stroke();
        this.currentY += 4;
      }
    });

    this.drawDivider();
  }

  private addTotals(sale: SaleWithRelations) {
    const rows: Array<{ label: string; value: string; highlight?: boolean }> = [
      { label: "Subtotal", value: `${this.currencySymbol} ${Number(sale.subtotal).toFixed(2)}` },
    ];

    if (Number(sale.discountAmount) > 0) {
      rows.push({
        label: "Discount",
        value: `-${this.currencySymbol} ${Number(sale.discountAmount).toFixed(2)}`,
      });
    }

    if (Number(sale.taxAmount) > 0) {
      rows.push({
        label: `Sales Tax (${Number(sale.taxPercentage).toFixed(1)}%)`,
        value: `${this.currencySymbol} ${Number(sale.taxAmount).toFixed(2)}`,
      });
    }

    rows.push({
      label: "Total",
      value: `${this.currencySymbol} ${Number(sale.totalAmount).toFixed(2)}`,
      highlight: true,
    });

    const summaryStartY = this.currentY;
    this.doc
      .save()
      .roundedRect(this.margin, summaryStartY - 4, this.contentWidth, rows.length * 20 + 16, 8)
      .fill("#f8fafc")
      .restore();

    this.doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(this.settings.textColor)
      .text("Summary", this.margin + 10, summaryStartY);
    this.currentY += 16;

    rows.forEach((row, idx) => {
      this.doc
        .font(row.highlight ? "Helvetica-Bold" : "Helvetica")
        .fontSize(row.highlight ? 12 : 10)
        .fillColor("#4b5563")
        .text(row.label, this.margin + 12, this.currentY);
      this.doc
        .font(row.highlight ? "Helvetica-Bold" : "Helvetica")
        .fontSize(row.highlight ? 12 : 10)
        .fillColor(this.settings.textColor)
        .text(row.value, this.margin, this.currentY, {
          width: this.contentWidth - 20,
          align: "right",
        });
      this.currentY += 18;

      if (idx < rows.length - 1) {
        this.doc
          .strokeColor("#e5e7eb")
          .lineWidth(0.5)
          .moveTo(this.margin + 12, this.currentY - 4)
          .lineTo(this.margin + this.contentWidth - 12, this.currentY - 4)
          .stroke();
      }
    });

    if (sale.customerBalanceDue !== null && sale.customerBalanceDue !== undefined) {
      this.currentY += 4;
      const outstandingStart = this.currentY;
      const outstandingHeight = 38;
      this.doc
        .save()
        .roundedRect(this.margin, outstandingStart, this.contentWidth, outstandingHeight, 6)
        .fill("#fffbeb")
        .restore();

      this.doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#92400e")
        .text("Outstanding (before):", this.margin + 10, outstandingStart + 8);
      this.doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#92400e")
        .text(
          `${this.currencySymbol} ${Number(sale.customerBalanceDue).toFixed(2)}`,
          this.margin,
          outstandingStart + 8,
          {
            width: this.contentWidth - 10,
            align: "right",
          },
        );

      this.doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#92400e")
        .text("Projected (after):", this.margin + 10, outstandingStart + 22);
      this.doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#92400e")
        .text(
          `${this.currencySymbol} ${Number(sale.projectedBalanceAfterInvoice ?? sale.customerBalanceDue).toFixed(2)}`,
          this.margin,
          outstandingStart + 22,
          { width: this.contentWidth - 10, align: "right" },
        );
      this.currentY += outstandingHeight + 8;
    }

    this.drawDivider();
  }

  private addPayments(payments: Payment[]) {
    if (!payments.length) {
      return;
    }

    this.doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(this.settings.textColor)
      .text("Payments", this.margin, this.currentY);
    this.currentY += 12;

    payments.forEach((payment) => {
      this.ensureSpace(32);
      this.doc
        .font("Helvetica-Bold")
        .fontSize(this.settings.paymentsFontSize)
        .fillColor(this.settings.textColor)
        .text(payment.paymentMethod, this.margin, this.currentY);
      this.doc
        .font("Helvetica-Bold")
        .fontSize(this.settings.paymentsFontSize)
        .fillColor(this.settings.textColor)
        .text(`${this.currencySymbol} ${Number(payment.amount).toFixed(2)}`, this.margin, this.currentY, {
          width: this.contentWidth,
          align: "right",
        });
      this.currentY += 11;

      if (payment.referenceNumber) {
        this.doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#6b7280")
          .text(`Ref: ${payment.referenceNumber}`, this.margin, this.currentY);
        this.currentY += 10;
      }

      this.doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#6b7280")
        .text(new Date(payment.paymentDate).toLocaleString(), this.margin, this.currentY);
      this.currentY += 12;
    });

    this.drawDivider();
  }

  private addFooter() {
    const footerHeight = 34;
    this.ensureSpace(footerHeight);

    const footerText = this.settings.footerText || "Developed by Malind Tech Limited";

    this.doc
      .font("Helvetica")
      .fontSize(this.settings.footerFontSize)
      .fillColor(this.settings.footerColor)
      .text(footerText, this.margin, this.currentY, {
        width: this.contentWidth,
        align: "center",
      });
    this.currentY += 12;
  }
}
