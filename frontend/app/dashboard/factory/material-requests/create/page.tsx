'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { useCreateMaterialRequest, type CreateMaterialRequestDto, type MaterialRequestPriority } from '@/hooks/useMaterialRequests'
import { useProducts } from '@/hooks/useProducts'
import { useWarehouses } from '@/hooks/useWarehouses'
import { apiClient } from '@/lib/api-client'
import { ArrowLeft, Plus, Trash2, Loader2, Save, Send, Package } from 'lucide-react'
import { isDummyDataEnabled } from '@/lib/dummy-data'

interface MaterialRequestFormData {
  plantId?: string
  warehouseId?: string
  priority: MaterialRequestPriority
  requiredDate?: string
  notes?: string
  items: Array<{
    productId: string
    quantity: number
    unit: string
    notes?: string
  }>
}

export default function CreateMaterialRequestPage() {
  const router = useRouter()
  const createMutation = useCreateMaterialRequest()
  const [warehouseProducts, setWarehouseProducts] = useState<any[]>([])

  // Form state
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MaterialRequestFormData>({
    defaultValues: {
      priority: 'MEDIUM',
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  // Watch warehouse selection
  const selectedWarehouse = watch('warehouseId')

  // Request only active storage warehouses; material requests cannot use dispatch warehouses.
  const { data: warehousesData } = useWarehouses({
    warehouseType: 'STORAGE',
    isActive: true,
    limit: 100,
  })

  const warehouses = useMemo(() => {
    const response = warehousesData as any
    const allWarehouses = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
          ? response.data.data
          : []

    return allWarehouses.filter((warehouse: any) => warehouse.warehouseType === 'STORAGE')
  }, [warehousesData])

  // Fetch products available in selected warehouse
  const { data: warehouseProductsData, isLoading: isLoadingWarehouseProducts, error: warehouseProductsError } = useQuery({
    queryKey: ['warehouse-products', selectedWarehouse],
    queryFn: async () => {
      if (!selectedWarehouse) return { data: [], count: 0 }
      try {
        const url = `/material-requests/warehouse/${selectedWarehouse}/products`
        console.log('[WAREHOUSE-PRODUCTS] Fetching from URL:', url)
        console.log('[WAREHOUSE-PRODUCTS] Selected Warehouse ID:', selectedWarehouse)
        const response = await apiClient.get(url)
        console.log('[WAREHOUSE-PRODUCTS] Full Response:', response?.data)

        // Handle wrapped response: { success: true, data: { data: [...], count: N } }
        const responseData = response?.data
        if (responseData?.data && responseData.data.data) {
          console.log('[WAREHOUSE-PRODUCTS] Unwrapped products:', responseData.data.data)
          return responseData.data // Return { data: [...], count: N }
        }

        // Fallback for direct response structure: { data: [...], count: N }
        if (responseData?.data && Array.isArray(responseData.data)) {
          return responseData // Return as is
        }

        return { data: [], count: 0 }
      } catch (error: any) {
        console.error('[WAREHOUSE-PRODUCTS] Error Details:', {
          message: error?.message,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          url: error?.config?.url,
          data: error?.response?.data,
          fullError: error,
        })
        throw error
      }
    },
    enabled: !!selectedWarehouse,
  })

  // Update warehouse products when data changes
  useEffect(() => {
    if (warehouseProductsError) {
      console.error('[WAREHOUSE-PRODUCTS-EFFECT] Error:', warehouseProductsError)
      setWarehouseProducts([])
    } else if (warehouseProductsData?.data && Array.isArray(warehouseProductsData.data)) {
      setWarehouseProducts(warehouseProductsData.data)
    } else {
      setWarehouseProducts([])
    }
  }, [warehouseProductsData, warehouseProductsError])

  // Products to display in dropdown (from warehouse, not all products) - ensure it's always an array
  const productOptions = Array.isArray(warehouseProducts) ? warehouseProducts : []

  const { data: plantsData } = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const USE_DUMMY_DATA = isDummyDataEnabled()
      if (USE_DUMMY_DATA) {
        await new Promise(resolve => setTimeout(resolve, 100))
        const { getDummyPlants } = await import('@/data/dummy/factory/plants')
        const result = getDummyPlants({ limit: 100 })
        return result.data.map(p => ({ id: p.id, name: p.name, code: p.code }))
      }
      const response = await apiClient.get('/plants')
      return response?.data?.data || response?.data || []
    },
  })
  const plants = plantsData || []

  const locationType = watch('plantId') ? 'plant' : 'warehouse'

  const onSubmit = async (data: MaterialRequestFormData) => {
    if (data.items.length === 0) {
      toast.error('Please add at least one item to the request')
      return
    }

    // Validate required fields
    if (!data.warehouseId && !data.plantId) {
      toast.error('Please select a warehouse or plant')
      return
    }

    // Validate items have productId and quantity > 0
    const invalidItems = data.items.filter(item => !item.productId || item.quantity <= 0)
    if (invalidItems.length > 0) {
      toast.error('Please ensure all items have a product selected and quantity greater than 0')
      return
    }

    // BUSINESS RULE: Validate requested quantity doesn't exceed available stock
    if (data.warehouseId && Array.isArray(productOptions)) {
      const insufficientStockItems = []
      for (const item of data.items) {
        if (item.productId && item.quantity > 0) {
          const product = productOptions.find(p => p.id === item.productId)
          if (product && product.availableQuantity < item.quantity) {
            insufficientStockItems.push({
              productName: product.name,
              requested: item.quantity,
              available: product.availableQuantity,
            })
          }
        }
      }

      if (insufficientStockItems.length > 0) {
        const itemDetails = insufficientStockItems
          .map(it => `- ${it.productName}: Requested ${it.requested}, Available ${it.available}`)
          .join('\n')
        toast.error(
          `Insufficient stock in warehouse:\n${itemDetails}\n\n` +
          `Please reduce quantities or wait for stock replenishment.`
        )
        return
      }
    }

    try {
      const requestData: CreateMaterialRequestDto = {
        plantId: data.plantId || undefined,
        warehouseId: data.warehouseId || undefined,
        priority: data.priority,
        requiredDate: data.requiredDate || undefined,
        notes: data.notes || undefined,
        items: data.items.filter(item => item.productId && item.quantity > 0), // Filter out invalid items
      }

      await createMutation.mutateAsync(requestData)
      toast.success('Material request created successfully')
      router.push('/dashboard/factory/material-requests')
    } catch (error: any) {
      console.error('Error creating material request:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create material request'
      toast.error(errorMessage)
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
    <ProtectedRoute requiredPermission="raw-materials.manage_stock">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard/factory/material-requests')}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create Material Request</h1>
                <p className="text-gray-600 mt-1">Request materials for production or operations</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Request Information */}
              <Card className="factory-light-card">
                <CardHeader>
                  <CardTitle className="text-gray-900">Request Information</CardTitle>
                  <CardDescription className="text-gray-600">
                    Basic information about the material request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="locationType" className="text-gray-700">Location Type</Label>
                      <Select
                        value={locationType}
                        onValueChange={(value) => {
                          if (value === 'plant') {
                            setValue('warehouseId', undefined)
                          } else {
                            setValue('plantId', undefined)
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1 border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="plant">Plant</SelectItem>
                          <SelectItem value="warehouse">Warehouse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {locationType === 'plant' ? (
                      <div>
                        <Label htmlFor="plantId" className="text-gray-700">Plant *</Label>
                        <Select
                          value={watch('plantId') || ''}
                          onValueChange={(value) => setValue('plantId', value)}
                        >
                          <SelectTrigger className="mt-1 border-gray-300">
                            <SelectValue placeholder="Select plant" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(plants) && plants.map((plant: any) => (
                              <SelectItem key={plant.id} value={plant.id}>
                                {plant.name} ({plant.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.plantId && (
                          <p className="text-sm text-red-600 mt-1">Plant is required</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="warehouseId" className="text-gray-700">Warehouse (STORAGE only) *</Label>
                        <Select
                          value={watch('warehouseId') || ''}
                          onValueChange={(value) => setValue('warehouseId', value)}
                        >
                          <SelectTrigger className="mt-1 border-gray-300">
                            <SelectValue placeholder="Select warehouse" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(warehouses) && warehouses.map((warehouse: any) => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name} ({warehouse.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {warehouses.length === 0 && (
                          <p className="text-sm text-amber-600 mt-1">No STORAGE warehouses available. Material requests can only use STORAGE warehouses.</p>
                        )}
                        {errors.warehouseId && (
                          <p className="text-sm text-red-600 mt-1">Warehouse is required</p>
                        )}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="priority" className="text-gray-700">Priority *</Label>
                      <Select
                        value={watch('priority')}
                        onValueChange={(value) => setValue('priority', value as MaterialRequestPriority)}
                      >
                        <SelectTrigger className="mt-1 border-gray-300">
                          <SelectValue />
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
                      <Label htmlFor="requiredDate" className="text-gray-700">Required Date</Label>
                      <Input
                        id="requiredDate"
                        type="date"
                        {...register('requiredDate')}
                        className="mt-1 border-gray-300"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-gray-700">Notes</Label>
                    <Textarea
                      id="notes"
                      {...register('notes')}
                      placeholder="Additional notes or requirements..."
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
                      <CardTitle className="text-gray-900">Request Items</CardTitle>
                      <CardDescription className="text-gray-600">
                        {selectedWarehouse
                          ? 'Add products and quantities needed from selected warehouse'
                          : 'Select a warehouse first to see available products'}
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
                                    const product = productOptions.find(p => p.id === value)
                                    if (product) {
                                      // Handle different unit field names from API
                                      const unitName =
                                        (product as any).uom?.name ||
                                        (product as any).uom?.symbol ||
                                        (product as any).uomName ||
                                        (product as any).unit ||
                                        'UNIT'
                                      setValue(`items.${index}.unit`, unitName)
                                    } else {
                                      setValue(`items.${index}.unit`, 'UNIT')
                                    }
                                  }}
                                  disabled={isLoadingWarehouseProducts || !selectedWarehouse}
                                >
                                  <SelectTrigger className="border-gray-300">
                                    <SelectValue placeholder={
                                      !selectedWarehouse ? "Select warehouse first" :
                                        isLoadingWarehouseProducts ? "Loading products..." :
                                          "Select product"
                                    } />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {!selectedWarehouse ? (
                                      <SelectItem value="no-warehouse" disabled>Please select a warehouse first</SelectItem>
                                    ) : isLoadingWarehouseProducts ? (
                                      <SelectItem value="loading" disabled>Loading products...</SelectItem>
                                    ) : !Array.isArray(productOptions) || productOptions.length === 0 ? (
                                      <SelectItem value="no-products" disabled>
                                        No products with available stock in selected warehouse
                                      </SelectItem>
                                    ) : (
                                      productOptions.map((product) => {
                                        const displayName = `${product.name} (${product.code}) - ${product.availableQuantity} available`
                                        return (
                                          <SelectItem key={product.id} value={product.id}>
                                            {displayName}
                                          </SelectItem>
                                        )
                                      })
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
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Items</p>
                          <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Quantity</p>
                          <p className="text-2xl font-bold text-gray-900">{totalQuantity.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Estimated Value</p>
                          <p className="text-2xl font-bold text-green-600">-</p>
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
                  onClick={() => router.push('/dashboard/factory/material-requests')}
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
                      <Send className="h-4 w-4 mr-2" />
                      Submit Request
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

