'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, MoreHorizontal, Gift } from 'lucide-react'
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
  useDeleteProductBonusGroup,
  useProductBonusGroups,
  type ProductBonusGroup,
} from '@/hooks/useProductBonusGroups'
import { ProductBonusGroupFormDialog } from '@/components/sales/product-bonus-groups/product-bonus-group-form-dialog'
import { StatusPill } from '@/components/sales/territory/status-pill'

export default function ProductBonusGroupsPage() {
  const controller = useDataTable({ initialSortBy: 'name', initialSortOrder: 'ASC' })
  const { data, isLoading, isError } = useProductBonusGroups(
    controller.queryParams as Record<string, string | number>,
  )
  const deleteMutation = useDeleteProductBonusGroup()
  const { hasPermission } = usePermissionCheck()
  const canManage = hasPermission('product-bonus-group.manage')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProductBonusGroup | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductBonusGroup | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (group: ProductBonusGroup) => {
    setEditing(group)
    setFormOpen(true)
  }

  const filters: DataTableFilter<ProductBonusGroup>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
      ],
    },
  ]

  const columns: DataTableColumn<ProductBonusGroup>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (group) => <span className="font-mono text-sm text-gray-700">{group.code}</span>,
    },
    {
      key: 'name',
      header: 'Group',
      sortable: true,
      render: (group) => <span className="font-medium text-gray-900">{group.name}</span>,
    },
    {
      key: 'productCount',
      header: 'Products',
      sortable: false,
      render: (group) => (
        <span className="tabular-nums text-gray-700">{group.productCount ?? 0}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (group) => <StatusPill status={group.status} />,
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      render: (group) => (
        <span className="text-gray-600 tabular-nums">
          {new Date(group.updatedAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            sortable: false,
            className: 'w-12',
            render: (group: ProductBonusGroup) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(group)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => setDeleteTarget(group)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } as DataTableColumn<ProductBonusGroup>,
        ]
      : []),
  ]

  return (
    <ProtectedRoute requiredPermission="product-bonus-group.view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Gift className="h-7 w-7 text-green-600" />
              Product Bonus Groups
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Master data for grouping products that will share bonus schemes. Does not affect orders or pricing yet.
            </p>
          </div>
          {canManage && (
            <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Bonus Group
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
              filters={filters}
              searchPlaceholder="Search by code or name…"
              emptyMessage="No product bonus groups yet."
            />
          </CardContent>
        </Card>

        <ProductBonusGroupFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          productBonusGroup={editing}
        />

        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete product bonus group?"
          description={
            deleteTarget
              ? `Delete "${deleteTarget.name}"? This removes the group only — products and existing orders are not affected.`
              : ''
          }
          confirmLabel="Delete"
          confirmVariant="destructive"
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
