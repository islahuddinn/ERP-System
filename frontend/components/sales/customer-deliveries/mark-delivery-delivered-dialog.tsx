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
  buildMarkDeliveredPayload,
  useMarkCustomerDeliveryDelivered,
  validateDeliveredQuantities,
  type CustomerDelivery,
  type CustomerDeliveryItem,
} from '@/hooks/useCustomerDeliveries'

interface MarkDeliveryDeliveredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  delivery: CustomerDelivery
  onSuccess?: () => void
}

function buildInitialQuantities(items: CustomerDeliveryItem[]): Record<string, number> {
  return Object.fromEntries(items.map((item) => [item.id, item.quantity]))
}

export function MarkDeliveryDeliveredDialog({
  open,
  onOpenChange,
  delivery,
  onSuccess,
}: MarkDeliveryDeliveredDialogProps) {
  const markDeliveredMutation = useMarkCustomerDeliveryDelivered()
  const items = delivery.items ?? []

  const [deliveredQuantities, setDeliveredQuantities] = useState<Record<string, number>>(() =>
    buildInitialQuantities(items),
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDeliveredQuantities(buildInitialQuantities(items))
      setValidationError(null)
    }
  }, [open, delivery.id, items])

  const projectedTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = deliveredQuantities[item.id] ?? 0
      return sum + quantity * Number(item.unitPrice)
    }, 0)
  }, [items, deliveredQuantities])

  const discountAmount = Number(delivery.discountAmount)
  const projectedNet = Math.max(projectedTotal - discountAmount, 0)
  const hasPartialDelivery = items.some(
    (item) => (deliveredQuantities[item.id] ?? item.quantity) < item.quantity,
  )

  const handleQuantityChange = (item: CustomerDeliveryItem, rawValue: string) => {
    setValidationError(null)

    if (rawValue.trim() === '') {
      setDeliveredQuantities((current) => ({ ...current, [item.id]: Number.NaN }))
      return
    }

    const parsed = Number(rawValue)
    setDeliveredQuantities((current) => ({ ...current, [item.id]: parsed }))
  }

  const handleSubmit = async () => {
    const errorMessage = validateDeliveredQuantities(items, deliveredQuantities)
    if (errorMessage) {
      setValidationError(errorMessage)
      return
    }

    if (discountAmount > projectedTotal) {
      setValidationError('Discount amount exceeds the adjusted delivery subtotal.')
      return
    }

    try {
      const payload = buildMarkDeliveredPayload(items, deliveredQuantities)
      await markDeliveredMutation.mutateAsync({
        deliveryId: delivery.id,
        markCustomerDeliveryDeliveredPayload: payload,
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      setValidationError(getApiErrorMessage(error, 'Failed to mark delivery as delivered'))
    }
  }

  const isLoading = markDeliveredMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark Delivery as Delivered</DialogTitle>
          <DialogDescription>
            Confirm quantities for {delivery.deliveryNumber}. Reduce quantities only when short on
            stock — prices stay locked from the delivery record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasPartialDelivery && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-amber-900">
                Partial delivery detected. The shop ledger and order status will reflect the
                quantities you confirm below.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border border-gray-200 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Deliver Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const deliveredQty = deliveredQuantities[item.id]
                  const lineTotal = (Number.isFinite(deliveredQty) ? deliveredQty : 0) * Number(item.unitPrice)

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium text-gray-900">{item.product?.name ?? item.productId}</p>
                        {item.product?.code && (
                          <p className="text-xs text-gray-500">{item.product.code}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-700">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0.01}
                          max={item.quantity}
                          step="any"
                          value={Number.isFinite(deliveredQty) ? deliveredQty : ''}
                          onChange={(event) => handleQuantityChange(item, event.target.value)}
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
              Projected subtotal:{' '}
              <span className="font-semibold text-gray-900">{formatCurrency(projectedTotal)}</span>
            </p>
            {discountAmount > 0 && (
              <p>
                Discount:{' '}
                <span className="font-semibold text-gray-900">−{formatCurrency(discountAmount)}</span>
              </p>
            )}
            <p>
              Net to debit shop ledger:{' '}
              <span className="font-semibold text-gray-900">{formatCurrency(projectedNet)}</span>
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
                Confirm Delivery
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
