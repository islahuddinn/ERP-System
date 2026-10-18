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
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { RequisitionStatusBadge } from '@/components/hr/recruitment/RecruitmentBadges'
import {
  useJobRequisitions,
  useDeleteJobRequisition,
  employmentTypeLabel,
  EMPLOYMENT_TYPES,
  JOB_REQUISITION_STATUSES,
  type JobRequisition,
} from '@/hooks/useJobRequisitions'

const BASE = '/dashboard/hr/recruitment/job-requisitions'

export function JobRequisitionsList() {
  const router = useRouter()
  const controller = useDataTable()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data, isLoading, isError } = useJobRequisitions({ ...(controller.queryParams as any) })
  const deleteMutation = useDeleteJobRequisition()

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const filters: DataTableFilter<JobRequisition>[] = [
    {
      key: 'status',
      label: 'Status',
      options: JOB_REQUISITION_STATUSES.map((status) => ({ value: status, label: status })),
    },
    {
      key: 'employmentType',
      label: 'Type',
      options: EMPLOYMENT_TYPES.map((type) => ({
        value: type,
        label: employmentTypeLabel(type),
      })),
    },
  ]

  const columns: DataTableColumn<JobRequisition>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (r) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Briefcase className="h-4 w-4 text-gray-400" />
          <span>
            {r.title}
            <span className="block text-xs text-gray-500">
              {r.department?.name ?? '—'}
              {r.position?.title ? ` · ${r.position.title}` : ''}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'employmentType',
      header: 'Type',
      render: (r) => (
        <span className="text-gray-700">
          {r.employmentType ? employmentTypeLabel(r.employmentType) : '—'}
        </span>
      ),
    },
    {
      key: 'openings',
      header: 'Openings',
      align: 'center',
      render: (r) => <span className="text-gray-700">{r.openings ?? '—'}</span>,
    },
    {
      key: 'applications',
      header: 'Applications',
      align: 'center',
      render: (r) => <span className="text-gray-700">{r._count?.applications ?? 0}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (r) => (
        <div className="flex justify-center">
          <RequisitionStatusBadge status={r.status} />
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={() => router.push(`${BASE}/create`)} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> New Requisition
        </Button>
      </div>
      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<JobRequisition>
            columns={columns}
            data={data?.data ?? []}
            meta={data?.meta}
            controller={controller}
            rowKey={(r) => r.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load job requisitions."
            searchable
            searchPlaceholder="Search requisitions…"
            filters={filters}
            pageSizeOptions
            emptyMessage="No job requisitions found."
            onRowClick={(r) => router.push(`${BASE}/${r.id}`)}
            actions={(r) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`${BASE}/${r.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`${BASE}/${r.id}/edit`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTargetId(r.id)}
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
        title="Delete Job Requisition"
        description="Are you sure you want to delete this job requisition? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  )
}
