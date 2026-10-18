'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, MoreVertical, BadgeCheck, Edit, Trash2, FileText } from 'lucide-react'
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
import { useMoney } from '@/contexts/currency-context'
import { OfferStatusBadge } from '@/components/hr/recruitment/RecruitmentBadges'
import { candidateFullName } from '@/hooks/useCandidates'
import { useOffers, useDeleteOffer, OFFER_STATUSES, type Offer } from '@/hooks/useOffers'

const BASE = '/dashboard/hr/recruitment/offers'

export function OffersList() {
  const router = useRouter()
  const controller = useDataTable()
  const money = useMoney()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data, isLoading, isError } = useOffers({ ...(controller.queryParams as any) })
  const deleteMutation = useDeleteOffer()

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const filters: DataTableFilter<Offer>[] = [
    {
      key: 'status',
      label: 'Status',
      options: OFFER_STATUSES.map((status) => ({ value: status, label: status })),
    },
  ]

  const columns: DataTableColumn<Offer>[] = [
    {
      key: 'candidate',
      header: 'Candidate',
      render: (o) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <BadgeCheck className="h-4 w-4 text-gray-400" />
          <span>
            {o.application?.candidate ? candidateFullName(o.application.candidate) : '—'}
            <span className="block text-xs text-gray-500">
              {o.application?.requisition?.title ?? ''}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'offeredSalary',
      header: 'Salary',
      align: 'right',
      render: (o) => <span className="text-gray-900 font-medium">{money(Number(o.offeredSalary))}</span>,
    },
    {
      key: 'joiningDate',
      header: 'Joining Date',
      render: (o) => (
        <span className="text-gray-700">
          {o.joiningDate ? format(new Date(o.joiningDate), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (o) => (
        <div className="flex justify-center">
          <OfferStatusBadge status={o.status} />
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={() => router.push(`${BASE}/create`)} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> New Offer
        </Button>
      </div>
      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Offer>
            columns={columns}
            data={data?.data ?? []}
            meta={data?.meta}
            controller={controller}
            rowKey={(o) => o.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load offers."
            searchable={false}
            filters={filters}
            pageSizeOptions
            emptyMessage="No offers found."
            onRowClick={(o) => router.push(`${BASE}/${o.id}`)}
            actions={(o) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`${BASE}/${o.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`${BASE}/${o.id}/edit`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTargetId(o.id)}
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
        title="Delete Offer"
        description="Are you sure you want to delete this offer? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  )
}
