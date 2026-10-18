'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/currency';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessPayment: (paymentData: {
    method: string;
    amount: number;
    notes: string;
    isCreditSale?: boolean;
  }) => Promise<void>;
  totalAmount: number;
  isProcessing: boolean;
  selectedCustomer?: any;
  selectedBroker?: any;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onProcessPayment,
  totalAmount,
  isProcessing,
  selectedCustomer,
  selectedBroker
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT'>('CASH');
  const [amountPaid, setAmountPaid] = useState(0);
  const [changeGiven, setChangeGiven] = useState(0);
  const [saleNotes, setSaleNotes] = useState('');
  const [isCreditSale, setIsCreditSale] = useState(false);

  // Helper function to round to 2 decimal places
  const roundToTwoDecimals = (value: number): number => {
    return Math.round(value * 100) / 100;
  };

  // Calculate change when amount paid changes
  useEffect(() => {
    if (amountPaid >= totalAmount) {
      setChangeGiven(roundToTwoDecimals(amountPaid - totalAmount));
    } else {
      setChangeGiven(0);
    }
  }, [amountPaid, totalAmount]);

  // Handle payment method change
  useEffect(() => {
    if (paymentMethod === 'CREDIT') {
      setIsCreditSale(true);
      setAmountPaid(0);
    } else {
      setIsCreditSale(false);
    }
  }, [paymentMethod]);

  const handleSubmit = async () => {
    // Round both amounts for accurate comparison (fix floating point precision issues)
    const roundedAmountPaid = roundToTwoDecimals(amountPaid);
    const roundedTotalAmount = roundToTwoDecimals(totalAmount);

    // Allow partial payments, credit sales, or when amount paid is 0 (will create credit sale)
    // Partial payments are allowed - the backend will set status to PARTIAL
    // Only block if amount is negative
    if (roundedAmountPaid < 0) {
      return;
    }

    await onProcessPayment({
      method: paymentMethod,
      amount: roundedAmountPaid,
      notes: saleNotes,
      isCreditSale: isCreditSale || (roundedAmountPaid < roundedTotalAmount - 0.01 && paymentMethod === 'CREDIT')
    });
  };

  const handleClose = () => {
    setAmountPaid(0);
    setChangeGiven(0);
    setSaleNotes('');
    setIsCreditSale(false);
    setPaymentMethod('CASH');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white via-emerald-50 to-slate-50 border border-emerald-100 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-emerald-100 bg-white/60 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-500 font-semibold">Payment</p>
            <h2 className="text-xl font-semibold text-slate-900">Complete Payment</h2>
            <p className="text-sm text-emerald-600 mt-1">Total Amount: {formatCurrency(totalAmount)}</p>
            {amountPaid > 0 && amountPaid < totalAmount && !isCreditSale && (
              <p className="text-xs text-orange-600 mt-1">⚠️ Partial payment will create PARTIAL status sale</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Payment Method</label>
            <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                {(selectedCustomer || selectedBroker) && (
                  <SelectItem value="CREDIT">Credit Sale (Pay Later)</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Paid */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              {isCreditSale ? 'Amount Paid (Optional)' : 'Amount Paid'}
            </label>
            <div className="flex space-x-2">
              <Input
                type="number"
                value={amountPaid === 0 ? '' : amountPaid}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setAmountPaid(0);
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      // Round to 2 decimal places to prevent validation errors
                      setAmountPaid(roundToTwoDecimals(numValue));
                    }
                  }
                }}
                onBlur={(e) => {
                  // Ensure rounding on blur as well
                  const value = e.target.value;
                  if (value !== '') {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      setAmountPaid(roundToTwoDecimals(numValue));
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && amountPaid >= 0) {
                    handleSubmit();
                  }
                }}
                placeholder={isCreditSale ? "0.00 (optional)" : "0.00"}
                step="0.01"
                min="0"
                max={isCreditSale ? totalAmount : undefined}
                className="flex-1"
                autoFocus
                disabled={isCreditSale && amountPaid === 0}
              />
              {!isCreditSale && (
                <Button
                  onClick={() => setAmountPaid(roundToTwoDecimals(totalAmount))}
                  variant="outline"
                  className="px-3"
                  title="Set exact amount (Enter key)"
                >
                  Exact
                </Button>
              )}
            </div>
            {isCreditSale && (
              <p className="text-xs text-gray-600 mt-1">
                Customer will owe: {formatCurrency(totalAmount - amountPaid)}
              </p>
            )}
          </div>

          {/* Change Given */}
          {changeGiven > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-emerald-700">Change Given:</span>
                <span className="text-lg font-bold text-emerald-900">{formatCurrency(changeGiven)}</span>
              </div>
            </div>
          )}

          {/* Sale Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Sale Notes (Optional)</label>
            <textarea
              className="w-full p-3 border border-emerald-100 rounded-2xl bg-white/80 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200 text-sm text-slate-800 placeholder:text-slate-400"
              rows={3}
              placeholder="Add notes for this sale..."
              value={saleNotes}
              onChange={(e) => setSaleNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-5 border-t border-emerald-100 bg-white/70 backdrop-blur">
          <Button
            onClick={handleClose}
            className="bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100 hover:border-emerald-200 px-6 py-2 font-medium rounded-xl transition-colors shadow-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={(() => {
              // Use rounded values for comparison to avoid floating point precision issues
              const roundedAmountPaid = roundToTwoDecimals(amountPaid);
              // Allow partial payments - only block if amount is negative or processing
              // Partial payments will create PARTIAL status sale
              return isProcessing || roundedAmountPaid < 0;
            })()}
            className={`px-6 py-2 rounded-xl shadow-lg ${isCreditSale || (roundToTwoDecimals(amountPaid) < roundToTwoDecimals(totalAmount) - 0.01)
              ? 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white'
              : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-sky-500 hover:from-emerald-500 hover:to-sky-400 text-white'
              } disabled:bg-gray-300 disabled:cursor-not-allowed`}
          >
            {isProcessing ? 'Processing...' :
              (isCreditSale || (roundToTwoDecimals(amountPaid) < roundToTwoDecimals(totalAmount) - 0.01))
                ? 'Complete Sale (Partial/Credit)'
                : 'Complete Sale'}
          </Button>
        </div>
      </div>
    </div>
  );
}
