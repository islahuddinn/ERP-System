'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleListShell } from '@/components/ui/module-list-shell'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useUrlStatusTabs, useListQueryParams } from '@/hooks/useUrlStatusTabs'
import {
  useBranchStockTransfers,
  formatTransferFromBranchName,
  BRANCH_STOCK_TRANSFER_STATUS_LABELS,
  type BranchStockTransfer,
  type BranchStockTransferStatus,
} from '@/hooks/useBranchStockTransfers'
import { formatCurrency } from '@/lib/currency'

const BASE_PATH = '/dashboard/sales/branch-stock-transfers'

const STATUS_TABS = [
  { value: 'all', label: 'All Transfers' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function getStatusStyle(status: BranchStockTransferStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'DISPATCHED':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'RECEIVED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function BranchStockTransfersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestIdFilter = searchParams.get('requestId') ?? undefined

  const controller = useDataTable({
    initialSortBy: 'createdAt',
    initialSortOrder: 'DESC',
  })

  const statusTabs = useUrlStatusTabs({
    basePath: BASE_PATH,
    preserveParams: ['requestId'],
  })

  const queryParams = useListQueryParams(controller, statusTabs, { requestId: requestIdFilter })

  const { data, isLoading, isError } = useBranchStockTransfers(queryParams)

  const columns: DataTableColumn<BranchStockTransfer>[] = [
    {
      key: 'transferNumber',
      header: 'Transfer #',
      sortable: true,
      render: (transfer) => (
        <span className="font-mono text-sm font-medium text-gray-800">{transfer.transferNumber}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (transfer) => (
        <span className="text-gray-700">{format(new Date(transfer.createdAt), 'MMM d, yyyy')}</span>
      ),
    },
    {
      key: 'fromBranch.name',
      header: 'From',
      render: (transfer) => (
        <span className="text-gray-700">{formatTransferFromBranchName(transfer.fromBranch)}</span>
      ),
    },
    {
      key: 'toBranch.name',
      header: 'To',
      render: (transfer) => (
        <div>
          <p className="font-medium text-gray-900">{transfer.toBranch?.name ?? '—'}</p>
          {transfer.toBranch?.code && (
            <p className="text-xs text-gray-500">{transfer.toBranch.code}</p>
          )}
        </div>
      ),
    },
    {
      key: 'request.requestNumber',
      header: 'Request',
      render: (transfer) =>
        transfer.request ? (
          <Link
            href={`/dashboard/sales/branch-stock-requests/${transfer.request.id}`}
            className="font-mono text-sm text-green-700 hover:text-green-800 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {transfer.request.requestNumber}
          </Link>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (transfer) => (
        <Badge className={getStatusStyle(transfer.status)}>
          {BRANCH_STOCK_TRANSFER_STATUS_LABELS[transfer.status] ?? transfer.status}
        </Badge>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (transfer) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(Number(transfer.totalAmount))}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      align: 'right',
      render: (transfer) => (
        <span className="tabular-nums text-gray-700">
          {transfer._count?.items ?? transfer.items?.length ?? 0}
        </span>
      ),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="branch-stock-transfer.view">
      <ModuleListShell
        title="Branch Stock Transfers"
        subtitle="Dispatched shipments against approved branch stock requests — confirm receipt at the destination branch to update stock and ledger."
        headerExtra={
          requestIdFilter ? (
            <p className="text-sm text-amber-800">
              Filtered to one request.{' '}
              <Link href={BASE_PATH} className="underline font-medium">
                Clear filter
              </Link>
            </p>
          ) : undefined
        }
        statusTabs={{
          value: statusTabs.value,
          onChange: statusTabs.onChange,
          tabs: STATUS_TABS,
        }}
      >
        <DataTable<BranchStockTransfer>
          columns={columns}
          data={data?.data}
          meta={data?.meta}
          controller={controller}
          rowKey={(transfer) => transfer.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load branch stock transfers."
          searchPlaceholder="Search transfers…"
          pageSizeOptions
          emptyMessage="No branch stock transfers found matching your criteria."
          onRowClick={(transfer) => router.push(`${BASE_PATH}/${transfer.id}`)}
          actions={(transfer) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`${BASE_PATH}/${transfer.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        />
      </ModuleListShell>
    </ProtectedRoute>
  )
}
