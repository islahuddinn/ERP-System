'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, MoreVertical, FileSpreadsheet, Edit, Trash2, FileText, ArrowRightLeft } from 'lucide-react'
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
import { ApplicationStageBadge } from '@/components/hr/recruitment/RecruitmentBadges'
import { MoveStageDialog } from '@/components/hr/recruitment/MoveStageDialog'
import { candidateFullName } from '@/hooks/useCandidates'
import {
  useApplications,
  useDeleteApplication,
  APPLICATION_STAGES,
  allowedNextStages,
  type Application,
} from '@/hooks/useApplications'

const BASE = '/dashboard/hr/recruitment/applications'

export function ApplicationsList() {
  const router = useRouter()
  const controller = useDataTable()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState<Application | null>(null)

  const { data, isLoading, isError } = useApplications({ ...(controller.queryParams as any) })
  const deleteMutation = useDeleteApplication()

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const filters: DataTableFilter<Application>[] = [
    {
      key: 'stage',
      label: 'Stage',
      options: APPLICATION_STAGES.map((stage) => ({ value: stage, label: stage })),
    },
  ]

  const columns: DataTableColumn<Application>[] = [
    {
      key: 'candidate',
      header: 'Candidate',
      render: (a) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <FileSpreadsheet className="h-4 w-4 text-gray-400" />
          <span>
            {a.candidate ? candidateFullName(a.candidate) : '—'}
            <span className="block text-xs text-gray-500">{a.candidate?.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'requisition',
      header: 'Requisition',
      render: (a) => <span className="text-gray-700">{a.requisition?.title ?? '—'}</span>,
    },
    {
      key: 'stage',
      header: 'Stage',
      align: 'center',
      render: (a) => (
        <div className="flex justify-center">
          <ApplicationStageBadge stage={a.stage} />
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Applied',
      render: (a) => (
        <span className="text-gray-600">
          {a.createdAt ? format(new Date(a.createdAt), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
  ]

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={() => router.push(`${BASE}/create`)} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> New Application
        </Button>
      </div>
      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Application>
            columns={columns}
            data={data?.data ?? []}
            meta={data?.meta}
            controller={controller}
            rowKey={(a) => a.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load applications."
            searchable
            searchPlaceholder="Search applications…"
            filters={filters}
            pageSizeOptions
            emptyMessage="No applications found."
            onRowClick={(a) => router.push(`${BASE}/${a.id}`)}
            actions={(a) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`${BASE}/${a.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  {allowedNextStages(a.stage).length > 0 && (
                    <DropdownMenuItem
                      onClick={() => setMoveTarget(a)}
                      className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                    >
                      <ArrowRightLeft className="mr-2 h-4 w-4" /> Move Stage
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => router.push(`${BASE}/${a.id}/edit`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTargetId(a.id)}
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

      {moveTarget && (
        <MoveStageDialog
          applicationId={moveTarget.id}
          currentStage={moveTarget.stage}
          open={!!moveTarget}
          onClose={() => setMoveTarget(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTargetId}
        title="Delete Application"
        description="Are you sure you want to delete this application? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  )
}
