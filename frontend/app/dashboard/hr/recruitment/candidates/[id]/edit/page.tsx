'use client'

import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { getApiErrorMessage } from '@/lib/api-error'
import { useCandidate, useUpdateCandidate } from '@/hooks/useCandidates'
import { CandidateForm, type CandidateFormValues } from '@/components/hr/recruitment/CandidateForm'

export default function EditCandidatePage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const { data: candidate, isLoading } = useCandidate(id)
  const updateMutation = useUpdateCandidate()

  const detailUrl = `/dashboard/hr/recruitment/candidates/${id}`

  const onSubmit = async (values: CandidateFormValues) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          phone: values.phone.trim() || null,
          resumeUrl: values.resumeUrl.trim() || null,
          source: values.source.trim() || null,
        },
      })
      router.push(detailUrl)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update candidate'))
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
              <User className="h-8 w-8 text-green-600" />
              Edit Candidate
            </h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : !candidate ? (
          <p className="text-center text-gray-500">Candidate not found.</p>
        ) : (
          <CandidateForm
            mode="edit"
            initialValues={{
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              email: candidate.email,
              phone: candidate.phone,
              resumeUrl: candidate.resumeUrl,
              source: candidate.source,
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
