'use client'

import { useMemo, useState } from 'react'
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
import { useRegionsDropdown } from '@/hooks/useRegions'
import { useZones, useDeleteZone, type Zone } from '@/hooks/useZones'
import { ZoneFormDialog } from './zone-form-dialog'
import { StatusPill } from './status-pill'

interface ZonesTabProps {
  /** Pre-filter to one region (drilled from the Regions tab). */
  initialRegionId?: string
  onDrillToCities?: (zone: Zone) => void
}

export function ZonesTab({ initialRegionId, onDrillToCities }: ZonesTabProps) {
  const controller = useDataTable({
    initialSortBy: 'name',
    initialSortOrder: 'ASC',
    initialFilters: initialRegionId ? { regionId: initialRegionId } : {},
  })
  const { data, isLoading, isError } = useZones(controller.queryParams as Record<string, string | number>)
  const deleteMutation = useDeleteZone()
  const { hasPermission } = usePermissionCheck()
  const canManage = hasPermission('sales-zone.manage')
  const { data: regionOptions = [] } = useRegionsDropdown()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Zone | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Zone | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (zone: Zone) => {
    setEditing(zone)
    setFormOpen(true)
  }

  const filters: DataTableFilter<Zone>[] = useMemo(
    () => [
      {
        key: 'regionId',
        label: 'Region',
        searchable: true,
        options: regionOptions.map((r) => ({ value: r.id, label: r.name })),
      },
    ],
    [regionOptions],
  )

  const columns: DataTableColumn<Zone>[] = [
    {
      key: 'name',
      header: 'Zone',
      sortable: true,
      render: (z) => <span className="font-medium text-gray-900">{z.name}</span>,
    },
    { key: 'region.name', header: 'Region', sortable: true, sortKey: 'region.name', render: (z) => z.region?.name ?? '—' },
    { key: 'status', header: 'Status', sortable: true, render: (z) => <StatusPill status={z.status} /> },
    {
      key: 'cities',
      header: 'Cities',
      align: 'right',
      render: (z) => <span className="tabular-nums text-gray-700">{z._count?.cities ?? 0}</span>,
    },
  ]

  const hasCities = (deleteTarget?._count?.cities ?? 0) > 0

  return (
    <>
      <DataTable<Zone>
        columns={columns}
        data={data?.data}
        meta={data?.meta}
        controller={controller}
        rowKey={(z) => z.id}
        isLoading={isLoading}
        isError={isError}
        searchable
        searchPlaceholder="Search zones…"
        filters={filters}
        pageSizeOptions
        emptyMessage="No zones yet. Create a zone under a region."
        onRowClick={onDrillToCities ? (z) => onDrillToCities(z) : undefined}
        toolbarRight={
          canManage ? (
            <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> New Zone
            </Button>
          ) : undefined
        }
        actions={(z) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDrillToCities && (
                <DropdownMenuItem onClick={() => onDrillToCities(z)}>
                  <ChevronRight className="mr-2 h-4 w-4" /> View cities
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem onClick={() => openEdit(z)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(z)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <ZoneFormDialog open={formOpen} onOpenChange={setFormOpen} zone={editing} defaultRegionId={initialRegionId} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete zone?"
        description={
          hasCities
            ? `"${deleteTarget?.name}" has ${deleteTarget?._count?.cities} city(ies) under it and cannot be deleted until those are removed.`
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
