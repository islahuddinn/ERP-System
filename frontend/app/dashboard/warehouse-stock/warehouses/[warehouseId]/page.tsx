'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { 
  Package, 
  Warehouse, 
  MapPin,
  Search, 
  RefreshCw, 
  X,
  ArrowLeft,
  Eye,
  Settings,
  Plus,
  ArrowRightLeft,
  TrendingUp
} from 'lucide-react'
import { useWarehouseStock, useStockByWarehouse } from '@/hooks/useWarehouseStock'
import { useWarehouse } from '@/hooks/useWarehouses'
import { AdjustStockModal, TransferStockModal, StockDetailsModal } from '@/components/factory/warehouse-stock'
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

export default function WarehouseStockDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const warehouseId = params.warehouseId as string

  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedStock, setSelectedStock] = useState<any>(null)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  
  const debouncedSearch = useDebounce(search, 300)

  const { data: warehouse, isLoading: warehouseLoading } = useWarehouse(warehouseId)
  const { data: stockData, isLoading: stockLoading, refetch: refetchStock } = useWarehouseStock({
    warehouseId,
    zoneId: zoneFilter !== 'all' ? zoneFilter : undefined,
    productId: productFilter !== 'all' ? productFilter : undefined,
    search: debouncedSearch,
    page: currentPage,
    limit: 50,
  })

  const stockBalances = stockData?.data || []
  const stockMeta = stockData?.meta

  // Get unique zones and products for filters
  const zones = Array.from(new Set(stockBalances.map((b: any) => b.zoneId).filter(Boolean))) as string[]
  const products = Array.from(new Set(stockBalances.map((b: any) => b.productId))) as string[]

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetchStock()
    setIsRefreshing(false)
  }

  const handleClearFilters = () => {
    setSearch('')
    setZoneFilter('all')
    setProductFilter('all')
    setCurrentPage(1)
  }

  // Calculate summary
  const totalProducts = new Set(stockBalances.map((b: any) => b.productId)).size
  const totalQuantity = stockBalances.reduce((sum: number, b: any) => sum + b.quantity, 0)
  const totalValue = stockBalances.reduce((sum: number, b: any) => sum + (b.quantity * (b.product?.price || 0)), 0)
  const totalAvailable = stockBalances.reduce((sum: number, b: any) => sum + b.availableQuantity, 0)
  const totalReserved = stockBalances.reduce((sum: number, b: any) => sum + b.reservedQuantity, 0)

  if (warehouseLoading || stockLoading) {
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

  if (!warehouse) {
    return (
      <ProtectedRoute requiredPermission="warehouses.view">
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="text-center py-12">
              <Warehouse className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">Warehouse not found</p>
              <Link href="/dashboard/warehouse-stock/warehouses">
                <Button className="factory-button-primary mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Warehouses
                </Button>
              </Link>
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
                <Link href="/dashboard/warehouse-stock/warehouses">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="factory-heading flex items-center gap-3">
                    <Warehouse className="h-8 w-8 text-green-600" />
                    {warehouse.name} - Stock Details
                  </h1>
                  <p className="factory-subheading">
                    {warehouse.code} • {warehouse.warehouseType}
                  </p>
                </div>
              </div>
              <PermissionGuard requiredPermission="stock.adjust">
                <Button
                  onClick={() => {
                    setSelectedStock(stockBalances[0])
                    setIsAdjustOpen(true)
                  }}
                  className="factory-button-primary"
                  disabled={stockBalances.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adjust Stock
                </Button>
              </PermissionGuard>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="factory-stat-card border-blue-200">
                <CardHeader className="pb-3">
                  <CardDescription className="text-gray-600 font-semibold">Total Products</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{totalProducts}</div>
                </CardContent>
              </Card>

              <Card className="factory-stat-card border-green-200">
                <CardHeader className="pb-3">
                  <CardDescription className="text-gray-600 font-semibold">Total Quantity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{totalQuantity.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="factory-stat-card border-purple-200">
                <CardHeader className="pb-3">
                  <CardDescription className="text-gray-600 font-semibold">Total Value</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>

              <Card className="factory-stat-card border-orange-200">
                <CardHeader className="pb-3">
                  <CardDescription className="text-gray-600 font-semibold">Available</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{totalAvailable.toLocaleString()}</div>
                  <p className="text-xs text-gray-500 mt-1">{totalReserved.toLocaleString()} reserved</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="factory-light-card">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by product name or SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 factory-input"
                      />
                    </div>
                  </div>
                  <Select value={zoneFilter} onValueChange={setZoneFilter}>
                    <SelectTrigger className="w-full md:w-[200px] factory-input">
                      <SelectValue placeholder="All Zones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Zones</SelectItem>
                      {zones.map((zoneId: string) => {
                        const zone = stockBalances.find((b: any) => b.zoneId === zoneId)?.zone
                        return zone ? (
                          <SelectItem key={zoneId} value={zoneId}>
                            {zone.name}
                          </SelectItem>
                        ) : null
                      })}
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

            {/* Stock Table */}
            <Card className="factory-light-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900">Stock Items</CardTitle>
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
                            <TableHead className="text-gray-700 font-semibold">Zone</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Batch</TableHead>
                            <TableHead className="text-gray-700 font-semibold text-right">Quantity</TableHead>
                            <TableHead className="text-gray-700 font-semibold text-right">Reserved</TableHead>
                            <TableHead className="text-gray-700 font-semibold text-right">Available</TableHead>
                            <TableHead className="text-gray-700 font-semibold text-right">Value</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Actions</TableHead>
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
                                  {balance.zone ? (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-gray-400" />
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
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedStock(balance)
                                        setIsDetailsOpen(true)
                                      }}
                                      className="text-gray-600 hover:text-gray-900"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <PermissionGuard requiredPermission="stock.adjust">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedStock(balance)
                                          setIsAdjustOpen(true)
                                        }}
                                        className="text-gray-600 hover:text-gray-900"
                                      >
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                    </PermissionGuard>
                                    <PermissionGuard requiredPermission="stock.transfer">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedStock(balance)
                                          setIsTransferOpen(true)
                                        }}
                                        className="text-gray-600 hover:text-gray-900"
                                      >
                                        <ArrowRightLeft className="h-4 w-4" />
                                      </Button>
                                    </PermissionGuard>
                                  </div>
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
                    <p className="text-sm text-gray-500">This warehouse has no stock items</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedStock && (
        <>
          <AdjustStockModal
            isOpen={isAdjustOpen}
            onClose={() => {
              setIsAdjustOpen(false)
              setSelectedStock(null)
            }}
            stockBalance={selectedStock}
          />
          <TransferStockModal
            isOpen={isTransferOpen}
            onClose={() => {
              setIsTransferOpen(false)
              setSelectedStock(null)
            }}
            stockBalance={selectedStock}
          />
          <StockDetailsModal
            isOpen={isDetailsOpen}
            onClose={() => {
              setIsDetailsOpen(false)
              setSelectedStock(null)
            }}
            stockBalance={selectedStock}
          />
        </>
      )}
    </ProtectedRoute>
  )
}

