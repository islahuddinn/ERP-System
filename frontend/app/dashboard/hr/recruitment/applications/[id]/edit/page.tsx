'use client'

import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { getApiErrorMessage } from '@/lib/api-error'
import { useApplication, useUpdateApplication } from '@/hooks/useApplications'
import { ApplicationForm, type ApplicationFormValues } from '@/components/hr/recruitment/ApplicationForm'

export default function EditApplicationPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const { data: application, isLoading } = useApplication(id)
  const updateMutation = useUpdateApplication()

  const detailUrl = `/dashboard/hr/recruitment/applications/${id}`

  const onSubmit = async (values: ApplicationFormValues) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          status: values.status.trim() || undefined,
          notes: values.notes.trim() || null,
        },
      })
      router.push(detailUrl)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update application'))
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
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              Edit Application
            </h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : !application ? (
          <p className="text-center text-gray-500">Application not found.</p>
        ) : (
          <ApplicationForm
            mode="edit"
            initialValues={{
              candidateId: application.candidateId,
              requisitionId: application.requisitionId,
              status: application.status,
              notes: application.notes,
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
