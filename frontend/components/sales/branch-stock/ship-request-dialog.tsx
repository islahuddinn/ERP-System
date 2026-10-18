'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Truck } from 'lucide-react'
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
  buildShipRequestPayload,
  computeRemainingRequestBalance,
  useShipBranchStockRequest,
  validateShipQuantities,
  type BranchStockRequest,
} from '@/hooks/useBranchStockRequests'

interface ShipRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchStockRequest: BranchStockRequest
  onSuccess?: () => void
}

function buildInitialShipQuantities(
  request: BranchStockRequest,
  remainingByItemId: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    (request.items ?? []).map((item) => [item.id, remainingByItemId[item.id] ?? 0]),
  )
}

export function ShipRequestDialog({
  open,
  onOpenChange,
  branchStockRequest,
  onSuccess,
}: ShipRequestDialogProps) {
  const shipMutation = useShipBranchStockRequest()
  const items = branchStockRequest.items ?? []

  const remainingByItemId = useMemo(
    () => computeRemainingRequestBalance(branchStockRequest),
    [branchStockRequest],
  )

  const [shipQuantities, setShipQuantities] = useState<Record<string, number>>(() =>
    buildInitialShipQuantities(branchStockRequest, remainingByItemId),
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setShipQuantities(buildInitialShipQuantities(branchStockRequest, remainingByItemId))
      setValidationError(null)
    }
  }, [open, branchStockRequest.id, branchStockRequest.items, remainingByItemId])

  const projectedTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = shipQuantities[item.id] ?? 0
      if (!Number.isFinite(quantity) || quantity <= 0) return sum
      return sum + quantity * Number(item.unitPrice ?? 0)
    }, 0)
  }, [items, shipQuantities])

  const hasPartialShipment = items.some((item) => {
    const quantity = shipQuantities[item.id] ?? 0
    const remaining = remainingByItemId[item.id] ?? 0
    return quantity > 0 && quantity < remaining
  })

  const handleQuantityChange = (itemId: string, rawValue: string) => {
    setValidationError(null)

    if (rawValue.trim() === '') {
      setShipQuantities((current) => ({ ...current, [itemId]: Number.NaN }))
      return
    }

    const parsed = Number(rawValue)
    setShipQuantities((current) => ({ ...current, [itemId]: parsed }))
  }

  const handleSubmit = async () => {
    const errorMessage = validateShipQuantities(items, shipQuantities, remainingByItemId)
    if (errorMessage) {
      setValidationError(errorMessage)
      return
    }

    try {
      const payload = buildShipRequestPayload(items, shipQuantities)
      await shipMutation.mutateAsync({
        requestId: branchStockRequest.id,
        shipBranchStockRequestPayload: payload,
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      setValidationError(getApiErrorMessage(error, 'Failed to ship branch stock transfer'))
    }
  }

  const isLoading = shipMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ship Against Request</DialogTitle>
          <DialogDescription>
            Dispatch stock for {branchStockRequest.requestNumber}. Leave an item at zero to skip it
            this round — you can ship the remainder in a follow-up transfer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasPartialShipment && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-amber-900">
                Partial shipment — any unshipped quantity stays outstanding on this approved request.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border border-gray-200 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Ship Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const shipQty = shipQuantities[item.id]
                  const remaining = remainingByItemId[item.id] ?? 0
                  const lineTotal =
                    (Number.isFinite(shipQty) && shipQty > 0 ? shipQty : 0) *
                    Number(item.unitPrice ?? 0)

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
                        {remaining}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={remaining}
                          step="any"
                          value={Number.isFinite(shipQty) ? shipQty : ''}
                          onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                          className="ml-auto h-10 w-28 text-right tabular-nums"
                          disabled={isLoading || remaining <= 0}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-700">
                        {item.unitPrice != null ? formatCurrency(Number(item.unitPrice)) : '—'}
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
              Shipment subtotal:{' '}
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
                Dispatching…
              </>
            ) : (
              <>
                <Truck className="mr-2 h-4 w-4" />
                Dispatch Transfer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
