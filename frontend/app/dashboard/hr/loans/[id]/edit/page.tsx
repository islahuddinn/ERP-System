'use client'

import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Banknote, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { getApiErrorMessage } from '@/lib/api-error'
import { useLoanRequest, useUpdateLoanRequest } from '@/hooks/useLoanRequests'
import {
  LoanRequestForm,
  type LoanRequestFormValues,
  type LoanFormInitialValues,
} from '@/components/hr/loans/LoanRequestForm'

export default function EditLoanRequestPage() {
  const router = useRouter()
  const params = useParams()
  const loanRequestId = params?.id as string

  const { data: loan, isLoading } = useLoanRequest(loanRequestId)
  const updateMutation = useUpdateLoanRequest()

  const onSubmit = async (values: LoanRequestFormValues) => {
    try {
      await updateMutation.mutateAsync({
        id: loanRequestId,
        data: {
          description: values.description.trim() || null,
          totalAmount: Number(values.totalAmount),
          totalInstallments: Number(values.totalInstallments),
          approverIds: values.approverIds,
        },
      })
      router.push(`/dashboard/hr/loans/${loanRequestId}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update loan request'))
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="loan-requests.update">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!loan) {
    return (
      <ProtectedRoute requiredPermission="loan-requests.update">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-red-500">
          <p>Loan request not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/loans')} className="mt-4">
            Back to Loan Requests
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  if (loan.status !== 'PENDING') {
    return (
      <ProtectedRoute requiredPermission="loan-requests.update">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Only pending loan requests can be edited.</p>
          <Button variant="outline" onClick={() => router.push(`/dashboard/hr/loans/${loanRequestId}`)}>
            Back to Loan Request
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  const initialValues: LoanFormInitialValues = {
    employeeId: loan.employeeId,
    description: loan.description,
    totalAmount: loan.totalAmount,
    totalInstallments: loan.totalInstallments,
    approverIds: loan.approvals.map((approval) => approval.approverId),
  }

  return (
    <ProtectedRoute requiredPermission="loan-requests.update">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/hr/loans/${loanRequestId}`)}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Banknote className="h-8 w-8 text-green-600" />
              Edit Loan Request
            </h1>
            <p className="text-gray-600 mt-1">Update amount, installments, description, or approvers.</p>
          </div>
        </div>

        <LoanRequestForm
          mode="edit"
          initialValues={initialValues}
          isSubmitting={updateMutation.isPending}
          onSubmit={onSubmit}
          onCancel={() => router.push(`/dashboard/hr/loans/${loanRequestId}`)}
        />
      </div>
    </ProtectedRoute>
  )
}
