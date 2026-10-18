'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { ModuleStatusTabs } from '@/components/ui/module-status-tabs'
import { useUrlStatusTabs } from '@/hooks/useUrlStatusTabs'
import {
  useMaterialTransfers,
  type MaterialTransfer,
  type MaterialTransferStatus,
} from '@/hooks/useMaterialTransfers'
import { apiClient } from '@/lib/api-client'
import { ArrowLeftRight, Plus, Search, RefreshCw, X, Loader2, Eye, Package, Calendar, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { useDebounce } from '@/hooks/useDebounce'

const BASE_PATH = '/dashboard/factory/material-transfers'

const STATUS_TABS = [
  { value: 'all', label: 'All Transfers' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function MaterialTransfersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const statusTabs = useUrlStatusTabs({ basePath: BASE_PATH })

  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  // Build filters
  const filters = {
    page: currentPage,
    limit: 20,
    search: debouncedSearch || undefined,
    status: statusTabs.filterValue as MaterialTransferStatus | undefined,
  }

  // Fetch material transfers
  const { data: transfersData, isLoading } = useMaterialTransfers(filters)
  const transfers = Array.isArray(transfersData) ? transfersData : (transfersData?.data || [])
  const totalPages = transfersData?.meta?.totalPages || 1

  // Note: Warehouses are not used in filters currently, but kept for future use

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['material-transfers'] })
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const clearFilters = () => {
    setSearch('')
    setCurrentPage(1)
    statusTabs.onChange('all')
  }

  const handleStatusTabChange = (value: string) => {
    setCurrentPage(1)
    statusTabs.onChange(value)
  }

  const getStatusBadge = (status: MaterialTransferStatus) => {
    const badges: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      APPROVED: { label: 'Approved', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      IN_TRANSIT: { label: 'In Transit', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      RECEIVED: { label: 'Received', className: 'bg-green-100 text-green-700 border-green-200' },
      CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
    }
    const badge = badges[status] || badges.PENDING
    return <Badge className={badge.className}>{badge.label}</Badge>
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="stock.transfer">
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="stock.transfer">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <ArrowLeftRight className="h-8 w-8 text-green-600" />
                  Material Transfers
                </h1>
                <p className="text-gray-600 mt-1">Manage material transfers between warehouses</p>
              </div>
              <PermissionGuard requiredPermission="stock.transfer">
                <Button 
                  onClick={() => router.push('/dashboard/factory/material-transfers/create')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Transfer
                </Button>
              </PermissionGuard>
            </div>

            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <ModuleStatusTabs
                  value={statusTabs.value}
                  onChange={handleStatusTabChange}
                  tabs={STATUS_TABS}
                />
              </CardHeader>
            </Card>

            {/* Filters and Search */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by transfer number, warehouse, or product..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    {(search || statusTabs.filterValue) && (
                      <Button 
                        variant="outline" 
                        onClick={clearFilters} 
                        className="h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {transfers.length} transfer{transfers.length !== 1 ? 's' : ''}
                {transfersData?.meta?.total && ` of ${transfersData.meta.total}`}
              </p>
            </div>

            {/* Material Transfers Table */}
            {transfers.length > 0 ? (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 bg-gray-50">
                        <TableHead className="text-gray-700 font-semibold">Transfer Number</TableHead>
                        <TableHead className="text-gray-700 font-semibold">From</TableHead>
                        <TableHead className="text-gray-700 font-semibold">To</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Items</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Total Qty</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Transfer Date</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                        <TableHead className="text-right text-gray-700 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer: MaterialTransfer) => (
                        <TableRow key={transfer.id} className="border-gray-200 hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900 font-mono text-sm">
                            {transfer.transferNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="text-gray-900 font-medium">
                                  {transfer.fromWarehouse?.name || 
                                   (transfer as any).sourceLocationDetails || 
                                   `${(transfer as any).sourceLocationType || 'Location'}: ${(transfer as any).sourceLocationId?.slice(0, 8) || 'N/A'}`}
                                </p>
                                {(transfer as any).sourceLocationDetails && !transfer.fromWarehouse?.name && (
                                  <p className="text-gray-500 text-xs">{(transfer as any).sourceLocationType || 'Location'}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="text-gray-900 font-medium">
                                  {transfer.toWarehouse?.name || 
                                   (transfer as any).destinationLocationDetails || 
                                   `${(transfer as any).destinationLocationType || 'Location'}: ${(transfer as any).destinationLocationId?.slice(0, 8) || 'N/A'}`}
                                </p>
                                {(transfer as any).destinationLocationDetails && !transfer.toWarehouse?.name && (
                                  <p className="text-gray-500 text-xs">{(transfer as any).destinationLocationType || 'Location'}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 font-semibold">
                            {transfer.itemsCount || (transfer.items?.length || 0)} item{(transfer.itemsCount || transfer.items?.length || 0) !== 1 ? 's' : ''}
                          </TableCell>
                          <TableCell className="text-gray-900 font-semibold">
                            {(transfer.totalQuantity || (transfer.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0)).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {transfer.transferDate ? format(new Date(transfer.transferDate), 'MMM dd, yyyy') : 
                               (transfer as any).scheduledDate ? format(new Date((transfer as any).scheduledDate), 'MMM dd, yyyy') : 
                               'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(transfer.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <PermissionGuard requiredPermission="stock.transfer">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-gray-100"
                                  onClick={() => router.push(`/dashboard/factory/material-transfers/${transfer.id}`)}
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4 text-gray-600" />
                                </Button>
                              </PermissionGuard>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="border-gray-300"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="border-gray-300"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="text-center py-16">
                  <ArrowLeftRight className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-900 font-semibold text-lg mb-2">No material transfers found</p>
                  <p className="text-gray-600 mb-6">
                    {search || statusTabs.filterValue
                      ? 'Try adjusting your filters to see more results'
                      : 'Get started by creating your first material transfer'}
                  </p>
                  {(!search && !statusTabs.filterValue) && (
                    <PermissionGuard requiredPermission="stock.transfer">
                      <Button
                        onClick={() => router.push('/dashboard/factory/material-transfers/create')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Transfer
                      </Button>
                    </PermissionGuard>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

