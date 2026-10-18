'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { HoldInvoiceData } from '@/hooks/pos/useHeldInvoices';
import { formatCurrency } from '@/lib/currency';

interface HoldInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: HoldInvoiceData) => Promise<void>;
  defaultName?: string;
  cartItemsCount: number;
  totalAmount: number;
}

export default function HoldInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  defaultName,
  cartItemsCount,
  totalAmount,
}: HoldInvoiceModalProps) {
  console.log('HoldInvoiceModal render - isOpen:', isOpen, 'cartItemsCount:', cartItemsCount, 'totalAmount:', totalAmount, 'typeof totalAmount:', typeof totalAmount);
  const [name, setName] = useState(defaultName || '');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Ensure we have valid numbers
  const displayItemCount = cartItemsCount ?? 0;
  const displayTotal = typeof totalAmount === 'number' && !isNaN(totalAmount) ? totalAmount : 0;

  const handleSubmit = async () => {
    if (!name.trim()) {
      return; // Don't allow empty name for now, or make it optional
    }

    setIsLoading(true);
    try {
      // The parent component will provide the full HoldInvoiceData
      await onConfirm({ name: name.trim(), notes: notes.trim() } as any);
      setName('');
      setNotes('');
      onClose();
    } catch (error) {
      // Error handling is done in the parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 text-slate-900 shadow-2xl">
        <DialogHeader className="border-b border-emerald-100 pb-3">
          <DialogTitle className="text-2xl font-semibold text-emerald-900">Hold Invoice</DialogTitle>
          <DialogDescription className="text-slate-500">
            Save this invoice for later. You can restore it anytime from the held invoices list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-700 text-sm font-medium">Invoice Name/Reference (Optional)</Label>
            <Input
              id="name"
              placeholder="e.g., Customer Order #123, Large Order, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && cartItemsCount > 0) {
                  handleSubmit();
                }
              }}
              className="pos-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-slate-700 text-sm font-medium">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this invoice..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="pos-input"
            />
          </div>

          <div className="rounded-2xl bg-emerald-50 p-4 text-sm border border-emerald-100 shadow-inner">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-700 font-medium">Items:</span>
              <span className="font-semibold text-emerald-800 text-base">{displayItemCount}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-emerald-100">
              <span className="text-slate-700 font-semibold">Total Amount:</span>
              <span className="font-bold text-lg text-emerald-700">{formatCurrency(displayTotal)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-emerald-100 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100 hover:border-emerald-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || cartItemsCount === 0}
            className="bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 shadow-lg text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Holding...
              </>
            ) : (
              'Hold Invoice'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

