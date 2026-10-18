'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CUSTOMER_RETURN_REASON_LABELS,
  useCreateCustomerReturn,
  validateReturnQuantity,
  type CustomerReturnReason,
  type ReturnableQuantitySummary,
} from '@/hooks/useCustomerReturns'
import type { CustomerDeliveryItem } from '@/hooks/useCustomerDeliveries'
import { formatCurrency } from '@/lib/currency'

interface ReturnLineFormProps {
  deliveryItem: CustomerDeliveryItem
  returnable: ReturnableQuantitySummary
  onSuccess?: () => void
}

export function ReturnLineForm({ deliveryItem, returnable, onSuccess }: ReturnLineFormProps) {
  const createMutation = useCreateCustomerReturn()
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState<CustomerReturnReason>('UNSOLD')
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const productName = deliveryItem.product?.name ?? deliveryItem.productId
  const isDisabled = returnable.remainingQuantity <= 0

  useEffect(() => {
    setQuantity('')
    setReason('UNSOLD')
    setNotes('')
    setValidationError(null)
  }, [deliveryItem.id, returnable.remainingQuantity])

  const projectedTotal = useMemo(() => {
    const parsedQuantity = Number(quantity)
    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) return 0
    return parsedQuantity * Number(deliveryItem.unitPrice)
  }, [quantity, deliveryItem.unitPrice])

  const handleSubmit = () => {
    const parsedQuantity = Number(quantity)
    const error = validateReturnQuantity(
      parsedQuantity,
      returnable.remainingQuantity,
      productName,
    )

    if (error) {
      setValidationError(error)
      return
    }

    createMutation.mutate(
      {
        deliveryItemId: deliveryItem.id,
        quantity: parsedQuantity,
        reason,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setQuantity('')
          setNotes('')
          setValidationError(null)
          onSuccess?.()
        },
      },
    )
  }

  if (isDisabled) {
    return (
      <p className="text-sm text-gray-500 italic">
        Fully returned — no remaining quantity on this line.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor={`qty-${deliveryItem.id}`}>Return qty (max {returnable.remainingQuantity})</Label>
          <Input
            id={`qty-${deliveryItem.id}`}
            type="number"
            min={0}
            max={returnable.remainingQuantity}
            step="any"
            value={quantity}
            onChange={(event) => {
              setValidationError(null)
              setQuantity(event.target.value)
            }}
            disabled={createMutation.isPending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`reason-${deliveryItem.id}`}>Reason</Label>
          <Select
            value={reason}
            onValueChange={(value) => setReason(value as CustomerReturnReason)}
            disabled={createMutation.isPending}
          >
            <SelectTrigger id={`reason-${deliveryItem.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CUSTOMER_RETURN_REASON_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`notes-${deliveryItem.id}`}>Notes (optional)</Label>
          <Textarea
            id={`notes-${deliveryItem.id}`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            maxLength={256}
            disabled={createMutation.isPending}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Credit at unit price{' '}
          <span className="font-medium text-gray-900">
            {formatCurrency(Number(deliveryItem.unitPrice))}
          </span>
          {projectedTotal > 0 && (
            <>
              {' '}
              → projected{' '}
              <span className="font-medium text-gray-900">{formatCurrency(projectedTotal)}</span>{' '}
              (pending approval)
            </>
          )}
        </p>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending || !quantity}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            'Submit Return'
          )}
        </Button>
      </div>

      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
