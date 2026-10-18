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
import { Textarea } from '@/components/ui/textarea'
import { useCreatePlant, useUpdatePlant, type CreatePlantDto, type Plant } from '@/hooks/usePlants'
import { Loader2 } from 'lucide-react'

interface CreatePlantModalProps {
  isOpen: boolean
  onClose: () => void
  plant?: Plant | null
  locations: Array<{ id: string; name: string }>
  users: Array<{ id: string; name: string; email: string }>
}

export function CreatePlantModal({
  isOpen,
  onClose,
  plant,
  locations,
  users,
}: CreatePlantModalProps) {
  const isEdit = !!plant
  const queryClient = useQueryClient()
  const createMutation = useCreatePlant()
  const updateMutation = useUpdatePlant()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreatePlantDto & { locationId: string; managerId?: string }>({
    defaultValues: {
      name: '',
      code: '',
      locationId: '',
      plantType: 'MANUFACTURING',
      capacity: 'MEDIUM',
      address: '',
      managerId: undefined,
      description: '',
      contactPhone: '',
      contactEmail: '',
      contactPerson: '',
      operatingHours: '',
    },
  })

  useEffect(() => {
    if (plant) {
      reset({
        name: plant.name,
        code: plant.code,
        locationId: plant.locationId,
        plantType: (plant.plantType as any) || 'MANUFACTURING',
        capacity: (plant.capacity as any) || 'MEDIUM',
        address: plant.address || '',
        managerId: plant.managerId || undefined,
        description: plant.description || '',
        contactPhone: (plant as any).contactPhone || '',
        contactEmail: (plant as any).contactEmail || '',
        contactPerson: (plant as any).contactPerson || '',
        operatingHours: (plant as any).operatingHours || '',
      })
    } else {
      reset({
        name: '',
        code: '',
        locationId: '',
        plantType: 'MANUFACTURING',
        capacity: 'MEDIUM',
        address: '',
        managerId: undefined,
        description: '',
        contactPhone: '',
        contactEmail: '',
        contactPerson: '',
        operatingHours: '',
      })
    }
  }, [plant, reset])

  const onSubmit = async (data: CreatePlantDto & { locationId: string; managerId?: string }) => {
    try {
      // Build plant data object, only including fields with actual values
      const cleanedData: CreatePlantDto = {
        name: data.name.trim(),
        code: data.code.trim(),
        locationId: data.locationId,
        plantType: data.plantType,
        capacity: data.capacity,
        address: data.address.trim(),
      }

      // Only add optional fields if they have values
      if (data.managerId && data.managerId !== 'none') {
        cleanedData.managerId = data.managerId
      }

      const description = data.description?.trim()
      if (description) {
        cleanedData.description = description
      }

      const contactPhone = data.contactPhone?.trim()
      if (contactPhone) {
        cleanedData.contactPhone = contactPhone
      }

      const contactEmail = data.contactEmail?.trim()
      if (contactEmail) {
        cleanedData.contactEmail = contactEmail
      }

      const contactPerson = data.contactPerson?.trim()
      if (contactPerson) {
        cleanedData.contactPerson = contactPerson
      }

      const operatingHours = data.operatingHours?.trim()
      if (operatingHours) {
        cleanedData.operatingHours = operatingHours
      }

      if (isEdit && plant) {
        // For updates, build payload with only provided fields
        const updateData: any = {}
        
        // Only include fields that are different from existing plant or explicitly provided
        const addIfChanged = (key: string, newValue: any, oldValue: any) => {
          if (newValue !== undefined && newValue !== null && newValue !== '') {
            if (typeof newValue === 'string' && newValue.trim() !== '') {
              const trimmed = newValue.trim()
              if (trimmed !== (oldValue || '')) {
                updateData[key] = trimmed
              }
            } else if (newValue !== oldValue) {
              updateData[key] = newValue
            }
          }
        }
        
        addIfChanged('name', cleanedData.name, plant.name)
        addIfChanged('code', cleanedData.code, plant.code)
        addIfChanged('locationId', cleanedData.locationId, plant.locationId)
        addIfChanged('plantType', cleanedData.plantType, plant.plantType)
        addIfChanged('capacity', cleanedData.capacity, plant.capacity)
        addIfChanged('address', cleanedData.address, plant.address)
        addIfChanged('managerId', cleanedData.managerId, plant.managerId)
        addIfChanged('description', cleanedData.description, plant.description)
        addIfChanged('contactPhone', cleanedData.contactPhone, plant.contactPhone)
        addIfChanged('contactEmail', cleanedData.contactEmail, plant.contactEmail)
        addIfChanged('contactPerson', cleanedData.contactPerson, plant.contactPerson)
        addIfChanged('operatingHours', cleanedData.operatingHours, plant.operatingHours)
        
        // Handle number fields
        if (cleanedData.totalArea !== undefined && cleanedData.totalArea !== null) {
          const num = Number(cleanedData.totalArea)
          if (!isNaN(num) && num >= 0 && num !== plant.totalArea) {
            updateData.totalArea = num
          }
        }
        if (cleanedData.productionCapacity !== undefined && cleanedData.productionCapacity !== null) {
          const num = Number(cleanedData.productionCapacity)
          if (!isNaN(num) && num >= 0 && num !== plant.productionCapacity) {
            updateData.productionCapacity = num
          }
        }
        
        await updateMutation.mutateAsync({ id: plant.id, data: updateData })
        toast.success('Plant updated successfully')
      } else {
        await createMutation.mutateAsync(cleanedData)
        toast.success('Plant created successfully')
      }
      queryClient.invalidateQueries({ queryKey: ['plants'] })
      queryClient.invalidateQueries({ queryKey: ['plant', plant?.id] })
      onClose()
      reset()
    } catch (error: any) {
      console.error('Error saving plant:', error)
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} plant`)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-xl font-semibold">
            {isEdit ? 'Edit Plant' : 'Add New Plant'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isEdit ? 'Update plant information' : 'Create a new production plant'}
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
                {...register('name', { required: 'Plant name is required' })}
                placeholder="Enter plant name"
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
                {...register('code', { required: 'Plant code is required' })}
                placeholder="PLANT-001"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              {errors.code && (
                <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="locationId" className="text-gray-700 font-medium">
                Location <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch('locationId') || ''}
                onValueChange={(value) => setValue('locationId', value, { shouldValidate: true })}
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
            <div>
              <Label htmlFor="plantType" className="text-gray-700 font-medium">
                Plant Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch('plantType') || 'MANUFACTURING'}
                onValueChange={(value) => setValue('plantType', value as CreatePlantDto['plantType'], { shouldValidate: true })}
              >
                <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                  <SelectValue placeholder="Select plant type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUFACTURING">Manufacturing</SelectItem>
                  <SelectItem value="ASSEMBLY">Assembly</SelectItem>
                  <SelectItem value="PACKAGING">Packaging</SelectItem>
                  <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                  <SelectItem value="QUALITY_CONTROL">Quality Control</SelectItem>
                  <SelectItem value="RESEARCH_DEVELOPMENT">Research & Development</SelectItem>
                  <SelectItem value="ADMINISTRATION">Administration</SelectItem>
                  <SelectItem value="MIXED">Mixed</SelectItem>
                </SelectContent>
              </Select>
              {errors.plantType && (
                <p className="text-sm text-red-600 mt-1">{errors.plantType.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="capacity" className="text-gray-700 font-medium">
                Capacity <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch('capacity') || 'MEDIUM'}
                onValueChange={(value) => setValue('capacity', value as CreatePlantDto['capacity'], { shouldValidate: true })}
              >
                <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                  <SelectValue placeholder="Select capacity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMALL">Small</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LARGE">Large</SelectItem>
                  <SelectItem value="EXTRA_LARGE">Extra Large</SelectItem>
                </SelectContent>
              </Select>
              {errors.capacity && (
                <p className="text-sm text-red-600 mt-1">{errors.capacity.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="address" className="text-gray-700 font-medium">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                {...register('address', { required: 'Address is required' })}
                placeholder="Enter plant address"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              {errors.address && (
                <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="managerId" className="text-gray-700 font-medium">
              Manager
            </Label>
            <Select
              value={watch('managerId') || 'none'}
              onValueChange={(value) => setValue('managerId', value === 'none' ? undefined : value, { shouldValidate: true })}
            >
              <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Manager</SelectItem>
                {Array.isArray(users) && users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-700 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter plant description"
              rows={3}
              className="mt-1.5 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactPerson" className="text-gray-700 font-medium">
                Contact Person
              </Label>
              <Input
                id="contactPerson"
                {...register('contactPerson')}
                placeholder="Enter contact person name"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone" className="text-gray-700 font-medium">
                Contact Phone
              </Label>
              <Input
                id="contactPhone"
                {...register('contactPhone')}
                placeholder="Enter contact phone"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactEmail" className="text-gray-700 font-medium">
                Contact Email
              </Label>
              <Input
                id="contactEmail"
                type="email"
                {...register('contactEmail')}
                placeholder="Enter contact email"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <Label htmlFor="operatingHours" className="text-gray-700 font-medium">
                Operating Hours
              </Label>
              <Input
                id="operatingHours"
                {...register('operatingHours')}
                placeholder="e.g., 9:00 AM - 5:00 PM"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
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
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update Plant' : 'Create Plant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

