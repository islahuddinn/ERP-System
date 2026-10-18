'use client';

import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatBalanceStatus } from '@/lib/currency';
import { CartItem } from '@/hooks/pos/useCart';
import { Customer } from '@/hooks/pos/useCustomers';
import { Location } from '@/hooks/pos/useLocations';
import { useBranding } from '@/hooks/useBranding';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedSale: any;
  receiptData: any;
  receiptCartItems: CartItem[];
  receiptTotals: {
    subtotal: number;
    itemDiscounts: number;
    saleDiscount: number;
    subtotalAfterDiscount: number;
    taxAmount: number;
    totalAmount: number;
    amountPaid: number;
    changeGiven: number;
    taxRate: number;
    discount: any;
    selectedCustomer: Customer | null;
    selectedLocation: Location | null;
    previousCustomerBalance?: number;
    invoiceOutstanding?: number;
    projectedCustomerBalance?: number;
  } | null;
  paymentMethod: string;
  saleNotes: string;
  onDownloadReceipt: (receiptId: string) => Promise<void>;
  onPrintReceipt: (receiptId: string) => Promise<void>;
  onGenerateReceipt: (saleId: string) => Promise<void>;
}

export default function ReceiptPreviewModal({
  isOpen,
  onClose,
  completedSale,
  receiptData,
  receiptCartItems,
  receiptTotals,
  paymentMethod,
  saleNotes,
  onDownloadReceipt,
  onPrintReceipt,
  onGenerateReceipt
}: ReceiptPreviewModalProps) {
  const { data: branding } = useBranding();
  const brandingName = branding?.name || 'Malind Tech';

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Sale Receipt</h2>
            <p className="text-sm text-gray-600 mt-1">
              Sale #{completedSale?.saleNumber} - {new Date().toLocaleString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Receipt Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {/* Company Header */}
            <div className="text-center border-b pb-4">
              <h1 className="text-3xl font-bold text-gray-900">{brandingName.toUpperCase()}</h1>
              <p className="text-gray-600">Inventory Management System</p>
            </div>

            {/* Sale Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">Sale Information</h3>
                <p className="text-sm text-gray-600">Sale #: {completedSale?.saleNumber}</p>
                <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
                <p className="text-sm text-gray-600">Time: {new Date().toLocaleTimeString()}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Location</h3>
                <p className="text-sm text-gray-600">{receiptTotals?.selectedLocation?.name}</p>
                <p className="text-sm text-gray-600">{receiptTotals?.selectedLocation?.address}</p>
              </div>
            </div>

            {/* Customer Info */}
            {receiptTotals?.selectedCustomer && (
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Customer</h3>
                <p className="text-sm text-gray-600">{receiptTotals.selectedCustomer.name}</p>
                {receiptTotals.selectedCustomer.email && (
                  <p className="text-sm text-gray-600">{receiptTotals.selectedCustomer.email}</p>
                )}
                {receiptTotals.selectedCustomer.phone && (
                  <p className="text-sm text-gray-600">{receiptTotals.selectedCustomer.phone}</p>
                )}
                {receiptTotals.previousCustomerBalance !== undefined && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800 space-y-1">
                    <div className="flex justify-between">
                      <span>Outstanding before sale:</span>
                      <span className="font-semibold">
                        {formatBalanceStatus(receiptTotals.previousCustomerBalance)}
                      </span>
                    </div>
                    {receiptTotals.invoiceOutstanding !== undefined && (
                      <div className="flex justify-between text-xs text-yellow-900">
                        <span>Change from this sale:</span>
                        <span className="font-semibold">
                          {formatBalanceStatus(receiptTotals.invoiceOutstanding)}
                        </span>
                      </div>
                    )}
                    {receiptTotals.projectedCustomerBalance !== undefined && (
                      <div className="flex justify-between text-xs text-yellow-900">
                        <span>Outstanding after sale:</span>
                        <span className="font-semibold">
                          {formatBalanceStatus(receiptTotals.projectedCustomerBalance)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Items */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-gray-900 font-semibold">Item</th>
                      <th className="text-center py-2 text-gray-900 font-semibold">Qty</th>
                      <th className="text-right py-2 text-gray-900 font-semibold">Price</th>
                      <th className="text-right py-2 text-gray-900 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptCartItems.length > 0 ? receiptCartItems.map((item, index) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-2 text-gray-900">{item.itemName}</td>
                        <td className="text-center py-2 text-gray-900">{item.quantity}</td>
                        <td className="text-right py-2 text-gray-900">{formatCurrency(item.unitPrice)}</td>
                        <td className="text-right py-2 text-gray-900">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-500">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-900">Subtotal:</span>
                <span className="text-gray-900">{formatCurrency(receiptTotals?.subtotal || 0)}</span>
              </div>
              {receiptTotals?.discount?.amount && receiptTotals.discount.amount > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-900">Discount:</span>
                  <span className="text-gray-900">-{formatCurrency(receiptTotals.discount.amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-900">Tax ({receiptTotals?.taxRate || 0}%):</span>
                <span className="text-gray-900">{formatCurrency(receiptTotals?.taxAmount || 0)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span className="text-gray-900">Total:</span>
                <span className="text-gray-900">{formatCurrency(receiptTotals?.totalAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-900">Amount Paid:</span>
                <span className="text-gray-900">{formatCurrency(receiptTotals?.amountPaid || 0)}</span>
              </div>
              {receiptTotals?.changeGiven && receiptTotals.changeGiven > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-900">Change:</span>
                  <span className="text-gray-900">{formatCurrency(receiptTotals.changeGiven)}</span>
                </div>
              )}
              {receiptTotals?.projectedCustomerBalance !== undefined && (
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 text-sm text-yellow-900 space-y-1">
                  <div className="flex justify-between">
                    <span>Outstanding before sale:</span>
                    <span className="font-semibold">
                      {formatBalanceStatus(receiptTotals.previousCustomerBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{receiptTotals.invoiceOutstanding !== undefined && receiptTotals.invoiceOutstanding < 0 ? 'Credit from this sale:' : 'Due from this sale:'}</span>
                    <span className="font-semibold">
                      {formatBalanceStatus(receiptTotals.invoiceOutstanding)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outstanding after sale:</span>
                    <span className="font-semibold">
                      {formatBalanceStatus(receiptTotals.projectedCustomerBalance)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                Payment Method: {paymentMethod}
              </p>
              {saleNotes && (
                <p className="text-sm text-gray-600 mt-2">
                  Notes: {saleNotes}
                </p>
              )}
            </div>

            {/* Developer Credit Footer */}
            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-center text-gray-400">
                Developed by Malind Tech
              </p>
            </div>
          </div>
        </div>

        {/* Footer with Download and Print buttons */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 hover:border-gray-400 px-6 py-2 font-medium transition-colors"
          >
            Close
          </Button>
          
          <div className="flex space-x-3">
            {receiptData?.receipt?.id && (
              <>
                <Button
                  onClick={async () => await onDownloadReceipt(receiptData.receipt.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  onClick={async () => await onPrintReceipt(receiptData.receipt.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
              </>
            )}
            {!receiptData?.receipt?.id && (
              <div className="flex items-center space-x-3">
                <Button
                  onClick={async () => await onGenerateReceipt(completedSale.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Receipt
                </Button>
                <div className="text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Generating receipt in background...
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
