'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, MoreVertical, CalendarDays, Edit, Trash2, FileText } from 'lucide-react'
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
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import {
  useHolidays,
  useDeleteHoliday,
  HOLIDAY_TYPE_LABELS,
  type Holiday,
} from '@/hooks/useHolidays'

function formatHolidayDate(value: string): string {
  return format(new Date(value), 'MMM d, yyyy')
}

export default function HolidaysPage() {
  const router = useRouter()
  const controller = useDataTable()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data, isLoading, isError } = useHolidays({ ...(controller.queryParams as any) })
  const deleteMutation = useDeleteHoliday()

  const holidays = data?.data ?? []
  const meta = data?.meta

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const columns: DataTableColumn<Holiday>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (h) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          {h.name}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (h) => (
        <Badge
          variant={h.type === 'FULL_DAY' ? 'default' : 'secondary'}
          className="justify-center whitespace-nowrap text-center"
        >
          {HOLIDAY_TYPE_LABELS[h.type]}
        </Badge>
      ),
    },
    {
      key: 'startDate',
      header: 'Start Date',
      sortable: true,
      render: (h) => <span className="text-gray-700">{formatHolidayDate(h.startDate)}</span>,
    },
    {
      key: 'endDate',
      header: 'End Date',
      sortable: true,
      render: (h) => <span className="text-gray-700">{formatHolidayDate(h.endDate)}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      render: (h) =>
        h.description ? (
          <span className="text-gray-600">{h.description}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
  ]

  // Backend supports filtering by calendar year (`year` query param — see
  // HolidayFiltersDto); offer a few years around today's for the dropdown.
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 7 }, (_, i) => {
    const year = currentYear - 2 + i
    return { value: String(year), label: String(year) }
  })

  const filters: DataTableFilter<Holiday>[] = [
    {
      key: 'type',
      label: 'Type',
      options: [
        { value: 'FULL_DAY', label: 'Full day' },
        { value: 'HALF_DAY', label: 'Half day' },
      ],
    },
    {
      key: 'year',
      label: 'Year',
      options: yearOptions,
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Holidays</h2>
          <p className="text-gray-500">Manage the company holiday calendar.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/hr/holidays/create')}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Holiday
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Holiday>
            columns={columns}
            data={holidays}
            meta={meta}
            controller={controller}
            rowKey={(h) => h.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load holidays."
            searchable
            searchPlaceholder="Search holidays..."
            filters={filters}
            pageSizeOptions
            emptyMessage="No holidays found."
            onRowClick={(h) => router.push(`/dashboard/hr/holidays/${h.id}`)}
            actions={(h) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/holidays/${h.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/holidays/${h.id}/edit`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTargetId(h.id)}
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
        title="Delete Holiday"
        description="Are you sure you want to delete this holiday? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
