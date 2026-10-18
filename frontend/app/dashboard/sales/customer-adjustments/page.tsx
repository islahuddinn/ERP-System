'use client'

import { useRouter, useSearchParams } from 'next/navigation'
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
  useCustomerLedgerAdjustments,
  CUSTOMER_LEDGER_ADJUSTMENT_TYPE_LABELS,
  type CustomerLedgerAdjustment,
  type CustomerLedgerAdjustmentFilters,
  type CustomerLedgerAdjustmentType,
} from '@/hooks/useCustomerLedgerAdjustments'
import { formatCurrency } from '@/lib/currency'

const BASE_PATH = '/dashboard/sales/customer-adjustments'

const TYPE_TABS = [
  { value: 'all', label: 'All Notes' },
  { value: 'CREDIT_NOTE', label: 'Credit Notes' },
  { value: 'DEBIT_NOTE', label: 'Debit Notes' },
]

function typeBadgeClass(type: CustomerLedgerAdjustmentType) {
  return type === 'CREDIT_NOTE'
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-red-100 text-red-800 border-red-200'
}

export default function CustomerAdjustmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const customerIdFilter = searchParams.get('customerId') ?? undefined
  const { hasPermission } = usePermissionCheck()
  const canCreate = hasPermission('customer-ledger-adjustment.create')

  const controller = useDataTable({
    initialSortBy: 'adjustedAt',
    initialSortOrder: 'DESC',
  })

  const typeTabs = useUrlStatusTabs({
    basePath: BASE_PATH,
    paramName: 'type',
    preserveParams: ['customerId'],
  })

  const queryParams = useListQueryParams(controller, typeTabs, {
    customerId: customerIdFilter,
  })

  const { data: adjustments, isLoading, isError, isFetching } = useCustomerLedgerAdjustments(
    queryParams as CustomerLedgerAdjustmentFilters,
  )
  const adjustmentRows = adjustments?.data ?? []
  const adjustmentMeta = adjustments?.meta

  const columns: DataTableColumn<CustomerLedgerAdjustment>[] = [
    {
      key: 'adjustmentNumber',
      header: 'Note #',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm font-medium text-gray-800">{row.adjustmentNumber}</span>
      ),
    },
    {
      key: 'adjustedAt',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-gray-700">{format(new Date(row.adjustedAt), 'MMM d, yyyy h:mm a')}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <Badge variant="outline" className={typeBadgeClass(row.type)}>
          {CUSTOMER_LEDGER_ADJUSTMENT_TYPE_LABELS[row.type]}
        </Badge>
      ),
    },
    {
      key: 'customer.shopName',
      header: 'Shop',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.customer?.shopName ?? '—'}</p>
          {row.customer?.code && <p className="text-xs text-gray-500">{row.customer.code}</p>}
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => <span className="text-gray-700 line-clamp-1">{row.reason}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums font-medium text-gray-900">{formatCurrency(Number(row.amount))}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href={`${BASE_PATH}/${row.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="customer-ledger-adjustment.view">
      <ModuleListShell
        title="Shop Credit / Debit Notes"
        subtitle="Finance corrections to a shop's distribution ledger — posts immediately as ADJUSTMENT entries."
        action={
          canCreate ? (
            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
              <Link href={`${BASE_PATH}/create`}>
                <Plus className="mr-2 h-4 w-4" />
                Post Note
              </Link>
            </Button>
          ) : undefined
        }
        statusTabs={{
          value: typeTabs.value,
          onChange: typeTabs.onChange,
          tabs: TYPE_TABS,
        }}
      >
        <DataTable<CustomerLedgerAdjustment>
          columns={columns}
          data={adjustmentRows}
          meta={adjustmentMeta}
          controller={controller}
          rowKey={(row) => row.id}
          isLoading={isLoading && adjustmentRows.length === 0}
          isError={isError && !isFetching && adjustmentRows.length === 0}
          errorMessage="Failed to load credit/debit notes."
          searchPlaceholder="Search note # or reason…"
          emptyMessage="No credit or debit notes yet."
          onRowClick={(row) => router.push(`${BASE_PATH}/${row.id}`)}
          pageSizeOptions
        />
      </ModuleListShell>
    </ProtectedRoute>
  )
}
