'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { getApiErrorMessage } from '@/lib/api-error'
import { useCreateOffer } from '@/hooks/useOffers'
import { OfferForm, type OfferFormValues } from '@/components/hr/recruitment/OfferForm'

const LIST = '/dashboard/hr/recruitment?tab=offers'

export default function CreateOfferPage() {
  const router = useRouter()
  const createMutation = useCreateOffer()

  const onSubmit = async (values: OfferFormValues) => {
    try {
      const created = await createMutation.mutateAsync({
        applicationId: values.applicationId,
        offeredSalary: Number(values.offeredSalary),
        joiningDate: new Date(values.joiningDate).toISOString(),
      })
      router.push(`/dashboard/hr/recruitment/offers/${created.id}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create offer'))
    }
  }

  return (
    <ProtectedRoute requiredPermission="hr.manage_recruitment">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(LIST)}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BadgeCheck className="h-8 w-8 text-green-600" />
              New Offer
            </h1>
            <p className="text-gray-600 mt-1">Extend an offer to a shortlisted candidate.</p>
          </div>
        </div>

        <OfferForm
          mode="create"
          isSubmitting={createMutation.isPending}
          onSubmit={onSubmit}
          onCancel={() => router.push(LIST)}
        />
      </div>
    </ProtectedRoute>
  )
}
