'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Package, AlertTriangle } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { dummyWarehouseStockBalances } from '@/data/dummy/factory/warehouse-stock'
import { isDummyDataEnabled } from '@/lib/dummy-data'

const USE_DUMMY_DATA = isDummyDataEnabled()

interface AdjustStockModalProps {
  isOpen: boolean
  onClose: () => void
  stockBalance?: {
    id: string
    warehouseId: string
    zoneId?: string
    productId: string
    product?: {
      name: string
      sku: string
    }
    quantity: number
    availableQuantity: number
  }
}

interface AdjustStockFormData {
  adjustmentType: 'INCREASE' | 'DECREASE' | 'SET'
  quantity: number
  reason: string
  notes?: string
}

export function AdjustStockModal({ isOpen, onClose, stockBalance }: AdjustStockModalProps) {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<AdjustStockFormData>({
    defaultValues: {
      adjustmentType: 'INCREASE',
      quantity: 0,
      reason: '',
      notes: '',
    },
  })

  const adjustmentType = watch('adjustmentType')

  const adjustStockMutation = useMutation({
    mutationFn: async (data: AdjustStockFormData) => {
      if (USE_DUMMY_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Update dummy data
        const balanceIndex = dummyWarehouseStockBalances.findIndex(b => b.id === stockBalance?.id)
        if (balanceIndex !== -1) {
          const balance = dummyWarehouseStockBalances[balanceIndex]
          let newQuantity = balance.quantity
          
          if (data.adjustmentType === 'INCREASE') {
            newQuantity = balance.quantity + data.quantity
          } else if (data.adjustmentType === 'DECREASE') {
            newQuantity = Math.max(0, balance.quantity - data.quantity)
          } else if (data.adjustmentType === 'SET') {
            newQuantity = Math.max(0, data.quantity)
          }
          
          balance.quantity = newQuantity
          balance.availableQuantity = newQuantity - balance.reservedQuantity
          balance.lastUpdated = new Date().toISOString()
        }
        
        return { success: true }
      }
      
      const currentQuantity = stockBalance?.quantity || 0
      const quantity = data.adjustmentType === 'SET'
        ? data.quantity
        : data.adjustmentType === 'INCREASE'
          ? currentQuantity + data.quantity
          : Math.max(0, currentQuantity - data.quantity)

      const payload = {
        warehouseId: stockBalance?.warehouseId,
        zoneId: stockBalance?.zoneId,
        productId: stockBalance?.productId,
        quantity,
        reservedQuantity: 0,
      }
      
      return await apiClient.post('/warehouses/stock/adjust', payload)
    },
    onSuccess: () => {
      toast.success('Stock adjusted successfully')
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock-summary'] })
      reset()
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to adjust stock')
    },
  })

  const onSubmit = async (data: AdjustStockFormData) => {
    if (!stockBalance) {
      toast.error('No stock balance selected')
      return
    }

    if (data.quantity <= 0) {
      toast.error('Quantity must be greater than 0')
      return
    }

    if (data.adjustmentType === 'DECREASE' && data.quantity > stockBalance.availableQuantity) {
      toast.error(`Cannot decrease by more than available quantity (${stockBalance.availableQuantity})`)
      return
    }

    setIsSubmitting(true)
    try {
      await adjustStockMutation.mutateAsync(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Adjust Stock
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {stockBalance?.product?.name || 'Product'} ({stockBalance?.product?.sku || 'N/A'})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjustmentType" className="text-gray-700">Adjustment Type</Label>
            <Select
              value={adjustmentType}
              onValueChange={(value: 'INCREASE' | 'DECREASE' | 'SET') => setValue('adjustmentType', value)}
            >
              <SelectTrigger className="factory-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCREASE">Increase Stock</SelectItem>
                <SelectItem value="DECREASE">Decrease Stock</SelectItem>
                <SelectItem value="SET">Set Exact Quantity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-gray-700">
              {adjustmentType === 'SET' ? 'New Quantity' : 'Quantity'}
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0"
              {...register('quantity', {
                required: 'Quantity is required',
                min: { value: 0.01, message: 'Quantity must be greater than 0' },
                valueAsNumber: true,
              })}
              className="factory-input"
              placeholder="Enter quantity"
            />
            {errors.quantity && (
              <p className="text-sm text-red-600">{errors.quantity.message}</p>
            )}
            {stockBalance && (
              <div className="text-xs text-gray-500 mt-1">
                Current: {stockBalance.quantity.toLocaleString()} | 
                Available: {stockBalance.availableQuantity.toLocaleString()}
                {adjustmentType === 'SET' && (
                  <span className="ml-2 text-orange-600">
                    New total will be: {watch('quantity') || 0}
                  </span>
                )}
                {adjustmentType === 'INCREASE' && (
                  <span className="ml-2 text-green-600">
                    New total will be: {(stockBalance.quantity + (watch('quantity') || 0)).toLocaleString()}
                  </span>
                )}
                {adjustmentType === 'DECREASE' && (
                  <span className="ml-2 text-red-600">
                    New total will be: {Math.max(0, stockBalance.quantity - (watch('quantity') || 0)).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-gray-700">Reason *</Label>
            <Select
              {...register('reason', { required: 'Reason is required' })}
              onValueChange={(value) => setValue('reason', value)}
            >
              <SelectTrigger className="factory-input">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STOCKTAKE">Stocktake Adjustment</SelectItem>
                <SelectItem value="DAMAGE">Damage</SelectItem>
                <SelectItem value="LOSS">Loss/Theft</SelectItem>
                <SelectItem value="RETURN">Return</SelectItem>
                <SelectItem value="CORRECTION">Correction</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.reason && (
              <p className="text-sm text-red-600">{errors.reason.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-700">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              className="factory-input"
              placeholder="Additional notes (optional)"
              rows={3}
            />
          </div>

          {adjustmentType === 'DECREASE' && stockBalance && watch('quantity') > stockBalance.availableQuantity && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-sm text-orange-700">
                <p className="font-semibold">Warning</p>
                <p>You are trying to decrease by more than the available quantity. This will affect reserved stock.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="factory-button-primary"
            >
              {isSubmitting ? 'Adjusting...' : 'Adjust Stock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

