'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { ModuleStatusTabs } from '@/components/ui/module-status-tabs'
import { useUrlStatusTabs } from '@/hooks/useUrlStatusTabs'
import {
  useMaterialRequests,
  type MaterialRequest,
  type MaterialRequestStatus,
  type MaterialRequestPriority,
} from '@/hooks/useMaterialRequests'
import { apiClient } from '@/lib/api-client'
import { userResolver } from '@/lib/user-resolver'
import { ClipboardList, Plus, Search, RefreshCw, X, Loader2, Eye, CheckCircle, XCircle, Package, Calendar, User, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useDebounce } from '@/hooks/useDebounce'

const BASE_PATH = '/dashboard/factory/material-requests'

const STATUS_TABS = [
  { value: 'all', label: 'All Requests' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FULFILLED', label: 'Fulfilled' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function MaterialRequestsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const statusTabs = useUrlStatusTabs({ basePath: BASE_PATH })

  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  // Build filters
  const filters = {
    page: currentPage,
    limit: 20,
    search: debouncedSearch || undefined,
    status: statusTabs.filterValue as MaterialRequestStatus | undefined,
    priority: priorityFilter !== 'all' ? (priorityFilter as MaterialRequestPriority) : undefined,
  }

  // Fetch material requests
  const { data: requestsData, isLoading } = useMaterialRequests(filters)
  const requests = Array.isArray(requestsData) ? requestsData : (requestsData?.data || [])
  const totalPages = requestsData?.meta?.totalPages || 1

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['material-requests'] })
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const clearFilters = () => {
    setSearch('')
    setPriorityFilter('all')
    setCurrentPage(1)
    statusTabs.onChange('all')
  }

  const handleStatusTabChange = (value: string) => {
    setCurrentPage(1)
    statusTabs.onChange(value)
  }

  const getStatusBadge = (status: MaterialRequestStatus) => {
    const badges: Record<MaterialRequestStatus, { label: string; className: string }> = {
      PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200' },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
      FULFILLED: { label: 'Fulfilled', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700 border-gray-200' },
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    }
    const badge = badges[status] || badges.PENDING
    return <Badge className={badge.className}>{badge.label}</Badge>
  }

  const getPriorityBadge = (priority: MaterialRequestPriority) => {
    const badges: Record<MaterialRequestPriority, { label: string; className: string }> = {
      LOW: { label: 'Low', className: 'bg-gray-100 text-gray-700 border-gray-200' },
      MEDIUM: { label: 'Medium', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      HIGH: { label: 'High', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      URGENT: { label: 'Urgent', className: 'bg-red-100 text-red-700 border-red-200' },
    }
    const badge = badges[priority] || badges.MEDIUM
    return <Badge className={badge.className}>{badge.label}</Badge>
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="raw-materials.read">
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
    <ProtectedRoute requiredPermission="raw-materials.read">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <ClipboardList className="h-8 w-8 text-green-600" />
                  Material Requests
                </h1>
                <p className="text-gray-600 mt-1">Manage material requests for production and operations</p>
              </div>
              <PermissionGuard requiredPermission="raw-materials.manage_stock">
                <Button 
                  onClick={() => router.push('/dashboard/factory/material-requests/create')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Request
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
                        placeholder="Search by request number, requester, or product..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-[150px] h-11 border-gray-300">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    {(search || statusTabs.filterValue || priorityFilter !== 'all') && (
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
                Showing {requests.length} request{requests.length !== 1 ? 's' : ''}
                {requestsData?.meta?.total && ` of ${requestsData.meta.total}`}
              </p>
            </div>

            {/* Material Requests Table */}
            {requests.length > 0 ? (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 bg-gray-50">
                        <TableHead className="text-gray-700 font-semibold">Request Number</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Requested By</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Date</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Location</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Items</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Total Qty</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Priority</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                        <TableHead className="text-right text-gray-700 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request: MaterialRequest) => (
                        <TableRow key={request.id} className="border-gray-200 hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900 font-mono text-sm">
                            {request.requestNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-900">{userResolver.getUserName(request.requestedById)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {/* 
                                Backend records use createdAt/requiredDate, 
                                while dummy data uses requestDate. 
                                Safely pick the first available and guard against invalid dates.
                              */}
                              {(() => {
                                const rawDate =
                                  (request as any).requestDate ||
                                  (request as any).createdAt ||
                                  (request as any).requiredDate

                                if (!rawDate) {
                                  return 'N/A'
                                }

                                const d = new Date(rawDate)
                                if (isNaN(d.getTime())) {
                                  return 'N/A'
                                }

                                return format(d, 'MMM dd, yyyy')
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {request.plant?.name ? (
                              <span>{request.plant.name}</span>
                            ) : request.warehouse?.name ? (
                              <span>{request.warehouse.name}</span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-900 font-semibold">
                            {(() => {
                              // Prefer itemsCount from dummy data; fall back to length of items from backend
                              const itemsCount =
                                (request as any).itemsCount ??
                                ((request as any).items ? (request as any).items.length : 0)

                              return `${itemsCount} item${itemsCount !== 1 ? 's' : ''}`
                            })()}
                          </TableCell>
                          <TableCell className="text-gray-900 font-semibold">
                            {(() => {
                              // Prefer totalQuantity from dummy data; otherwise sum requestedQuantity from backend items
                              let totalQuantity = (request as any).totalQuantity

                              if (totalQuantity == null && Array.isArray((request as any).items)) {
                                totalQuantity = (request as any).items.reduce(
                                  (sum: number, item: any) =>
                                    sum + (Number(item.requestedQuantity ?? item.approvedQuantity ?? item.fulfilledQuantity ?? 0) || 0),
                                  0,
                                )
                              }

                              const safeTotal = Number(totalQuantity) || 0
                              return safeTotal.toLocaleString()
                            })()}
                          </TableCell>
                          <TableCell>
                            {getPriorityBadge(request.priority)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(request.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <PermissionGuard requiredPermission="raw-materials.read">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-gray-100"
                                  onClick={() => router.push(`/dashboard/factory/material-requests/${request.id}`)}
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
                  <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-900 font-semibold text-lg mb-2">No material requests found</p>
                  <p className="text-gray-600 mb-6">
                    {search || statusTabs.filterValue || priorityFilter !== 'all'
                      ? 'Try adjusting your filters to see more results'
                      : 'Get started by creating your first material request'}
                  </p>
                  {(!search && !statusTabs.filterValue && priorityFilter === 'all') && (
                    <PermissionGuard requiredPermission="raw-materials.manage_stock">
                      <Button
                        onClick={() => router.push('/dashboard/factory/material-requests/create')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Material Request
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

