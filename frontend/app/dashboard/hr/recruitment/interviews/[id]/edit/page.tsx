'use client'

import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, CalendarClock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { getApiErrorMessage } from '@/lib/api-error'
import { useInterview, useUpdateInterview } from '@/hooks/useInterviews'
import { InterviewForm, type InterviewFormValues } from '@/components/hr/recruitment/InterviewForm'

export default function EditInterviewPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const { data: interview, isLoading } = useInterview(id)
  const updateMutation = useUpdateInterview()

  const detailUrl = `/dashboard/hr/recruitment/interviews/${id}`

  const onSubmit = async (values: InterviewFormValues) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          interviewDate: new Date(values.interviewDate).toISOString(),
          interviewType: values.interviewType,
          result: values.result.trim() || null,
          feedback: values.feedback.trim() || null,
        },
      })
      router.push(detailUrl)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update interview'))
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
              <CalendarClock className="h-8 w-8 text-green-600" />
              Edit Interview
            </h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : !interview ? (
          <p className="text-center text-gray-500">Interview not found.</p>
        ) : (
          <InterviewForm
            mode="edit"
            initialValues={{
              applicationId: interview.applicationId,
              interviewerId: interview.interviewerId,
              interviewDate: interview.interviewDate,
              interviewType: interview.interviewType,
              result: interview.result,
              feedback: interview.feedback,
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
