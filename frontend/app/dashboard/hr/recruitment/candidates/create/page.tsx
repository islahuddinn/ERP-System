'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { getApiErrorMessage } from '@/lib/api-error'
import { useCreateCandidate } from '@/hooks/useCandidates'
import { CandidateForm, type CandidateFormValues } from '@/components/hr/recruitment/CandidateForm'

const LIST = '/dashboard/hr/recruitment?tab=candidates'

export default function CreateCandidatePage() {
  const router = useRouter()
  const createMutation = useCreateCandidate()

  const onSubmit = async (values: CandidateFormValues) => {
    try {
      const created = await createMutation.mutateAsync({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || null,
        resumeUrl: values.resumeUrl.trim() || null,
        source: values.source.trim() || null,
      })
      router.push(`/dashboard/hr/recruitment/candidates/${created.id}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create candidate'))
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
              <User className="h-8 w-8 text-green-600" />
              New Candidate
            </h1>
            <p className="text-gray-600 mt-1">Add a candidate to the talent pool.</p>
          </div>
        </div>

        <CandidateForm
          mode="create"
          isSubmitting={createMutation.isPending}
          onSubmit={onSubmit}
          onCancel={() => router.push(LIST)}
        />
      </div>
    </ProtectedRoute>
  )
}
