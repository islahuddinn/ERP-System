'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SaleReturn } from '@/hooks/pos/useReturns'
import { formatCurrency } from '@/lib/currency'
import { userResolver } from '@/lib/user-resolver'

interface ReturnDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  saleReturn?: SaleReturn | null
}

export function ReturnDetailsDialog({ open, onOpenChange, saleReturn }: ReturnDetailsDialogProps) {
  if (!saleReturn) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Return {saleReturn.returnNumber}</DialogTitle>
          <DialogDescription>
            Linked sale: {saleReturn.originalSale?.saleNumber ?? 'N/A'} • Location:{' '}
            {saleReturn.location?.name ?? 'N/A'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-4">
            <h4 className="text-sm font-medium text-muted-foreground">Financials</h4>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Subtotal:</span>{' '}
                <span className="font-medium">{formatCurrency(Number(saleReturn.subtotal || 0))}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Tax:</span>{' '}
                <span className="font-medium">{formatCurrency(Number(saleReturn.taxAmount || 0))}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Discount:</span>{' '}
                <span className="font-medium">
                  {formatCurrency(Number(saleReturn.discountAmount || 0))}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Refund Amount:</span>{' '}
                <span className="font-semibold text-primary">
                  {formatCurrency(Number(saleReturn.totalAmount || 0))}
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-4">
            <h4 className="text-sm font-medium text-muted-foreground">Meta</h4>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Reason:</span>{' '}
                <span className="font-medium">{saleReturn.reason}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Refund method:</span>{' '}
                <span className="font-medium">{saleReturn.refundMethod}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Processed by:</span>{' '}
                <span className="font-medium">{saleReturn.processorId ? userResolver.getUserName(saleReturn.processorId) : 'N/A'}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Approved by:</span>{' '}
                <span className="font-medium">{saleReturn.approvedById ? userResolver.getUserName(saleReturn.approvedById) : 'N/A'}</span>
              </p>
            </div>
          </div>
        </div>

        {saleReturn.notes && (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="text-muted-foreground mb-1 font-medium">Notes</p>
            <p className="whitespace-pre-line">{saleReturn.notes}</p>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Returned Items</h4>
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                  <TableHead className="text-right">Original Qty</TableHead>
                  <TableHead className="text-right">Refund</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saleReturn.returnItems?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.itemName}</div>
                      <div className="text-xs text-muted-foreground">{item.itemType}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{Number(item.quantityReturned)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{Number(item.originalQuantity)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(Number(item.lineTotal))}
                    </TableCell>
                  </TableRow>
                ))}
                {!saleReturn.returnItems?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                      No items found for this return.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

