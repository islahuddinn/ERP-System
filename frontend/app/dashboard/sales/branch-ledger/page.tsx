'use client'

import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleStatusTabs } from '@/components/ui/module-status-tabs'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useUrlStatusTabs, useListQueryParams } from '@/hooks/useUrlStatusTabs'
import {
  useBranchLedger,
  useBranchLedgerSummary,
  BRANCH_LEDGER_ENTRY_TYPE_LABELS,
  type BranchLedgerEntry,
  type BranchLedgerEntryType,
} from '@/hooks/useBranchLedger'
import { formatCurrency } from '@/lib/currency'

const BASE_PATH = '/dashboard/sales/branch-ledger'

const TYPE_TABS = [
  { value: 'all', label: 'All Entries' },
  { value: 'STOCK_RECEIVED', label: 'Stock Received' },
  { value: 'PAYMENT', label: 'Payments' },
  { value: 'STOCK_RETURNED', label: 'Stock Returned' },
]

function getLedgerEntryTypeStyle(type: BranchLedgerEntryType) {
  switch (type) {
    case 'STOCK_RECEIVED':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'PAYMENT':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'STOCK_RETURNED':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function BranchLedgerPage() {
  const controller = useDataTable({ initialLimit: 20 })

  const typeTabs = useUrlStatusTabs({
    basePath: BASE_PATH,
    paramName: 'type',
  })

  const queryParams = useListQueryParams(controller, typeTabs)

  const { data, isLoading, isError } = useBranchLedger(queryParams)

  const { data: summary, isLoading: isLoadingSummary, isError: isSummaryError } = useBranchLedgerSummary()

  const columns: DataTableColumn<BranchLedgerEntry>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (entry) => (
        <span className="text-gray-700">
          {entry.date ? format(new Date(entry.date), 'MMM d, yyyy h:mm a') : '—'}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (entry) => (
        <Badge className={getLedgerEntryTypeStyle(entry.type)}>
          {BRANCH_LEDGER_ENTRY_TYPE_LABELS[entry.type] ?? entry.type}
        </Badge>
      ),
    },
    {
      key: 'branch',
      header: 'Counterparties',
      render: (entry) => (
        <div>
          <p className="font-medium text-gray-900">
            {entry.counterparty ? entry.counterparty.name : 'Factory'}{' '}
          </p>
          <p className="text-xs text-gray-500">
            {entry.branch.code} → {entry.counterparty ? entry.counterparty.code : 'FACTORY'}
          </p>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (entry) => <span className="text-gray-800">{entry.description}</span>,
    },
    {
      key: 'debit',
      header: 'Debit',
      align: 'right',
      render: (entry) => (
        <span className="tabular-nums text-red-700">
          {entry.debit > 0 ? formatCurrency(Number(entry.debit)) : '—'}
        </span>
      ),
    },
    {
      key: 'credit',
      header: 'Credit',
      align: 'right',
      render: (entry) => (
        <span className="tabular-nums text-green-700">
          {entry.credit > 0 ? formatCurrency(Number(entry.credit)) : '—'}
        </span>
      ),
    },
  ]

  return (
    <ProtectedRoute
      requiredPermissions={[
        'branch-ledger.view',
        'branch-stock-operations.view',
        'branch-stock-operations.manage',
      ]}
      requireAll={false}
    >
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Branch Ledger</h2>
          <p className="text-gray-500">Outstanding branch charges and credits for visible branches.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Owed to Parent</p>
              <p className="text-2xl font-bold text-amber-700">
                {formatCurrency(Number(summary?.owedToParent ?? 0))}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Owed from Children</p>
              <p className="text-2xl font-bold text-amber-700">
                {formatCurrency(Number(summary?.owedFromChildren ?? 0))}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Profit / Loss</p>
              <p
                className={`text-2xl font-bold ${
                  Number(summary?.profitLoss ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {formatCurrency(Number(summary?.profitLoss ?? 0))}
              </p>
            </CardContent>
          </Card>
        </div>

        {isLoadingSummary && <p className="text-gray-500 text-sm">Loading summary…</p>}
        {isSummaryError && (
          <p className="text-red-600 text-sm">Failed to load branch ledger summary.</p>
        )}

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <ModuleStatusTabs
              value={typeTabs.value}
              onChange={typeTabs.onChange}
              tabs={TYPE_TABS}
            />
          </CardHeader>
          <CardContent className="pt-0">
            <DataTable<BranchLedgerEntry>
              columns={columns}
              data={data?.data}
              meta={data?.meta}
              controller={controller}
              rowKey={(entry) => entry.id}
              isLoading={isLoading}
              isError={isError}
              errorMessage="Failed to load branch ledger entries."
              searchable={false}
              pageSizeOptions
              emptyMessage="No ledger entries found matching your criteria."
              onRowClick={() => {}}
            />
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
