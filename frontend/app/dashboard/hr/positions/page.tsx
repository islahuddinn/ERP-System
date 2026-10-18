'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreVertical, Briefcase, Edit, Trash2, FileText } from 'lucide-react'
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
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { usePositions, useDeletePosition, type Position } from '@/hooks/usePositions'

export default function PositionsPage() {
  const router = useRouter()
  const controller = useDataTable()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data, isLoading, isError } = usePositions({ ...(controller.queryParams as any) })
  const deleteMutation = useDeletePosition()

  const positions = data?.data ?? []
  const meta = data?.meta

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const columns: DataTableColumn<Position>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (p) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Briefcase className="h-4 w-4 text-gray-400" />
          {p.title}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      render: (p) =>
        p.description ? (
          <span className="text-gray-600">{p.description}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'employees',
      header: 'Employees',
      sortable: true,
      sortKey: 'contracts._count',
      align: 'center',
      render: (p) => (
        <div className="flex justify-center">
          <Badge variant="secondary">{p._count?.contracts ?? 0}</Badge>
        </div>
      ),
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Positions</h2>
          <p className="text-gray-500">Manage job titles used across employee contracts.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/hr/positions/create')}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Position
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Position>
            columns={columns}
            data={positions}
            meta={meta}
            controller={controller}
            rowKey={(p) => p.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load positions."
            searchable
            searchPlaceholder="Search positions..."
            pageSizeOptions
            emptyMessage="No positions found."
            onRowClick={(p) => router.push(`/dashboard/hr/positions/${p.id}`)}
            actions={(p) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/positions/${p.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/positions/${p.id}/edit`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTargetId(p.id)}
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
        title="Delete Position"
        description="Are you sure you want to delete this position? Positions with employees assigned cannot be deleted."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
