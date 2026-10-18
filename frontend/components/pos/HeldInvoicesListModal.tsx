'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, RotateCcw, X } from 'lucide-react';
import { HeldInvoice, useHeldInvoices } from '@/hooks/pos/useHeldInvoices';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';

interface HeldInvoicesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
  onRestore: (heldInvoice: HeldInvoice) => void;
}

export default function HeldInvoicesListModal({
  isOpen,
  onClose,
  locationId,
  onRestore,
}: HeldInvoicesListModalProps) {
  const {
    heldInvoices,
    isLoading,
    getHeldInvoices,
    restoreHeldInvoice,
    deleteHeldInvoice,
  } = useHeldInvoices();

  const [selectedInvoice, setSelectedInvoice] = useState<HeldInvoice | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHeldInvoices();
    }
  }, [isOpen, locationId]);

  const loadHeldInvoices = async () => {
    try {
      await getHeldInvoices(locationId);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleRestore = async (invoice: HeldInvoice) => {
    try {
      const restored = await restoreHeldInvoice(invoice.id);
      onRestore(restored);
      onClose();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleDelete = async (invoice: HeldInvoice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${invoice.name || invoice.referenceNumber}"?`)) {
      try {
        await deleteHeldInvoice(invoice.id);
        if (selectedInvoice?.id === invoice.id) {
          setSelectedInvoice(null);
        }
      } catch (error) {
        // Error handling is done in the hook
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[860px] max-h-[90vh] flex flex-col rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 text-slate-900 shadow-2xl">
        <DialogHeader className="border-b border-emerald-100 pb-4">
          <DialogTitle className="text-2xl font-semibold text-emerald-900 flex items-center gap-2">
            Held Invoices
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            View and manage invoices that were saved for later
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left: List of held invoices */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="text-sm text-slate-300 mb-3">
              {heldInvoices.length} {heldInvoices.length === 1 ? 'invoice' : 'invoices'} held
            </div>
            <ScrollArea className="flex-1 border border-emerald-100 rounded-2xl bg-white/80 backdrop-blur">
              {isLoading ? (
                <div className="p-4 text-center text-slate-400 animate-pulse">Loading...</div>
              ) : heldInvoices.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  No held invoices found
                </div>
              ) : (
                <div className="divide-y divide-emerald-50">
                  {heldInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className={`p-4 cursor-pointer transition-all border rounded-xl ${selectedInvoice?.id === invoice.id
                          ? 'border-emerald-400 bg-gradient-to-r from-emerald-50 to-sky-50 shadow-lg'
                          : 'border-transparent hover:bg-white'
                        }`}
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-slate-900 truncate">
                            {invoice.name || invoice.referenceNumber}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {formatDate(invoice.heldAt)}
                          </div>
                          <div className="text-sm font-semibold text-emerald-600 mt-1">
                            {formatCurrency(Number(invoice.totalAmount))}
                          </div>
                          {invoice.restoredAt && (
                            <div className="mt-1 text-xs font-medium text-sky-500">
                              Restored {formatDate(invoice.restoredAt)}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleRestore(invoice)}
                            className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-700"
                            title="Restore to cart"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDelete(invoice, e)}
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Invoice details */}
          <div className="w-80 border border-emerald-100 rounded-2xl p-4 flex flex-col bg-white shadow-lg">
            {selectedInvoice ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg text-emerald-900">Details</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedInvoice(null)}
                    className="h-6 w-6 p-0 text-slate-500 hover:text-emerald-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-3 text-sm text-slate-700">
                    <div>
                      <div className="text-slate-500 font-medium uppercase text-xs tracking-wide">Reference</div>
                      <div className="font-semibold text-slate-900">{selectedInvoice.referenceNumber}</div>
                    </div>

                    {selectedInvoice.name && (
                      <div>
                        <div className="text-slate-500 font-medium uppercase text-xs tracking-wide">Name</div>
                        <div className="font-semibold text-slate-900">{selectedInvoice.name}</div>
                      </div>
                    )}

                    <div>
                      <div className="text-slate-500 font-medium uppercase text-xs tracking-wide">Held At</div>
                      <div className="font-medium text-slate-900">{formatDate(selectedInvoice.heldAt)}</div>
                    </div>

                    {selectedInvoice.customer && (
                      <div>
                        <div className="text-slate-500 font-medium uppercase text-xs tracking-wide">Customer</div>
                        <div className="font-medium text-slate-900">{selectedInvoice.customer.name}</div>
                      </div>
                    )}

                    {selectedInvoice.broker && (
                      <div>
                        <div className="text-slate-500 font-medium uppercase text-xs tracking-wide">Broker</div>
                        <div className="font-medium text-slate-900">
                          {selectedInvoice.broker.name} ({selectedInvoice.broker.brokerCode})
                        </div>
                      </div>
                    )}

                    {selectedInvoice.location && (
                      <div>
                        <div className="text-slate-500 font-medium uppercase text-xs tracking-wide">Location</div>
                        <div className="font-medium text-slate-900">{selectedInvoice.location.name}</div>
                      </div>
                    )}

                    {selectedInvoice.holder && (
                      <div>
                        <div className="text-slate-500 font-medium uppercase text-xs tracking-wide">Held By</div>
                        <div className="font-medium text-slate-900">{selectedInvoice.holder.name}</div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {selectedInvoice.restoredAt && (
                        <div>
                          <div className="text-slate-500 font-medium uppercase text-xs tracking-wide">Last Restored</div>
                          <div className="font-medium text-slate-900">
                            {formatDate(selectedInvoice.restoredAt)}
                          </div>
                          {selectedInvoice.restorer && (
                            <div className="text-xs text-slate-500">
                              Restored by {selectedInvoice.restorer.name}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-slate-500 mb-2 font-medium uppercase text-xs tracking-wide">
                        Items ({selectedInvoice.items.length})
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {selectedInvoice.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-slate-600">
                            <span className="truncate">{item.itemName}</span>
                            <span className="ml-2 font-medium text-slate-900">
                              {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-medium text-slate-900">{formatCurrency(Number(selectedInvoice.subtotal))}</span>
                      </div>
                      {Number(selectedInvoice.discountAmount || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Discount</span>
                          <span className="font-medium text-rose-500">
                            -{formatCurrency(Number(selectedInvoice.discountAmount))}
                          </span>
                        </div>
                      )}
                      {Number(selectedInvoice.taxAmount || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tax ({Number(selectedInvoice.taxRate || 0)}%)</span>
                          <span className="font-medium text-slate-900">{formatCurrency(Number(selectedInvoice.taxAmount))}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-base pt-1 text-slate-900">
                        <span>Total</span>
                        <span>{formatCurrency(Number(selectedInvoice.totalAmount))}</span>
                      </div>
                    </div>

                    {selectedInvoice.notes && (
                      <div className="pt-2 border-t border-slate-200">
                        <div className="text-slate-500 font-medium uppercase text-xs tracking-wide">Notes</div>
                        <div className="text-sm mt-1 text-slate-800">{selectedInvoice.notes}</div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <Button
                    className="w-full bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-white border-none shadow-lg"
                    onClick={() => handleRestore(selectedInvoice)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore to Cart
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Select an invoice to view details
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

