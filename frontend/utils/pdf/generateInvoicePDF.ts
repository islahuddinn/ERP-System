import jsPDF from 'jspdf';
import { formatCurrency, formatBalanceStatus } from '@/lib/currency';
import { InvoiceData } from '@/types/pos';
import { InvoiceSettings } from '@/hooks/useInvoiceSettings';

// Helper to get page size for jsPDF
const getPageSize = (settings?: InvoiceSettings | null): [string, number, number] => {
  if (!settings) {
    return ['p', 148, 210]; // A5 portrait default
  }

  if (settings.pageSize === 'CUSTOM' && settings.customPageWidth && settings.customPageHeight) {
    return [settings.pageOrientation === 'landscape' ? 'l' : 'p', settings.customPageWidth, settings.customPageHeight];
  }

  switch (settings.pageSize) {
    case 'A4':
      return [settings.pageOrientation === 'landscape' ? 'l' : 'p', 210, 297];
    case 'A5':
      return [settings.pageOrientation === 'landscape' ? 'l' : 'p', 148, 210];
    case 'A6':
      return [settings.pageOrientation === 'landscape' ? 'l' : 'p', 105, 148];
    default:
      return ['p', 148, 210]; // A5 portrait default
  }
};

// Helper to convert hex color to RGB
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
};

export const generateInvoicePDF = (
  invoiceData: InvoiceData,
  brandingName: string = 'Malind Tech',
  settings?: InvoiceSettings | null
) => {
  try {
    // Use settings or defaults
    const s = settings || {
      pageSize: 'A5',
      pageOrientation: 'portrait',
      margin: 10,
      brandNameFontSize: 19,
      brandNameColor: '#111827',
      receiptTitle: 'SALES RECEIPT',
      receiptTitleFontSize: 11,
      showLocationAddress: true,
      showCustomerInfo: true,
      customerInfoFontSize: 11,
      showItemsTable: true,
      itemsTableFontSize: 9,
      showPayments: true,
      paymentsFontSize: 9,
      footerText: null,
      showFooter: true,
      footerFontSize: 8,
      footerColor: '#9ca3af',
      dividerColor: '#d1d5db',
      dividerStyle: 'dashed',
      backgroundColor: null,
      textColor: '#111827',
    } as InvoiceSettings;

    const [orientation, pageWidth, pageHeight] = getPageSize(s);
    const pdf = new jsPDF(orientation as 'p' | 'l', 'mm', [pageWidth, pageHeight]);
    const margin = s.margin || 10;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const formatDate = (date: Date) =>
      date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    const addKeyValue = (label: string, value: string, fontSize?: number) => {
      pdf.setFontSize(fontSize || s.customerInfoFontSize || 9);
      pdf.text(`${label}:`, margin, y);
      pdf.text(value, margin + 35, y);
      y += 5;
    };

    const addDivider = () => {
      const [r, g, b] = hexToRgb(s.dividerColor || '#d1d5db');
      pdf.setDrawColor(r, g, b);

      // Apply divider style
      if (s.dividerStyle === 'dashed') {
        // jsPDF doesn't support dashed lines directly, so we'll use a solid line
        pdf.line(margin, y, margin + contentWidth, y);
      } else {
        pdf.line(margin, y, margin + contentWidth, y);
      }
      y += 4;
    };

    // Apply background color if set
    if (s.backgroundColor) {
      const [r, g, b] = hexToRgb(s.backgroundColor);
      pdf.setFillColor(r, g, b);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    }

    // Header
    const [brandR, brandG, brandB] = hexToRgb(s.brandNameColor || '#111827');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(s.brandNameFontSize || 19);
    pdf.setTextColor(brandR, brandG, brandB);
    pdf.text(brandingName.toUpperCase(), margin + contentWidth / 2, y, { align: 'center' });
    y += 6;

    if (s.showLocationAddress && invoiceData.location.address) {
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.text(invoiceData.location.address, margin + contentWidth / 2, y, { align: 'center' });
      y += 4;
    }

    pdf.setFontSize(s.receiptTitleFontSize || 11);
    const [textR, textG, textB] = hexToRgb(s.textColor || '#111827');
    pdf.setTextColor(textR, textG, textB);
    pdf.text(s.receiptTitle || 'SALES RECEIPT', margin + contentWidth / 2, y, { align: 'center' });
    y += 4;
    addDivider();

    // Invoice meta (customer info)
    if (s.showCustomerInfo) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(s.customerInfoFontSize || 11);
      pdf.setTextColor(textR, textG, textB);
      addKeyValue('Invoice', `#${invoiceData.invoiceNumber}`, s.customerInfoFontSize);
      addKeyValue('Date', formatDate(invoiceData.date), s.customerInfoFontSize);
      addKeyValue('Location', invoiceData.location.name, s.customerInfoFontSize);
      if (invoiceData.broker) {
        addKeyValue('Broker', invoiceData.broker.name, s.customerInfoFontSize);
        addKeyValue('Code', invoiceData.broker.brokerCode, s.customerInfoFontSize);
        if (invoiceData.broker.phone) addKeyValue('Phone', invoiceData.broker.phone, s.customerInfoFontSize);
      } else if (invoiceData.customer) {
        addKeyValue('Buyer', invoiceData.customer.name, s.customerInfoFontSize);
        if (invoiceData.customer.phone) addKeyValue('Phone', invoiceData.customer.phone, s.customerInfoFontSize);
        if (invoiceData.customer.email) addKeyValue('Email', invoiceData.customer.email, s.customerInfoFontSize);
      } else {
        addKeyValue('Buyer', 'Walk-in Customer', s.customerInfoFontSize);
      }
      if (invoiceData.biltyAddress?.trim()) {
        addKeyValue('Ship To', invoiceData.biltyAddress, s.customerInfoFontSize);
        if (invoiceData.biltyContact) addKeyValue('Contact', invoiceData.biltyContact, s.customerInfoFontSize);
      }
      addDivider();
    }

    // Items table
    if (s.showItemsTable) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(s.itemsTableFontSize || 9);
      pdf.setTextColor(textR, textG, textB);
      const columns = [
        { label: 'Item', width: 70 },
        { label: 'Qty', width: 15 },
        { label: 'Rate', width: 25 },
        { label: 'Disc', width: 25 },
        { label: 'Value', width: 25 },
      ];
      let currentX = margin;
      columns.forEach((col) => {
        pdf.text(col.label, currentX + 1, y);
        currentX += col.width;
      });
      y += 4;
      const [divR, divG, divB] = hexToRgb(s.dividerColor || '#d1d5db');
      pdf.setDrawColor(divR, divG, divB);
      pdf.line(margin, y, margin + contentWidth, y);
      y += 4;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(s.itemsTableFontSize || 9);
      if (invoiceData.items.length === 0) {
        pdf.text('No items added', margin, y);
        y += 5;
      } else {
        invoiceData.items.forEach((item) => {
          if (y > pageHeight - 30) {
            pdf.addPage();
            y = margin;
          }
          currentX = margin;
          const name = item.itemName.length > 38 ? `${item.itemName.slice(0, 35)}...` : item.itemName;
          pdf.text(name, currentX, y);
          currentX += columns[0].width;
          pdf.text(String(item.quantity), currentX, y, { align: 'right' });
          currentX += columns[1].width;
          pdf.text(formatCurrency(item.unitPrice), currentX, y, { align: 'right' });
          currentX += columns[2].width;
          pdf.text(
            item.itemDiscountAmount > 0 ? formatCurrency(item.itemDiscountAmount) : '-',
            currentX,
            y,
            { align: 'right' },
          );
          currentX += columns[3].width;
          pdf.text(formatCurrency(item.lineTotal), currentX, y, { align: 'right' });
          y += 5;
        });
      }
      y += 4;
      addDivider();
    }

    // Summary
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(textR, textG, textB);
    const summaryRows: Array<{ label: string; value: string }> = [
      { label: 'Subtotal', value: formatCurrency(invoiceData.subtotal) },
    ];
    if (invoiceData.itemDiscounts > 0) {
      summaryRows.push({ label: 'Item Discounts', value: `-${formatCurrency(invoiceData.itemDiscounts)}` });
    }
    if (invoiceData.saleDiscount.amount > 0) {
      summaryRows.push({
        label:
          'Sale Discount' +
          (invoiceData.saleDiscount.type === 'PERCENTAGE' ? ` (${invoiceData.saleDiscount.value}%)` : ''),
        value: `-${formatCurrency(invoiceData.saleDiscount.amount)}`,
      });
    }
    if (invoiceData.additionalCharges.labourExpense > 0) {
      summaryRows.push({
        label: 'Labour Expense',
        value: formatCurrency(invoiceData.additionalCharges.labourExpense),
      });
    }
    if (invoiceData.additionalCharges.freightCharges > 0) {
      summaryRows.push({
        label: 'Freight Charges',
        value: formatCurrency(invoiceData.additionalCharges.freightCharges),
      });
    }
    if (invoiceData.taxAmount > 0) {
      summaryRows.push({
        label: `Sales Tax (${invoiceData.taxRate}%)`,
        value: formatCurrency(invoiceData.taxAmount),
      });
    }
    summaryRows.push({ label: 'Total', value: formatCurrency(invoiceData.totalAmount) });

    summaryRows.forEach((row, index) => {
      pdf.setFont('helvetica', index === summaryRows.length - 1 ? 'bold' : 'normal');
      pdf.setFontSize(index === summaryRows.length - 1 ? 11 : 10);
      pdf.text(row.label, margin, y);
      pdf.text(row.value, margin + contentWidth, y, { align: 'right' });
      y += 5;
    });

    if (invoiceData.customerBalanceDue !== undefined) {
      y += 2;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('Outstanding (before):', margin, y);
      pdf.text(formatBalanceStatus(invoiceData.customerBalanceDue), margin + contentWidth, y, { align: 'right' });
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text('Projected (after):', margin, y);
      pdf.text(
        formatBalanceStatus(invoiceData.projectedBalanceAfterInvoice ?? invoiceData.customerBalanceDue),
        margin + contentWidth,
        y,
        { align: 'right' },
      );
      y += 6;
    }

    // Payments section
    if (s.showPayments && invoiceData.payments && invoiceData.payments.length > 0) {
      addDivider();
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(s.paymentsFontSize || 9);
      pdf.text('Payments:', margin, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      invoiceData.payments.forEach((payment) => {
        pdf.text(`${payment.paymentMethod}:`, margin, y);
        pdf.text(formatCurrency(payment.amount), margin + contentWidth, y, { align: 'right' });
        y += 5;
      });
    }

    if (invoiceData.notes?.trim()) {
      addDivider();
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('Notes:', margin, y);
      y += 4;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const noteLines = pdf.splitTextToSize(invoiceData.notes, contentWidth);
      pdf.text(noteLines, margin, y);
      y += noteLines.length * 4 + 2;
    }

    // Footer
    if (s.showFooter) {
      addDivider();
      const [footerR, footerG, footerB] = hexToRgb(s.footerColor || '#9ca3af');
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(s.footerFontSize || 8);
      pdf.setTextColor(footerR, footerG, footerB);
      const footerText = s.footerText || 'Developed by Malind Tech Limited';
      pdf.text(footerText, margin + contentWidth / 2, y, { align: 'center' });
    }

    const fileName = `invoice-${invoiceData.invoiceNumber}-${Date.now()}.pdf`;
    pdf.save(fileName);
    return fileName;
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw new Error('Failed to generate invoice PDF');
  }
};
