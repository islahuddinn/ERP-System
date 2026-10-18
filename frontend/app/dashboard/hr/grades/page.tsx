'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreVertical, Layers, Edit, Trash2, FileText } from 'lucide-react'
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
import { useDataTable, applyClientPaging } from '@/hooks/useDataTable'
import { useMoney } from '@/contexts/currency-context'
import { useGrades, useDeleteGrade, type Grade } from '@/hooks/useGrades'

export default function GradesPage() {
  const router = useRouter()
  const controller = useDataTable({ initialSortBy: 'level', initialSortOrder: 'ASC' })
  const money = useMoney()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data: rows, isLoading, isError } = useGrades()
  const deleteMutation = useDeleteGrade()

  const paged = useMemo(
    () =>
      applyClientPaging<Grade>(rows, controller, {
        search: (g) => g.name,
        sort: {
          name: (g) => g.name.toLowerCase(),
          level: (g) => g.level,
          salaryBandMin: (g) => Number(g.salaryBandMin),
          salaryBandMax: (g) => Number(g.salaryBandMax),
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

  const columns: DataTableColumn<Grade>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (g) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Layers className="h-4 w-4 text-gray-400" />
          {g.name}
        </span>
      ),
    },
    { key: 'level', header: 'Level', sortable: true, align: 'center', render: (g) => <Badge variant="secondary">{g.level}</Badge> },
    { key: 'salaryBandMin', header: 'Salary Band Min', sortable: true, align: 'right', render: (g) => <span className="text-gray-700">{money(Number(g.salaryBandMin))}</span> },
    { key: 'salaryBandMax', header: 'Salary Band Max', sortable: true, align: 'right', render: (g) => <span className="text-gray-700">{money(Number(g.salaryBandMax))}</span> },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Grades</h2>
          <p className="text-gray-500">Define salary grades and their pay bands.</p>
        </div>
        <Button onClick={() => router.push('/dashboard/hr/grades/create')} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Grade
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Grade>
            columns={columns}
            data={paged.data}
            meta={paged.meta}
            controller={controller}
            rowKey={(g) => g.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load grades."
            searchable
            searchPlaceholder="Search grades..."
            pageSizeOptions
            emptyMessage="No grades found."
            onRowClick={(g) => router.push(`/dashboard/hr/grades/${g.id}`)}
            actions={(g) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => router.push(`/dashboard/hr/grades/${g.id}`)} className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50">
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/dashboard/hr/grades/${g.id}/edit`)} className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50">
                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDeleteTargetId(g.id)} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
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
        title="Delete Grade"
        description="Are you sure you want to delete this grade? Grades with assigned employees cannot be deleted."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
