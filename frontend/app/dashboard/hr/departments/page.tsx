'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreVertical, Building2, Edit, Trash2, FileText, List, FolderTree, Loader2, ChevronRight, Network } from 'lucide-react'
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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import {
  useDepartments,
  useDeleteDepartment,
  useDepartmentTree,
  type Department,
  type DepartmentTreeNode,
} from '@/hooks/useDepartments'

// ─── Tree view (org-chart, aligned with the Sites → Tree tab) ────────────────
// A single node box + its nested children, driven by GET /hr/departments/tree.
// Uses the shared `.oc-tree` / `.oc-node` org-chart styles from globals.css.
function DepartmentTreeNode({
  node,
  onOpen,
}: {
  node: DepartmentTreeNode
  onOpen: (id: string) => void
}) {
  const children = node.children ?? []
  const hasChildren = children.length > 0
  const [open, setOpen] = useState(true)
  const employeeCount = node._count?.contracts ?? 0

  return (
    <li>
      <div
        onClick={() => onOpen(node.id)}
        className="oc-node cursor-pointer rounded-lg border border-gray-200 bg-white shadow-sm px-3 py-2 min-w-[200px] hover:border-green-300 hover:shadow transition-colors"
      >
        <div className="flex items-center justify-center gap-1.5">
          <Building2 className="h-4 w-4 text-green-600 shrink-0" />
          <span className="font-semibold text-gray-900 text-sm whitespace-nowrap">{node.name}</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
            {employeeCount} employee{employeeCount !== 1 ? 's' : ''}
          </span>
        </div>
        {node.description && (
          <p className="mt-1.5 text-[11px] text-gray-500 whitespace-nowrap">{node.description}</p>
        )}
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setOpen((o) => !o)
            }}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800"
            aria-label={open ? 'Collapse children' : 'Expand children'}
          >
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
            {children.length} child{children.length !== 1 ? 'ren' : ''}
          </button>
        )}
      </div>
      {hasChildren && open && (
        <ul>
          {children.map((child) => (
            <DepartmentTreeNode key={child.id} node={child} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function DepartmentsPage() {
  const router = useRouter()
  const controller = useDataTable()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'tree'>('list')

  const { data, isLoading, isError } = useDepartments({ ...(controller.queryParams as any) })
  const deleteMutation = useDeleteDepartment()
  const { data: tree = [], isLoading: treeLoading, isError: treeError } = useDepartmentTree()

  const departments = data?.data ?? []
  const meta = data?.meta

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const columns: DataTableColumn<Department>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (d) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Building2 className="h-4 w-4 text-gray-400" />
          {d.name}
        </span>
      ),
    },
    {
      key: 'parent',
      header: 'Parent Department',
      sortable: true,
      sortKey: 'parent.name',
      render: (d) =>
        d.parent ? (
          <span className="text-gray-700">{d.parent.name}</span>
        ) : (
          <span className="text-gray-400">— Top level —</span>
        ),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      render: (d) =>
        d.description ? (
          <span className="text-gray-600">{d.description}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'employees',
      header: 'Employees',
      align: 'center',
      sortable: true,
      sortKey: 'contracts._count',
      render: (d) => (
        <div className="flex justify-center">
          <Badge variant="secondary">{d._count?.contracts ?? 0}</Badge>
        </div>
      ),
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Departments</h2>
          <p className="text-gray-500">Organize your workforce into a department hierarchy.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-gray-200 p-0.5">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${
                view === 'list' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="h-4 w-4" /> List
            </button>
            <button
              type="button"
              onClick={() => setView('tree')}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${
                view === 'tree' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FolderTree className="h-4 w-4" /> Tree
            </button>
          </div>
          <Button
            onClick={() => router.push('/dashboard/hr/departments/create')}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Department
          </Button>
        </div>
      </div>

      {view === 'tree' ? (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Department Hierarchy</h3>
            </div>
            <p className="text-sm text-gray-500">Top-down view of parent departments and their nested sub-departments.</p>
          </CardHeader>
          <CardContent>
            {treeLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              </div>
            ) : treeError ? (
              <p className="py-12 text-center text-red-500">Failed to load department tree.</p>
            ) : tree.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Network className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="font-medium">No departments to display</p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-4">
                <div className="oc-tree">
                  {tree.map((node) => (
                    <ul key={node.id}>
                      <DepartmentTreeNode
                        node={node}
                        onOpen={(id) => router.push(`/dashboard/hr/departments/${id}`)}
                      />
                    </ul>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Department>
            columns={columns}
            data={departments}
            meta={meta}
            controller={controller}
            rowKey={(d) => d.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load departments."
            searchable
            searchPlaceholder="Search departments..."
            pageSizeOptions
            emptyMessage="No departments found."
            onRowClick={(d) => router.push(`/dashboard/hr/departments/${d.id}`)}
            actions={(d) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/departments/${d.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/departments/${d.id}/edit`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTargetId(d.id)}
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
      )}

      <ConfirmDialog
        open={!!deleteTargetId}
        title="Delete Department"
        description="Are you sure you want to delete this department? Departments with employees or sub-departments cannot be deleted."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
