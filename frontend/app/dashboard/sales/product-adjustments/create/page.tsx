'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useCustomersDropdown } from '@/hooks/useCustomers'
import { useProductsDropdown } from '@/hooks/useProducts'
import {
  useCreateProductAdjustment,
  PRODUCT_ADJUSTMENT_TYPE_LABELS,
  type ProductAdjustmentType,
} from '@/hooks/useProductAdjustments'

const ADJUSTMENT_TYPES = Object.keys(PRODUCT_ADJUSTMENT_TYPE_LABELS) as ProductAdjustmentType[]

export default function CreateProductAdjustmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetCustomerId = searchParams.get('customerId') ?? ''

  const createMutation = useCreateProductAdjustment()
  const { data: customers = [] } = useCustomersDropdown()
  const { data: products = [] } = useProductsDropdown()

  const [customerId, setCustomerId] = useState(presetCustomerId)
  const [productId, setProductId] = useState('')
  const [type, setType] = useState<ProductAdjustmentType>('DEDUCTION')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (presetCustomerId && customers.some((customer) => customer.id === presetCustomerId)) {
      setCustomerId(presetCustomerId)
    }
  }, [presetCustomerId, customers])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setValidationError(null)

    if (!customerId) {
      setValidationError('Select a shop.')
      return
    }

    if (!productId) {
      setValidationError('Select a product.')
      return
    }

    if (!reason.trim()) {
      setValidationError('Reason is required.')
      return
    }

    const parsedQuantity = Number(quantity)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setValidationError('Enter a valid quantity greater than zero.')
      return
    }

    const adjustment = await createMutation.mutateAsync({
      customerId,
      productId,
      type,
      quantity: parsedQuantity,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
    })
    router.push(`/dashboard/sales/product-adjustments/${adjustment.id}`)
  }

  return (
    <ProtectedRoute requiredPermission="product-adjustment.create">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/product-adjustments')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Record Product Adjustment</h1>
            <p className="text-gray-600 mt-1">
              Document a quantity correction for a shop and product. Does not change stock or shop
              ledger automatically.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Adjustment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {validationError && (
                <Alert variant="destructive">
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label>Shop *</Label>
                <Select value={customerId || undefined} onValueChange={setCustomerId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.shopName} ({customer.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Product *</Label>
                <Select value={productId || undefined} onValueChange={setProductId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Adjustment type *</Label>
                <Select value={type} onValueChange={(value) => setType(value as ProductAdjustmentType)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_TYPES.map((adjustmentType) => (
                      <SelectItem key={adjustmentType} value={adjustmentType}>
                        {PRODUCT_ADJUSTMENT_TYPE_LABELS[adjustmentType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.001"
                  step="any"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="mt-1.5"
                  placeholder="e.g. 5"
                />
              </div>

              <div>
                <Label htmlFor="reason">Reason *</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-1.5"
                  placeholder="e.g. Damaged units after delivery"
                  maxLength={256}
                />
              </div>

              <div>
                <Label htmlFor="notes">Internal notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-1.5"
                  rows={3}
                  placeholder="Optional additional notes…"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/sales/product-adjustments')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Record
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </ProtectedRoute>
  )
}
