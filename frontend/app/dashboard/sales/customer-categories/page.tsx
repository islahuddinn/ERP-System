'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, MoreHorizontal, Tags } from 'lucide-react'
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
  useCustomerCategories,
  useDeleteCustomerCategory,
  type CustomerCategory,
} from '@/hooks/useCustomerCategories'
import { CustomerCategoryFormDialog } from '@/components/sales/customer-categories/customer-category-form-dialog'
import { StatusPill } from '@/components/sales/territory/status-pill'

export default function CustomerCategoriesPage() {
  const controller = useDataTable({ initialSortBy: 'name', initialSortOrder: 'ASC' })
  const { data, isLoading, isError } = useCustomerCategories(
    controller.queryParams as Record<string, string | number>,
  )
  const deleteMutation = useDeleteCustomerCategory()
  const { hasPermission } = usePermissionCheck()
  const canManage = hasPermission('customer-category.manage')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CustomerCategory | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (category: CustomerCategory) => {
    setEditing(category)
    setFormOpen(true)
  }

  const filters: DataTableFilter<CustomerCategory>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
      ],
    },
  ]

  const columns: DataTableColumn<CustomerCategory>[] = [
    {
      key: 'name',
      header: 'Category',
      sortable: true,
      render: (category) => <span className="font-medium text-gray-900">{category.name}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (category) => <StatusPill status={category.status} />,
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      render: (category) => (
        <span className="text-gray-600 tabular-nums">
          {new Date(category.updatedAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="customer-category.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Tags className="h-8 w-8 text-green-600" />
              Customer Categories
            </h1>
            <p className="text-gray-600 mt-1">
              Manage shop categories used when creating customers in territory and customer forms.
            </p>
          </div>
          {canManage && (
            <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              New Category
            </Button>
          )}
        </div>

        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <DataTable<CustomerCategory>
              columns={columns}
              data={data?.data}
              meta={data?.meta}
              controller={controller}
              rowKey={(category) => category.id}
              isLoading={isLoading}
              isError={isError}
              errorMessage="Failed to load customer categories."
              searchable
              searchPlaceholder="Search categories…"
              filters={filters}
              pageSizeOptions
              emptyMessage="No customer categories yet. Create one before registering shops."
              toolbarRight={
                canManage ? (
                  <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white md:hidden">
                    <Plus className="mr-2 h-4 w-4" />
                    New
                  </Button>
                ) : undefined
              }
              actions={(category) =>
                canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(category)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setDeleteTarget(category)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : undefined
              }
            />
          </CardContent>
        </Card>

        <CustomerCategoryFormDialog open={formOpen} onOpenChange={setFormOpen} customerCategory={editing} />

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete customer category?"
          description={
            deleteTarget
              ? `Delete "${deleteTarget.name}"? Categories linked to customers cannot be removed.`
              : ''
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            if (!deleteTarget) return
            try {
              await deleteMutation.mutateAsync(deleteTarget.id)
            } catch {
              /* toast handled in hook */
            }
            setDeleteTarget(null)
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </ProtectedRoute>
  )
}
