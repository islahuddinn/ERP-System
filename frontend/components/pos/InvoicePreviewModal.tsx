'use client';

import { useRef } from 'react';
import { X, FileText, Printer, Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatBalanceStatus } from '@/lib/currency';
import { InvoiceData } from '@/types/pos';
import { generateInvoicePDF } from '@/utils/pdf/generateInvoicePDF';
import { printInvoice } from '@/utils/print/printInvoice';
import { useBranding } from '@/hooks/useBranding';
import { useInvoiceSettings } from '@/hooks/useInvoiceSettings';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceData | null;
  onSaveInvoice: () => Promise<void>;
  isSaving: boolean;
}

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  invoiceData,
  onSaveInvoice,
  isSaving,
}: InvoicePreviewModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { data: branding } = useBranding();
  const { data: invoiceSettings } = useInvoiceSettings();
  const brandingName = branding?.name || 'Malind Tech';

  if (!isOpen || !invoiceData) return null;


  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePrint = () => {
    printInvoice(invoiceData, brandingName, invoiceSettings);
  };

  const handleExportPDF = () => {
    try {
      generateInvoicePDF(invoiceData, brandingName, invoiceSettings);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white via-emerald-50 to-slate-50 rounded-3xl border border-emerald-100 shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-emerald-100 bg-white/80 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-500 font-semibold">Invoice Preview</p>
            <h2 className="text-2xl font-semibold text-slate-900">{brandingName}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {invoiceData.invoiceNumber} · {formatDate(invoiceData.date)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Invoice Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white/40" ref={invoiceRef}>
          <div className="flex justify-center">
            <div className="w-full max-w-[560px] border border-slate-200 rounded-2xl shadow-lg px-6 py-6 text-xs text-slate-900 space-y-4 bg-white">
              <div className="text-center border-b border-dashed pb-2">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">{invoiceData.location?.address}</p>
                <h1 className="text-xl font-semibold tracking-wide">{brandingName}</h1>
                <p className="text-[11px]">Sales Invoice</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Invoice</p>
                  <p>#{invoiceData.invoiceNumber}</p>
                  <p>{formatDate(invoiceData.date)}</p>
                  <p>Location: {invoiceData.location.name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    {invoiceData.broker ? 'Broker' : 'Buyer'}
                  </p>
                  {invoiceData.broker ? (
                    <>
                      <p>{invoiceData.broker.name}</p>
                      <p>Code: {invoiceData.broker.brokerCode}</p>
                      {invoiceData.broker.phone && <p>{invoiceData.broker.phone}</p>}
                    </>
                  ) : (
                    <>
                      <p>{invoiceData.customer?.name ?? 'Walk-in Customer'}</p>
                      {invoiceData.customer?.phone && <p>{invoiceData.customer.phone}</p>}
                      {invoiceData.customer?.email && <p>{invoiceData.customer.email}</p>}
                    </>
                  )}
                </div>
              </div>

              {invoiceData.biltyAddress && invoiceData.biltyAddress.trim() !== '' && (
                <div className="text-[11px] leading-tight grid grid-cols-2 gap-2">
                  <div>
                    <p className="font-semibold uppercase text-gray-500">Ship To</p>
                    <p>{invoiceData.biltyAddress}</p>
                    {invoiceData.biltyContact && <p>Contact: {invoiceData.biltyContact}</p>}
                  </div>
                  {invoiceData.customerBalanceDue !== undefined && (
                    <div className="border border-dashed border-yellow-400 rounded px-2 py-2 bg-yellow-50 text-[11px]">
                      <p className="uppercase text-yellow-800 font-semibold">Outstanding</p>
                      <div className="flex justify-between">
                        <span>Before:</span>
                        <span className="font-semibold">{formatBalanceStatus(invoiceData.customerBalanceDue)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] mt-1">
                        <span>After:</span>
                        <span className="font-semibold">
                          {formatBalanceStatus(
                            invoiceData.projectedBalanceAfterInvoice ?? invoiceData.customerBalanceDue
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100 text-[11px]">
                      <th className="text-left px-2 py-1 font-semibold">Item</th>
                      <th className="text-center px-2 py-1 font-semibold">Qty</th>
                      <th className="text-right px-2 py-1 font-semibold">Rate</th>
                      <th className="text-right px-2 py-1 font-semibold">Disc</th>
                      <th className="text-right px-2 py-1 font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-500 py-4">
                          No items
                        </td>
                      </tr>
                    )}
                    {invoiceData.items.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-2 py-1 text-[11px]">{item.itemName}</td>
                        <td className="px-2 py-1 text-center text-[11px]">{item.quantity}</td>
                        <td className="px-2 py-1 text-right text-[11px]">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-2 py-1 text-right text-[11px]">
                          {item.itemDiscountAmount > 0 ? formatCurrency(item.itemDiscountAmount) : '-'}
                        </td>
                        <td className="px-2 py-1 text-right text-[11px] font-semibold">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-3 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoiceData.subtotal)}</span>
                </div>
                {invoiceData.itemDiscounts > 0 && (
                  <div className="flex justify-between">
                    <span>Item Discounts</span>
                    <span>-{formatCurrency(invoiceData.itemDiscounts)}</span>
                  </div>
                )}
                {invoiceData.saleDiscount.amount > 0 && (
                  <div className="flex justify-between">
                    <span>
                      Sale Discount
                      {invoiceData.saleDiscount.type === 'PERCENTAGE'
                        ? ` (${invoiceData.saleDiscount.value}%)`
                        : ''}
                    </span>
                    <span>-{formatCurrency(invoiceData.saleDiscount.amount)}</span>
                  </div>
                )}
                {invoiceData.additionalCharges.labourExpense > 0 && (
                  <div className="flex justify-between">
                    <span>Labour Expense</span>
                    <span>{formatCurrency(invoiceData.additionalCharges.labourExpense)}</span>
                  </div>
                )}
                {invoiceData.additionalCharges.freightCharges > 0 && (
                  <div className="flex justify-between">
                    <span>Freight Charges</span>
                    <span>{formatCurrency(invoiceData.additionalCharges.freightCharges)}</span>
                  </div>
                )}
                {invoiceData.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Sales Tax ({invoiceData.taxRate}%)</span>
                    <span>{formatCurrency(invoiceData.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold border-t border-gray-300 pt-2 mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(invoiceData.totalAmount)}</span>
                </div>
              </div>

              {invoiceData.notes && invoiceData.notes.trim() !== '' && (
                <div className="border-t border-dashed pt-2 text-[11px]">
                  <p className="font-semibold uppercase text-gray-500">Notes</p>
                  <p>{invoiceData.notes}</p>
                </div>
              )}

              <div className="text-center text-[10px] text-slate-500 border-t border-dashed border-slate-200 pt-2">
                <p>Thank you for your business</p>
                <p className="uppercase tracking-wide mt-1">Developed by Malind Tech</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Action Buttons */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-emerald-100 bg-white/80 backdrop-blur">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100 hover:border-emerald-200 px-6 py-2 font-medium rounded-xl transition-colors shadow-sm"
          >
            Close
          </Button>

          <div className="flex space-x-3">
            <Button
              onClick={handlePrint}
              className="bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white px-6 py-2 flex items-center gap-2 rounded-xl shadow-lg"
            >
              <Printer className="w-4 h-4" />
              Print Invoice
            </Button>
            <Button
              onClick={handleExportPDF}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-6 py-2 flex items-center gap-2 rounded-xl shadow-lg"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button
              onClick={onSaveInvoice}
              disabled={isSaving}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Invoice
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

