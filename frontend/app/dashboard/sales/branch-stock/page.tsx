'use client'

import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleListShell } from '@/components/ui/module-list-shell'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import {
  useBranchStock,
  type BranchStockBalance,
} from '@/hooks/useBranchStock'

export default function BranchStockPage() {
  const controller = useDataTable({ initialLimit: 20 })

  const { data, isLoading, isError } = useBranchStock(
    controller.queryParams as Record<string, string | number>,
  )

  const columns: DataTableColumn<BranchStockBalance>[] = [
    {
      key: 'branch',
      header: 'Branch',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.branch.name}</p>
          <p className="text-xs text-gray-500">{row.branch.code}</p>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.product.name}</p>
          <p className="text-xs text-gray-500">{row.product.code}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-medium text-gray-900">{row.quantity}</span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (row) => (
        <span className="text-gray-700">
          {row.updatedAt ? format(new Date(row.updatedAt), 'MMM d, yyyy h:mm a') : '—'}
        </span>
      ),
    },
  ]

  return (
    <ProtectedRoute
      requiredPermissions={['branch-stock.view', 'branch-stock-operations.view', 'branch-stock-operations.manage']}
      requireAll={false}
    >
      <ModuleListShell
        title="Branch Stock"
        subtitle="Current on-hand quantities per product for your visible branches."
        headerExtra={
          <Button
            variant="outline"
            className="hidden md:inline-flex"
            onClick={() => controller.resetFilters()}
          >
            Reset
          </Button>
        }
      >
        <DataTable<BranchStockBalance>
          columns={columns}
          data={data?.data}
          meta={data?.meta}
          controller={controller}
          rowKey={(row) => row.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load branch stock."
          searchable={false}
          pageSizeOptions
          emptyMessage="No branch stock found."
          onRowClick={() => {}}
        />
      </ModuleListShell>
    </ProtectedRoute>
  )
}
