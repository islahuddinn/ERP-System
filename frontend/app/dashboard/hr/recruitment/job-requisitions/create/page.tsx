'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { getApiErrorMessage } from '@/lib/api-error'
import { useCreateJobRequisition, type EmploymentType } from '@/hooks/useJobRequisitions'
import {
  JobRequisitionForm,
  type JobRequisitionFormValues,
} from '@/components/hr/recruitment/JobRequisitionForm'

const LIST = '/dashboard/hr/recruitment?tab=requisitions'

export default function CreateJobRequisitionPage() {
  const router = useRouter()
  const createMutation = useCreateJobRequisition()

  const onSubmit = async (values: JobRequisitionFormValues) => {
    try {
      const created = await createMutation.mutateAsync({
        title: values.title.trim(),
        departmentId: values.departmentId,
        positionId: values.positionId,
        employmentType: values.employmentType as EmploymentType,
        openings: Number(values.openings),
        status: values.status,
        description: values.description.trim() || null,
      })
      router.push(`/dashboard/hr/recruitment/job-requisitions/${created.id}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create job requisition'))
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
              <Briefcase className="h-8 w-8 text-green-600" />
              New Job Requisition
            </h1>
            <p className="text-gray-600 mt-1">Open a new requisition to start hiring.</p>
          </div>
        </div>

        <JobRequisitionForm
          mode="create"
          isSubmitting={createMutation.isPending}
          onSubmit={onSubmit}
          onCancel={() => router.push(LIST)}
        />
      </div>
    </ProtectedRoute>
  )
}
