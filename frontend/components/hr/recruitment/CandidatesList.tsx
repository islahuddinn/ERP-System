'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreVertical, User, Edit, Trash2, FileText } from 'lucide-react'
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
import {
  useCandidates,
  useDeleteCandidate,
  candidateFullName,
  type Candidate,
} from '@/hooks/useCandidates'

const BASE = '/dashboard/hr/recruitment/candidates'

export function CandidatesList() {
  const router = useRouter()
  const controller = useDataTable()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data, isLoading, isError } = useCandidates({ ...(controller.queryParams as any) })
  const deleteMutation = useDeleteCandidate()

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const columns: DataTableColumn<Candidate>[] = [
    {
      key: 'name',
      header: 'Candidate',
      render: (c) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <User className="h-4 w-4 text-gray-400" />
          <span>
            {candidateFullName(c)}
            <span className="block text-xs text-gray-500">{c.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (c) => <span className="text-gray-700">{c.phone || '—'}</span>,
    },
    {
      key: 'source',
      header: 'Source',
      render: (c) => <span className="text-gray-700">{c.source || '—'}</span>,
    },
    {
      key: 'applications',
      header: 'Applications',
      align: 'center',
      render: (c) => <span className="text-gray-700">{c._count?.applications ?? 0}</span>,
    },
  ]

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={() => router.push(`${BASE}/create`)} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> New Candidate
        </Button>
      </div>
      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Candidate>
            columns={columns}
            data={data?.data ?? []}
            meta={data?.meta}
            controller={controller}
            rowKey={(c) => c.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load candidates."
            searchable
            searchPlaceholder="Search candidates…"
            pageSizeOptions
            emptyMessage="No candidates found."
            onRowClick={(c) => router.push(`${BASE}/${c.id}`)}
            actions={(c) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`${BASE}/${c.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`${BASE}/${c.id}/edit`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTargetId(c.id)}
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
        title="Delete Candidate"
        description="Are you sure you want to delete this candidate? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  )
}
