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
import { useCreateProductionLine, useUpdateProductionLine, type CreateProductionLineDto, type ProductionLine, type ProductionLineStatus } from '@/hooks/usePlants'
import { Loader2 } from 'lucide-react'

interface CreateProductionLineModalProps {
  isOpen: boolean
  onClose: () => void
  line?: ProductionLine | null
  plantId: string
}

export function CreateProductionLineModal({
  isOpen,
  onClose,
  line,
  plantId,
}: CreateProductionLineModalProps) {
  const isEdit = !!line
  const queryClient = useQueryClient()
  const createMutation = useCreateProductionLine()
  const updateMutation = useUpdateProductionLine()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateProductionLineDto>({
    defaultValues: {
      plantId: plantId,
      name: '',
      code: '',
      lineType: 'ASSEMBLY',
      capacity: 100,
      status: 'ACTIVE',
      description: '',
    },
  })

  useEffect(() => {
    if (line) {
      reset({
        plantId: line.plantId,
        name: line.name,
        code: line.code,
        lineType: (line as any).lineType || 'ASSEMBLY',
        capacity: line.capacity,
        status: line.status,
        description: line.description || '',
      })
    } else {
      reset({
        plantId: plantId,
        name: '',
        code: '',
        lineType: 'ASSEMBLY',
        capacity: 100,
        status: 'ACTIVE',
        description: '',
      })
    }
  }, [line, plantId, reset])

  const onSubmit = async (data: CreateProductionLineDto) => {
    try {
      // Build payload with required fields only
      const cleanedData: any = {
        name: String(data.name).trim(),
        code: String(data.code).trim(),
        lineType: data.lineType,
        capacity: Number(data.capacity),
        plantId: data.plantId,
      }

      // Add optional fields only if they have valid values
      const addString = (key: string, value: unknown) => {
        if (typeof value === 'string' && value.trim() !== '') {
          cleanedData[key] = value.trim()
        }
      }

      addString('description', data.description)
      addString('location', data.location)
      addString('operatingHours', data.operatingHours)
      addString('notes', data.notes)

      if (data.supervisorId && data.supervisorId !== 'none' && data.supervisorId.trim() !== '') {
        cleanedData.supervisorId = data.supervisorId.trim()
      }

      if (data.departments && Array.isArray(data.departments) && data.departments.length > 0) {
        const validDepts = data.departments.filter(d => d && String(d).trim() !== '').map(d => String(d).trim())
        if (validDepts.length > 0) {
          cleanedData.departments = validDepts
        }
      }

      if (data.certifications && Array.isArray(data.certifications) && data.certifications.length > 0) {
        const validCerts = data.certifications.filter(c => c && String(c).trim() !== '').map(c => String(c).trim())
        if (validCerts.length > 0) {
          cleanedData.certifications = validCerts
        }
      }

      if (data.equipment && Array.isArray(data.equipment) && data.equipment.length > 0) {
        const validEquip = data.equipment.filter(e => e && String(e).trim() !== '').map(e => String(e).trim())
        if (validEquip.length > 0) {
          cleanedData.equipment = validEquip
        }
      }

      if (isEdit && line) {
        // For updates, only include fields that are different or have values
        const updateData: any = {}
        
        const addIfChanged = (key: string, newValue: any, oldValue: any) => {
          if (newValue !== undefined && newValue !== null && newValue !== '') {
            if (typeof newValue === 'string' && newValue.trim() !== '') {
              const trimmed = newValue.trim()
              if (trimmed !== (oldValue || '')) {
                updateData[key] = trimmed
              }
            } else if (typeof newValue === 'number' && !isNaN(newValue)) {
              if (newValue !== oldValue) {
                updateData[key] = newValue
              }
            } else if (newValue !== oldValue) {
              updateData[key] = newValue
            }
          }
        }
        
        addIfChanged('name', cleanedData.name, line.name)
        addIfChanged('code', cleanedData.code, line.code)
        addIfChanged('lineType', cleanedData.lineType, (line as any).lineType)
        addIfChanged('capacity', cleanedData.capacity, line.capacity)
        addIfChanged('description', cleanedData.description, line.description)
        addIfChanged('location', cleanedData.location, (line as any).location)
        addIfChanged('operatingHours', cleanedData.operatingHours, (line as any).operatingHours)
        addIfChanged('notes', cleanedData.notes, (line as any).notes)
        
        if (cleanedData.supervisorId && cleanedData.supervisorId !== (line as any).supervisorId) {
          updateData.supervisorId = cleanedData.supervisorId
        }
        
        if (cleanedData.departments && cleanedData.departments.length > 0) {
          updateData.departments = cleanedData.departments
        }
        if (cleanedData.certifications && cleanedData.certifications.length > 0) {
          updateData.certifications = cleanedData.certifications
        }
        if (cleanedData.equipment && cleanedData.equipment.length > 0) {
          updateData.equipment = cleanedData.equipment
        }
        
        await updateMutation.mutateAsync({ id: line.id, data: updateData })
        toast.success('Production line updated successfully')
      } else {
        await createMutation.mutateAsync(cleanedData)
        toast.success('Production line created successfully')
        // Small delay to allow optimistic update and refetch to initiate
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      // The mutation hook's onSuccess already handles invalidation and refetch
      // Close the modal and reset the form after a brief delay
      setTimeout(() => {
        onClose()
        reset()
      }, 100)
    } catch (error: any) {
      console.error('Error saving production line:', error)
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} production line`)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-xl font-semibold">
            {isEdit ? 'Edit Production Line' : 'Add New Production Line'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isEdit ? 'Update production line information' : 'Create a new production line for this plant'}
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
                {...register('name', { required: 'Production line name is required' })}
                placeholder="Enter production line name"
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
                {...register('code', { required: 'Production line code is required' })}
                placeholder="LINE-001"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
              />
              {errors.code && (
                <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lineType" className="text-gray-700 font-medium">
                Line Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch('lineType') || 'ASSEMBLY'}
                onValueChange={(value) => setValue('lineType', value as CreateProductionLineDto['lineType'], { shouldValidate: true })}
              >
                <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                  <SelectValue placeholder="Select line type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASSEMBLY">Assembly</SelectItem>
                  <SelectItem value="PACKAGING">Packaging</SelectItem>
                  <SelectItem value="MANUFACTURING">Manufacturing</SelectItem>
                  <SelectItem value="QUALITY_CONTROL">Quality Control</SelectItem>
                  <SelectItem value="TESTING">Testing</SelectItem>
                  <SelectItem value="MIXED">Mixed</SelectItem>
                </SelectContent>
              </Select>
              {errors.lineType && (
                <p className="text-sm text-red-600 mt-1">{errors.lineType.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="capacity" className="text-gray-700 font-medium">
                Capacity (units/hr) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="capacity"
                type="number"
                {...register('capacity', { 
                  required: 'Capacity is required',
                  min: { value: 1, message: 'Capacity must be greater than 0' },
                  valueAsNumber: true,
                })}
                placeholder="100"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              {errors.capacity && (
                <p className="text-sm text-red-600 mt-1">{errors.capacity.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="status" className="text-gray-700 font-medium">
              Status
            </Label>
            <Select
              value={watch('status') || 'ACTIVE'}
              onValueChange={(value) => setValue('status', value as ProductionLineStatus, { shouldValidate: true })}
            >
              <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="UNDER_REPAIR">Under Repair</SelectItem>
                <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-700 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter production line description..."
              rows={3}
              className="mt-1.5 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
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
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEdit ? 'Update Line' : 'Create Line'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

