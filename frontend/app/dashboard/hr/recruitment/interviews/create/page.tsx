'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { getApiErrorMessage } from '@/lib/api-error'
import { useCreateInterview } from '@/hooks/useInterviews'
import { InterviewForm, type InterviewFormValues } from '@/components/hr/recruitment/InterviewForm'

const LIST = '/dashboard/hr/recruitment?tab=interviews'

export default function CreateInterviewPage() {
  const router = useRouter()
  const createMutation = useCreateInterview()

  const onSubmit = async (values: InterviewFormValues) => {
    try {
      const created = await createMutation.mutateAsync({
        applicationId: values.applicationId,
        interviewerId: values.interviewerId,
        interviewDate: new Date(values.interviewDate).toISOString(),
        interviewType: values.interviewType,
      })
      router.push(`/dashboard/hr/recruitment/interviews/${created.id}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to schedule interview'))
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
              <CalendarClock className="h-8 w-8 text-green-600" />
              Schedule Interview
            </h1>
            <p className="text-gray-600 mt-1">Book an interview for an application.</p>
          </div>
        </div>

        <InterviewForm
          mode="create"
          isSubmitting={createMutation.isPending}
          onSubmit={onSubmit}
          onCancel={() => router.push(LIST)}
        />
      </div>
    </ProtectedRoute>
  )
}
