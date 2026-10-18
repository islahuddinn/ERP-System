'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { ArrowRightLeft, Package, AlertTriangle } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { dummyWarehouseStockBalances, dummyWarehouseStockTransactions } from '@/data/dummy/factory/warehouse-stock'
import { useWarehouses, type Warehouse } from '@/hooks/useWarehouses'
import { getAllDummyZones } from '@/data/dummy/factory/warehouses'
import { getDummyDataStore } from '@/hooks/useWarehouses'
import { isDummyDataEnabled } from '@/lib/dummy-data'

const USE_DUMMY_DATA = isDummyDataEnabled()

interface TransferStockModalProps {
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

interface TransferStockFormData {
  fromWarehouseId: string
  fromZoneId?: string
  toWarehouseId: string
  toZoneId?: string
  quantity: number
  batchId?: string
  notes?: string
}

export function TransferStockModal({ isOpen, onClose, stockBalance }: TransferStockModalProps) {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [allZones, setAllZones] = useState<any[]>([])

  const { data: warehousesData } = useWarehouses({ limit: 1000 })
  const warehouses = warehousesData?.data || []

  useEffect(() => {
    const fetchZones = async () => {
      if (USE_DUMMY_DATA && warehouses.length > 0) {
        const store = getDummyDataStore()
        const zonesData = getAllDummyZones(warehouses, store.zones)
        setAllZones(zonesData)
      }
    }
    if (warehouses.length > 0) {
      fetchZones()
    }
  }, [warehouses])

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<TransferStockFormData>({
    defaultValues: {
      fromWarehouseId: stockBalance?.warehouseId || '',
      fromZoneId: stockBalance?.zoneId || '',
      toWarehouseId: '',
      toZoneId: '',
      quantity: 0,
      batchId: '',
      notes: '',
    },
  })

  const fromWarehouseId = watch('fromWarehouseId')
  const toWarehouseId = watch('toWarehouseId')

  // Get zones for selected warehouses
  const fromZones = allZones.filter(z => z.warehouse?.id === fromWarehouseId)
  const toZones = allZones.filter(z => z.warehouse?.id === toWarehouseId)

  // Get batches for the product
  const batches = stockBalance ? dummyWarehouseStockBalances
    .filter(b => b.productId === stockBalance.productId && b.warehouseId === fromWarehouseId && b.batchId)
    .map(b => b.batch!)
    .filter((batch, index, self) => index === self.findIndex(b => b.id === batch.id))
    : []

  useEffect(() => {
    if (stockBalance) {
      setValue('fromWarehouseId', stockBalance.warehouseId)
      setValue('fromZoneId', stockBalance.zoneId || '')
    }
  }, [stockBalance, setValue])

  const transferStockMutation = useMutation({
    mutationFn: async (data: TransferStockFormData) => {
      if (USE_DUMMY_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Update source balance
        const sourceBalance = dummyWarehouseStockBalances.find(b => 
          b.warehouseId === data.fromWarehouseId &&
          b.zoneId === data.fromZoneId &&
          b.productId === stockBalance?.productId &&
          (!data.batchId || b.batchId === data.batchId)
        )
        
        if (sourceBalance) {
          sourceBalance.quantity -= data.quantity
          sourceBalance.availableQuantity = sourceBalance.quantity - sourceBalance.reservedQuantity
          sourceBalance.lastUpdated = new Date().toISOString()
        }
        
        // Update or create destination balance
        let destBalance = dummyWarehouseStockBalances.find(b =>
          b.warehouseId === data.toWarehouseId &&
          b.zoneId === data.toZoneId &&
          b.productId === stockBalance?.productId &&
          (!data.batchId || b.batchId === data.batchId)
        )
        
        if (destBalance) {
          destBalance.quantity += data.quantity
          destBalance.availableQuantity = destBalance.quantity - destBalance.reservedQuantity
          destBalance.lastUpdated = new Date().toISOString()
        } else {
          // Create new balance
          const newBalance = {
            id: `wsb-${data.toWarehouseId}-${stockBalance?.productId}-${data.toZoneId || 'nozone'}-${data.batchId || 'nobatch'}`,
            warehouseId: data.toWarehouseId,
            zoneId: data.toZoneId,
            productId: stockBalance?.productId || '',
            batchId: data.batchId,
            quantity: data.quantity,
            reservedQuantity: 0,
            availableQuantity: data.quantity,
            lastUpdated: new Date().toISOString(),
            warehouse: warehouses.find((w: Warehouse) => w.id === data.toWarehouseId),
            zone: data.toZoneId ? allZones.find(z => z.id === data.toZoneId) : undefined,
            product: stockBalance?.product,
            batch: data.batchId ? batches.find(b => b.id === data.batchId) : undefined,
          }
          dummyWarehouseStockBalances.push(newBalance as any)
        }
        
        // Create transaction record
        const transaction = {
          id: `wst-${Date.now()}`,
          warehouseId: data.fromWarehouseId,
          zoneId: data.fromZoneId,
          productId: stockBalance?.productId || '',
          batchId: data.batchId,
          transactionType: 'TRANSFER_OUT' as const,
          quantity: data.quantity,
          referenceType: 'TRANSFER',
          referenceId: `transfer-${Date.now()}`,
          notes: data.notes,
          createdAt: new Date().toISOString(),
          createdById: 'user-1',
          warehouse: warehouses.find((w: Warehouse) => w.id === data.fromWarehouseId),
          zone: data.fromZoneId ? allZones.find(z => z.id === data.fromZoneId) : undefined,
          product: stockBalance?.product,
          batch: data.batchId ? batches.find(b => b.id === data.batchId) : undefined,
        }
        dummyWarehouseStockTransactions.unshift(transaction as any)
        
        // Create receiving transaction
        const receivingTransaction = {
          ...transaction,
          id: `wst-${Date.now()}-rec`,
          warehouseId: data.toWarehouseId,
          zoneId: data.toZoneId,
          transactionType: 'TRANSFER_IN' as const,
          warehouse: warehouses.find((w: Warehouse) => w.id === data.toWarehouseId),
          zone: data.toZoneId ? allZones.find(z => z.id === data.toZoneId) : undefined,
        }
        dummyWarehouseStockTransactions.unshift(receivingTransaction as any)
        
        return { success: true }
      }
      
      const payload = {
        fromWarehouseId: data.fromWarehouseId,
        fromZoneId: data.fromZoneId,
        toWarehouseId: data.toWarehouseId,
        toZoneId: data.toZoneId,
        productId: stockBalance?.productId,
        batchId: data.batchId,
        quantity: data.quantity,
        notes: data.notes,
      }
      
      return await apiClient.post('/warehouses/stock/transfer', payload)
    },
    onSuccess: () => {
      toast.success('Stock transferred successfully')
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock-summary'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock-transactions'] })
      reset()
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to transfer stock')
    },
  })

  const onSubmit = async (data: TransferStockFormData) => {
    if (!stockBalance) {
      toast.error('No stock balance selected')
      return
    }

    if (data.quantity <= 0) {
      toast.error('Quantity must be greater than 0')
      return
    }

    if (data.fromWarehouseId === data.toWarehouseId && data.fromZoneId === data.toZoneId) {
      toast.error('Source and destination must be different')
      return
    }

    if (data.quantity > stockBalance.availableQuantity) {
      toast.error(`Cannot transfer more than available quantity (${stockBalance.availableQuantity})`)
      return
    }

    setIsSubmitting(true)
    try {
      await transferStockMutation.mutateAsync(data)
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
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            Transfer Stock
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {stockBalance?.product?.name || 'Product'} ({stockBalance?.product?.sku || 'N/A'})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromWarehouseId" className="text-gray-700">From Warehouse *</Label>
              <Select
                value={fromWarehouseId}
                onValueChange={(value) => {
                  setValue('fromWarehouseId', value)
                  setValue('fromZoneId', '')
                }}
              >
                <SelectTrigger className="factory-input">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse: any) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toWarehouseId" className="text-gray-700">To Warehouse *</Label>
              <Select
                value={toWarehouseId}
                onValueChange={(value) => {
                  setValue('toWarehouseId', value)
                  setValue('toZoneId', '')
                }}
              >
                <SelectTrigger className="factory-input">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.filter((w: any) => w.id !== fromWarehouseId).map((warehouse: any) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromZoneId" className="text-gray-700">From Zone (Optional)</Label>
              <Select
                value={watch('fromZoneId') || 'none'}
                onValueChange={(value) => setValue('fromZoneId', value === 'none' ? undefined : value)}
              >
                <SelectTrigger className="factory-input">
                  <SelectValue placeholder="No zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Zone</SelectItem>
                  {fromZones.map((zone: any) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toZoneId" className="text-gray-700">To Zone (Optional)</Label>
              <Select
                value={watch('toZoneId') || 'none'}
                onValueChange={(value) => setValue('toZoneId', value === 'none' ? undefined : value)}
              >
                <SelectTrigger className="factory-input">
                  <SelectValue placeholder="No zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Zone</SelectItem>
                  {toZones.map((zone: any) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {batches.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="batchId" className="text-gray-700">Batch (Optional)</Label>
              <Select
                value={watch('batchId') || 'none'}
                onValueChange={(value) => setValue('batchId', value === 'none' ? undefined : value)}
              >
                <SelectTrigger className="factory-input">
                  <SelectValue placeholder="No batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Batch</SelectItem>
                  {batches.map((batch: any) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batchNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-gray-700">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0"
              max={stockBalance?.availableQuantity}
              {...register('quantity', {
                required: 'Quantity is required',
                min: { value: 0.01, message: 'Quantity must be greater than 0' },
                max: {
                  value: stockBalance?.availableQuantity || Infinity,
                  message: `Cannot transfer more than available (${stockBalance?.availableQuantity || 0})`,
                },
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
                Available: {stockBalance.availableQuantity.toLocaleString()}
              </div>
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
              {isSubmitting ? 'Transferring...' : 'Transfer Stock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

