'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  MoreVertical,
  Truck,
  Edit,
  Trash2,
  FileText,
  Mail,
  Phone,
  Power,
  PowerOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useSuppliers, useDeleteSupplier, useToggleSupplierActive, type Supplier } from '@/hooks/useSuppliers'

export default function SuppliersPage() {
  const router = useRouter()
  const controller = useDataTable()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Server-side: search / sort / pagination / isActive filter go to the backend.
  const { data, isLoading, isError } = useSuppliers({ ...(controller.queryParams as any) })
  const deleteMutation = useDeleteSupplier()
  const toggleActiveMutation = useToggleSupplierActive()

  const suppliers = data?.data ?? []
  const meta = data?.meta

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  // Backend supports ?isActive=true|false (SupplierQueryDto) — static status filter.
  const filters: DataTableFilter<Supplier>[] = [
    {
      key: 'isActive',
      label: 'Status',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' },
      ],
    },
  ]

  const columns: DataTableColumn<Supplier>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (s) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Truck className="h-4 w-4 text-gray-400" />
          {s.name}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      align: 'center',
      sortable: true,
      sortKey: 'isActive',
      // Status is display-only here; Activate/Deactivate lives in the row's ⋮ Actions
      // menu (wired to PATCH /suppliers/:id/toggle-active via useToggleSupplierActive).
      render: (s) => (
        <div className="flex items-center justify-center">
          <Badge variant={s.isActive ? 'default' : 'secondary'}>
            {s.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      sortable: true,
      sortKey: 'email',
      render: (s) => (
        <div className="flex flex-col text-sm text-gray-600">
          {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email}</span>}
          {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</span>}
          {!s.email && !s.phone && <span className="text-gray-400">—</span>}
        </div>
      ),
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Suppliers</h2>
          <p className="text-gray-500">Manage vendor relationships and accounts.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/suppliers/create')}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Supplier>
            columns={columns}
            data={suppliers}
            meta={meta}
            controller={controller}
            rowKey={(s) => s.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load suppliers."
            searchable
            searchPlaceholder="Search suppliers..."
            filters={filters}
            pageSizeOptions
            emptyMessage="No suppliers found."
            onRowClick={(s) => router.push(`/dashboard/suppliers/${s.id}`)}
            actions={(s) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/suppliers/${s.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/suppliers/${s.id}/edit`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => toggleActiveMutation.mutate(s.id)}
                    disabled={toggleActiveMutation.isPending}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    {s.isActive ? (
                      <><PowerOff className="mr-2 h-4 w-4" /> Deactivate</>
                    ) : (
                      <><Power className="mr-2 h-4 w-4" /> Activate</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTargetId(s.id)}
                    className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTargetId}
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
