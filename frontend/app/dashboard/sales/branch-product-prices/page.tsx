'use client'

import { useMemo, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleListShell } from '@/components/ui/module-list-shell'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import { useCurrentUser } from '@/hooks/useUsers'
import { useBranches } from '@/hooks/useBranches'
import { useBranchProductPrices, type BranchProductPriceEntry } from '@/hooks/useBranchProductPrices'

type BranchProductPriceScope = 'factory' | 'mine'
import { SetBranchProductPriceDialog } from '@/components/sales/branch-product-prices/set-branch-product-price-dialog'
import { formatCurrency } from '@/lib/currency'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function BranchProductPricesPage() {
  const { hasPermission } = usePermissionCheck()
  const { data: currentUser } = useCurrentUser()
  const { data: branchesResponse } = useBranches({ limit: 100 })

  const canManageFactory = hasPermission('branch-product-price.manage-factory')
  const canManageMine =
    hasPermission('branch-product-price.manage') ||
    hasPermission('branch-stock-operations.manage')

  const myBranchId = useMemo(() => {
    if (!currentUser?.id) return undefined
    return branchesResponse?.data?.find(
      (branch) => branch.distributor?.user?.id === currentUser.id,
    )?.id
  }, [branchesResponse?.data, currentUser?.id])

  const [scope, setScope] = useState<BranchProductPriceScope>(
    canManageFactory ? 'factory' : 'mine',
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<BranchProductPriceEntry | null>(null)

  const controller = useDataTable({ initialLimit: 20, initialSortOrder: 'ASC' })

  const apiFilters = {
    ...(controller.queryParams as Record<string, string | number>),
    ...(scope === 'mine' && myBranchId ? { sellerBranchId: myBranchId } : {}),
  }

  const { data, isLoading, isError } = useBranchProductPrices(
    scope === 'mine' && !myBranchId ? {} : apiFilters,
  )

  const canManageCurrentScope = scope === 'factory' ? canManageFactory : canManageMine && !!myBranchId

  const openCreate = () => {
    setEditingEntry(null)
    setDialogOpen(true)
  }

  const openEdit = (entry: BranchProductPriceEntry) => {
    setEditingEntry(entry)
    setDialogOpen(true)
  }

  const columns: DataTableColumn<BranchProductPriceEntry>[] = [
    {
      key: 'productName',
      header: 'Product',
      render: (entry) => (
        <div>
          <p className="font-medium text-gray-900">{entry.product.name}</p>
          <p className="text-xs text-gray-500">{entry.product.code}</p>
        </div>
      ),
    },
    {
      key: 'seller',
      header: 'Seller',
      render: (entry) => (
        <span className="text-gray-700">
          {entry.sellerBranch ? `${entry.sellerBranch.name} (${entry.sellerBranch.code})` : 'Factory'}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      render: (entry) => (
        <span className="tabular-nums font-medium text-gray-900">{formatCurrency(entry.price)}</span>
      ),
    },
    ...(canManageCurrentScope
      ? [
          {
            key: 'edit',
            header: '',
            align: 'right' as const,
            render: (entry: BranchProductPriceEntry) => (
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
    <ProtectedRoute
      requiredPermissions={[
        'branch-product-price.view',
        'branch-stock-operations.view',
        'branch-stock-operations.manage',
      ]}
      requireAll={false}
    >
      <ModuleListShell
        title="Branch Product Prices"
        subtitle="Per-seller prices for FREE_PRICE mode. In FIXED_PRICE mode, use Trade Price Lists instead."
        action={
          canManageCurrentScope ? (
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
        {(canManageFactory || (canManageMine && myBranchId)) && (
          <div className="mb-4 max-w-xs">
            <label className="text-sm font-medium text-gray-700 block mb-1">Price list</label>
            <Select
              value={scope}
              onValueChange={(value) => setScope(value as BranchProductPriceScope)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canManageFactory && <SelectItem value="factory">Factory prices</SelectItem>}
                {canManageMine && myBranchId && (
                  <SelectItem value="mine">My branch prices</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {scope === 'mine' && !myBranchId && (
          <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            You are not linked as a branch distributor — only factory prices can be managed here.
          </p>
        )}

        <DataTable<BranchProductPriceEntry>
          columns={columns}
          data={data?.data}
          meta={data?.meta}
          controller={controller}
          rowKey={(entry) => entry.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load branch product prices."
          searchPlaceholder="Search products…"
          pageSizeOptions
          emptyMessage={
            scope === 'factory'
              ? 'No factory prices set yet.'
              : 'No branch prices set yet for your branch.'
          }
          onRowClick={canManageCurrentScope ? openEdit : undefined}
        />
      </ModuleListShell>

      <SetBranchProductPriceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        scope={scope}
        entry={editingEntry}
      />
    </ProtectedRoute>
  )
}
