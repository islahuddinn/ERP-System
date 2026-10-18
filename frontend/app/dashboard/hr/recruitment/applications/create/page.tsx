'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { getApiErrorMessage } from '@/lib/api-error'
import { useCreateApplication } from '@/hooks/useApplications'
import { ApplicationForm, type ApplicationFormValues } from '@/components/hr/recruitment/ApplicationForm'

const LIST = '/dashboard/hr/recruitment?tab=applications'

export default function CreateApplicationPage() {
  const router = useRouter()
  const createMutation = useCreateApplication()

  const onSubmit = async (values: ApplicationFormValues) => {
    try {
      const created = await createMutation.mutateAsync({
        candidateId: values.candidateId,
        requisitionId: values.requisitionId,
        notes: values.notes.trim() || null,
      })
      router.push(`/dashboard/hr/recruitment/applications/${created.id}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create application'))
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
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              New Application
            </h1>
            <p className="text-gray-600 mt-1">Link a candidate to a job requisition.</p>
          </div>
        </div>

        <ApplicationForm
          mode="create"
          isSubmitting={createMutation.isPending}
          onSubmit={onSubmit}
          onCancel={() => router.push(LIST)}
        />
      </div>
    </ProtectedRoute>
  )
}
