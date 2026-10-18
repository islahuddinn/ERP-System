'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { 
  Package, 
  Warehouse as WarehouseIcon, 
  Search, 
  RefreshCw, 
  X,
  ArrowLeft,
  Eye
} from 'lucide-react'
import { useWarehouseStock, useStockByWarehouse } from '@/hooks/useWarehouseStock'
import { useWarehouses, type Warehouse } from '@/hooks/useWarehouses'
import Link from 'next/link'

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

export default function StockByWarehousePage() {
  const searchParams = useSearchParams()
  const warehouseIdParam = searchParams.get('warehouseId')
  
  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState<string>(warehouseIdParam || 'all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  const debouncedSearch = useDebounce(search, 300)

  const { data: warehousesData, isLoading: warehousesLoading } = useWarehouses({ limit: 1000 })
  const warehouses = warehousesData?.data || []

  const { data: stockData, isLoading: stockLoading, refetch: refetchStock } = useWarehouseStock({
    warehouseId: warehouseFilter !== 'all' ? warehouseFilter : undefined,
    search: debouncedSearch,
    page: currentPage,
    limit: 50,
  })

  // Safely extract stockBalances array from potentially nested response
  const stockBalances = Array.isArray(stockData?.data) 
    ? stockData.data 
    : Array.isArray(stockData) 
    ? stockData 
    : []
  const stockMeta = stockData?.meta

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetchStock()
    setIsRefreshing(false)
  }

  const handleClearFilters = () => {
    setSearch('')
    setWarehouseFilter('all')
    setCurrentPage(1)
  }

  // Calculate warehouse-wise summary
  const warehouseSummary = warehouses.map((warehouse: Warehouse) => {
    const warehouseStock = Array.isArray(stockBalances) 
      ? stockBalances.filter((b: any) => b.warehouseId === warehouse.id)
      : []
    const totalQuantity = warehouseStock.reduce((sum: number, b: any) => sum + b.quantity, 0)
    const totalValue = warehouseStock.reduce((sum: number, b: any) => sum + (b.quantity * (b.product?.price || 0)), 0)
    const productCount = new Set(warehouseStock.map((b: any) => b.productId)).size
    
    return {
      warehouse,
      productCount,
      totalQuantity,
      totalValue,
    }
  })

  if (warehousesLoading || stockLoading) {
    return (
      <ProtectedRoute requiredPermission="warehouses.view">
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-transparent border-t-green-600"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="warehouses.view">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/dashboard/warehouse-stock">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="factory-heading flex items-center gap-3">
                    <WarehouseIcon className="h-8 w-8 text-green-600" />
                    Stock by Warehouse
                  </h1>
                  <p className="factory-subheading">
                    View stock organized by warehouse
                  </p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <Card className="factory-light-card">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by product name, SKU, or warehouse..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 factory-input"
                      />
                    </div>
                  </div>
                  <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                    <SelectTrigger className="w-full md:w-[200px] factory-input">
                      <SelectValue placeholder="All Warehouses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Warehouses</SelectItem>
                      {warehouses.map((warehouse: any) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Warehouse Summary Cards */}
            {warehouseFilter === 'all' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouseSummary.map((summary: any) => (
                  <Link 
                    key={summary.warehouse.id}
                    href={`/dashboard/warehouse-stock/warehouses/${summary.warehouse.id}`}
                  >
                    <Card className="factory-light-card hover:shadow-lg transition-all cursor-pointer">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-green-50">
                              <WarehouseIcon className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{summary.warehouse.name}</div>
                              <div className="text-sm text-gray-500">{summary.warehouse.code}</div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 pt-4 border-t border-gray-200">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Products</span>
                            <span className="font-semibold text-gray-900">{summary.productCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Quantity</span>
                            <span className="font-semibold text-gray-900">{summary.totalQuantity.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Value</span>
                            <span className="font-semibold text-green-600">
                              ${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Stock Table */}
            <Card className="factory-light-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900">Stock Details</CardTitle>
                    <CardDescription className="text-gray-600">
                      {stockMeta ? `Showing ${stockBalances.length} of ${stockMeta.total} items` : 'Loading...'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {stockBalances.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200">
                            <TableHead className="text-gray-700 font-semibold">Product</TableHead>
                            <TableHead className="text-gray-700 font-semibold">SKU</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Warehouse</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Zone</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Batch</TableHead>
                            <TableHead className="text-gray-700 font-semibold text-right">Quantity</TableHead>
                            <TableHead className="text-gray-700 font-semibold text-right">Reserved</TableHead>
                            <TableHead className="text-gray-700 font-semibold text-right">Available</TableHead>
                            <TableHead className="text-gray-700 font-semibold text-right">Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockBalances.map((balance: any) => {
                            const value = balance.quantity * (balance.product?.price || 0)
                            return (
                              <TableRow key={balance.id} className="border-gray-200 hover:bg-gray-50">
                                <TableCell className="font-medium text-gray-900">
                                  {balance.product?.name || 'Unknown Product'}
                                </TableCell>
                                <TableCell className="text-gray-600 font-mono text-sm">
                                  {balance.product?.sku || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <WarehouseIcon className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-900">{balance.warehouse?.name || 'Unknown'}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {balance.zone ? (
                                    <div className="flex items-center gap-2">
                                      <Package className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-600">{balance.zone.name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">No Zone</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {balance.batch ? (
                                    <Badge variant="outline" className="text-xs">
                                      {balance.batch.batchNumber}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400">No Batch</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-gray-900">
                                  {balance.quantity.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-orange-600">
                                  {balance.reservedQuantity.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-green-600 font-semibold">
                                  {balance.availableQuantity.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-gray-900">
                                  ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>
                                  <Link href={`/dashboard/warehouse-stock/warehouses/${balance.warehouseId}`}>
                                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Pagination */}
                    {stockMeta && stockMeta.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          Page {stockMeta.page} of {stockMeta.totalPages}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="border-gray-200"
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(stockMeta.totalPages, p + 1))}
                            disabled={currentPage === stockMeta.totalPages}
                            className="border-gray-200"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium mb-2">No stock found</p>
                    <p className="text-sm text-gray-500">Try adjusting your filters</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

