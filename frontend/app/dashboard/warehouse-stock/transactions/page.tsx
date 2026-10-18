'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  Package,
  Warehouse,
  MapPin,
  Search,
  RefreshCw,
  X,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Settings,
  Eye
} from 'lucide-react'
import { useWarehouseStockTransactions } from '@/hooks/useWarehouseStock'
import { useWarehouses } from '@/hooks/useWarehouses'
import { StockDetailsModal } from '@/components/factory/warehouse-stock'
import Link from 'next/link'
import { format } from 'date-fns'
import { userResolver } from '@/lib/user-resolver'

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

export default function StockTransactionsPage() {
  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const { data: warehousesData, isLoading: warehousesLoading } = useWarehouses({ limit: 1000 })
  const warehouses = warehousesData?.data || []

  const { data: transactionsData, isLoading: transactionsLoading, refetch: refetchTransactions } = useWarehouseStockTransactions({
    warehouseId: warehouseFilter !== 'all' ? warehouseFilter : undefined,
    transactionType: transactionTypeFilter !== 'all' ? transactionTypeFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page: currentPage,
    limit: 50,
  })

  // Safely extract transactions array - handle nested data structures
  // API response structure: { success, message, data: { data: [...], meta: {...} } }
  const transactions = Array.isArray(transactionsData?.data?.data)
    ? transactionsData.data.data
    : Array.isArray(transactionsData?.data)
      ? transactionsData.data
      : Array.isArray(transactionsData)
        ? transactionsData
        : []
  const transactionsMeta = transactionsData?.data?.meta || transactionsData?.meta


  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetchTransactions()
    setIsRefreshing(false)
  }

  const handleClearFilters = () => {
    setSearch('')
    setWarehouseFilter('all')
    setTransactionTypeFilter('all')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
  }

  const getTransactionTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string; icon: any }> = {
      IN: { label: 'In', className: 'bg-green-100 text-green-700 border-green-200', icon: TrendingUp },
      OUT: { label: 'Out', className: 'bg-red-100 text-red-700 border-red-200', icon: TrendingDown },
      TRANSFER_IN: { label: 'Transfer In', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: ArrowRightLeft },
      TRANSFER_OUT: { label: 'Transfer Out', className: 'bg-purple-100 text-purple-700 border-purple-200', icon: ArrowRightLeft },
      ADJUSTMENT: { label: 'Adjustment', className: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Settings },
    }
    const badge = badges[type] || { label: type, className: 'bg-gray-100 text-gray-700 border-gray-200', icon: Package }
    const Icon = badge.icon
    return (
      <Badge className={`${badge.className} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </Badge>
    )
  }

  // Calculate summary stats - ensure transactions is an array
  const totalIn = Array.isArray(transactions)
    ? transactions.filter((t: any) => t.transactionType === 'IN' || t.transactionType === 'TRANSFER_IN').reduce((sum: number, t: any) => sum + (t.quantity || 0), 0)
    : 0
  const totalOut = Array.isArray(transactions)
    ? transactions.filter((t: any) => t.transactionType === 'OUT' || t.transactionType === 'TRANSFER_OUT').reduce((sum: number, t: any) => sum + (t.quantity || 0), 0)
    : 0
  const netMovement = totalIn - totalOut

  if (warehousesLoading || transactionsLoading) {
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
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                    Stock Transactions
                  </h1>
                  <p className="factory-subheading">
                    View all warehouse stock movements and transactions
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="factory-stat-card border-green-200">
                <CardHeader className="pb-3">
                  <CardDescription className="text-gray-600 font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Total In
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{totalIn.toLocaleString()}</div>
                  <p className="text-sm text-gray-500 mt-1">Units received</p>
                </CardContent>
              </Card>

              <Card className="factory-stat-card border-red-200">
                <CardHeader className="pb-3">
                  <CardDescription className="text-gray-600 font-semibold flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    Total Out
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{totalOut.toLocaleString()}</div>
                  <p className="text-sm text-gray-500 mt-1">Units issued</p>
                </CardContent>
              </Card>

              <Card className="factory-stat-card border-blue-200">
                <CardHeader className="pb-3">
                  <CardDescription className="text-gray-600 font-semibold flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                    Net Movement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${netMovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netMovement >= 0 ? '+' : ''}{netMovement.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Net change</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="factory-light-card">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by product name, SKU, or reference..."
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
                    <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                      <SelectTrigger className="w-full md:w-[200px] factory-input">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="IN">In</SelectItem>
                        <SelectItem value="OUT">Out</SelectItem>
                        <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
                        <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
                        <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <Input
                      type="date"
                      placeholder="Start Date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="factory-input"
                    />
                    <Input
                      type="date"
                      placeholder="End Date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="factory-input"
                    />
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
                </div>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card className="factory-light-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900">Transaction History</CardTitle>
                    <CardDescription className="text-gray-600">
                      {transactionsMeta ? `Showing ${transactions.length} of ${transactionsMeta.total} transactions` : 'Loading...'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {Array.isArray(transactions) && transactions.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200">
                            <TableHead className="text-gray-700 font-semibold">Date & Time</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Type</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Product</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Warehouse</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Zone</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Batch</TableHead>
                            <TableHead className="text-gray-700 font-semibold text-right">Quantity</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Reference</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Created By</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((transaction: any) => (
                            <TableRow key={transaction.id} className="border-gray-200 hover:bg-gray-50">
                              <TableCell className="text-gray-900">
                                {format(new Date(transaction.createdAt), 'MMM dd, yyyy HH:mm')}
                              </TableCell>
                              <TableCell>
                                {getTransactionTypeBadge(transaction.transactionType)}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium text-gray-900">{transaction.product?.name || 'Unknown'}</div>
                                  <div className="text-xs text-gray-500 font-mono">{transaction.product?.sku || 'N/A'}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Warehouse className="h-4 w-4 text-gray-400" />
                                  <span className="text-gray-900">{transaction.warehouse?.name || 'Unknown'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {transaction.zone ? (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">{transaction.zone.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">No Zone</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {transaction.batch ? (
                                  <Badge variant="outline" className="text-xs">
                                    {transaction.batch.batchNumber}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">No Batch</span>
                                )}
                              </TableCell>
                              <TableCell className={`text-right font-semibold ${transaction.transactionType === 'IN' || transaction.transactionType === 'TRANSFER_IN'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                                }`}>
                                {transaction.transactionType === 'IN' || transaction.transactionType === 'TRANSFER_IN' ? '+' : '-'}
                                {transaction.quantity.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {transaction.referenceType && transaction.referenceId ? (
                                  <Badge variant="outline" className="text-xs">
                                    {transaction.referenceType} #{transaction.referenceId.slice(-6)}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-600">
                                {userResolver.getUserName(transaction.createdById || '')}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Find the stock balance for this transaction
                                    const stockBalance = {
                                      warehouseId: transaction.warehouseId,
                                      zoneId: transaction.zoneId,
                                      productId: transaction.productId,
                                      batchId: transaction.batchId,
                                      product: transaction.product,
                                      warehouse: transaction.warehouse,
                                      zone: transaction.zone,
                                      batch: transaction.batch,
                                    }
                                    setSelectedTransaction(stockBalance)
                                    setIsDetailsOpen(true)
                                  }}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {transactionsMeta && transactionsMeta.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          Page {transactionsMeta.page} of {transactionsMeta.totalPages}
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
                            onClick={() => setCurrentPage(p => Math.min(transactionsMeta.totalPages, p + 1))}
                            disabled={currentPage === transactionsMeta.totalPages}
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
                    <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium mb-2">No transactions found</p>
                    <p className="text-sm text-gray-500">Try adjusting your filters or date range</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedTransaction && (
        <StockDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false)
            setSelectedTransaction(null)
          }}
          stockBalance={selectedTransaction}
        />
      )}
    </ProtectedRoute>
  )
}

