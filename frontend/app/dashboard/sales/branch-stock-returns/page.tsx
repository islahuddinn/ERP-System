'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
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
  useBranchStockReturns,
  formatBranchStockReturnEmployeeName,
  formatReceivingBranchName,
  BRANCH_STOCK_RETURN_STATUS_LABELS,
  type BranchStockReturn,
  type BranchStockReturnStatus,
} from '@/hooks/useBranchStockReturns'
import { formatCurrency } from '@/lib/currency'

const BASE_PATH = '/dashboard/sales/branch-stock-returns'

const STATUS_TABS = [
  { value: 'all', label: 'All Returns' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

function getStatusStyle(status: BranchStockReturnStatus) {
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

export default function BranchStockReturnsPage() {
  const router = useRouter()
  const { hasPermission } = usePermissionCheck()
  const canCreate = hasPermission('branch-stock-return.create')

  const controller = useDataTable({
    initialSortBy: 'requestDate',
    initialSortOrder: 'DESC',
  })

  const statusTabs = useUrlStatusTabs({ basePath: BASE_PATH })

  const queryParams = useListQueryParams(controller, statusTabs)

  const { data, isLoading, isError } = useBranchStockReturns(queryParams)

  const columns: DataTableColumn<BranchStockReturn>[] = [
    {
      key: 'returnNumber',
      header: 'Return #',
      sortable: true,
      render: (stockReturn) => (
        <span className="font-mono text-sm font-medium text-gray-800">
          {stockReturn.returnNumber}
        </span>
      ),
    },
    {
      key: 'requestDate',
      header: 'Date',
      sortable: true,
      render: (stockReturn) => (
        <span className="text-gray-700">
          {format(new Date(stockReturn.requestDate), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      key: 'transfer.transferNumber',
      header: 'Transfer',
      render: (stockReturn) =>
        stockReturn.transfer ? (
          <Link
            href={`/dashboard/sales/branch-stock-transfers/${stockReturn.transfer.id}`}
            className="font-mono text-sm text-green-700 hover:text-green-800 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {stockReturn.transfer.transferNumber}
          </Link>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'returningBranch.name',
      header: 'Returning Branch',
      render: (stockReturn) => (
        <div>
          <p className="font-medium text-gray-900">{stockReturn.returningBranch?.name ?? '—'}</p>
          {stockReturn.returningBranch?.code && (
            <p className="text-xs text-gray-500">{stockReturn.returningBranch.code}</p>
          )}
        </div>
      ),
    },
    {
      key: 'receivingBranch.name',
      header: 'Receiving Branch',
      render: (stockReturn) => (
        <span className="text-gray-700">
          {formatReceivingBranchName(stockReturn.receivingBranch)}
        </span>
      ),
    },
    {
      key: 'requestedBy',
      header: 'Requested By',
      render: (stockReturn) => (
        <span className="text-gray-700">
          {formatBranchStockReturnEmployeeName(stockReturn.requestedBy)}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (stockReturn) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(Number(stockReturn.totalAmount))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (stockReturn) => (
        <Badge className={getStatusStyle(stockReturn.status)}>
          {BRANCH_STOCK_RETURN_STATUS_LABELS[stockReturn.status] ?? stockReturn.status}
        </Badge>
      ),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="branch-stock-return.view">
      <ModuleListShell
        title="Branch Stock Returns"
        subtitle="Return stock from a branch back to where it came from — against received transfers only. Pending returns require approval before stock and ledger are updated."
        action={
          canCreate ? (
            <Button
              onClick={() => router.push(`${BASE_PATH}/create`)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Return
            </Button>
          ) : undefined
        }
        statusTabs={{
          value: statusTabs.value,
          onChange: statusTabs.onChange,
          tabs: STATUS_TABS,
        }}
      >
        <DataTable<BranchStockReturn>
          columns={columns}
          data={data?.data}
          meta={data?.meta}
          controller={controller}
          rowKey={(stockReturn) => stockReturn.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load branch stock returns."
          searchPlaceholder="Search returns…"
          pageSizeOptions
          emptyMessage="No branch stock returns found matching your criteria."
          onRowClick={(stockReturn) => router.push(`${BASE_PATH}/${stockReturn.id}`)}
          actions={(stockReturn) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`${BASE_PATH}/${stockReturn.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        />
      </ModuleListShell>
    </ProtectedRoute>
  )
}
