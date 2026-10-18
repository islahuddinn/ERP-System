'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { getApiErrorMessage } from '@/lib/api-error'
import { useCreateLoanRequest } from '@/hooks/useLoanRequests'
import { LoanRequestForm, type LoanRequestFormValues } from '@/components/hr/loans/LoanRequestForm'

export default function CreateLoanRequestPage() {
  const router = useRouter()
  const createMutation = useCreateLoanRequest()

  const onSubmit = async (values: LoanRequestFormValues) => {
    try {
      const created = await createMutation.mutateAsync({
        employeeId: values.employeeId,
        description: values.description.trim() || null,
        totalAmount: Number(values.totalAmount),
        totalInstallments: Number(values.totalInstallments),
        approverIds: values.approverIds,
      })
      router.push(`/dashboard/hr/loans/${created.id}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create loan request'))
    }
  }

  return (
    <ProtectedRoute requiredPermission="loan-requests.create">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/hr/loans')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Banknote className="h-8 w-8 text-green-600" />
              New Loan Request
            </h1>
            <p className="text-gray-600 mt-1">Request a loan on behalf of an employee.</p>
          </div>
        </div>

        <LoanRequestForm
          mode="create"
          isSubmitting={createMutation.isPending}
          onSubmit={onSubmit}
          onCancel={() => router.push('/dashboard/hr/loans')}
        />
      </div>
    </ProtectedRoute>
  )
}
