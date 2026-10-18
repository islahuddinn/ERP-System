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
import { useCreateMachine, useUpdateMachine, type CreateMachineDto, type Machine, type MachineStatus, type ProductionLine } from '@/hooks/usePlants'
import { useProductionLines } from '@/hooks/usePlants'
import { Loader2 } from 'lucide-react'

interface CreateMachineModalProps {
  isOpen: boolean
  onClose: () => void
  machine?: Machine | null
  plantId: string
}

export function CreateMachineModal({
  isOpen,
  onClose,
  machine,
  plantId,
}: CreateMachineModalProps) {
  const isEdit = !!machine
  const queryClient = useQueryClient()
  const createMutation = useCreateMachine()
  const updateMutation = useUpdateMachine()

  // Get production lines for this plant
  const { data: productionLinesData } = useProductionLines({ plantId, limit: 100 })
  // Ensure productionLines is always an array
  const productionLines = Array.isArray(productionLinesData?.data) 
    ? productionLinesData.data 
    : (Array.isArray(productionLinesData) ? productionLinesData : [])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMachineDto>({
    defaultValues: {
      plantId: plantId,
      productionLineId: undefined,
      name: '',
      code: '',
      machineType: 'PRODUCTION',
      manufacturer: '',
      model: '',
      serialNumber: '',
      status: 'OPERATIONAL',
      description: '',
    },
  })

  useEffect(() => {
    if (machine) {
      reset({
        plantId: machine.plantId,
        productionLineId: machine.productionLineId || undefined,
        name: machine.name,
        code: machine.code,
        machineType: (machine as any).machineType || 'PRODUCTION',
        manufacturer: machine.manufacturer || '',
        model: machine.model || '',
        serialNumber: machine.serialNumber || '',
        status: machine.status,
        description: machine.description || '',
      })
    } else {
      reset({
        plantId: plantId,
        productionLineId: undefined,
        name: '',
        code: '',
        machineType: 'PRODUCTION',
        manufacturer: '',
        model: '',
        serialNumber: '',
        status: 'OPERATIONAL',
        description: '',
      })
    }
  }, [machine, plantId, reset])

  const onSubmit = async (data: CreateMachineDto) => {
    try {
      // Build payload with required fields only
      const cleanedData: any = {
        name: String(data.name).trim(),
        code: String(data.code).trim(),
        machineType: data.machineType,
        plantId: data.plantId,
      }

      // Add optional fields only if they have valid values
      const addString = (key: string, value: unknown) => {
        if (typeof value === 'string' && value.trim() !== '') {
          cleanedData[key] = value.trim()
        }
      }

      const addNumber = (key: string, value: unknown) => {
        const num = typeof value === 'string' ? Number(value) : value
        if (typeof num === 'number' && !isNaN(num) && num >= 0) {
          cleanedData[key] = num
        }
      }

      if (data.productionLineId && data.productionLineId !== 'none' && data.productionLineId.trim() !== '') {
        cleanedData.productionLineId = data.productionLineId.trim()
      }

      if (data.supervisorId && data.supervisorId !== 'none' && data.supervisorId.trim() !== '') {
        cleanedData.supervisorId = data.supervisorId.trim()
      }

      addString('description', data.description)
      addString('location', data.location)
      addString('operatingHours', data.operatingHours)
      addString('notes', data.notes)
      addString('manufacturer', data.manufacturer)
      addString('model', data.model)
      addString('serialNumber', data.serialNumber)

      addNumber('capacity', data.capacity)
      addNumber('efficiency', data.efficiency)

      if (data.purchaseDate && data.purchaseDate.trim() !== '') {
        cleanedData.purchaseDate = data.purchaseDate.trim()
      }

      if (data.installationDate && data.installationDate.trim() !== '') {
        cleanedData.installationDate = data.installationDate.trim()
      }

      if (data.warrantyExpiryDate && data.warrantyExpiryDate.trim() !== '') {
        cleanedData.warrantyExpiryDate = data.warrantyExpiryDate.trim()
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

      if (data.components && Array.isArray(data.components) && data.components.length > 0) {
        const validComps = data.components.filter(c => c && String(c).trim() !== '').map(c => String(c).trim())
        if (validComps.length > 0) {
          cleanedData.components = validComps
        }
      }

      if (isEdit && machine) {
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
        
        addIfChanged('name', cleanedData.name, machine.name)
        addIfChanged('code', cleanedData.code, machine.code)
        addIfChanged('machineType', cleanedData.machineType, (machine as any).machineType)
        addIfChanged('description', cleanedData.description, machine.description)
        addIfChanged('location', cleanedData.location, (machine as any).location)
        addIfChanged('operatingHours', cleanedData.operatingHours, (machine as any).operatingHours)
        addIfChanged('notes', cleanedData.notes, (machine as any).notes)
        addIfChanged('manufacturer', cleanedData.manufacturer, (machine as any).manufacturer)
        addIfChanged('model', cleanedData.model, (machine as any).model)
        addIfChanged('serialNumber', cleanedData.serialNumber, (machine as any).serialNumber)
        addIfChanged('capacity', cleanedData.capacity, (machine as any).capacity)
        addIfChanged('efficiency', cleanedData.efficiency, (machine as any).efficiency)
        
        if (cleanedData.productionLineId && cleanedData.productionLineId !== machine.productionLineId) {
          updateData.productionLineId = cleanedData.productionLineId
        }
        if (cleanedData.supervisorId && cleanedData.supervisorId !== (machine as any).supervisorId) {
          updateData.supervisorId = cleanedData.supervisorId
        }
        
        if (cleanedData.purchaseDate && cleanedData.purchaseDate !== (machine as any).purchaseDate) {
          updateData.purchaseDate = cleanedData.purchaseDate
        }
        if (cleanedData.installationDate && cleanedData.installationDate !== (machine as any).installationDate) {
          updateData.installationDate = cleanedData.installationDate
        }
        if (cleanedData.warrantyExpiryDate && cleanedData.warrantyExpiryDate !== (machine as any).warrantyExpiryDate) {
          updateData.warrantyExpiryDate = cleanedData.warrantyExpiryDate
        }
        
        if (cleanedData.departments && cleanedData.departments.length > 0) {
          updateData.departments = cleanedData.departments
        }
        if (cleanedData.certifications && cleanedData.certifications.length > 0) {
          updateData.certifications = cleanedData.certifications
        }
        if (cleanedData.components && cleanedData.components.length > 0) {
          updateData.components = cleanedData.components
        }
        
        await updateMutation.mutateAsync({ id: machine.id, data: updateData })
        toast.success('Machine updated successfully')
      } else {
        await createMutation.mutateAsync(cleanedData)
        toast.success('Machine created successfully')
      }
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['plants', plantId] })
      onClose()
      reset()
    } catch (error: any) {
      console.error('Error saving machine:', error)
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} machine`)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  const machineTypes: Array<{ value: CreateMachineDto['machineType']; label: string }> = [
    { value: 'PRODUCTION', label: 'Production' },
    { value: 'ASSEMBLY', label: 'Assembly' },
    { value: 'PACKAGING', label: 'Packaging' },
    { value: 'TESTING', label: 'Testing' },
    { value: 'QUALITY_CONTROL', label: 'Quality Control' },
    { value: 'MATERIAL_HANDLING', label: 'Material Handling' },
    { value: 'UTILITY', label: 'Utility' },
    { value: 'CONVEYOR', label: 'Conveyor' },
    { value: 'CNC', label: 'CNC' },
    { value: 'ROBOTIC', label: 'Robotic' },
    { value: 'OTHER', label: 'Other' },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-xl font-semibold">
            {isEdit ? 'Edit Machine' : 'Add New Machine'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isEdit ? 'Update machine information' : 'Create a new machine for this plant'}
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
                {...register('name', { required: 'Machine name is required' })}
                placeholder="Enter machine name"
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
                {...register('code', { required: 'Machine code is required' })}
                placeholder="MACHINE-001"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
              />
              {errors.code && (
                <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="machineType" className="text-gray-700 font-medium">
                Machine Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch('machineType') || 'PRODUCTION'}
                onValueChange={(value) => setValue('machineType', value as CreateMachineDto['machineType'], { shouldValidate: true })}
              >
                <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                  <SelectValue placeholder="Select machine type" />
                </SelectTrigger>
                <SelectContent>
                  {machineTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.machineType && (
                <p className="text-sm text-red-600 mt-1">{errors.machineType.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="status" className="text-gray-700 font-medium">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch('status') || 'OPERATIONAL'}
                onValueChange={(value) => setValue('status', value as MachineStatus, { shouldValidate: true })}
              >
                <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATIONAL">Operational</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="IDLE">Idle</SelectItem>
                  <SelectItem value="BREAKDOWN">Breakdown</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="productionLineId" className="text-gray-700 font-medium">
              Production Line
            </Label>
            <Select
              value={watch('productionLineId') || 'none'}
              onValueChange={(value) => setValue('productionLineId', value === 'none' ? undefined : value, { shouldValidate: true })}
            >
              <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                <SelectValue placeholder="Select production line" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Production Line</SelectItem>
                {productionLines.map((line: ProductionLine) => (
                  <SelectItem key={line.id} value={line.id}>
                    {line.name} ({line.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="manufacturer" className="text-gray-700 font-medium">
                Manufacturer
              </Label>
              <Input
                id="manufacturer"
                {...register('manufacturer')}
                placeholder="Enter manufacturer"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <Label htmlFor="model" className="text-gray-700 font-medium">
                Model
              </Label>
              <Input
                id="model"
                {...register('model')}
                placeholder="Enter model"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <Label htmlFor="serialNumber" className="text-gray-700 font-medium">
                Serial Number
              </Label>
              <Input
                id="serialNumber"
                {...register('serialNumber')}
                placeholder="Enter serial number"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="lastMaintenanceDate" className="text-gray-700 font-medium">
                Last Maintenance
              </Label>
              <Input
                id="lastMaintenanceDate"
                type="date"
                {...register('lastMaintenanceDate')}
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <Label htmlFor="nextMaintenanceDate" className="text-gray-700 font-medium">
                Next Maintenance
              </Label>
              <Input
                id="nextMaintenanceDate"
                type="date"
                {...register('nextMaintenanceDate')}
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <Label htmlFor="maintenanceInterval" className="text-gray-700 font-medium">
                Maintenance Interval (days)
              </Label>
              <Input
                id="maintenanceInterval"
                type="number"
                {...register('maintenanceInterval', { 
                  min: { value: 1, message: 'Interval must be at least 1 day' },
                  valueAsNumber: true,
                })}
                placeholder="30"
                className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              {errors.maintenanceInterval && (
                <p className="text-sm text-red-600 mt-1">{errors.maintenanceInterval.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-700 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter machine description..."
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
                isEdit ? 'Update Machine' : 'Create Machine'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

