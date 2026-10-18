'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateBatch, type CreateBatchDto } from '@/hooks/useBatches'
import { useProducts } from '@/hooks/useProducts'
import { useWarehouses } from '@/hooks/useWarehouses'
import { apiClient } from '@/lib/api-client'
import { getDataOrSelf } from '@/lib/api-helpers'
import { Product, Warehouse, WarehouseZone } from '@/types/common'
import { Loader2 } from 'lucide-react'

interface CreateBatchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateBatchModal({ isOpen, onClose }: CreateBatchModalProps) {
  const createMutation = useCreateBatch()
  const { data: productsData } = useProducts({ isActive: true, limit: 100 })
  const { data: warehousesData } = useWarehouses({ isActive: true, limit: 100 })

  const products = (productsData?.data ?? []) as Product[]
  const warehouses = getDataOrSelf(warehousesData) as Warehouse[]

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBatchDto>({
    defaultValues: {
      productId: '',
      warehouseId: '',
      zoneId: '',
      quantity: 0,
      batchNumber: '',
      manufacturingDate: '',
      expiryDate: '',
      receivedDate: '',
      status: 'ACTIVE',
      notes: '',
    },
  })

  const watchedWarehouseId = watch('warehouseId')

  // Fetch zones when warehouse is selected
  const { data: zonesData } = useQuery({
    queryKey: ['warehouse-zones', watchedWarehouseId],
    queryFn: async () => {
      if (!watchedWarehouseId) return []
      const response = await apiClient.get(`/warehouses/${watchedWarehouseId}/zones`)
      const responseData = response.data?.data || response.data || []
      return Array.isArray(responseData) ? responseData : []
    },
    enabled: !!watchedWarehouseId,
  })

  const zones = (zonesData || []) as WarehouseZone[]

  useEffect(() => {
    if (!isOpen) {
      reset()
    }
  }, [isOpen, reset])

  const onSubmit = async (data: CreateBatchDto) => {
    try {
      // Prepare the data
      const submitData: CreateBatchDto = {
        productId: data.productId,
        warehouseId: data.warehouseId || undefined,
        zoneId: data.zoneId || undefined,
        quantity: Number(data.quantity),
        batchNumber: data.batchNumber || undefined,
        manufacturingDate: data.manufacturingDate || undefined,
        expiryDate: data.expiryDate || undefined,
        receivedDate: data.receivedDate || undefined,
        status: data.status || 'ACTIVE',
        notes: data.notes || undefined,
      }

      await createMutation.mutateAsync(submitData)
      toast.success('Batch created successfully')
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create batch')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Batch</DialogTitle>
          <DialogDescription>
            Create a new batch for a product. Batch number will be auto-generated if not provided.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="productId">Product *</Label>
              <Select
                onValueChange={(value) => {
                  setValue('productId', value, { shouldValidate: true })
                }}
              >
                <SelectTrigger className={errors.productId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product: any) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.productId && (
                <p className="text-sm text-red-600 mt-1">{errors.productId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="warehouseId">Warehouse</Label>
              <Select
                onValueChange={(value) => {
                  setValue('warehouseId', value === 'none' ? '' : value, { shouldValidate: true })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {warehouses.map((warehouse: any) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {watchedWarehouseId && zones.length > 0 && (
            <div>
              <Label htmlFor="zoneId">Zone</Label>
              <Select
                onValueChange={(value) => {
                  setValue('zoneId', value === 'none' ? '' : value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select zone (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {zones.map((zone: any) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name} ({zone.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register('quantity', {
                  required: 'Quantity is required',
                  min: { value: 0.01, message: 'Quantity must be greater than 0' },
                  valueAsNumber: true,
                })}
                className={errors.quantity ? 'border-red-500' : ''}
              />
              {errors.quantity && (
                <p className="text-sm text-red-600 mt-1">{errors.quantity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="batchNumber">Batch Number</Label>
              <Input
                {...register('batchNumber')}
                placeholder="Auto-generated if not provided"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="manufacturingDate">Manufacturing Date</Label>
              <Input
                type="date"
                {...register('manufacturingDate')}
              />
            </div>

            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                type="date"
                {...register('expiryDate')}
              />
            </div>

            <div>
              <Label htmlFor="receivedDate">Received Date</Label>
              <Input
                type="date"
                {...register('receivedDate')}
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              onValueChange={(value) => {
                setValue('status', value as any)
              }}
              defaultValue="ACTIVE"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="QUARANTINE">Quarantine</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CONSUMED">Consumed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              {...register('notes')}
              placeholder="Optional batch notes"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Batch'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

