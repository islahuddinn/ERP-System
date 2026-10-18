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
import { useCitiesDropdown, useCity } from '@/hooks/useCities'
import { useBranches, useDeleteBranch, type Branch } from '@/hooks/useBranches'
import { BranchFormDialog } from './branch-form-dialog'
import { StatusPill } from './status-pill'

interface BranchesTabProps {
  initialCityId?: string
  onDrillToAreas?: (branch: Branch) => void
}

export function BranchesTab({ initialCityId, onDrillToAreas }: BranchesTabProps) {
  const controller = useDataTable({
    initialSortBy: 'name',
    initialSortOrder: 'ASC',
    initialFilters: initialCityId ? { cityId: initialCityId } : {},
  })
  const { data, isLoading, isError } = useBranches(controller.queryParams as Record<string, string | number>)
  const deleteMutation = useDeleteBranch()
  const { hasPermission } = usePermissionCheck()
  const canManage = hasPermission('sales-branch.manage')
  const { data: cityOptions = [] } = useCitiesDropdown()
  const { data: drillCity } = useCity(initialCityId ?? '')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (branch: Branch) => {
    setEditing(branch)
    setFormOpen(true)
  }

  const filters: DataTableFilter<Branch>[] = useMemo(
    () => [
      {
        key: 'cityId',
        label: 'City',
        searchable: true,
        options: cityOptions.map((c) => ({ value: c.id, label: c.name })),
      },
      {
        key: 'status',
        label: 'Status',
        options: [
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
        ],
      },
    ],
    [cityOptions],
  )

  const columns: DataTableColumn<Branch>[] = [
    { key: 'code', header: 'Code', sortable: true, render: (b) => <span className="font-mono text-xs text-gray-700">{b.code}</span> },
    { key: 'name', header: 'Branch', sortable: true, render: (b) => <span className="font-medium text-gray-900">{b.name}</span> },
    { key: 'city.name', header: 'City', sortable: true, sortKey: 'city.name', render: (b) => b.city?.name ?? '—' },
    {
      key: 'distributor',
      header: 'Distributor',
      render: (b) =>
        b.distributor?.user ? `${b.distributor.user.firstName} ${b.distributor.user.lastName}` : (b.distributor?.employeeCode ?? '—'),
    },
    {
      key: 'productGroups',
      header: 'Product Groups',
      render: (b) =>
        b.productGroups && b.productGroups.length ? (
          <div className="flex flex-wrap gap-1">
            {b.productGroups.slice(0, 3).map((pg) => (
              <span key={pg.id} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">{pg.name}</span>
            ))}
            {b.productGroups.length > 3 && <span className="text-xs text-gray-400">+{b.productGroups.length - 3}</span>}
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'status', header: 'Status', sortable: true, render: (b) => <StatusPill status={b.status} /> },
    { key: 'areas', header: 'Areas', align: 'right', render: (b) => <span className="tabular-nums text-gray-700">{b._count?.areas ?? 0}</span> },
  ]

  const hasAreas = (deleteTarget?._count?.areas ?? 0) > 0

  return (
    <>
      <DataTable<Branch>
        columns={columns}
        data={data?.data}
        meta={data?.meta}
        controller={controller}
        rowKey={(b) => b.id}
        isLoading={isLoading}
        isError={isError}
        searchable
        searchPlaceholder="Search branches (name or code)…"
        filters={filters}
        pageSizeOptions
        emptyMessage="No branches yet. A branch needs a city, a distributor, and at least one product group."
        onRowClick={onDrillToAreas ? (b) => onDrillToAreas(b) : undefined}
        toolbarRight={
          canManage ? (
            <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> New Branch
            </Button>
          ) : undefined
        }
        actions={(b) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDrillToAreas && (
                <DropdownMenuItem onClick={() => onDrillToAreas(b)}>
                  <ChevronRight className="mr-2 h-4 w-4" /> View areas
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem onClick={() => openEdit(b)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(b)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <BranchFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        branch={editing}
        defaultRegionId={drillCity?.zone?.region?.id}
        defaultZoneId={drillCity?.zoneId}
        defaultCityId={initialCityId}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete branch?"
        description={
          hasAreas
            ? `"${deleteTarget?.name}" has ${deleteTarget?._count?.areas} area(s) under it and cannot be deleted until those are removed.`
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
