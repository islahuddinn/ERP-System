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
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import {
  EMPLOYEE_CASH_TRANSFER_STATUS_LABELS,
  formatTransferEmployeeName,
  useEmployeeCashTransfers,
  type EmployeeCashTransfer,
  type EmployeeCashTransferStatus,
} from '@/hooks/useEmployeeCashTransfers'
import { formatCurrency } from '@/lib/currency'

const BASE_PATH = '/dashboard/sales/employee-cash/transfers'

function statusClass(status: EmployeeCashTransferStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'RECEIVED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function EmployeeCashTransfersPage() {
  const router = useRouter()
  const { hasPermission } = usePermissionCheck()
  const canCreate = hasPermission('employee-cash-transfer.create')

  const controller = useDataTable({
    initialSortBy: 'transferredAt',
    initialSortOrder: 'DESC',
  })

  const { data, isLoading, isError } = useEmployeeCashTransfers(
    controller.queryParams as Record<string, string | number>,
  )

  const columns: DataTableColumn<EmployeeCashTransfer>[] = [
    {
      key: 'transferNumber',
      header: 'Transfer #',
      sortable: true,
      render: (transfer) => (
        <span className="font-mono text-sm font-medium text-gray-800">{transfer.transferNumber}</span>
      ),
    },
    {
      key: 'transferredAt',
      header: 'Date',
      sortable: true,
      render: (transfer) => (
        <span className="text-gray-700">
          {format(new Date(transfer.transferredAt), 'MMM d, yyyy h:mm a')}
        </span>
      ),
    },
    {
      key: 'fromEmployee',
      header: 'From',
      render: (transfer) => (
        <span className="text-gray-800">{formatTransferEmployeeName(transfer.fromEmployee)}</span>
      ),
    },
    {
      key: 'toEmployee',
      header: 'To',
      render: (transfer) => (
        <span className="text-gray-800">{formatTransferEmployeeName(transfer.toEmployee)}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (transfer) => (
        <span className="tabular-nums font-medium text-gray-900">
          {formatCurrency(transfer.amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (transfer) => (
        <Badge variant="outline" className={statusClass(transfer.status)}>
          {EMPLOYEE_CASH_TRANSFER_STATUS_LABELS[transfer.status]}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (transfer) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href={`${BASE_PATH}/${transfer.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="employee-cash-transfer.view">
      <ModuleListShell
        title="Employee Cash Transfers"
        subtitle="Handoffs between employees — ledger updates only after the recipient confirms."
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/sales/employee-cash">Cash Ledger</Link>
            </Button>
            {canCreate && (
              <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                <Link href={`${BASE_PATH}/create`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Transfer
                </Link>
              </Button>
            )}
          </div>
        }
      >
        <DataTable<EmployeeCashTransfer>
          columns={columns}
          data={data?.data}
          meta={data?.meta}
          controller={controller}
          rowKey={(transfer) => transfer.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load cash transfers."
          emptyMessage="No cash transfers yet."
          onRowClick={(transfer) => router.push(`${BASE_PATH}/${transfer.id}`)}
          pageSizeOptions
        />
      </ModuleListShell>
    </ProtectedRoute>
  )
}
