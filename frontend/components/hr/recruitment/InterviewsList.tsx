'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, MoreVertical, CalendarClock, Edit, Trash2, FileText } from 'lucide-react'
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
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { candidateFullName } from '@/hooks/useCandidates'
import { recruitmentUserName } from '@/hooks/useRecruitmentShared'
import { useInterviews, useDeleteInterview, type Interview } from '@/hooks/useInterviews'

const BASE = '/dashboard/hr/recruitment/interviews'

export function InterviewsList() {
  const router = useRouter()
  const controller = useDataTable()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data, isLoading, isError } = useInterviews({ ...(controller.queryParams as any) })
  const deleteMutation = useDeleteInterview()

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const columns: DataTableColumn<Interview>[] = [
    {
      key: 'candidate',
      header: 'Candidate',
      render: (i) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <CalendarClock className="h-4 w-4 text-gray-400" />
          <span>
            {i.application?.candidate ? candidateFullName(i.application.candidate) : '—'}
            <span className="block text-xs text-gray-500">
              {i.application?.requisition?.title ?? ''}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'interviewType',
      header: 'Type',
      render: (i) => <span className="text-gray-700">{i.interviewType}</span>,
    },
    {
      key: 'interviewDate',
      header: 'Date',
      render: (i) => (
        <span className="text-gray-700">
          {i.interviewDate ? format(new Date(i.interviewDate), 'MMM d, yyyy p') : '—'}
        </span>
      ),
    },
    {
      key: 'interviewer',
      header: 'Interviewer',
      render: (i) => <span className="text-gray-700">{recruitmentUserName(i.interviewer)}</span>,
    },
    {
      key: 'result',
      header: 'Result',
      align: 'center',
      render: (i) => <span className="text-gray-700">{i.result || '—'}</span>,
    },
  ]

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={() => router.push(`${BASE}/create`)} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Schedule Interview
        </Button>
      </div>
      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Interview>
            columns={columns}
            data={data?.data ?? []}
            meta={data?.meta}
            controller={controller}
            rowKey={(i) => i.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load interviews."
            searchable={false}
            pageSizeOptions
            emptyMessage="No interviews found."
            onRowClick={(i) => router.push(`${BASE}/${i.id}`)}
            actions={(i) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`${BASE}/${i.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`${BASE}/${i.id}/edit`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTargetId(i.id)}
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
        title="Delete Interview"
        description="Are you sure you want to delete this interview? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  )
}
