'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, BadgeCheck, Edit, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { useMoney } from '@/contexts/currency-context'
import { OfferStatusBadge } from '@/components/hr/recruitment/RecruitmentBadges'
import { recruitmentUserName } from '@/hooks/useRecruitmentShared'
import { useOffer, useDeleteOffer } from '@/hooks/useOffers'
import { candidateFullName } from '@/hooks/useCandidates'

const LIST = '/dashboard/hr/recruitment?tab=offers'

export default function OfferDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const money = useMoney()

  const { data: offer, isLoading } = useOffer(id)
  const deleteMutation = useDeleteOffer()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id)
      router.push(LIST)
    } finally {
      setConfirmDelete(false)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="hr.view_recruitment">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!offer) {
    return (
      <ProtectedRoute requiredPermission="hr.view_recruitment">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Offer not found</p>
          <Button variant="outline" onClick={() => router.push(LIST)}>
            Back to Offers
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  const candidate = offer.application?.candidate

  return (
    <ProtectedRoute requiredPermission="hr.view_recruitment">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BadgeCheck className="h-8 w-8 text-green-600" />
                {candidate ? candidateFullName(candidate) : 'Offer'}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <span>{offer.application?.requisition?.title ?? '—'}</span>
                <span>•</span>
                <OfferStatusBadge status={offer.status} />
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/hr/recruitment/offers/${id}/edit`)}
              className="border-gray-300"
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
            <ViewHistoryButton entityName="Offer" entityId={id} size="default" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Offer Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <Field label="Candidate" value={candidate ? candidateFullName(candidate) : '—'} />
            <Field label="Requisition" value={offer.application?.requisition?.title ?? '—'} />
            <Field label="Status" value={<OfferStatusBadge status={offer.status} />} />
            <Field label="Offered Salary" value={money(Number(offer.offeredSalary))} />
            <Field
              label="Joining Date"
              value={offer.joiningDate ? format(new Date(offer.joiningDate), 'MMM d, yyyy') : '—'}
            />
            <Field label="Created By" value={recruitmentUserName(offer.creator)} />
            <Field
              label="Created"
              value={offer.createdAt ? format(new Date(offer.createdAt), 'MMM d, yyyy') : '—'}
            />
            <Field
              label="Last Updated"
              value={offer.updatedAt ? format(new Date(offer.updatedAt), 'MMM d, yyyy') : '—'}
            />
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Offer"
        description="Are you sure you want to delete this offer? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </ProtectedRoute>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  )
}
