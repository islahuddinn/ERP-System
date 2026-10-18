'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { ModuleStatusTabs } from '@/components/ui/module-status-tabs'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useUrlStatusTabs, useListQueryParams } from '@/hooks/useUrlStatusTabs'
import { normalizeGrnListStatus } from '@/lib/list-status-filters'
import {
  useGrns,
  useGrnStats,
  type Grn,
  type GrnStatus,
} from '@/hooks/useMaterialReceiving'
import { PackageCheck, Plus, Eye, Calendar, Building2, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

const BASE_PATH = '/dashboard/factory/receiving'

const STATUS_TABS = [
  { value: 'all', label: 'All GRNs' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'INSPECTING', label: 'Inspecting' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
]

const STATUS_BADGES: Record<GrnStatus, { label: string; className: string }> = {
  PENDING:    { label: 'Pending',    className: 'bg-gray-100 text-gray-700 border-gray-200' },
  INSPECTING: { label: 'Inspecting', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  APPROVED:   { label: 'Approved',   className: 'bg-teal-100 text-teal-700 border-teal-200' },
  REJECTED:   { label: 'Rejected',   className: 'bg-red-100 text-red-700 border-red-200' },
  COMPLETED:  { label: 'Completed',  className: 'bg-green-100 text-green-700 border-green-200' },
}

function getStatusBadge(status: GrnStatus) {
  const badge = STATUS_BADGES[status] || STATUS_BADGES.PENDING
  return <Badge className={badge.className}>{badge.label}</Badge>
}

export default function MaterialReceivingPage() {
  const router = useRouter()

  const controller = useDataTable({
    initialSortBy: 'createdAt',
    initialSortOrder: 'DESC',
  })

  const statusTabs = useUrlStatusTabs({
    basePath: BASE_PATH,
    normalizeValue: (raw) => normalizeGrnListStatus(raw) ?? raw,
  })

  const queryParams = useListQueryParams(controller, statusTabs)

  const { data, isLoading, isError } = useGrns(queryParams as Parameters<typeof useGrns>[0])
  const { data: stats } = useGrnStats()

  const grnRecords: Grn[] = data?.data ?? []
  const meta = data?.meta ?? null

  // Summary cards (QA #59):
  // - No filter active → server-wide /grn/stats (correct across all pages).
  // - Any filter active → reflect the filtered result set. "Total GRNs" uses the
  //   filtered server total (meta.total); Completed/Completion Rate derive from the
  //   filtered rows so the cards update with the selected filter.
  const isFiltered = controller.isFiltered || Boolean(statusTabs.filterValue)
  const filteredTotal = Number(meta?.total ?? grnRecords.length) || 0
  const filteredCompleted = grnRecords.filter((g) => g.status === 'COMPLETED').length
  const filteredCompletionRate =
    grnRecords.length > 0 ? Math.round((filteredCompleted / grnRecords.length) * 100) : 0

  const cardTotal = isFiltered ? filteredTotal : stats?.total ?? 0
  const cardCompleted = isFiltered ? filteredCompleted : stats?.completed ?? 0
  const cardCompletionRate = isFiltered ? filteredCompletionRate : stats?.completionRate ?? 0


  const filters: DataTableFilter<Grn>[] = [
    {
      key: 'receivingType',
      label: 'Receiving Type',
      options: [
        { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
        { value: 'RETURN', label: 'Return' },
        { value: 'PRODUCTION_RETURN', label: 'Production Return' },
        { value: 'OTHER', label: 'Other' },
      ],
    },
    { type: 'daterange', label: 'Received Date', fromKey: 'startDate', toKey: 'endDate' },
  ]

  const columns: DataTableColumn<Grn>[] = [
    {
      key: 'receivingNumber',
      header: 'Receiving Number',
      sortable: true,
      render: (r) => (
        <span className="font-medium text-gray-900 font-mono text-sm">{r.receivingNumber}</span>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      sortable: true,
      sortKey: 'purchaseOrder.supplier.name',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900">{r.purchaseOrder?.supplier?.name || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'poNumber',
      header: 'PO Number',
      sortable: true,
      sortKey: 'purchaseOrder.orderNumber',
      render: (r) => (
        <span className="text-gray-600 font-mono text-sm">{r.purchaseOrder?.orderNumber || 'N/A'}</span>
      ),
    },
    {
      key: 'receivingType',
      header: 'Type',
      sortable: true,
      sortKey: 'receivingType',
      render: (r) => <span className="text-gray-600 text-sm">{r.receivingType.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'items',
      header: 'Items',
      // Sort by the count of related GRN items — buildOrderBy turns 'items._count'
      // into Prisma's { items: { _count: order } } aggregate ordering.
      sortable: true,
      sortKey: 'items._count',
      render: (r) => {
        const itemsCount = r.items?.length || 0
        return (
          <span className="text-gray-900 font-semibold">
            {itemsCount} item{itemsCount !== 1 ? 's' : ''}
          </span>
        )
      },
    },
    {
      key: 'receivedDate',
      header: 'Received Date',
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400" />
          {r.receivedDate ? format(new Date(r.receivedDate), 'MMM dd, yyyy') : 'N/A'}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (r) => getStatusBadge(r.status),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="grn.read">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <PackageCheck className="h-8 w-8 text-green-600" />
                  Goods Receipt Notes
                </h1>
                <p className="text-gray-600 mt-1">Manage incoming material receiving records</p>
              </div>
              <PermissionGuard requiredPermission="grn.create">
                <Button
                  onClick={() => router.push('/dashboard/factory/receiving/create')}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create GRN
                </Button>
              </PermissionGuard>
            </div>

            {/* Stats — reflect the active filter (QA #59) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <PackageCheck className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Total GRNs</p>
                      <p className="text-2xl font-bold text-gray-900">{cardTotal}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <PackageCheck className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-gray-900">{cardCompleted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Completion Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{cardCompletionRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* GRN Table */}
            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="pb-3">
                <ModuleStatusTabs
                  value={statusTabs.value}
                  onChange={statusTabs.onChange}
                  tabs={STATUS_TABS}
                />
              </CardHeader>
              <CardContent className="pt-0 p-4">
                <DataTable<Grn>
                  columns={columns}
                  data={grnRecords}
                  meta={meta}
                  controller={controller}
                  rowKey={(r) => r.id}
                  isLoading={isLoading}
                  isError={isError}
                  errorMessage="Failed to load GRNs."
                  searchable
                  searchPlaceholder="Search by receiving number or delivery note..."
                  filters={filters}
                  pageSizeOptions
                  emptyMessage="No GRNs found. Try adjusting your filters or create a new Goods Receipt Note."
                  onRowClick={(r) => router.push(`/dashboard/factory/receiving/${r.id}`)}
                  actions={(r) => (
                    <PermissionGuard requiredPermission="grn.read">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        onClick={() => router.push(`/dashboard/factory/receiving/${r.id}`)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4 text-gray-600" />
                      </Button>
                    </PermissionGuard>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
