'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiClient } from '@/lib/api-client'
import { Package, MapPin, Search, RefreshCw, X, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'

// Types
interface StockBalance {
  id: string
  productId: string
  locationId: string
  quantity: number
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
}

interface Location {
  id: string
  name: string
  type: string
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

export default function CurrentStockPage() {
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'product' | 'location'>('product')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const debouncedSearch = useDebounce(search, 300)

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, locationFilter, productFilter, viewMode])

  // Fetch stock balances - fetch all pages to get complete data
  const { data: balancesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['stock-balances-all', locationFilter, productFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams()
        params.append('page', '1')
        params.append('limit', '100') // Max limit per API
        
        if (locationFilter !== 'all') params.append('locationId', locationFilter)
        if (productFilter !== 'all') params.append('productId', productFilter)
        
        const allBalances: StockBalance[] = []
        let currentPage = 1
        let hasMore = true
        
        while (hasMore) {
          params.set('page', currentPage.toString())
          const response = await apiClient.get(`/stock/balances?${params.toString()}`)
          const data = response.data
          
          // Handle paginated response structure
          const balances = Array.isArray(data) 
            ? data 
            : (data?.data || [])
          
          if (balances.length === 0) break
          
          allBalances.push(...balances)
          
          // Check if there are more pages
          if (data?.meta) {
            hasMore = currentPage < (data.meta.totalPages || 1)
            currentPage++
          } else {
            // If no meta, check if we got a full page (might have more)
            hasMore = balances.length === 100
            currentPage++
          }
          
          // Safety limit to prevent infinite loops
          if (currentPage > 100) break
        }
        
        return allBalances
      } catch (error) {
        console.error('Error fetching stock balances:', error)
        return []
      }
    },
  })

  // Fetch products for dropdowns and total count
  const { data: productsResponse } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await apiClient.get('/product-management/products?page=1&limit=1')
      const allProductsResponse = await apiClient.get('/product-management/products')
      return allProductsResponse.data
    },
  })

  // Fetch locations for dropdowns
  const { data: locationsResponse } = useQuery({
    queryKey: ['locations'],
    queryFn: () => apiClient.get('/locations').then(res => res.data),
  })

  // balancesResponse is already an array from our query function
  const allBalances: StockBalance[] = Array.isArray(balancesResponse) 
    ? balancesResponse 
    : []

  // Handle wrapped response for products
  const products = Array.isArray(productsResponse?.data) 
    ? productsResponse.data 
    : Array.isArray(productsResponse?.data?.data)
    ? productsResponse.data.data
    : Array.isArray(productsResponse)
    ? productsResponse
    : []
  
  // Handle wrapped response for locations
  const locations = Array.isArray(locationsResponse?.data) 
    ? locationsResponse.data 
    : Array.isArray(locationsResponse?.data?.data)
    ? locationsResponse.data.data
    : Array.isArray(locationsResponse)
    ? locationsResponse
    : []

  // Filter balances by search term (client-side)
  const balances = allBalances.filter((balance: StockBalance) => {
    if (!debouncedSearch) return true
    const searchLower = debouncedSearch.toLowerCase()
    return (
      balance.product?.name?.toLowerCase().includes(searchLower) ||
      balance.product?.sku?.toLowerCase().includes(searchLower) ||
      balance.location?.name?.toLowerCase().includes(searchLower)
    )
  })

  // Group balances by product or location
  const groupedData = () => {
    if (viewMode === 'product') {
      // Group by product
      const grouped: Record<string, StockBalance[]> = {}
      balances.forEach((balance: StockBalance) => {
        if (!balance.product?.id) return
        const key = balance.product.id
        if (!grouped[key]) {
          grouped[key] = []
        }
        grouped[key].push(balance)
      })
      return grouped
    } else {
      // Group by location
      const grouped: Record<string, StockBalance[]> = {}
      balances.forEach((balance: StockBalance) => {
        if (!balance.location?.id) return
        const key = balance.location.id
        if (!grouped[key]) {
          grouped[key] = []
        }
        grouped[key].push(balance)
      })
      return grouped
    }
  }

  const grouped = groupedData()
  const groupedKeys = Object.keys(grouped)
  const totalPages = Math.ceil(groupedKeys.length / pageSize)
  const paginatedKeys = groupedKeys.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Calculate summary statistics from all balances (before filtering)
  const totalProducts = allBalances.length > 0 ? new Set(allBalances.map((b: StockBalance) => b.product?.id).filter(Boolean)).size : 0
  const totalLocations = allBalances.length > 0 ? new Set(allBalances.map((b: StockBalance) => b.location?.id).filter(Boolean)).size : 0
  const totalStockUnits = allBalances.reduce((sum: number, balance: StockBalance) => sum + (balance.quantity || 0), 0)
  const lowStockItems = allBalances.filter((b: StockBalance) => (b.quantity || 0) <= (b.product?.reorderLevel || 0)).length

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error loading stock data</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Current Stock</h1>
          <p className="text-gray-600">View stock levels across all products and locations</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'product' ? 'default' : 'outline'}
            onClick={() => setViewMode('product')}
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            By Product
          </Button>
          <Button
            variant={viewMode === 'location' ? 'default' : 'outline'}
            onClick={() => setViewMode('location')}
            className="flex items-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            By Location
          </Button>
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
                  {totalProducts}
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
                  {totalLocations}
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
                  {totalStockUnits}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Low Stock Items</p>
                <p className="text-2xl font-semibold text-white">
                  {lowStockItems}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Stock View */}
      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === 'product' ? 'Stock by Product' : 'Stock by Location'}
          </CardTitle>
          <CardDescription>
            {viewMode === 'product' 
              ? 'View all locations for each product'
              : 'View all products at each location'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedKeys.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300">No stock found</p>
              <p className="text-sm text-gray-400 mt-2">
                {search || locationFilter !== 'all' || productFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Add stock to products to see them here'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {paginatedKeys.map((key) => {
                const items = grouped[key]
                if (!items || items.length === 0) return null
                const firstItem = items[0]
                if (!firstItem) return null
                const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0)
                
                return (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {viewMode === 'product' 
                            ? firstItem.product?.name || 'Unknown Product'
                            : firstItem.location?.name || 'Unknown Location'
                          }
                        </h3>
                        <p className="text-sm text-gray-400">
                          {viewMode === 'product' 
                            ? `SKU: ${firstItem.product?.sku || 'N/A'}`
                            : `${firstItem.location?.type || 'N/A'} • ${items.length} product${items.length !== 1 ? 's' : ''}`
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Total Quantity</p>
                        <p className="text-2xl font-bold text-white">
                          {totalQuantity} {viewMode === 'product' ? firstItem.product?.uom?.symbol || '' : ''}
                        </p>
                      </div>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {viewMode === 'product' ? (
                            <>
                              <TableHead>Location</TableHead>
                              <TableHead>Type</TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead>Product</TableHead>
                              <TableHead>SKU</TableHead>
                            </>
                          )}
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit</TableHead>
                          {viewMode === 'product' && <TableHead>Reorder Level</TableHead>}
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((balance: StockBalance) => {
                          const quantity = balance.quantity || 0
                          const reorderLevel = balance.product?.reorderLevel || 0
                          const isLowStock = quantity <= reorderLevel
                          return (
                            <TableRow key={balance.id || `${balance.productId}-${balance.locationId}`}>
                              {viewMode === 'product' ? (
                                <>
                                  <TableCell>
                                    <Link 
                                      href={`/dashboard/locations`}
                                      className="text-blue-400 hover:underline"
                                    >
                                      {balance.location?.name || 'Unknown Location'}
                                    </Link>
                                  </TableCell>
                                  <TableCell>
                                    <span className="capitalize text-gray-400">
                                      {balance.location?.type?.toLowerCase() || 'N/A'}
                                    </span>
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell>
                                    <Link 
                                      href={`/dashboard/products`}
                                      className="text-blue-400 hover:underline"
                                    >
                                      {balance.product?.name || 'Unknown Product'}
                                    </Link>
                                  </TableCell>
                                  <TableCell className="text-gray-400">
                                    {balance.product?.sku || 'N/A'}
                                  </TableCell>
                                </>
                              )}
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  isLowStock 
                                    ? 'bg-red-100 text-red-800' 
                                    : quantity > reorderLevel * 2
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {quantity}
                                </span>
                              </TableCell>
                              <TableCell>{balance.product?.uom?.symbol || 'N/A'}</TableCell>
                              {viewMode === 'product' && (
                                <TableCell>{reorderLevel}</TableCell>
                              )}
                              <TableCell>
                                {isLowStock ? (
                                  <span className="text-red-600 text-xs font-medium">Low Stock</span>
                                ) : (
                                  <span className="text-green-600 text-xs font-medium">In Stock</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {groupedKeys.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-300">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, groupedKeys.length)} of {groupedKeys.length} {viewMode === 'product' ? 'products' : 'locations'}
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
    </div>
  )
}

