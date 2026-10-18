'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, MoreHorizontal, BadgePercent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useDataTable } from '@/hooks/useDataTable'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import {
  useDeleteProductBonusScheme,
  useProductBonusSchemes,
  type ProductBonusScheme,
} from '@/hooks/useProductBonusSchemes'
import { ProductBonusSchemeFormDialog } from '@/components/sales/product-bonus-schemes/product-bonus-scheme-form-dialog'
import { StatusPill } from '@/components/sales/territory/status-pill'

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function ProductBonusSchemesPage() {
  const controller = useDataTable({ initialSortBy: 'validFrom', initialSortOrder: 'DESC' })
  const { data, isLoading, isError } = useProductBonusSchemes(
    controller.queryParams as Record<string, string | number>,
  )
  const deleteMutation = useDeleteProductBonusScheme()
  const { hasPermission } = usePermissionCheck()
  const canManage = hasPermission('product-bonus-scheme.manage')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProductBonusScheme | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductBonusScheme | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (scheme: ProductBonusScheme) => {
    setEditing(scheme)
    setFormOpen(true)
  }

  const filters: DataTableFilter<ProductBonusScheme>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
      ],
    },
  ]

  const columns: DataTableColumn<ProductBonusScheme>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (scheme) => <span className="font-mono text-sm text-gray-700">{scheme.code}</span>,
    },
    {
      key: 'name',
      header: 'Scheme',
      sortable: true,
      render: (scheme) => <span className="font-medium text-gray-900">{scheme.name}</span>,
    },
    {
      key: 'productBonusGroup',
      header: 'Bonus Group',
      sortable: false,
      render: (scheme) => (
        <span className="text-gray-700">
          {scheme.productBonusGroup?.name ?? '—'}
          {scheme.productBonusGroup?.code ? (
            <span className="ml-1 text-xs text-gray-500">({scheme.productBonusGroup.code})</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'minPurchaseQty',
      header: 'Buy / Get',
      sortable: false,
      render: (scheme) => (
        <span className="tabular-nums text-gray-700">
          {scheme.minPurchaseQty} / {scheme.bonusQty}
        </span>
      ),
    },
    {
      key: 'validFrom',
      header: 'Valid',
      sortable: true,
      render: (scheme) => (
        <span className="text-gray-600 tabular-nums text-sm">
          {formatDate(scheme.validFrom)}
          {scheme.validTo ? ` → ${formatDate(scheme.validTo)}` : ' → open'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (scheme) => <StatusPill status={scheme.status} />,
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            sortable: false,
            className: 'w-12',
            render: (scheme: ProductBonusScheme) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(scheme)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => setDeleteTarget(scheme)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } as DataTableColumn<ProductBonusScheme>,
        ]
      : []),
  ]

  return (
    <ProtectedRoute requiredPermission="product-bonus-scheme.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BadgePercent className="h-7 w-7 text-green-600" />
              Product Bonus Schemes
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Quantity bonus rules linked to product bonus groups. Master data only — order booking is not affected yet.
            </p>
          </div>
          {canManage && (
            <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Bonus Scheme
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            <DataTable
              columns={columns}
              data={data?.data ?? []}
              meta={data?.meta}
              isLoading={isLoading}
              isError={isError}
              controller={controller}
              rowKey={(scheme) => scheme.id}
              filters={filters}
              searchPlaceholder="Search by code or name…"
              emptyMessage="No product bonus schemes yet. Create a bonus group first, then add a scheme."
            />
          </CardContent>
        </Card>

        <ProductBonusSchemeFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          productBonusScheme={editing}
        />

        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete product bonus scheme?"
          description={
            deleteTarget
              ? `Delete "${deleteTarget.name}"? This removes the scheme only — orders and stock are not affected.`
              : ''
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            if (!deleteTarget) return
            await deleteMutation.mutateAsync(deleteTarget.id)
            setDeleteTarget(null)
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </ProtectedRoute>
  )
}
