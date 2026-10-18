'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Toast } from '@/components/ui/toast'
import { apiClient } from '@/lib/api-client'
import { Package, MapPin, Plus, Edit, ArrowRightLeft, Search, Filter, X, RefreshCw, Settings, TrendingUp, TrendingDown, ChevronDown, CheckSquare, Square, Loader2, DollarSign } from 'lucide-react'
import { useForm } from 'react-hook-form'

// Types
interface StockBalance {
  id: string
  productId: string
  locationId: string
  quantity: number
  availableQuantity?: number
  reservedQuantity?: number
  lastUpdated: string
  product: {
    id: string
    name: string
    sku: string
    uom: {
      symbol: string
    }
    reorderLevel: number
  }
  location: {
    id: string
    name: string
    type: string
  }
}

interface Product {
  id: string
  name: string
  sku: string
  uom: {
    id: string
    symbol: string
  }
}

interface Location {
  id: string
  name: string
  type: string
}

interface StockAdjustmentForm {
  productId: string
  locationId: string
  adjustmentType: 'add' | 'subtract' | 'set'
  quantity: number
  reason: string
}

interface StockTransferForm {
  productId: string
  fromLocationId: string
  toLocationId: string
  quantity: number
  reason: string
}

// Custom hook for debounced search
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function BalancesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  })
  const [productSearch, setProductSearch] = useState('')
  const [productSelectOpen, setProductSelectOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  
  // Bulk operations state
  const [selectedBalances, setSelectedBalances] = useState<Set<string>>(new Set())
  const [isBulkAdjustOpen, setIsBulkAdjustOpen] = useState(false)
  const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBalances, setTotalBalances] = useState(0)

  const debouncedSearch = useDebounce(search, 300)
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, locationFilter, productFilter])

  // Form setup
  const { register: registerAdjustment, handleSubmit: handleAdjustmentSubmit, reset: resetAdjustment, setValue: setAdjustmentValue, watch: watchAdjustment, formState: { errors: adjustmentErrors } } = useForm<StockAdjustmentForm>()
  const { register: registerTransfer, handleSubmit: handleTransferSubmit, reset: resetTransfer, setValue: setTransferValue, formState: { errors: transferErrors } } = useForm<StockTransferForm>()
  
  // Watch form values to display selected values
  const adjustmentFormValues = watchAdjustment()

  // Fetch stock balances
  const { data: balancesResponse, isLoading } = useQuery({
    queryKey: ['stock-balances', debouncedSearch, locationFilter, productFilter, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams()
      // Add pagination parameters
      params.append('page', currentPage.toString())
      params.append('limit', pageSize.toString())
      
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (locationFilter !== 'all') params.append('locationId', locationFilter)
      if (productFilter !== 'all') params.append('productId', productFilter)
      
      const response = await apiClient.get(`/stock/balances?${params.toString()}`)
      
      // Update pagination info
      if (response.data.meta) {
        setTotalPages(response.data.meta.totalPages || 1)
        setTotalBalances(response.data.meta.total || 0)
      } else {
        const arr = Array.isArray(response.data) ? response.data : (response.data?.data || [])
        const estimatedTotal = ((currentPage - 1) * pageSize) + (arr?.length || 0)
        setTotalBalances(estimatedTotal)
        setTotalPages(arr?.length === pageSize ? currentPage + 1 : currentPage)
      }
      
      return response.data
    },
  })
  
  // Extract balances array from paginated response
  const balances = Array.isArray(balancesResponse) 
    ? balancesResponse 
    : balancesResponse?.data || []

  // Fetch products for dropdowns
  const { data: productsResponse } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      // Return all products for dropdown (fetch without pagination)
      const allProductsResponse = await apiClient.get('/product-management/products')
      return allProductsResponse.data
    },
  })
  
  // Fetch total products count separately
  const { data: totalProductsData } = useQuery({
    queryKey: ['products-total'],
    queryFn: async () => {
      const response = await apiClient.get('/product-management/products?page=1&limit=1')
      return response.data
    },
  })

  // Fetch locations for dropdowns
  const { data: locationsResponse } = useQuery({
    queryKey: ['locations'],
    queryFn: () => apiClient.get('/locations').then(res => res.data),
  })

  // Fetch location-wise inventory costs
  const { data: locationWiseCosts } = useQuery({
    queryKey: ['stock-balances', 'location-wise-cost'],
    queryFn: () => apiClient.get('/stock/balances/location-wise-cost').then(res => res.data),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const products = productsResponse?.data || productsResponse || []
  const locations = locationsResponse?.data || locationsResponse || []
  
  // Calculate total products - use API total if available, otherwise count unique products from balances
  const totalProductsInSystem = totalProductsData?.meta?.total || 
    new Set(balances?.map((b: StockBalance) => b.product.id)).size || 0

  // Stock adjustment mutation
  const adjustmentMutation = useMutation({
    mutationFn: async (data: StockAdjustmentForm) => {
      const payload = {
        productId: data.productId,
        fromLocationId: (data.adjustmentType === 'subtract' || data.adjustmentType === 'set') ? data.locationId : undefined,
        toLocationId: data.adjustmentType === 'add' ? data.locationId : undefined,
        type: data.adjustmentType === 'set' ? 'ADJUSTMENT' : (data.adjustmentType === 'add' ? 'RECEIPT' : 'ISSUE'),
        quantity: Number(data.quantity),
        remarks: data.reason || undefined
      }
      console.log('📊 Stock adjustment payload:', payload)
      const response = await apiClient.post('/stock/transactions', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      setIsAdjustmentOpen(false)
      resetAdjustment()
      setProductSearch('') // Clear product search
      setSelectedProductId('') // Clear selected product
      setToast({
        message: '✅ Stock adjusted successfully!',
        type: 'success',
        isVisible: true
      })
    },
    onError: (error: any) => {
      console.error('❌ Stock adjustment error:', error.response?.data)
      setToast({
        message: `❌ Error adjusting stock: ${error.response?.data?.message || error.message || 'Unknown error'}`,
        type: 'error',
        isVisible: true
      })
    }
  })

  // Stock transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data: StockTransferForm) => {
      const payload = {
        productId: data.productId,
        fromLocationId: data.fromLocationId,
        toLocationId: data.toLocationId,
        type: 'TRANSFER',
        quantity: Number(data.quantity),
        remarks: data.reason || undefined
      }
      console.log('🔄 Stock transfer payload:', payload)
      const response = await apiClient.post('/stock/transactions', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      setIsTransferOpen(false)
      resetTransfer()
      setToast({
        message: '✅ Stock transferred successfully!',
        type: 'success',
        isVisible: true
      })
    },
    onError: (error: any) => {
      console.error('❌ Stock transfer error:', error.response?.data)
      setToast({
        message: `❌ Error transferring stock: ${error.response?.data?.message || error.message || 'Unknown error'}`,
        type: 'error',
        isVisible: true
      })
    }
  })

  // Bulk adjustment mutation
  const bulkAdjustMutation = useMutation({
    mutationFn: async (data: { adjustments: Array<{ productId: string; locationId: string; type: 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT'; quantity: number; remarks?: string }> }) => {
      console.log('📤 Bulk adjust request:', data)
      try {
        const response = await apiClient.post('/stock/transactions/bulk-adjust', {
          adjustments: data.adjustments,
          allowPartialSuccess: false
        })
        console.log('✅ Bulk adjust response:', response.data)
        return response.data
      } catch (error: any) {
        console.error('❌ Bulk adjust API error:', error)
        console.error('Error response:', error.response)
        console.error('Error data:', error.response?.data)
        console.error('Error message:', error.message)
        throw error
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      setIsBulkAdjustOpen(false)
      setSelectedBalances(new Set())
      const successCount = data.processed || 0
      const failedCount = data.failed || 0
      if (failedCount === 0) {
        setToast({
          message: `✅ Successfully adjusted ${successCount} product${successCount !== 1 ? 's' : ''}!`,
          type: 'success',
          isVisible: true
        })
      } else {
        setToast({
          message: `⚠️ Adjusted ${successCount} product${successCount !== 1 ? 's' : ''}, ${failedCount} failed`,
          type: 'error',
          isVisible: true
        })
      }
    },
    onError: (error: any) => {
      console.error('❌ Bulk adjustment error:', error)
      console.error('Error response:', error.response)
      console.error('Error response data:', error.response?.data)
      console.error('Error message:', error.message)
      
      let errorMessage = 'Unknown error occurred'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      } else if (typeof error.response?.data === 'string') {
        errorMessage = error.response.data
      }
      
      setToast({
        message: `❌ Error: ${errorMessage}`,
        type: 'error',
        isVisible: true
      })
    }
  })

  // Bulk transfer mutation
  const bulkTransferMutation = useMutation({
    mutationFn: async (data: { transfers: Array<{ productId: string; fromLocationId: string; toLocationId: string; quantity: number; remarks?: string }> }) => {
      console.log('📤 Bulk transfer request:', data)
      try {
        const response = await apiClient.post('/stock/transactions/bulk-transfer', {
          transfers: data.transfers,
          allowPartialSuccess: false
        })
        console.log('✅ Bulk transfer response:', response.data)
        return response.data
      } catch (error: any) {
        console.error('❌ Bulk transfer API error:', error)
        console.error('Error response:', error.response)
        console.error('Error data:', error.response?.data)
        console.error('Error message:', error.message)
        throw error
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      setIsBulkTransferOpen(false)
      setSelectedBalances(new Set())
      const successCount = data.processed || 0
      const failedCount = data.failed || 0
      if (failedCount === 0) {
        setToast({
          message: `✅ Successfully transferred ${successCount} product${successCount !== 1 ? 's' : ''}!`,
          type: 'success',
          isVisible: true
        })
      } else {
        setToast({
          message: `⚠️ Transferred ${successCount} product${successCount !== 1 ? 's' : ''}, ${failedCount} failed`,
          type: 'error',
          isVisible: true
        })
      }
    },
    onError: (error: any) => {
      console.error('❌ Bulk transfer error:', error)
      console.error('Error response:', error.response)
      console.error('Error response data:', error.response?.data)
      console.error('Error message:', error.message)
      
      let errorMessage = 'Unknown error occurred'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      } else if (typeof error.response?.data === 'string') {
        errorMessage = error.response.data
      }
      
      setToast({
        message: `❌ Error: ${errorMessage}`,
        type: 'error',
        isVisible: true
      })
    }
  })

  // Handlers
  const handleAdjustment = (data: StockAdjustmentForm) => {
    console.log('📝 Form data received:', data)
    
    // Validate required fields
    if (!data.productId || !data.locationId || data.quantity === undefined || data.quantity === null) {
      setToast({
        message: '❌ Please fill in all required fields',
        type: 'error',
        isVisible: true
      })
      return
    }
    
    // Validate quantity based on adjustment type
    const quantity = Number(data.quantity)
    if (isNaN(quantity)) {
      setToast({
        message: '❌ Quantity must be a valid number',
        type: 'error',
        isVisible: true
      })
      return
    }
    
    // For "Set Exact Quantity", allow 0. For "add" and "subtract", require > 0
    if (data.adjustmentType !== 'set' && quantity <= 0) {
      setToast({
        message: '❌ Quantity must be greater than 0',
        type: 'error',
        isVisible: true
      })
      return
    }
    
    // For "Set Exact Quantity", allow 0 or greater
    if (data.adjustmentType === 'set' && quantity < 0) {
      setToast({
        message: '❌ Quantity cannot be negative',
        type: 'error',
        isVisible: true
      })
      return
    }
    
    adjustmentMutation.mutate(data)
  }

  const handleTransfer = (data: StockTransferForm) => {
    console.log('📝 Transfer form data received:', data)
    
    // Validate required fields
    if (!data.productId || !data.fromLocationId || !data.toLocationId || !data.quantity) {
      setToast({
        message: '❌ Please fill in all required fields',
        type: 'error',
        isVisible: true
      })
      return
    }
    
    if (data.quantity <= 0) {
      setToast({
        message: '❌ Quantity must be greater than 0',
        type: 'error',
        isVisible: true
      })
      return
    }
    
    if (data.fromLocationId === data.toLocationId) {
      setToast({
        message: '❌ From and to locations cannot be the same',
        type: 'error',
        isVisible: true
      })
      return
    }
    
    transferMutation.mutate(data)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const clearFilters = () => {
    setSearch('')
    setLocationFilter('all')
    setProductFilter('all')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Balances</h1>
          <p className="text-gray-600">Manage stock levels across all locations</p>
          {selectedBalances.size > 0 && (
            <p className="text-sm text-green-600 mt-1">
              {selectedBalances.size} product{selectedBalances.size !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setIsAdjustmentOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adjust Stock
          </Button>
          <Button variant="outline" onClick={() => setIsTransferOpen(true)}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transfer Stock
          </Button>
          {selectedBalances.size > 0 && (
            <>
              <Button 
                variant="default" 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setIsBulkAdjustOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Bulk Adjust ({selectedBalances.size})
              </Button>
              <Button 
                variant="default" 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setIsBulkTransferOpen(true)}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Bulk Transfer ({selectedBalances.size})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Total Products</p>
                <p className="text-2xl font-semibold text-white">
                  {totalProductsInSystem || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Total Locations</p>
                <p className="text-2xl font-semibold text-white">
                  {new Set(balances?.map((b: any) => b.location.id)).size || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Total Stock Units</p>
                <p className="text-2xl font-semibold text-white">
                  {balances?.reduce((sum: number, balance: any) => sum + balance.quantity, 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Low Stock Items</p>
                <p className="text-2xl font-semibold text-white">
                  {balances?.filter((b: any) => b.quantity <= b.product.reorderLevel).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location-wise Inventory Cost Stats */}
      {locationWiseCosts && Array.isArray(locationWiseCosts) && locationWiseCosts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Location-wise Inventory Cost</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {locationWiseCosts.map((locationCost: any) => (
              <Card key={locationCost.locationId}>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-cyan-600" />
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-300">{locationCost.locationName}</p>
                      <p className="text-2xl font-semibold text-white">
                        Rs. {Number(locationCost.totalCost || 0).toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products or locations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {(locations?.data || locations)?.map((location: Location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {(products?.data || products)?.map((product: Product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {(search || locationFilter !== 'all' || productFilter !== 'all') && (
                <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Balances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Balances</CardTitle>
          <CardDescription>
            Current stock levels for all products across all locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <button
                    onClick={() => {
                      if (selectedBalances.size === balances.length) {
                        setSelectedBalances(new Set())
                      } else {
                        const allKeys = balances.map((b: StockBalance) => `${b.product.id}::${b.location.id}`)
                        setSelectedBalances(new Set(allKeys))
                      }
                    }}
                    className="flex items-center justify-center"
                  >
                    {selectedBalances.size === balances.length && balances.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-green-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances?.map((balance: StockBalance) => {
                const balanceKey = `${balance.product.id}::${balance.location.id}`
                const isSelected = selectedBalances.has(balanceKey)
                return (
                  <TableRow 
                    key={balanceKey}
                    className={isSelected ? 'bg-green-100/30 dark:bg-green-900/30 border-l-4 border-l-green-500 dark:border-l-green-500' : ''}
                  >
                    <TableCell>
                      <button
                        onClick={() => {
                          const newSelected = new Set(selectedBalances)
                          if (isSelected) {
                            newSelected.delete(balanceKey)
                          } else {
                            newSelected.add(balanceKey)
                          }
                          setSelectedBalances(newSelected)
                        }}
                        className="flex items-center justify-center"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-green-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{balance.product.name}</div>
                        <div className="text-sm text-gray-300">SKU: {balance.product.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{balance.location.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (balance.availableQuantity ?? balance.quantity) <= balance.product.reorderLevel 
                          ? 'bg-red-100 text-red-800' 
                          : (balance.availableQuantity ?? balance.quantity) > balance.product.reorderLevel * 2
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {balance.availableQuantity !== undefined ? balance.availableQuantity : balance.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      {balance.reservedQuantity !== undefined ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          balance.reservedQuantity > 0 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {balance.reservedQuantity}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{balance.quantity}</span>
                    </TableCell>
                    <TableCell>{balance.product.uom.symbol}</TableCell>
                    <TableCell>{balance.product.reorderLevel}</TableCell>
                    <TableCell>
                      {new Date(balance.lastUpdated).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Reset form first
                          resetAdjustment()
                          // Set form values with existing balance data
                          setAdjustmentValue('productId', balance.product.id)
                          setAdjustmentValue('locationId', balance.location.id)
                          setAdjustmentValue('quantity', balance.quantity)
                          setAdjustmentValue('adjustmentType', 'set')
                          // Set selected product for display
                          setSelectedProductId(balance.product.id)
                          // Open dialog
                          setIsAdjustmentOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {balances?.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300">No stock balances found</p>
              <p className="text-sm text-gray-400 mt-2">
                {search || locationFilter !== 'all' || productFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Add stock to products to see them here'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {balances && balances.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-300">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalBalances)} of {totalBalances} stock balances
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">Show:</span>
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  setPageSize(Number(value))
                  setCurrentPage(1)
                }}>
                  <SelectTrigger className="w-20 h-8 text-xs bg-gray-700 border-gray-600 text-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-xs font-medium text-gray-400 border border-gray-600 rounded-md hover:bg-gray-700 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-xs font-medium text-gray-400 border border-gray-600 rounded-md hover:bg-gray-700 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              {(() => {
                const maxVisible = 5
                let startPage = Math.max(1, currentPage - 2)
                let endPage = Math.min(totalPages, startPage + maxVisible - 1)
                
                if (endPage - startPage < maxVisible - 1) {
                  startPage = Math.max(1, endPage - maxVisible + 1)
                }
                
                const pages = []
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`px-3 py-1 text-xs font-medium border rounded-md transition-colors ${
                        currentPage === i
                          ? 'bg-green-600 text-white border-green-600'
                          : 'text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-gray-200'
                      }`}
                    >
                      {i}
                    </button>
                  )
                }
                return pages
              })()}
              
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-xs font-medium text-gray-400 border border-gray-600 rounded-md hover:bg-gray-700 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-xs font-medium text-gray-400 border border-gray-600 rounded-md hover:bg-gray-700 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
              >
                Last
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustmentOpen} onOpenChange={(open) => {
        setIsAdjustmentOpen(open)
        if (!open) {
          resetAdjustment() // Reset form when closing
          setProductSearch('') // Clear search when modal closes
          setSelectedProductId('') // Clear selected product
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Add, subtract, or set stock quantity for a product at a location
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustmentSubmit(handleAdjustment)} className="space-y-4">
            <div>
              <Label htmlFor="adjustment-product">Product *</Label>
              <Popover open={productSelectOpen} onOpenChange={setProductSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productSelectOpen}
                    className="w-full justify-between"
                  >
                    {selectedProductId 
                      ? (() => {
                          const selected = (products?.data || products || []).find((p: Product) => p.id === selectedProductId)
                          return selected ? `${selected.name} (${selected.sku})` : 'Select product...'
                        })()
                      : 'Select product...'}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <div className="p-2">
                    <Input
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="mb-2"
                    />
                    <div className="max-h-[300px] overflow-y-auto">
                      {(() => {
                        const allProducts = Array.isArray(products) ? products : (products?.data || [])
                        const filteredProducts = allProducts.filter((product: Product) => {
                          if (!productSearch || !productSearch.trim()) return true
                          const searchLower = productSearch.toLowerCase().trim()
                          return (
                            product.name?.toLowerCase().includes(searchLower) ||
                            product.sku?.toLowerCase().includes(searchLower)
                          )
                        })
                        
                        if (filteredProducts.length === 0 && productSearch) {
                          return <div className="px-3 py-2 text-sm text-muted-foreground">No products found</div>
                        }
                        
                        if (filteredProducts.length === 0) {
                          return <div className="px-3 py-2 text-sm text-muted-foreground">No products available</div>
                        }
                        
                        return filteredProducts.map((product: Product) => (
                          <div
                            key={product.id}
                            className="px-3 py-2 cursor-pointer hover:bg-accent rounded-sm text-sm"
                            onClick={() => {
                              setAdjustmentValue('productId', product.id)
                              setSelectedProductId(product.id)
                              setProductSearch('') // Clear search after selection
                              setProductSelectOpen(false)
                            }}
                          >
                            {product.name} ({product.sku})
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {adjustmentErrors.productId && (
                <p className="text-sm text-red-600 mt-1">{adjustmentErrors.productId.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="adjustment-location">Location *</Label>
              <Select 
                value={adjustmentFormValues.locationId || ''} 
                onValueChange={(value) => setAdjustmentValue('locationId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {(locations?.data || locations)?.map((location: Location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {adjustmentErrors.locationId && (
                <p className="text-sm text-red-600 mt-1">{adjustmentErrors.locationId.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="adjustment-type">Adjustment Type *</Label>
              <Select 
                value={adjustmentFormValues.adjustmentType || ''} 
                onValueChange={(value: 'add' | 'subtract' | 'set') => setAdjustmentValue('adjustmentType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock</SelectItem>
                  <SelectItem value="subtract">Subtract Stock</SelectItem>
                  <SelectItem value="set">Set Exact Quantity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="adjustment-quantity">Quantity *</Label>
              <Input
                id="adjustment-quantity"
                type="number"
                min={adjustmentFormValues.adjustmentType === 'set' ? '0' : '0.01'}
                step="0.01"
                {...registerAdjustment('quantity', { 
                  required: 'Quantity is required',
                  validate: (value) => {
                    const numValue = Number(value)
                    if (isNaN(numValue)) {
                      return 'Quantity must be a number'
                    }
                    if (adjustmentFormValues.adjustmentType === 'set') {
                      // Allow 0 for "Set Exact Quantity"
                      return numValue >= 0 || 'Quantity must be 0 or greater'
                    } else {
                      // For "add" and "subtract", require > 0
                      return numValue > 0 || 'Quantity must be greater than 0'
                    }
                  }
                })}
                placeholder={adjustmentFormValues.adjustmentType === 'set' ? 'Enter exact quantity (0 allowed)' : 'Enter quantity'}
              />
              {adjustmentErrors.quantity && (
                <p className="text-sm text-red-600 mt-1">{adjustmentErrors.quantity.message}</p>
              )}
              {adjustmentFormValues.adjustmentType === 'set' && (
                <p className="text-xs text-gray-500 mt-1">This will set the exact quantity (0 is allowed)</p>
              )}
            </div>
            <div>
              <Label htmlFor="adjustment-reason">Reason</Label>
              <Input
                id="adjustment-reason"
                {...registerAdjustment('reason')}
                placeholder="Enter reason for adjustment"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdjustmentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={adjustmentMutation.isPending}>
                {adjustmentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adjusting...
                  </>
                ) : (
                  'Adjust Stock'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Stock</DialogTitle>
            <DialogDescription>
              Move stock from one location to another
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransferSubmit(handleTransfer)} className="space-y-4">
            <div>
              <Label htmlFor="transfer-product">Product *</Label>
              <Select onValueChange={(value) => setTransferValue('productId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {(products?.data || products)?.map((product: Product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transfer-from">From Location *</Label>
              <Select onValueChange={(value) => setTransferValue('fromLocationId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source location" />
                </SelectTrigger>
                <SelectContent>
                  {(locations?.data || locations)?.map((location: Location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transfer-to">To Location *</Label>
              <Select onValueChange={(value) => setTransferValue('toLocationId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination location" />
                </SelectTrigger>
                <SelectContent>
                  {(locations?.data || locations)?.map((location: Location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transfer-quantity">Quantity *</Label>
              <Input
                id="transfer-quantity"
                type="number"
                min="0"
                {...registerTransfer('quantity', { required: 'Quantity is required', min: 0 })}
                placeholder="Enter quantity to transfer"
              />
            </div>
            <div>
              <Label htmlFor="transfer-reason">Reason</Label>
              <Input
                id="transfer-reason"
                {...registerTransfer('reason')}
                placeholder="Enter reason for transfer"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTransferOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={transferMutation.isPending}>
                {transferMutation.isPending ? 'Transferring...' : 'Transfer Stock'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Adjust Dialog */}
      <Dialog open={isBulkAdjustOpen} onOpenChange={setIsBulkAdjustOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Adjust Stock</DialogTitle>
            <DialogDescription>
              Adjust stock for {selectedBalances.size} selected product{selectedBalances.size !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <BulkAdjustDialog
            selectedBalances={selectedBalances}
            balances={balances}
            locations={locations?.data || locations || []}
            onSubmit={(data) => {
              const adjustments = Array.from(selectedBalances).map(balanceKey => {
                const [productId, locationId] = balanceKey.split('::')
                const balance = balances.find((b: StockBalance) => 
                  b.product.id === productId && b.location.id === locationId
                )
                const adjustment = {
                  productId: String(productId),
                  locationId: String(data.useCurrentLocation ? locationId : data.locationId),
                  type: (data.adjustmentType === 'add' ? 'RECEIPT' : (data.adjustmentType === 'subtract' ? 'ISSUE' : 'ADJUSTMENT')) as 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT',
                  quantity: Number(data.quantity),
                } as {
                  productId: string;
                  locationId: string;
                  type: 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT';
                  quantity: number;
                  remarks?: string;
                }
                
                if (data.reason && data.reason.trim()) {
                  adjustment.remarks = data.reason.trim()
                }
                
                return adjustment
              })
              console.log('📤 Sending bulk adjust request with adjustments:', adjustments)
              bulkAdjustMutation.mutate({ adjustments })
            }}
            onCancel={() => setIsBulkAdjustOpen(false)}
            isLoading={bulkAdjustMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Transfer Dialog */}
      <Dialog open={isBulkTransferOpen} onOpenChange={setIsBulkTransferOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Transfer Stock</DialogTitle>
            <DialogDescription>
              Transfer stock for {selectedBalances.size} selected product{selectedBalances.size !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <BulkTransferDialog
            selectedBalances={selectedBalances}
            balances={balances}
            locations={locations?.data || locations || []}
            onSubmit={(data) => {
              const transfers = Array.from(selectedBalances).map(balanceKey => {
                const [productId, locationId] = balanceKey.split('::')
                const transfer = {
                  productId: String(productId),
                  fromLocationId: String(data.useCurrentLocation ? locationId : data.fromLocationId),
                  toLocationId: String(data.toLocationId),
                  quantity: Number(data.quantity),
                } as {
                  productId: string;
                  fromLocationId: string;
                  toLocationId: string;
                  quantity: number;
                  remarks?: string;
                }
                
                if (data.reason && data.reason.trim()) {
                  transfer.remarks = data.reason.trim()
                }
                
                return transfer
              })
              console.log('📤 Sending bulk transfer request with transfers:', transfers)
              bulkTransferMutation.mutate({ transfers })
            }}
            onCancel={() => setIsBulkTransferOpen(false)}
            isLoading={bulkTransferMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  )
}

// Bulk Adjust Dialog Component
function BulkAdjustDialog({ 
  selectedBalances, 
  balances, 
  locations, 
  onSubmit, 
  onCancel, 
  isLoading 
}: {
  selectedBalances: Set<string>
  balances: StockBalance[]
  locations: Location[]
  onSubmit: (data: { locationId: string; useCurrentLocation: boolean; adjustmentType: 'add' | 'subtract' | 'set'; quantity: number; reason?: string }) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [locationId, setLocationId] = useState('')
  const [useCurrentLocation, setUseCurrentLocation] = useState(true)
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  const selectedProducts = balances.filter((b: StockBalance) => 
    selectedBalances.has(`${b.product.id}::${b.location.id}`)
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (quantity === '' || quantity === null || quantity === undefined) {
      return
    }
    const qty = Number(quantity)
    if (isNaN(qty) || qty < 0) {
      return
    }
    // For "set" type, allow 0. For "add" and "subtract", require > 0
    if (adjustmentType !== 'set' && qty <= 0) {
      return
    }
    if (!useCurrentLocation && !locationId) {
      return
    }
    onSubmit({ locationId, useCurrentLocation, adjustmentType, quantity: qty, reason })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-lg p-4 bg-gray-900 dark:bg-gray-800">
        <h4 className="font-semibold mb-3 text-white dark:text-white">Selected Products ({selectedProducts.length}):</h4>
        <div className="space-y-2">
          {selectedProducts.map((balance: StockBalance) => (
            <div 
              key={`${balance.product.id}-${balance.location.id}`} 
              className="text-sm p-2 rounded bg-gray-800 dark:bg-gray-700 border border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="font-medium text-white dark:text-white">{balance.product.name}</span>
                  <span className="text-gray-400 dark:text-gray-400 ml-2 text-xs">SKU: {balance.product.sku}</span>
                </div>
                <div className="text-right">
                  <div className="text-gray-300 dark:text-gray-300 text-xs">{balance.location.name}</div>
                  <div className="text-green-400 dark:text-green-400 font-semibold">Qty: {balance.quantity} {balance.product.uom?.symbol || ''}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Use Current Location</Label>
        <div className="flex items-center space-x-2 mt-1">
          <input
            type="checkbox"
            checked={useCurrentLocation}
            onChange={(e) => setUseCurrentLocation(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-600">Apply to each product's current location</span>
        </div>
      </div>

      {!useCurrentLocation && (
        <div>
          <Label htmlFor="bulk-adjust-location">Location *</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location: Location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="bulk-adjust-type">Adjustment Type *</Label>
        <Select value={adjustmentType} onValueChange={(value: 'add' | 'subtract' | 'set') => setAdjustmentType(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">Add Stock</SelectItem>
            <SelectItem value="subtract">Subtract Stock</SelectItem>
            <SelectItem value="set">Set Exact Quantity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="bulk-adjust-quantity">Quantity *</Label>
        <Input
          id="bulk-adjust-quantity"
          type="number"
          min={adjustmentType === 'set' ? '0' : '0.01'}
          step="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={adjustmentType === 'set' ? 'Enter exact quantity (0 allowed)' : 'Enter quantity'}
          required
        />
        {adjustmentType === 'set' && (
          <p className="text-xs text-gray-500 mt-1">This will set the exact quantity (0 is allowed)</p>
        )}
      </div>

      <div>
        <Label htmlFor="bulk-adjust-reason">Reason</Label>
        <Input
          id="bulk-adjust-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for adjustment"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !quantity || (!useCurrentLocation && !locationId)}>
          {isLoading ? 'Adjusting...' : `Adjust ${selectedProducts.length} Product${selectedProducts.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Bulk Transfer Dialog Component
function BulkTransferDialog({ 
  selectedBalances, 
  balances, 
  locations, 
  onSubmit, 
  onCancel, 
  isLoading 
}: {
  selectedBalances: Set<string>
  balances: StockBalance[]
  locations: Location[]
  onSubmit: (data: { fromLocationId: string; useCurrentLocation: boolean; toLocationId: string; quantity: number; reason?: string }) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [fromLocationId, setFromLocationId] = useState('')
  const [useCurrentLocation, setUseCurrentLocation] = useState(true)
  const [toLocationId, setToLocationId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  const selectedProducts = balances.filter((b: StockBalance) => 
    selectedBalances.has(`${b.product.id}::${b.location.id}`)
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quantity || Number(quantity) <= 0) {
      return
    }
    if (!toLocationId) {
      return
    }
    if (!useCurrentLocation && !fromLocationId) {
      return
    }
    onSubmit({ fromLocationId, useCurrentLocation, toLocationId, quantity: Number(quantity), reason })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-lg p-4 bg-gray-900 dark:bg-gray-800">
        <h4 className="font-semibold mb-3 text-white dark:text-white">Selected Products ({selectedProducts.length}):</h4>
        <div className="space-y-2">
          {selectedProducts.map((balance: StockBalance) => (
            <div 
              key={`${balance.product.id}-${balance.location.id}`} 
              className="text-sm p-2 rounded bg-gray-800 dark:bg-gray-700 border border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="font-medium text-white dark:text-white">{balance.product.name}</span>
                  <span className="text-gray-400 dark:text-gray-400 ml-2 text-xs">SKU: {balance.product.sku}</span>
                </div>
                <div className="text-right">
                  <div className="text-gray-300 dark:text-gray-300 text-xs">{balance.location.name}</div>
                  <div className="text-green-400 dark:text-green-400 font-semibold">Qty: {balance.quantity} {balance.product.uom?.symbol || ''}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Use Current Location as Source</Label>
        <div className="flex items-center space-x-2 mt-1">
          <input
            type="checkbox"
            checked={useCurrentLocation}
            onChange={(e) => setUseCurrentLocation(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-600">Transfer from each product's current location</span>
        </div>
      </div>

      {!useCurrentLocation && (
        <div>
          <Label htmlFor="bulk-transfer-from">From Location *</Label>
          <Select value={fromLocationId} onValueChange={setFromLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select source location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location: Location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="bulk-transfer-to">To Location *</Label>
        <Select value={toLocationId} onValueChange={setToLocationId}>
          <SelectTrigger>
            <SelectValue placeholder="Select destination location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location: Location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="bulk-transfer-quantity">Quantity *</Label>
        <Input
          id="bulk-transfer-quantity"
          type="number"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Enter quantity"
          required
        />
      </div>

      <div>
        <Label htmlFor="bulk-transfer-reason">Reason</Label>
        <Input
          id="bulk-transfer-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for transfer"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !quantity || !toLocationId || (!useCurrentLocation && !fromLocationId)}>
          {isLoading ? 'Transferring...' : `Transfer ${selectedProducts.length} Product${selectedProducts.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogFooter>
    </form>
  )
}

