'use client'

import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, BadgeCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { getApiErrorMessage } from '@/lib/api-error'
import { useOffer, useUpdateOffer } from '@/hooks/useOffers'
import { OfferForm, type OfferFormValues } from '@/components/hr/recruitment/OfferForm'

export default function EditOfferPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const { data: offer, isLoading } = useOffer(id)
  const updateMutation = useUpdateOffer()

  const detailUrl = `/dashboard/hr/recruitment/offers/${id}`

  const onSubmit = async (values: OfferFormValues) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          offeredSalary: Number(values.offeredSalary),
          joiningDate: new Date(values.joiningDate).toISOString(),
          status: values.status,
        },
      })
      router.push(detailUrl)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update offer'))
    }
  }

  return (
    <ProtectedRoute requiredPermission="hr.manage_recruitment">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(detailUrl)}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BadgeCheck className="h-8 w-8 text-green-600" />
              Edit Offer
            </h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : !offer ? (
          <p className="text-center text-gray-500">Offer not found.</p>
        ) : (
          <OfferForm
            mode="edit"
            initialValues={{
              applicationId: offer.applicationId,
              offeredSalary: offer.offeredSalary,
              joiningDate: offer.joiningDate,
              status: offer.status,
            }}
            isSubmitting={updateMutation.isPending}
            onSubmit={onSubmit}
            onCancel={() => router.push(detailUrl)}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
