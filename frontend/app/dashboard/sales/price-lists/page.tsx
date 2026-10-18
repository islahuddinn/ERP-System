'use client'

import { useState } from 'react'
import { Plus, Pencil, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleListShell } from '@/components/ui/module-list-shell'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import { usePriceLists, type ProductPriceListEntry } from '@/hooks/usePriceLists'
import { SetPriceDialog, PriceCell } from '@/components/sales/price-lists/set-price-dialog'

export default function PriceListsPage() {
  const controller = useDataTable({ initialLimit: 20, initialSortBy: 'productName', initialSortOrder: 'ASC' })
  const { hasPermission } = usePermissionCheck()
  const canManage = hasPermission('price-list.manage')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ProductPriceListEntry | null>(null)

  const { data, isLoading, isError } = usePriceLists(
    controller.queryParams as Record<string, string | number>,
  )

  const openCreate = () => {
    setEditingEntry(null)
    setDialogOpen(true)
  }

  const openEdit = (entry: ProductPriceListEntry) => {
    setEditingEntry(entry)
    setDialogOpen(true)
  }

  const columns: DataTableColumn<ProductPriceListEntry>[] = [
    {
      key: 'productName',
      header: 'Product',
      sortable: true,
      render: (entry) => (
        <div>
          <p className="font-medium text-gray-900">{entry.productName}</p>
          <p className="text-xs text-gray-500">{entry.productCode}</p>
        </div>
      ),
    },
    {
      key: 'factoryPrice',
      header: 'Factory',
      align: 'right',
      render: (entry) => <PriceCell value={entry.prices.factoryPrice} />,
    },
    {
      key: 'distributorPrice',
      header: 'Distributor',
      align: 'right',
      render: (entry) => <PriceCell value={entry.prices.distributorPrice} />,
    },
    {
      key: 'tradePrice',
      header: 'Trade',
      align: 'right',
      render: (entry) => <PriceCell value={entry.prices.tradePrice} />,
    },
    {
      key: 'mrp',
      header: 'MRP',
      align: 'right',
      render: (entry) => <PriceCell value={entry.prices.mrp} />,
    },
    ...(canManage
      ? [
          {
            key: 'edit',
            header: '',
            align: 'right' as const,
            render: (entry: ProductPriceListEntry) => (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(event) => {
                  event.stopPropagation()
                  openEdit(entry)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ),
          },
        ]
      : []),
  ]

  return (
    <ProtectedRoute requiredPermission="price-list.view">
      <ModuleListShell
        title="Trade Price Lists"
        subtitle="Four company-wide price tiers — required before booking shop orders or branch stock requests in FIXED_PRICE mode."
        action={
          canManage ? (
            <Button
              onClick={openCreate}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Set Price
            </Button>
          ) : undefined
        }
      >
        <DataTable<ProductPriceListEntry>
          columns={columns}
          data={data?.data}
          meta={data?.meta}
          controller={controller}
          rowKey={(entry) => entry.productId}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load price lists."
          searchPlaceholder="Search products…"
          pageSizeOptions
          emptyMessage="No products with prices yet. Set at least Trade Price for each product you plan to sell."
          onRowClick={canManage ? openEdit : undefined}
        />
      </ModuleListShell>

      <SetPriceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editingEntry}
      />
    </ProtectedRoute>
  )
}
