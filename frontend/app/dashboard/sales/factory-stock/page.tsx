'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleListShell } from '@/components/ui/module-list-shell'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import { useFactoryStock, type FactoryStockBalance } from '@/hooks/useFactoryStock'
import { FactoryStockInDialog } from '@/components/sales/factory-stock/factory-stock-in-dialog'
import { FactoryStockAdjustDialog } from '@/components/sales/factory-stock/factory-stock-adjust-dialog'

export default function FactoryStockPage() {
  const controller = useDataTable({ initialLimit: 20, initialSortBy: 'updatedAt', initialSortOrder: 'DESC' })
  const { hasPermission } = usePermissionCheck()
  const canManage = hasPermission('factory-stock.manage')

  const [stockInOpen, setStockInOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<FactoryStockBalance | null>(null)

  const { data, isLoading, isError } = useFactoryStock(
    controller.queryParams as Record<string, string | number>,
  )

  const columns: DataTableColumn<FactoryStockBalance>[] = [
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
      sortable: true,
      render: (row) => (
        <span className="tabular-nums font-semibold text-gray-900">{row.quantity}</span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      render: (row) => (
        <span className="text-gray-700">
          {row.updatedAt ? format(new Date(row.updatedAt), 'MMM d, yyyy h:mm a') : '—'}
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (row: FactoryStockBalance) => (
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation()
                  setAdjustTarget(row)
                }}
              >
                <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
                Adjust
              </Button>
            ),
          },
        ]
      : []),
  ]

  return (
    <ProtectedRoute
      requiredPermissions={['factory-stock.view', 'factory-stock.manage']}
      requireAll={false}
    >
      <ModuleListShell
        title="Factory Stock"
        subtitle="Distribution stock pool at the factory — ship to primary branches via Branch Stock Requests. Separate from warehouse inventory."
        action={
          canManage ? (
            <Button
              onClick={() => setStockInOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Stock In
            </Button>
          ) : undefined
        }
      >
        <DataTable<FactoryStockBalance>
          columns={columns}
          data={data?.data}
          meta={data?.meta}
          controller={controller}
          rowKey={(row) => row.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load factory stock."
          searchPlaceholder="Search products…"
          pageSizeOptions
          emptyMessage="No factory stock yet. Use Stock In to add products to the distribution pool."
          onRowClick={() => {}}
        />
      </ModuleListShell>

      <FactoryStockInDialog open={stockInOpen} onOpenChange={setStockInOpen} />
      <FactoryStockAdjustDialog
        open={Boolean(adjustTarget)}
        onOpenChange={(open) => {
          if (!open) setAdjustTarget(null)
        }}
        balance={adjustTarget}
      />
    </ProtectedRoute>
  )
}
