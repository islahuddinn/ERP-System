'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateWarehouseZone, useUpdateWarehouseZone, type WarehouseZone } from '@/hooks/useWarehouses'
import { Loader2 } from 'lucide-react'

interface CreateZoneModalProps {
  isOpen: boolean
  onClose: () => void
  warehouseId: string
  zone?: WarehouseZone | null
}

interface ZoneFormData {
  name: string
  code: string
  zoneType: 'RAW_MATERIALS' | 'PACKAGING' | 'FINISHED_GOODS' | 'QUARANTINE' | 'REJECTED' | 'TEMPORARY'
  totalCapacity: number
  description?: string
  temperature?: number
  humidity?: number
  notes?: string
  isActive?: boolean
}

export function CreateZoneModal({
  isOpen,
  onClose,
  warehouseId,
  zone,
}: CreateZoneModalProps) {
  const isEdit = !!zone
  const queryClient = useQueryClient()
  const createMutation = useCreateWarehouseZone()
  const updateMutation = useUpdateWarehouseZone()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ZoneFormData>({
    defaultValues: {
      name: '',
      code: '',
      zoneType: 'RAW_MATERIALS',
      totalCapacity: 0,
      description: '',
      temperature: undefined,
      humidity: undefined,
      notes: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (zone) {
      reset({
        name: zone.name,
        code: zone.code,
        zoneType: zone.zoneType,
        totalCapacity: zone.totalCapacity,
        description: zone.description || '',
        temperature: zone.temperature || undefined,
        humidity: zone.humidity || undefined,
        notes: zone.notes || '',
        isActive: zone.isActive,
      })
    } else {
      reset({
        name: '',
        code: '',
        zoneType: 'RAW_MATERIALS',
        totalCapacity: 0,
        description: '',
        temperature: undefined,
        humidity: undefined,
        notes: '',
        isActive: true,
      })
    }
  }, [zone, reset])

  const onSubmit = async (data: ZoneFormData) => {
    try {
      const cleanedData = {
        ...data,
        description: data.description?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        temperature: data.temperature || undefined,
        humidity: data.humidity || undefined,
      }

      if (isEdit && zone) {
        await updateMutation.mutateAsync({ warehouseId, zoneId: zone.id, data: cleanedData })
        toast.success('Zone updated successfully')
      } else {
        await createMutation.mutateAsync({ warehouseId, data: cleanedData })
        toast.success('Zone created successfully')
      }
      queryClient.invalidateQueries({ queryKey: ['warehouse-zones', warehouseId] })
      queryClient.invalidateQueries({ queryKey: ['warehouse', warehouseId] })
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      onClose()
      reset()
    } catch (error: any) {
      console.error('Error saving zone:', error)
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} zone`)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-xl font-semibold">
            {isEdit ? 'Edit Zone' : 'Add New Zone'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isEdit ? 'Update zone information' : 'Create a new zone in this warehouse'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-gray-700 font-medium">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register('name', { required: 'Zone name is required' })}
                placeholder="Enter zone name"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="code" className="text-gray-700 font-medium">
                Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                {...register('code', { required: 'Zone code is required' })}
                placeholder="ZONE-001"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              {errors.code && (
                <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="zoneType" className="text-gray-700 font-medium">
              Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch('zoneType')}
              onValueChange={(value: any) => setValue('zoneType', value)}
            >
              <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                <SelectValue placeholder="Select zone type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RAW_MATERIALS">Raw Materials</SelectItem>
                <SelectItem value="PACKAGING">Packaging</SelectItem>
                <SelectItem value="FINISHED_GOODS">Finished Goods</SelectItem>
                <SelectItem value="QUARANTINE">Quarantine</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="TEMPORARY">Temporary</SelectItem>
              </SelectContent>
            </Select>
            {errors.zoneType && (
              <p className="text-sm text-red-600 mt-1">{errors.zoneType.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="totalCapacity" className="text-gray-700 font-medium">
              Total Capacity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="totalCapacity"
              type="number"
              step="0.01"
              {...register('totalCapacity', {
                required: 'Total capacity is required',
                valueAsNumber: true,
                min: { value: 0, message: 'Capacity must be positive' },
              })}
              placeholder="1000"
              className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {errors.totalCapacity && (
              <p className="text-sm text-red-600 mt-1">{errors.totalCapacity.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="temperature" className="text-gray-700 font-medium">Temperature (°C)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                {...register('temperature', { valueAsNumber: true })}
                placeholder="Optional"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <Label htmlFor="humidity" className="text-gray-700 font-medium">Humidity (%)</Label>
              <Input
                id="humidity"
                type="number"
                step="0.1"
                {...register('humidity', { valueAsNumber: true })}
                placeholder="Optional"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-700 font-medium">Description</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Zone description (optional)"
              className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-gray-700 font-medium">Notes</Label>
            <Input
              id="notes"
              {...register('notes')}
              placeholder="Additional notes (optional)"
              className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <DialogFooter className="gap-2 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEdit ? 'Update Zone' : 'Create Zone'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

