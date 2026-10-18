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
import { useDataTable, applyClientPaging } from '@/hooks/useDataTable'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import { useBranchesDropdown, useBranch, useBranchTree } from '@/hooks/useBranches'
import { useAreas, useDeleteArea, type Area } from '@/hooks/useAreas'
import { AreaFormDialog } from './area-form-dialog'
import { BranchTreeContext } from './branch-tree-context'
import { StatusPill } from './status-pill'
import { mapBranchTreeAreasToRows, type AreaTreeRow } from './utils/branch-tree'

interface AreasTabProps {
  initialBranchId?: string
  onDrillToCustomers?: (area: Area) => void
}

export function AreasTab({ initialBranchId, onDrillToCustomers }: AreasTabProps) {
  const treeMode = Boolean(initialBranchId)

  const controller = useDataTable({
    initialSortBy: 'name',
    initialSortOrder: 'ASC',
    initialFilters: initialBranchId ? { branchId: initialBranchId } : {},
  })

  // Global list: server-side pagination/search (scales across all branches).
  const listQuery = useAreas(controller.queryParams as Record<string, string | number>, {
    enabled: !treeMode,
  })

  // Drilled branch: one tree request returns branch + areas + customer counts.
  const {
    data: branchTree,
    isLoading: isTreeLoading,
    isError: isTreeError,
  } = useBranchTree(initialBranchId ?? '')

  const { data: drillBranch } = useBranch(treeMode ? (initialBranchId ?? '') : '')

  const deleteMutation = useDeleteArea()
  const { hasPermission } = usePermissionCheck()
  const canManage = hasPermission('sales-area.manage')
  const { data: branchOptions = [] } = useBranchesDropdown()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Area | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null)

  const treeRows = useMemo(
    () => mapBranchTreeAreasToRows(branchTree, drillBranch ?? undefined),
    [branchTree, drillBranch],
  )

  const pagedTreeRows = useMemo(
    () =>
      applyClientPaging<AreaTreeRow>(treeRows, controller, {
        search: (area) => area.name,
        filters: {
          branchId: (area) => area.branchId,
          status: (area) => area.status,
        },
        sort: {
          name: (area) => area.name.toLowerCase(),
          status: (area) => area.status,
          'branch.name': (area) => area.branch?.name?.toLowerCase() ?? '',
          customers: (area) => area.customerCount,
        },
      }),
    [treeRows, controller],
  )

  const tableData = treeMode ? pagedTreeRows.data : listQuery.data?.data
  const tableMeta = treeMode ? pagedTreeRows.meta : listQuery.data?.meta
  const isLoading = treeMode ? isTreeLoading : listQuery.isLoading
  const isError = treeMode ? isTreeError : listQuery.isError

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (area: Area) => {
    setEditing(area)
    setFormOpen(true)
  }

  const filters: DataTableFilter<Area>[] = useMemo(
    () =>
      treeMode
        ? [
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ],
            },
          ]
        : [
            {
              key: 'branchId',
              label: 'Branch',
              searchable: true,
              options: branchOptions.map((branch) => ({ value: branch.id, label: branch.name })),
            },
          ],
    [treeMode, branchOptions],
  )

  const columns: DataTableColumn<AreaTreeRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Area',
        sortable: true,
        render: (area) => <span className="font-medium text-gray-900">{area.name}</span>,
      },
      {
        key: 'branch.name',
        header: 'City / Branch',
        sortable: true,
        sortKey: 'branch.name',
        render: (area) =>
          area.branch ? (
            <span className="text-gray-600">
              {area.branch.city?.name ? `${area.branch.city.name} / ` : ''}
              <span className="text-gray-800">{area.branch.name}</span>
            </span>
          ) : (
            '—'
          ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (area) => <StatusPill status={area.status} />,
      },
      ...(treeMode
        ? [
            {
              key: 'customers',
              header: 'Customers',
              align: 'right' as const,
              sortable: true,
              render: (area: AreaTreeRow) => (
                <span className="tabular-nums text-gray-700">{area.customerCount ?? 0}</span>
              ),
            },
          ]
        : []),
    ],
    [treeMode],
  )

  return (
    <>
      {treeMode && branchTree && <BranchTreeContext branchTree={branchTree} branchDetail={drillBranch} />}

      <DataTable<AreaTreeRow>
        columns={columns}
        data={tableData}
        meta={tableMeta}
        controller={controller}
        rowKey={(area) => area.id}
        isLoading={isLoading}
        isError={isError}
        searchable
        searchPlaceholder="Search areas…"
        filters={filters}
        pageSizeOptions
        emptyMessage={
          treeMode
            ? 'No areas under this branch yet. Create an area to continue the territory hierarchy.'
            : 'No areas yet. Create an area under a branch.'
        }
        onRowClick={onDrillToCustomers ? (area) => onDrillToCustomers(area) : undefined}
        toolbarRight={
          canManage ? (
            <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> New Area
            </Button>
          ) : undefined
        }
        actions={(area) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDrillToCustomers && (
                <DropdownMenuItem onClick={() => onDrillToCustomers(area)}>
                  <ChevronRight className="mr-2 h-4 w-4" /> View customers
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem onClick={() => openEdit(area)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(area)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <AreaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        area={editing}
        defaultCityId={drillBranch?.cityId}
        defaultBranchId={initialBranchId}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete area?"
        description={`This deletes "${deleteTarget?.name}". Note: any customers assigned to this area will be left without one — reassign them first if needed.`}
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
