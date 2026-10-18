'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Eye, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleListShell } from '@/components/ui/module-list-shell'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useUrlStatusTabs, useListQueryParams } from '@/hooks/useUrlStatusTabs'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import {
  useBranchStockRequests,
  formatBranchStockEmployeeName,
  formatFulfillerBranchName,
  BRANCH_STOCK_REQUEST_STATUS_LABELS,
  type BranchStockRequest,
  type BranchStockRequestStatus,
} from '@/hooks/useBranchStockRequests'

const BASE_PATH = '/dashboard/sales/branch-stock-requests'

const STATUS_TABS = [
  { value: 'all', label: 'All Requests' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

function getStatusStyle(status: BranchStockRequestStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'APPROVED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'REJECTED':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function BranchStockRequestsPage() {
  const router = useRouter()
  const { hasPermission } = usePermissionCheck()
  const canCreate = hasPermission('branch-stock-request.create')

  const controller = useDataTable({
    initialSortBy: 'requestDate',
    initialSortOrder: 'DESC',
  })

  const statusTabs = useUrlStatusTabs({ basePath: BASE_PATH })

  const queryParams = useListQueryParams(controller, statusTabs)

  const { data, isLoading, isError } = useBranchStockRequests(queryParams)

  const columns: DataTableColumn<BranchStockRequest>[] = [
    {
      key: 'requestNumber',
      header: 'Request #',
      sortable: true,
      render: (request) => (
        <span className="font-mono text-sm font-medium text-gray-800">{request.requestNumber}</span>
      ),
    },
    {
      key: 'requestDate',
      header: 'Date',
      sortable: true,
      render: (request) => (
        <span className="text-gray-700">{format(new Date(request.requestDate), 'MMM d, yyyy')}</span>
      ),
    },
    {
      key: 'requesterBranch.name',
      header: 'Requesting Branch',
      render: (request) => (
        <div>
          <p className="font-medium text-gray-900">{request.requesterBranch?.name ?? '—'}</p>
          {request.requesterBranch?.code && (
            <p className="text-xs text-gray-500">{request.requesterBranch.code}</p>
          )}
        </div>
      ),
    },
    {
      key: 'fulfillerBranch.name',
      header: 'Fulfilling Branch',
      render: (request) => (
        <span className="text-gray-700">{formatFulfillerBranchName(request.fulfillerBranch)}</span>
      ),
    },
    {
      key: 'requestedBy',
      header: 'Requested By',
      render: (request) => (
        <span className="text-gray-700">{formatBranchStockEmployeeName(request.requestedBy)}</span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      align: 'right',
      render: (request) => (
        <span className="tabular-nums text-gray-700">
          {request._count?.items ?? request.items?.length ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (request) => (
        <Badge className={getStatusStyle(request.status)}>
          {BRANCH_STOCK_REQUEST_STATUS_LABELS[request.status] ?? request.status}
        </Badge>
      ),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="branch-stock-request.view">
      <ModuleListShell
        title="Branch Stock Requests"
        subtitle="Request stock from your parent branch or the Factory. Approved requests are fulfilled via separate transfer shipments."
        action={
          canCreate ? (
            <Button
              onClick={() => router.push(`${BASE_PATH}/create`)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          ) : undefined
        }
        statusTabs={{
          value: statusTabs.value,
          onChange: statusTabs.onChange,
          tabs: STATUS_TABS,
        }}
      >
        <DataTable<BranchStockRequest>
          columns={columns}
          data={data?.data}
          meta={data?.meta}
          controller={controller}
          rowKey={(request) => request.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load branch stock requests."
          searchPlaceholder="Search requests…"
          pageSizeOptions
          emptyMessage="No branch stock requests found matching your criteria."
          onRowClick={(request) => router.push(`${BASE_PATH}/${request.id}`)}
          actions={(request) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`${BASE_PATH}/${request.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        />
      </ModuleListShell>
    </ProtectedRoute>
  )
}
