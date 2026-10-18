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
import { useCreateWarehouse, useUpdateWarehouse, type CreateWarehouseDto, type Warehouse } from '@/hooks/useWarehouses'
import { Loader2 } from 'lucide-react'

interface CreateWarehouseModalProps {
  isOpen: boolean
  onClose: () => void
  warehouse?: Warehouse | null
  locations: Array<{ id: string; name: string }>
  users: Array<{ id: string; name: string; email: string }>
}

export function CreateWarehouseModal({
  isOpen,
  onClose,
  warehouse,
  locations,
  users,
}: CreateWarehouseModalProps) {
  const isEdit = !!warehouse
  const queryClient = useQueryClient()
  const createMutation = useCreateWarehouse()
  const updateMutation = useUpdateWarehouse()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateWarehouseDto & { locationId: string }>({
    defaultValues: {
      name: '',
      code: '',
      warehouseType: 'STORAGE',
      locationId: '',
      address: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      totalCapacity: 0,
      capacityUnit: 'CUBIC_METER',
      description: '',
      notes: '',
      managerId: undefined,
      isActive: true,
    },
  })

  useEffect(() => {
    if (warehouse) {
      reset({
        name: warehouse.name,
        code: warehouse.code,
        warehouseType: warehouse.warehouseType,
        locationId: warehouse.locationId,
        address: warehouse.address || '',
        contactPerson: warehouse.contactPerson || '',
        contactPhone: warehouse.contactPhone || '',
        contactEmail: warehouse.contactEmail || '',
        totalCapacity: warehouse.totalCapacity,
        capacityUnit: warehouse.capacityUnit || 'CUBIC_METER',
        description: warehouse.description || '',
        notes: warehouse.notes || '',
        managerId: warehouse.managerId || undefined,
        isActive: warehouse.isActive,
      })
    } else {
      reset({
        name: '',
        code: '',
        warehouseType: 'STORAGE',
        locationId: '',
        address: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        totalCapacity: 0,
        capacityUnit: 'CUBIC_METER',
        description: '',
        notes: '',
        managerId: undefined,
        isActive: true,
      })
    }
  }, [warehouse, reset])

  const onSubmit = async (data: CreateWarehouseDto & { locationId: string }) => {
    try {
      const cleanedData: CreateWarehouseDto = {
        ...data,
        address: data.address?.trim() || undefined,
        contactPerson: data.contactPerson?.trim() || undefined,
        contactPhone: data.contactPhone?.trim() || undefined,
        contactEmail: data.contactEmail?.trim() || undefined,
        description: data.description?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        managerId: data.managerId === 'none' ? undefined : data.managerId,
      }

      if (isEdit && warehouse) {
        await updateMutation.mutateAsync({ id: warehouse.id, data: cleanedData })
        toast.success('Warehouse updated successfully')
      } else {
        await createMutation.mutateAsync(cleanedData)
        toast.success('Warehouse created successfully')
      }
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse', warehouse?.id] })
      onClose()
      reset()
    } catch (error: any) {
      console.error('Error saving warehouse:', error)
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} warehouse`)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-xl font-semibold">
            {isEdit ? 'Edit Warehouse' : 'Add New Warehouse'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isEdit ? 'Update warehouse information' : 'Create a new storage or dispatch warehouse'}
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
                {...register('name', { required: 'Warehouse name is required' })}
                placeholder="Enter warehouse name"
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
                {...register('code', { required: 'Warehouse code is required' })}
                placeholder="WH-001"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              {errors.code && (
                <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="warehouseType" className="text-gray-700 font-medium">
                Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch('warehouseType')}
                onValueChange={(value: 'STORAGE' | 'DISPATCH') => setValue('warehouseType', value)}
              >
                <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                  <SelectValue placeholder="Select warehouse type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STORAGE">Storage</SelectItem>
                  <SelectItem value="DISPATCH">Dispatch</SelectItem>
                </SelectContent>
              </Select>
              {errors.warehouseType && (
                <p className="text-sm text-red-600 mt-1">{errors.warehouseType.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="locationId" className="text-gray-700 font-medium">
                Location <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch('locationId')}
                onValueChange={(value) => setValue('locationId', value)}
              >
                <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(locations) && locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.locationId && (
                <p className="text-sm text-red-600 mt-1">{errors.locationId.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="address" className="text-gray-700 font-medium">Address</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="Enter warehouse address (optional)"
              className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactPerson" className="text-gray-700 font-medium">Contact Person</Label>
              <Input
                id="contactPerson"
                {...register('contactPerson')}
                placeholder="Contact person name"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone" className="text-gray-700 font-medium">Contact Phone</Label>
              <Input
                id="contactPhone"
                {...register('contactPhone')}
                placeholder="Phone number"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contactEmail" className="text-gray-700 font-medium">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              {...register('contactEmail')}
              placeholder="email@example.com"
              className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="capacityUnit" className="text-gray-700 font-medium">Capacity Unit</Label>
              <Select
                value={watch('capacityUnit') || 'CUBIC_METER'}
                onValueChange={(value) => setValue('capacityUnit', value)}
              >
                <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUBIC_METER">Cubic Meter</SelectItem>
                  <SelectItem value="SQUARE_METER">Square Meter</SelectItem>
                  <SelectItem value="UNIT">Unit</SelectItem>
                  <SelectItem value="KILOGRAM">Kilogram</SelectItem>
                  <SelectItem value="TON">Ton</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="managerId" className="text-gray-700 font-medium">Manager</Label>
            <Select
              value={watch('managerId') || 'none'}
              onValueChange={(value) => setValue('managerId', value === 'none' ? undefined : value)}
            >
              <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                <SelectValue placeholder="Select manager (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {Array.isArray(users) && users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-700 font-medium">Description</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Warehouse description (optional)"
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
                isEdit ? 'Update Warehouse' : 'Create Warehouse'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

