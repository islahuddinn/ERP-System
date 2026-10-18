'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronRight, MoreHorizontal } from 'lucide-react'
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
import { useRegions, useDeleteRegion, type Region } from '@/hooks/useRegions'
import { RegionFormDialog } from './region-form-dialog'
import { StatusPill } from './status-pill'

interface RegionsTabProps {
  /** Drill into this region's zones (switches the parent tab, pre-filtered). */
  onDrillToZones?: (region: Region) => void
}

export function RegionsTab({ onDrillToZones }: RegionsTabProps) {
  const controller = useDataTable({ initialSortBy: 'name', initialSortOrder: 'ASC' })
  const { data, isLoading, isError } = useRegions(controller.queryParams as Record<string, string | number>)
  const deleteMutation = useDeleteRegion()
  const { hasPermission } = usePermissionCheck()
  const canManage = hasPermission('sales-region.manage')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Region | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Region | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (region: Region) => {
    setEditing(region)
    setFormOpen(true)
  }

  const filters: DataTableFilter<Region>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
      ],
    },
  ]

  const columns: DataTableColumn<Region>[] = [
    {
      key: 'name',
      header: 'Region',
      sortable: true,
      render: (r) => <span className="font-medium text-gray-900">{r.name}</span>,
    },
    { key: 'countryName', header: 'Country', sortable: true },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusPill status={r.status} /> },
    {
      key: 'zones',
      header: 'Zones',
      align: 'right',
      render: (r) => <span className="tabular-nums text-gray-700">{r._count?.zones ?? 0}</span>,
    },
  ]

  const hasZones = (deleteTarget?._count?.zones ?? 0) > 0

  return (
    <>
      <DataTable<Region>
        columns={columns}
        data={data?.data}
        meta={data?.meta}
        controller={controller}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        isError={isError}
        searchable
        searchPlaceholder="Search regions or country…"
        filters={filters}
        pageSizeOptions
        emptyMessage="No regions yet. Create the first region to start the territory hierarchy."
        onRowClick={onDrillToZones ? (r) => onDrillToZones(r) : undefined}
        toolbarRight={
          canManage ? (
            <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> New Region
            </Button>
          ) : undefined
        }
        actions={(r) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDrillToZones && (
                <DropdownMenuItem onClick={() => onDrillToZones(r)}>
                  <ChevronRight className="mr-2 h-4 w-4" /> View zones
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem onClick={() => openEdit(r)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(r)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <RegionFormDialog open={formOpen} onOpenChange={setFormOpen} region={editing} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete region?"
        description={
          hasZones
            ? `"${deleteTarget?.name}" has ${deleteTarget?._count?.zones} zone(s) under it and cannot be deleted until those are removed.`
            : `This permanently deletes "${deleteTarget?.name}". This action cannot be undone.`
        }
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
