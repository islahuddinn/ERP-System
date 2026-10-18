'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import { useProductGroups, useDeleteProductGroup, type ProductGroup } from '@/hooks/useProductGroups'
import { ProductGroupFormDialog } from './product-group-form-dialog'
import { StatusPill } from './status-pill'

export function ProductGroupsTab() {
  const controller = useDataTable({ initialSortBy: 'name', initialSortOrder: 'ASC' })
  const { data, isLoading, isError } = useProductGroups(controller.queryParams as Record<string, string | number>)
  const deleteMutation = useDeleteProductGroup()
  const { hasPermission } = usePermissionCheck()
  const canManage = hasPermission('product-group.manage')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProductGroup | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductGroup | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (pg: ProductGroup) => {
    setEditing(pg)
    setFormOpen(true)
  }

  const filters: DataTableFilter<ProductGroup>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
      ],
    },
  ]

  const columns: DataTableColumn<ProductGroup>[] = [
    {
      key: 'name',
      header: 'Product Group',
      sortable: true,
      render: (pg) => <span className="font-medium text-gray-900">{pg.name}</span>,
    },
    { key: 'status', header: 'Status', sortable: true, render: (pg) => <StatusPill status={pg.status} /> },
  ]

  return (
    <>
      <DataTable<ProductGroup>
        columns={columns}
        data={data?.data}
        meta={data?.meta}
        controller={controller}
        rowKey={(pg) => pg.id}
        isLoading={isLoading}
        isError={isError}
        searchable
        searchPlaceholder="Search product groups…"
        filters={filters}
        pageSizeOptions
        emptyMessage="No product groups yet. Create one — branches stock product groups."
        toolbarRight={
          canManage ? (
            <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> New Product Group
            </Button>
          ) : undefined
        }
        actions={(pg) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canManage && (
                <DropdownMenuItem onClick={() => openEdit(pg)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(pg)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <ProductGroupFormDialog open={formOpen} onOpenChange={setFormOpen} productGroup={editing} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete product group?"
        description={`This deletes "${deleteTarget?.name}". It will be blocked if any product still uses this group.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            await deleteMutation.mutateAsync(deleteTarget.id)
          } catch {
            /* error toast handled in the hook */
          }
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
