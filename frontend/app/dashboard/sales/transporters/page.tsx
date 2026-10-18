'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, MoreHorizontal, Truck } from 'lucide-react'
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
import { useDeleteTransporter, useTransporters, type Transporter } from '@/hooks/useTransporters'
import { TransporterFormDialog } from '@/components/sales/transporters/transporter-form-dialog'
import { StatusPill } from '@/components/sales/territory/status-pill'

export default function TransportersPage() {
  const controller = useDataTable({ initialSortBy: 'name', initialSortOrder: 'ASC' })
  const { data, isLoading, isError } = useTransporters(
    controller.queryParams as Record<string, string | number>,
  )
  const deleteMutation = useDeleteTransporter()
  const { hasPermission } = usePermissionCheck()
  const canManage = hasPermission('transporter.manage')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transporter | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transporter | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (transporter: Transporter) => {
    setEditing(transporter)
    setFormOpen(true)
  }

  const filters: DataTableFilter<Transporter>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
      ],
    },
  ]

  const columns: DataTableColumn<Transporter>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (transporter) => (
        <span className="font-mono text-sm text-gray-700">{transporter.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Transporter',
      sortable: true,
      render: (transporter) => (
        <span className="font-medium text-gray-900">{transporter.name}</span>
      ),
    },
    {
      key: 'contactName',
      header: 'Contact',
      sortable: true,
      render: (transporter) => (
        <span className="text-gray-700">{transporter.contactName || '—'}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      render: (transporter) => (
        <span className="text-gray-700 tabular-nums">{transporter.phone || '—'}</span>
      ),
    },
    {
      key: 'vehicleRegistration',
      header: 'Vehicle',
      sortable: false,
      render: (transporter) => (
        <span className="font-mono text-sm text-gray-700">
          {transporter.vehicleRegistration || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (transporter) => <StatusPill status={transporter.status} />,
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            sortable: false,
            className: 'w-12',
            render: (transporter: Transporter) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(transporter)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => setDeleteTarget(transporter)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } as DataTableColumn<Transporter>,
        ]
      : []),
  ]

  return (
    <ProtectedRoute requiredPermission="transporter.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="h-7 w-7 text-green-600" />
              Transporters
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Master data for logistics vendors. Does not change factory material transfers or shop delivery flows yet.
            </p>
          </div>
          {canManage && (
            <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Transporter
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
              rowKey={(transporter) => transporter.id}
              filters={filters}
              searchPlaceholder="Search by code, name, phone, or vehicle…"
              emptyMessage="No transporters yet."
            />
          </CardContent>
        </Card>

        <TransporterFormDialog open={formOpen} onOpenChange={setFormOpen} transporter={editing} />

        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete transporter?"
          description={
            deleteTarget
              ? `Delete "${deleteTarget.name}"? Existing material transfers and deliveries are not affected.`
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
