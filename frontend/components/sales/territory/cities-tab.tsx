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
import { useZonesDropdown } from '@/hooks/useZones'
import { useCities, useDeleteCity, type City } from '@/hooks/useCities'
import { CityFormDialog } from './city-form-dialog'
import { StatusPill } from './status-pill'

interface CitiesTabProps {
  /** Pre-filter to one zone (drilled from the Zones tab). */
  initialZoneId?: string
  onDrillToBranches?: (city: City) => void
}

export function CitiesTab({ initialZoneId, onDrillToBranches }: CitiesTabProps) {
  const controller = useDataTable({
    initialSortBy: 'name',
    initialSortOrder: 'ASC',
    initialFilters: initialZoneId ? { zoneId: initialZoneId } : {},
  })
  const { data, isLoading, isError } = useCities(controller.queryParams as Record<string, string | number>)
  const deleteMutation = useDeleteCity()
  const { hasPermission } = usePermissionCheck()
  const canManage = hasPermission('sales-city.manage')
  const { data: zoneOptions = [] } = useZonesDropdown()
  const defaultRegionId = initialZoneId
    ? zoneOptions.find((zone) => zone.id === initialZoneId)?.regionId
    : undefined

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<City | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<City | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (city: City) => {
    setEditing(city)
    setFormOpen(true)
  }

  const filters: DataTableFilter<City>[] = useMemo(
    () => [
      {
        key: 'zoneId',
        label: 'Zone',
        searchable: true,
        options: zoneOptions.map((z) => ({ value: z.id, label: z.name })),
      },
    ],
    [zoneOptions],
  )

  const columns: DataTableColumn<City>[] = [
    {
      key: 'name',
      header: 'City',
      sortable: true,
      render: (c) => <span className="font-medium text-gray-900">{c.name}</span>,
    },
    {
      key: 'zone.name',
      header: 'Region / Zone',
      sortable: true,
      sortKey: 'zone.name',
      render: (c) =>
        c.zone ? (
          <span className="text-gray-600">
            {c.zone.region?.name ? `${c.zone.region.name} / ` : ''}
            <span className="text-gray-800">{c.zone.name}</span>
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'status', header: 'Status', sortable: true, render: (c) => <StatusPill status={c.status} /> },
    {
      key: 'branches',
      header: 'Branches',
      align: 'right',
      render: (c) => <span className="tabular-nums text-gray-700">{c._count?.branches ?? 0}</span>,
    },
  ]

  const hasBranches = (deleteTarget?._count?.branches ?? 0) > 0

  return (
    <>
      <DataTable<City>
        columns={columns}
        data={data?.data}
        meta={data?.meta}
        controller={controller}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        isError={isError}
        searchable
        searchPlaceholder="Search cities…"
        filters={filters}
        pageSizeOptions
        emptyMessage="No cities yet. Create a city under a zone."
        onRowClick={onDrillToBranches ? (c) => onDrillToBranches(c) : undefined}
        toolbarRight={
          canManage ? (
            <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> New City
            </Button>
          ) : undefined
        }
        actions={(c) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDrillToBranches && (
                <DropdownMenuItem onClick={() => onDrillToBranches(c)}>
                  <ChevronRight className="mr-2 h-4 w-4" /> View branches
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem onClick={() => openEdit(c)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(c)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <CityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        city={editing}
        defaultRegionId={defaultRegionId}
        defaultZoneId={initialZoneId}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete city?"
        description={
          hasBranches
            ? `"${deleteTarget?.name}" has ${deleteTarget?._count?.branches} branch(es) under it and cannot be deleted until those are removed.`
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
