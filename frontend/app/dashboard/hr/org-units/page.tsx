'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreVertical, Network, Edit, Trash2, FileText, Loader2 } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable, applyClientPaging } from '@/hooks/useDataTable'
import { OrgTree } from '@/components/hr/org-units/org-tree'
import {
  useOrgUnits,
  useOrgUnitTree,
  useOrgChart,
  useDeleteOrgUnit,
  ORG_UNIT_TYPES,
  type OrgUnit,
} from '@/hooks/useOrgUnits'

function ListTab() {
  const router = useRouter()
  const controller = useDataTable({ initialSortBy: 'name', initialSortOrder: 'ASC' })
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data: rows, isLoading, isError } = useOrgUnits()
  const deleteMutation = useDeleteOrgUnit()

  // Map parent id → name so the List tab can show a readable parent column.
  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const unit of rows ?? []) map.set(unit.id, unit.name)
    return map
  }, [rows])

  const paged = useMemo(
    () =>
      applyClientPaging<OrgUnit>(rows, controller, {
        search: (u) => u.name,
        filters: { type: (u) => u.type },
        sort: {
          name: (u) => u.name.toLowerCase(),
          type: (u) => u.type,
        },
      }),
    [rows, controller],
  )

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const columns: DataTableColumn<OrgUnit>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (u) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Network className="h-4 w-4 text-gray-400" />
          {u.name}
        </span>
      ),
    },
    { key: 'type', header: 'Type', sortable: true, render: (u) => <Badge variant="secondary">{u.type}</Badge> },
    {
      key: 'parentId',
      header: 'Parent',
      render: (u) => (u.parentId ? <span className="text-gray-700">{nameById.get(u.parentId) ?? '—'}</span> : <span className="text-gray-400">— Top level —</span>),
    },
  ]

  const filters: DataTableFilter<OrgUnit>[] = [
    { key: 'type', label: 'Type', options: ORG_UNIT_TYPES.map((t) => ({ value: t, label: t })) },
  ]

  return (
    <div className="space-y-4">
      <DataTable<OrgUnit>
        columns={columns}
        data={paged.data}
        meta={paged.meta}
        controller={controller}
        rowKey={(u) => u.id}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to load org units."
        searchable
        searchPlaceholder="Search org units..."
        filters={filters}
        pageSizeOptions
        emptyMessage="No org units found."
        onRowClick={(u) => router.push(`/dashboard/hr/org-units/${u.id}`)}
        actions={(u) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-gray-200">
              <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push(`/dashboard/hr/org-units/${u.id}`)} className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50">
                <FileText className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/dashboard/hr/org-units/${u.id}/edit`)} className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50">
                <Edit className="mr-2 h-4 w-4" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteTargetId(u.id)} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <ConfirmDialog
        open={!!deleteTargetId}
        title="Delete Org Unit"
        description="Are you sure you want to delete this org unit? Units with employees or child units cannot be deleted."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}

function TreeTab() {
  const router = useRouter()
  const { data: tree, isLoading, isError } = useOrgUnitTree()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }
  if (isError) {
    return <p className="text-center py-8 text-red-500">Failed to load the org-unit tree.</p>
  }
  return <OrgTree nodes={tree ?? []} onSelect={(id) => router.push(`/dashboard/hr/org-units/${id}`)} />
}

function OrgChartTab() {
  const { data: chart, isLoading, isError } = useOrgChart()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }
  if (isError) {
    return <p className="text-center py-8 text-red-500">The org chart could not be loaded.</p>
  }
  return <OrgTree nodes={chart ?? []} />
}

export default function OrgUnitsPage() {
  const router = useRouter()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Org Units</h2>
          <p className="text-gray-500">Model your organisation as a hierarchy of companies, divisions, departments and teams.</p>
        </div>
        <Button onClick={() => router.push('/dashboard/hr/org-units/create')} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Org Unit
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="tree">Tree</TabsTrigger>
              <TabsTrigger value="org-chart">Org Chart</TabsTrigger>
            </TabsList>
            <TabsContent value="list" className="mt-4">
              <ListTab />
            </TabsContent>
            <TabsContent value="tree" className="mt-4">
              <TreeTab />
            </TabsContent>
            <TabsContent value="org-chart" className="mt-4">
              <OrgChartTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
