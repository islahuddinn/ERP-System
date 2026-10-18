'use client'

import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Briefcase, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  useJobRequisition,
  useUpdateJobRequisition,
  type EmploymentType,
} from '@/hooks/useJobRequisitions'
import {
  JobRequisitionForm,
  type JobRequisitionFormValues,
} from '@/components/hr/recruitment/JobRequisitionForm'

export default function EditJobRequisitionPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const { data: requisition, isLoading } = useJobRequisition(id)
  const updateMutation = useUpdateJobRequisition()

  const detailUrl = `/dashboard/hr/recruitment/job-requisitions/${id}`

  const onSubmit = async (values: JobRequisitionFormValues) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          title: values.title.trim(),
          departmentId: values.departmentId,
          positionId: values.positionId,
          employmentType: values.employmentType as EmploymentType,
          openings: Number(values.openings),
          status: values.status,
          description: values.description.trim() || null,
        },
      })
      router.push(detailUrl)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update job requisition'))
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
              <Briefcase className="h-8 w-8 text-green-600" />
              Edit Job Requisition
            </h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : !requisition ? (
          <p className="text-center text-gray-500">Job requisition not found.</p>
        ) : (
          <JobRequisitionForm
            mode="edit"
            initialValues={{
              title: requisition.title,
              departmentId: requisition.departmentId,
              positionId: requisition.positionId,
              employmentType: requisition.employmentType,
              openings: requisition.openings,
              status: requisition.status,
              description: requisition.description,
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
