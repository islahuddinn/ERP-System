'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, PackageCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatCurrency } from '@/lib/currency'
import {
  buildConfirmReceiptPayload,
  useConfirmBranchStockTransferReceipt,
  validateReceivedQuantities,
  type BranchStockTransfer,
} from '@/hooks/useBranchStockTransfers'

interface ConfirmTransferReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transfer: BranchStockTransfer
  onSuccess?: () => void
}

function buildInitialQuantities(
  transfer: BranchStockTransfer,
): Record<string, number> {
  return Object.fromEntries(
    (transfer.items ?? []).map((item) => [item.id, item.quantity]),
  )
}

export function ConfirmTransferReceiptDialog({
  open,
  onOpenChange,
  transfer,
  onSuccess,
}: ConfirmTransferReceiptDialogProps) {
  const confirmReceiptMutation = useConfirmBranchStockTransferReceipt()
  const items = transfer.items ?? []

  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>(() =>
    buildInitialQuantities(transfer),
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setReceivedQuantities(buildInitialQuantities(transfer))
      setValidationError(null)
    }
  }, [open, transfer.id, transfer.items])

  const projectedTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = receivedQuantities[item.id] ?? 0
      return sum + quantity * Number(item.unitPrice)
    }, 0)
  }, [items, receivedQuantities])

  const hasPartialReceipt = items.some(
    (item) => (receivedQuantities[item.id] ?? item.quantity) < item.quantity,
  )

  const handleQuantityChange = (itemId: string, rawValue: string) => {
    setValidationError(null)

    if (rawValue.trim() === '') {
      setReceivedQuantities((current) => ({ ...current, [itemId]: Number.NaN }))
      return
    }

    const parsed = Number(rawValue)
    setReceivedQuantities((current) => ({ ...current, [itemId]: parsed }))
  }

  const handleSubmit = async () => {
    const errorMessage = validateReceivedQuantities(items, receivedQuantities)
    if (errorMessage) {
      setValidationError(errorMessage)
      return
    }

    try {
      const payload = buildConfirmReceiptPayload(items, receivedQuantities)
      await confirmReceiptMutation.mutateAsync({
        transferId: transfer.id,
        confirmBranchStockTransferReceiptPayload: payload,
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      setValidationError(getApiErrorMessage(error, 'Failed to confirm transfer receipt'))
    }
  }

  const isLoading = confirmReceiptMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Transfer Receipt</DialogTitle>
          <DialogDescription>
            Confirm quantities received for {transfer.transferNumber}. Reduce quantities only when
            goods were lost or damaged in transit — prices stay locked from the transfer record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasPartialReceipt && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-amber-900">
                Partial receipt detected. Branch stock and the ledger debit will reflect the
                quantities you confirm below, not the dispatched amounts.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border border-gray-200 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Dispatched</TableHead>
                  <TableHead className="text-right">Received Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const receivedQty = receivedQuantities[item.id]
                  const lineTotal =
                    (Number.isFinite(receivedQty) ? receivedQty : 0) * Number(item.unitPrice)

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium text-gray-900">
                          {item.product?.name ?? item.productId}
                        </p>
                        {item.product?.code && (
                          <p className="text-xs text-gray-500">{item.product.code}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-700">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={item.quantity}
                          step="any"
                          value={Number.isFinite(receivedQty) ? receivedQty : ''}
                          onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                          className="ml-auto h-10 w-28 text-right tabular-nums"
                          disabled={isLoading}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-700">
                        {formatCurrency(Number(item.unitPrice))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-gray-900">
                        {formatCurrency(lineTotal)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col items-end gap-1 text-sm text-gray-700">
            <p>
              Net to debit branch ledger:{' '}
              <span className="font-semibold text-gray-900">{formatCurrency(projectedTotal)}</span>
            </p>
          </div>

          {validationError && (
            <Alert variant="destructive">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-end pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || items.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white min-w-[160px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming…
              </>
            ) : (
              <>
                <PackageCheck className="mr-2 h-4 w-4" />
                Confirm Receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
