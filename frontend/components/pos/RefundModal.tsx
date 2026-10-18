'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (refundData: RefundData) => Promise<void>;
  sale: {
    id: string;
    saleNumber: string;
    totalAmount: number;
    amountPaid: number;
    status: string;
    paymentStatus: string;
  };
  isProcessing: boolean;
}

export interface RefundData {
  refundType: 'FULL' | 'PARTIAL';
  refundAmount?: number;
  refundMethod: 'CASH' | 'CARD' | 'MOBILE_PAYMENT' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT' | 'OTHER';
  reason: string;
  notes?: string;
}

export default function RefundModal({
  isOpen,
  onClose,
  onConfirm,
  sale,
  isProcessing
}: RefundModalProps) {
  const [refundType, setRefundType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [refundAmount, setRefundAmount] = useState<number>(sale.totalAmount);
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'CARD' | 'MOBILE_PAYMENT' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT' | 'OTHER'>('CASH');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setRefundType('FULL');
      setRefundAmount(sale.totalAmount);
      setRefundMethod('CASH');
      setReason('');
      setNotes('');
      setErrors({});
    }
  }, [isOpen, sale.totalAmount]);

  useEffect(() => {
    if (refundType === 'FULL') {
      setRefundAmount(sale.totalAmount);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.refundAmount;
        return newErrors;
      });
    }
  }, [refundType, sale.totalAmount]);

  const roundToTwoDecimals = (value: number): number => {
    return Math.round(value * 100) / 100;
  };

  // Calculate remaining amount that can be refunded
  // For fully refunded sales, maxRefundAmount is 0
  // For completed sales, we can refund up to the totalAmount (not amountPaid, as refunds affect what was paid)
  const alreadyRefunded = sale.paymentStatus === 'REFUNDED' && sale.status === 'REFUNDED'
    ? sale.totalAmount
    : sale.totalAmount - sale.amountPaid; // How much has been refunded already
    
  const maxRefundAmount = sale.paymentStatus === 'REFUNDED' && sale.status === 'REFUNDED'
    ? 0 
    : sale.totalAmount - alreadyRefunded; // Remaining amount that can be refunded

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!reason.trim()) {
      newErrors.reason = 'Reason is required';
    }

    if (refundType === 'PARTIAL') {
      if (!refundAmount || refundAmount <= 0) {
        newErrors.refundAmount = 'Refund amount must be greater than 0';
      } else if (refundAmount > maxRefundAmount) {
        newErrors.refundAmount = `Refund amount cannot exceed remaining refundable amount (${formatCurrency(maxRefundAmount)})`;
      } else if (refundAmount > sale.totalAmount) {
        newErrors.refundAmount = `Refund amount cannot exceed sale total (${formatCurrency(sale.totalAmount)})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const refundData: RefundData = {
      refundType,
      refundMethod,
      reason: reason.trim(),
      ...(refundType === 'PARTIAL' && { refundAmount: roundToTwoDecimals(refundAmount) }),
      ...(notes.trim() && { notes: notes.trim() }),
    };

    await onConfirm(refundData);
  };

  const handleRefundAmountChange = (value: string) => {
    if (value === '') {
      setRefundAmount(0);
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setRefundAmount(roundToTwoDecimals(numValue));
      // Clear error if amount is valid
      if (errors.refundAmount && numValue > 0 && numValue <= sale.totalAmount) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.refundAmount;
          return newErrors;
        });
      }
    }
  };
    
  const canRefund = (sale.status === 'COMPLETED' || (sale.status === 'REFUNDED' && sale.paymentStatus === 'PARTIAL')) && 
                    sale.paymentStatus !== 'CANCELLED' && 
                    sale.paymentStatus !== 'REFUNDED' &&
                    maxRefundAmount > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Process a refund for sale {sale.saleNumber}. This will restore inventory and update customer balance if applicable.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-4 py-4">
            {!canRefund && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">
                  This sale cannot be refunded. Only completed sales that haven't been refunded or cancelled can be refunded.
                </p>
              </div>
            )}
          {/* Sale Information */}
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Sale Number:</span>
                <p className="font-medium text-gray-900">{sale.saleNumber}</p>
              </div>
              <div>
                <span className="text-gray-500">Sale Total:</span>
                <p className="font-medium text-gray-900">{formatCurrency(sale.totalAmount)}</p>
              </div>
            </div>
          </div>

          {/* Refund Type */}
          <div>
            <Label htmlFor="refundType">Refund Type *</Label>
            <Select value={refundType} onValueChange={(value: 'FULL' | 'PARTIAL') => setRefundType(value)}>
              <SelectTrigger id="refundType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL">Full Refund</SelectItem>
                <SelectItem value="PARTIAL">Partial Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Refund Amount (only for partial) */}
          {refundType === 'PARTIAL' && (
            <div>
              <Label htmlFor="refundAmount">
                Refund Amount * (Max: {formatCurrency(maxRefundAmount)})
              </Label>
              <Input
                id="refundAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={maxRefundAmount}
                value={refundAmount === 0 ? '' : refundAmount}
                onChange={(e) => handleRefundAmountChange(e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value !== '') {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      setRefundAmount(roundToTwoDecimals(numValue));
                    }
                  }
                }}
                className={errors.refundAmount ? 'border-red-500' : ''}
                placeholder="0.00"
              />
              {errors.refundAmount && (
                <p className="text-sm text-red-500 mt-1">{errors.refundAmount}</p>
              )}
            </div>
          )}

          {refundType === 'FULL' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                Full refund amount: <span className="font-semibold">{formatCurrency(maxRefundAmount)}</span>
                {alreadyRefunded > 0 && (
                  <span className="text-xs text-gray-500 block mt-1">
                    (Already refunded: {formatCurrency(alreadyRefunded)})
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Refund Method */}
          <div>
            <Label htmlFor="refundMethod">Refund Method *</Label>
            <Select value={refundMethod} onValueChange={(value: any) => setRefundMethod(value)}>
              <SelectTrigger id="refundMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="MOBILE_PAYMENT">Mobile Payment</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="CREDIT">Credit to Account</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">Reason for Refund *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errors.reason) {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.reason;
                    return newErrors;
                  });
                }
              }}
              className={errors.reason ? 'border-red-500' : ''}
              placeholder="Enter the reason for this refund..."
              rows={3}
            />
            {errors.reason && (
              <p className="text-sm text-red-500 mt-1">{errors.reason}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this refund..."
              rows={2}
            />
          </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canRefund || isProcessing}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isProcessing ? 'Processing...' : 'Process Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

