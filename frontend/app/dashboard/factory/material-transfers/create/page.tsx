'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useCreateMaterialTransfer, type CreateMaterialTransferDto } from '@/hooks/useMaterialTransfers'
import { useProducts } from '@/hooks/useProducts'
import { usePlants } from '@/hooks/usePlants'
import { apiClient } from '@/lib/api-client'
import { ArrowLeft, Plus, Trash2, Loader2, Package } from 'lucide-react'
import { isDummyDataEnabled } from '@/lib/dummy-data'

interface MaterialTransferFormData {
  title: string
  description: string
  transferType: 'WAREHOUSE_TO_WAREHOUSE' | 'WAREHOUSE_TO_PLANT' | 'PLANT_TO_WAREHOUSE' | 'PLANT_TO_PLANT' | 'DEPARTMENT_TO_DEPARTMENT'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  fromWarehouseId: string
  fromZoneId?: string
  toWarehouseId: string
  toZoneId?: string
  scheduledDate: string
  expectedDeliveryDate?: string
  notes?: string
  items: Array<{
    productId: string
    batchId?: string
    quantity: number
    unit: string
    notes?: string
  }>
}

// Helper function to determine source and destination location types based on transfer type
function getLocationTypes(transferType: string) {
  const typeMap: Record<string, { source: string; destination: string }> = {
    'WAREHOUSE_TO_WAREHOUSE': { source: 'WAREHOUSE', destination: 'WAREHOUSE' },
    'WAREHOUSE_TO_PLANT': { source: 'WAREHOUSE', destination: 'PLANT' },
    'PLANT_TO_WAREHOUSE': { source: 'PLANT', destination: 'WAREHOUSE' },
    'PLANT_TO_PLANT': { source: 'PLANT', destination: 'PLANT' },
    'DEPARTMENT_TO_DEPARTMENT': { source: 'DEPARTMENT', destination: 'DEPARTMENT' },
  }
  return typeMap[transferType] || { source: 'WAREHOUSE', destination: 'WAREHOUSE' }
}

// Helper function to get location type label
function getLocationTypeLabel(locationType: string): string {
  const labels: Record<string, string> = {
    'WAREHOUSE': 'Warehouse',
    'PLANT': 'Plant',
    'DEPARTMENT': 'Department',
  }
  return labels[locationType] || locationType
}

// Helper function to get correct locations based on location type
function getLocationsByType(locationType: string, warehouses: any[], plants: any[], departments: any[]) {
  if (locationType === 'WAREHOUSE') {
    return warehouses
  } else if (locationType === 'PLANT') {
    return plants
  } else if (locationType === 'DEPARTMENT') {
    return departments
  }
  return warehouses
}

export default function CreateMaterialTransferPage() {
  const router = useRouter()
  const createMutation = useCreateMaterialTransfer()

  // Load active products from API (real-time fetch)
  const { data: productsData, isLoading: isLoadingProducts } = useProducts({
    isActive: true,
    limit: 100,
  })

  // Unwrap products from response - useProducts returns { data: [...], meta: {...} }
  const products: any[] = Array.isArray((productsData as any)?.data)
    ? (productsData as any).data
    : Array.isArray(productsData)
      ? productsData
      : []

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MaterialTransferFormData>({
    defaultValues: {
      title: '',
      description: '',
      transferType: 'WAREHOUSE_TO_WAREHOUSE',
      priority: 'MEDIUM',
      scheduledDate: new Date().toISOString().split('T')[0],
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  // Load warehouses (dummy in dev, real from backend in production)
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const USE_DUMMY_DATA = isDummyDataEnabled()
      if (USE_DUMMY_DATA) {
        await new Promise(resolve => setTimeout(resolve, 100))
        const { dummyWarehouses } = await import('@/data/dummy/factory/warehouses')
        // In dummy mode return a flat array
        return dummyWarehouses.map(w => ({ id: w.id, name: w.name, code: w.code }))
      }
      const response = await apiClient.get('/warehouses')
      const root = response.data
      const payload = root?.data ?? root

      if (payload && Array.isArray((payload as any).data)) {
        return payload
      }
      if (Array.isArray(payload)) {
        return { data: payload, meta: { total: (payload as any).length } }
      }
      return { data: [], meta: { total: 0 } }
    },
  })

  // Normalize warehouses to a flat array for rendering
  const warehouses = Array.isArray((warehousesData as any)?.data)
    ? (warehousesData as any).data
    : Array.isArray(warehousesData as any)
      ? (warehousesData as any)
      : []

  // Load plants for transfer type that include plants
  const { data: plantsData } = usePlants({ limit: 100, status: 'ACTIVE' })
  const plants = Array.isArray((plantsData as any)?.data)
    ? (plantsData as any).data
    : Array.isArray(plantsData as any)
      ? (plantsData as any)
      : []

  // Load departments (using Production Lines API)
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/production-lines?limit=100&status=ACTIVE')
        const root = response.data
        const payload = root?.data ?? root

        if (Array.isArray((payload as any)?.data)) {
          return (payload as any).data
        }
        if (Array.isArray(payload)) {
          return payload
        }
        return []
      } catch (error) {
        console.error('Error loading departments:', error)
        return []
      }
    },
  })
  const departments = Array.isArray(departmentsData) ? departmentsData : []

  const fromWarehouseId = watch('fromWarehouseId')
  const toWarehouseId = watch('toWarehouseId')
  const transferType = watch('transferType')

  // Get location types based on transfer type
  const { source: sourceLocationType, destination: destinationLocationType } = getLocationTypes(transferType)

  // Fetch zones for selected warehouses (using dummy data)
  const { data: fromZonesData } = useQuery({
    queryKey: ['warehouse-zones', fromWarehouseId],
    queryFn: async () => {
      if (!fromWarehouseId) return []
      const USE_DUMMY_DATA = isDummyDataEnabled()
      if (USE_DUMMY_DATA) {
        await new Promise(resolve => setTimeout(resolve, 100))
        const { getAllDummyZones } = await import('@/data/dummy/factory/warehouses')
        const allZones = getAllDummyZones()
        return allZones.filter(z => z.warehouseId === fromWarehouseId).map(z => ({ id: z.id, name: z.name, code: z.code }))
      }
      const response = await apiClient.get(`/warehouses/${fromWarehouseId}/zones`)
      return response.data?.data || response.data || []
    },
    enabled: !!fromWarehouseId,
  })
  const fromZones = fromZonesData || []

  const { data: toZonesData } = useQuery({
    queryKey: ['warehouse-zones', toWarehouseId],
    queryFn: async () => {
      if (!toWarehouseId) return []
      const USE_DUMMY_DATA = isDummyDataEnabled()
      if (USE_DUMMY_DATA) {
        await new Promise(resolve => setTimeout(resolve, 100))
        const { getAllDummyZones } = await import('@/data/dummy/factory/warehouses')
        const allZones = getAllDummyZones()
        return allZones.filter(z => z.warehouseId === toWarehouseId).map(z => ({ id: z.id, name: z.name, code: z.code }))
      }
      const response = await apiClient.get(`/warehouses/${toWarehouseId}/zones`)
      return response.data?.data || response.data || []
    },
    enabled: !!toWarehouseId,
  })
  const toZones = toZonesData || []

  const onSubmit = async (data: MaterialTransferFormData) => {
    if (data.items.length === 0) {
      toast.error('Please add at least one item to the transfer')
      return
    }

    if (data.fromWarehouseId === data.toWarehouseId) {
      toast.error('From and To warehouses must be different')
      return
    }

    if (!data.title || !data.description) {
      toast.error('Title and description are required')
      return
    }

    try {
      const transferData: CreateMaterialTransferDto = {
        title: data.title,
        description: data.description,
        transferType: data.transferType,
        priority: data.priority,
        scheduledDate: new Date(data.scheduledDate).toISOString(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate).toISOString() : undefined,
        sourceLocationType: sourceLocationType as any,
        sourceLocationId: data.fromWarehouseId,
        sourceLocationDetails: data.fromZoneId ? `Zone: ${data.fromZoneId}` : undefined,
        destinationLocationType: destinationLocationType as any,
        destinationLocationId: data.toWarehouseId,
        destinationLocationDetails: data.toZoneId ? `Zone: ${data.toZoneId}` : undefined,
        notes: data.notes || undefined,
        items: data.items.map(item => ({
          materialId: item.productId, // Backend expects materialId, not productId
          quantity: Number(item.quantity) || 0, // Convert string to number
          specifications: item.notes || undefined,
        })),
      }

      await createMutation.mutateAsync(transferData)
      toast.success('Material transfer created successfully')
      router.push('/dashboard/factory/material-transfers')
    } catch (error: any) {
      console.error('Error creating material transfer:', error)
      toast.error(error.response?.data?.message || 'Failed to create material transfer')
    }
  }

  const addItem = () => {
    append({
      productId: '',
      quantity: 0,
      unit: 'UNIT',
      notes: '',
    })
  }

  const totalItems = fields.length
  const totalQuantity = fields.reduce((sum: number, field: any, index: number) => {
    const quantity = watch(`items.${index}.quantity`) || 0
    return sum + quantity
  }, 0)

  return (
    <ProtectedRoute requiredPermission="stock.transfer">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard/factory/material-transfers')}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create Material Transfer</h1>
                <p className="text-gray-600 mt-1">Transfer materials between warehouses</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Transfer Information */}
              <Card className="factory-light-card">
                <CardHeader>
                  <CardTitle className="text-gray-900">Transfer Information</CardTitle>
                  <CardDescription className="text-gray-600">
                    Source and destination information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="title" className="text-gray-700">Title *</Label>
                      <Input
                        id="title"
                        {...register('title', { required: 'Title is required' })}
                        placeholder="e.g., Transfer raw materials from warehouse to production line"
                        className="mt-1 border-gray-300"
                      />
                      {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message as string}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="description" className="text-gray-700">Description *</Label>
                      <Textarea
                        id="description"
                        {...register('description', { required: 'Description is required' })}
                        placeholder="Detailed description of material transfer"
                        className="mt-1 border-gray-300"
                        rows={3}
                      />
                      {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message as string}</p>}
                    </div>

                    <div>
                      <Label htmlFor="transferType" className="text-gray-700">Transfer Type *</Label>
                      <Select
                        value={watch('transferType') || 'WAREHOUSE_TO_WAREHOUSE'}
                        onValueChange={(value) => setValue('transferType', value as any)}
                      >
                        <SelectTrigger className="mt-1 border-gray-300">
                          <SelectValue placeholder="Select transfer type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WAREHOUSE_TO_WAREHOUSE">Warehouse to Warehouse</SelectItem>
                          <SelectItem value="WAREHOUSE_TO_PLANT">Warehouse to Plant</SelectItem>
                          <SelectItem value="PLANT_TO_WAREHOUSE">Plant to Warehouse</SelectItem>
                          <SelectItem value="PLANT_TO_PLANT">Plant to Plant</SelectItem>
                          <SelectItem value="DEPARTMENT_TO_DEPARTMENT">Department to Department</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="priority" className="text-gray-700">Priority *</Label>
                      <Select
                        value={watch('priority') || 'MEDIUM'}
                        onValueChange={(value) => setValue('priority', value as any)}
                      >
                        <SelectTrigger className="mt-1 border-gray-300">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="fromWarehouseId" className="text-gray-700">From {getLocationTypeLabel(sourceLocationType)} *</Label>
                      <Select
                        value={watch('fromWarehouseId') || ''}
                        onValueChange={(value) => {
                          setValue('fromWarehouseId', value)
                          setValue('fromZoneId', undefined)
                        }}
                      >
                        <SelectTrigger className="mt-1 border-gray-300">
                          <SelectValue placeholder={`Select ${getLocationTypeLabel(sourceLocationType).toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {getLocationsByType(sourceLocationType, warehouses, plants, departments).map((location: any) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name} ({location.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="fromZoneId" className="text-gray-700">From Zone (Optional)</Label>
                      <Select
                        value={watch('fromZoneId') || ''}
                        onValueChange={(value) => setValue('fromZoneId', value)}
                        disabled={!fromWarehouseId || fromZones.length === 0}
                      >
                        <SelectTrigger className="mt-1 border-gray-300">
                          <SelectValue placeholder={fromZones.length === 0 ? 'No zones available' : 'Select zone'} />
                        </SelectTrigger>
                        <SelectContent>
                          {fromZones.map((zone: any) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.name} ({zone.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="toWarehouseId" className="text-gray-700">To {getLocationTypeLabel(destinationLocationType)} *</Label>
                      <Select
                        value={watch('toWarehouseId') || ''}
                        onValueChange={(value) => {
                          setValue('toWarehouseId', value)
                          setValue('toZoneId', undefined)
                        }}
                      >
                        <SelectTrigger className="mt-1 border-gray-300">
                          <SelectValue placeholder={`Select ${getLocationTypeLabel(destinationLocationType).toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {getLocationsByType(destinationLocationType, warehouses, plants, departments)
                            .filter((loc: any) => loc.id !== fromWarehouseId)
                            .map((location: any) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name} ({location.code})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="toZoneId" className="text-gray-700">To Zone (Optional)</Label>
                      <Select
                        value={watch('toZoneId') || ''}
                        onValueChange={(value) => setValue('toZoneId', value)}
                        disabled={!toWarehouseId || toZones.length === 0}
                      >
                        <SelectTrigger className="mt-1 border-gray-300">
                          <SelectValue placeholder={toZones.length === 0 ? 'No zones available' : 'Select zone'} />
                        </SelectTrigger>
                        <SelectContent>
                          {toZones.map((zone: any) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.name} ({zone.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="scheduledDate" className="text-gray-700">Scheduled Date *</Label>
                      <Input
                        id="scheduledDate"
                        type="date"
                        {...register('scheduledDate', { required: 'Scheduled date is required' })}
                        className="mt-1 border-gray-300"
                      />
                    </div>

                    <div>
                      <Label htmlFor="expectedDeliveryDate" className="text-gray-700">Expected Delivery Date</Label>
                      <Input
                        id="expectedDeliveryDate"
                        type="date"
                        {...register('expectedDeliveryDate')}
                        className="mt-1 border-gray-300"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-gray-700">Notes</Label>
                    <Textarea
                      id="notes"
                      {...register('notes')}
                      placeholder="Additional notes or instructions..."
                      className="mt-1 border-gray-300"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Items Section */}
              <Card className="factory-light-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-gray-900">Transfer Items</CardTitle>
                      <CardDescription className="text-gray-600">
                        Add products and quantities to transfer
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      onClick={addItem}
                      variant="outline"
                      className="border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {fields.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 font-medium">No items added</p>
                      <p className="text-sm text-gray-500 mt-2">Click "Add Item" to start adding products</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 bg-gray-50">
                            <TableHead className="text-gray-700 font-semibold">Product</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Quantity</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Unit</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Batch (Optional)</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Notes</TableHead>
                            <TableHead className="text-right text-gray-700 font-semibold">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => (
                            <TableRow key={field.id} className="border-gray-200">
                              <TableCell>
                                <Select
                                  value={watch(`items.${index}.productId`) || ''}
                                  onValueChange={(value) => {
                                    setValue(`items.${index}.productId`, value)
                                    const product = products.find((p: any) => p.id === value)
                                    if (product) {
                                      setValue(`items.${index}.unit`, product.unitOfMeasure || product.unit || 'UNIT')
                                    }
                                  }}
                                  disabled={isLoadingProducts}
                                >
                                  <SelectTrigger className="border-gray-300">
                                    <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Select product"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.length === 0 && !isLoadingProducts ? (
                                      <SelectItem value="no-products" disabled>
                                        No products available
                                      </SelectItem>
                                    ) : (
                                      products.map((product: any) => (
                                        <SelectItem key={product.id} value={product.id}>
                                          {product.name} {product.code ? `(${product.code})` : ''}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...register(`items.${index}.quantity`, {
                                    required: 'Quantity is required',
                                    min: { value: 0.01, message: 'Quantity must be greater than 0' },
                                  })}
                                  className="border-gray-300"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  {...register(`items.${index}.unit`)}
                                  className="border-gray-300"
                                  readOnly
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  {...register(`items.${index}.batchId`)}
                                  placeholder="Batch number..."
                                  className="border-gray-300"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  {...register(`items.${index}.notes`)}
                                  placeholder="Item notes..."
                                  className="border-gray-300"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => remove(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Summary */}
                  {fields.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Items</p>
                          <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Quantity</p>
                          <p className="text-2xl font-bold text-gray-900">{totalQuantity.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/factory/material-transfers')}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || fields.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Create Transfer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

