import { InvoiceData } from '@/types/pos';
import { formatCurrency, formatBalanceStatus } from '@/lib/currency';
import { InvoiceSettings } from '@/hooks/useInvoiceSettings';

// Helper to get page size CSS
const getPageSizeCSS = (settings?: InvoiceSettings | null): string => {
  if (!settings) {
    return 'size: 105mm 148mm;';
  }

  if (settings.pageSize === 'CUSTOM' && settings.customPageWidth && settings.customPageHeight) {
    return `size: ${settings.customPageWidth}mm ${settings.customPageHeight}mm;`;
  }

  switch (settings.pageSize) {
    case 'A5':
      return settings.pageOrientation === 'landscape' ? 'size: 210mm 148mm;' : 'size: 148mm 210mm;';
    case 'A6':
      return settings.pageOrientation === 'landscape' ? 'size: 148mm 105mm;' : 'size: 105mm 148mm;';
    case 'A4':
    default:
      return settings.pageOrientation === 'landscape' ? 'size: 297mm 210mm;' : 'size: 210mm 297mm;';
  }
};

// Helper to get divider style CSS
const getDividerStyleCSS = (style: string): string => {
  switch (style) {
    case 'solid':
      return 'solid';
    case 'dotted':
      return 'dotted';
    case 'dashed':
    default:
      return 'dashed';
  }
};

export const printInvoice = (
  invoiceData: InvoiceData,
  brandingName: string = 'Malind Tech',
  settings?: InvoiceSettings | null
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  // Use settings or defaults
  const s = settings || {
    pageSize: 'A6',
    pageOrientation: 'portrait',
    margin: 7,
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

  const margin = s.margin || 7;
  const marginCSS = `${margin}mm`;
  const marginDouble = margin * 2;
  const marginDoubleCSS = `${marginDouble}mm`;

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const outstandingBalance = invoiceData.customerBalanceDue ?? null;
  const projectedBalanceAfterInvoice =
    invoiceData.projectedBalanceAfterInvoice ??
    (outstandingBalance !== null ? outstandingBalance + invoiceData.totalAmount : null);

  // Generate items table HTML
  const itemsTableRows = invoiceData.items.map(item => `
    <tr>
      <td>${item.itemName}</td>
      <td>${item.quantity}</td>
      <td>${formatCurrency(item.unitPrice)}</td>
      <td>${item.itemDiscountAmount > 0 ? formatCurrency(item.itemDiscountAmount) : '-'}</td>
      <td>${formatCurrency(item.lineTotal)}</td>
    </tr>
  `).join('');

  const summaryRows = `
    <tr>
      <td>Subtotal</td>
      <td>${formatCurrency(invoiceData.subtotal)}</td>
    </tr>
    ${invoiceData.itemDiscounts > 0 ? `
    <tr>
      <td>Item Discounts</td>
      <td>-${formatCurrency(invoiceData.itemDiscounts)}</td>
    </tr>` : ''}
    ${invoiceData.saleDiscount.amount > 0 ? `
    <tr>
      <td>Sale Discount${invoiceData.saleDiscount.type === 'PERCENTAGE' ? ` (${invoiceData.saleDiscount.value}%)` : ''}</td>
      <td>-${formatCurrency(invoiceData.saleDiscount.amount)}</td>
    </tr>` : ''}
    ${invoiceData.additionalCharges.labourExpense > 0 ? `
    <tr>
      <td>Labour Expense</td>
      <td>${formatCurrency(invoiceData.additionalCharges.labourExpense)}</td>
    </tr>` : ''}
    ${invoiceData.additionalCharges.freightCharges > 0 ? `
    <tr>
      <td>Freight Charges</td>
      <td>${formatCurrency(invoiceData.additionalCharges.freightCharges)}</td>
    </tr>` : ''}
    ${invoiceData.taxAmount > 0 ? `
    <tr>
      <td>Sales Tax (${invoiceData.taxRate}%)</td>
      <td>${formatCurrency(invoiceData.taxAmount)}</td>
    </tr>` : ''}
    <tr class="total-row">
      <td>Total</td>
      <td>${formatCurrency(invoiceData.totalAmount)}</td>
    </tr>
  `;

  const dividerStyle = getDividerStyleCSS(s.dividerStyle || 'dashed');
  const backgroundColor = s.backgroundColor || '#ffffff';
  const footerText = s.footerText || 'Developed by Malind Tech Limited';

  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice ${invoiceData.invoiceNumber}</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
          }
          @page {
            ${getPageSizeCSS(s)}
            margin: ${marginCSS};
          }
          body {
            font-family: 'Helvetica', Arial, sans-serif;
            background: #f5f5f5;
            font-size: ${s.customerInfoFontSize || 11}px;
            color: ${s.textColor || '#111827'};
          }
          .invoice-wrapper {
            width: calc(100% - ${marginDoubleCSS});
            min-height: calc(100% - ${marginDoubleCSS});
            margin: 0 auto;
            background: ${backgroundColor};
            border: 1px solid ${s.dividerColor || '#d1d5db'};
            padding: ${marginCSS};
          }
          .invoice-header {
            text-align: center;
            border-bottom: 1px ${dividerStyle} ${s.dividerColor || '#d1d5db'};
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .invoice-header h1 {
            margin: 0;
            font-size: ${s.brandNameFontSize || 19}px;
            letter-spacing: 1px;
            color: ${s.brandNameColor || '#111827'};
          }
          .invoice-header .receipt-title {
            margin: 4px 0;
            font-size: ${s.receiptTitleFontSize || 11}px;
            letter-spacing: 2px;
            color: ${s.textColor || '#111827'};
          }
          .invoice-header .location-address {
            margin: 2px 0;
            font-size: 10px;
            color: #6b7280;
          }
          .invoice-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: ${s.customerInfoFontSize || 11}px;
          }
          .invoice-meta div {
            width: 48%;
          }
          .invoice-meta p {
            margin: 2px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          table thead th {
            background: #f3f4f6;
            font-weight: 600;
            font-size: ${s.itemsTableFontSize || 9}px;
            padding: 4px 6px;
            border: 1px solid #e5e7eb;
          }
          table td {
            border: 1px solid #e5e7eb;
            padding: 4px 6px;
            font-size: ${s.itemsTableFontSize || 9}px;
          }
          table td:nth-child(2),
          table td:nth-child(3),
          table td:nth-child(4),
          table td:nth-child(5) {
            text-align: right;
          }
          table td:nth-child(1) {
            text-align: left;
          }
          .summary-table {
            width: 100%;
            margin-top: 10px;
            font-size: 10px;
          }
          .summary-table td {
            padding: 4px 0;
          }
          .summary-table td:last-child {
            text-align: right;
          }
          .summary-table .total-row {
            border-top: 1px ${dividerStyle} ${s.dividerColor || '#9ca3af'};
            font-weight: 600;
            font-size: 11px;
          }
          .outstanding-box {
            border: 1px ${dividerStyle} #f59e0b;
            padding: 6px;
            font-size: 10px;
            margin-top: 8px;
            background: #fffbeb;
          }
          .notes {
            border-top: 1px ${dividerStyle} ${s.dividerColor || '#d1d5db'};
            margin-top: 10px;
            padding-top: 8px;
            font-size: 10px;
          }
          .footer {
            border-top: 1px ${dividerStyle} ${s.dividerColor || '#d1d5db'};
            margin-top: 12px;
            padding-top: 8px;
            font-size: ${s.footerFontSize || 8}px;
            text-align: center;
            color: ${s.footerColor || '#9ca3af'};
          }
        </style>
      </head>
      <body>
        <div class="invoice-wrapper">
          <div class="invoice-header">
            <h1>${brandingName?.toUpperCase?.() ?? brandingName}</h1>
            ${s.showLocationAddress && invoiceData.location?.address ? `
            <p class="location-address">${invoiceData.location.address}</p>
            ` : ''}
            <p class="receipt-title">${s.receiptTitle || 'SALES RECEIPT'}</p>
          </div>

          ${s.showCustomerInfo ? `
          <div class="invoice-meta">
            <div>
              <p><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</p>
              <p><strong>Date:</strong> ${formatDate(invoiceData.date)}</p>
              <p><strong>Location:</strong> ${invoiceData.location.name}</p>
            </div>
            <div>
              <p><strong>${invoiceData.broker ? 'Broker' : 'Buyer'}:</strong> 
                ${invoiceData.broker ? invoiceData.broker.name : (invoiceData.customer?.name ?? 'Walk-in Customer')}
              </p>
              ${invoiceData.broker ? `<p><strong>Code:</strong> ${invoiceData.broker.brokerCode}</p>` : ''}
              ${(invoiceData.broker?.phone || invoiceData.customer?.phone) ? `<p><strong>Phone:</strong> ${invoiceData.broker?.phone || invoiceData.customer?.phone}</p>` : ''}
              ${(!invoiceData.broker && invoiceData.customer?.email) ? `<p><strong>Email:</strong> ${invoiceData.customer.email}</p>` : ''}
            </div>
          </div>
          ` : ''}

          ${invoiceData.biltyAddress && invoiceData.biltyAddress.trim() !== '' ? `
          <div style="font-size:10px;margin-top:4px;">
            <strong>Ship To:</strong> ${invoiceData.biltyAddress}
            ${invoiceData.biltyContact ? `<p style="margin:2px 0 0 0;"><strong>Contact:</strong> ${invoiceData.biltyContact}</p>` : ''}
          </div>
          ` : ''}

          ${s.showItemsTable ? `
          <table>
            <thead>
              <tr>
                <th style="text-align:left;">Item</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Rate</th>
                <th style="text-align:right;">Disc</th>
                <th style="text-align:right;">Value</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTableRows || `<tr><td colspan="5" style="text-align:center;padding:10px;color:#9ca3af;">No items</td></tr>`}
            </tbody>
          </table>
          ` : ''}

          <table class="summary-table">
            <tbody>
              ${summaryRows}
            </tbody>
          </table>

          ${outstandingBalance !== null ? `
          <div class="outstanding-box">
            <div style="display:flex;justify-content:space-between;">
              <span>Outstanding (before):</span>
              <strong>${formatBalanceStatus(outstandingBalance)}</strong>
            </div>
            ${projectedBalanceAfterInvoice !== null ? `
            <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:9px;">
              <span>Projected (after):</span>
              <strong>${formatBalanceStatus(projectedBalanceAfterInvoice)}</strong>
            </div>` : ''}
          </div>
          ` : ''}

          ${s.showPayments && invoiceData.payments && invoiceData.payments.length > 0 ? `
          <div style="margin-top:10px;font-size:${s.paymentsFontSize || 9}px;">
            <strong>Payments:</strong>
            ${invoiceData.payments.map(payment => `
              <div style="display:flex;justify-content:space-between;margin-top:4px;">
                <span>${payment.paymentMethod}</span>
                <strong>${formatCurrency(payment.amount)}</strong>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${invoiceData.notes && invoiceData.notes.trim() !== '' ? `
          <div class="notes">
            <strong>Notes:</strong>
            <p style="margin:2px 0 0 0;">${invoiceData.notes}</p>
          </div>
          ` : ''}

          ${s.showFooter ? `
          <div class="footer">
            <p>${footerText}</p>
          </div>
          ` : ''}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();

  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
  }, 250);
};
