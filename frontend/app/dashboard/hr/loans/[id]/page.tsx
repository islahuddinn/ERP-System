'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Loader2, Banknote, Edit, Gavel } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { useMoney } from '@/contexts/currency-context'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import {
  LoanStatusBadge,
  LoanApprovalBadge,
  LoanInstallmentBadge,
  LoanRepaymentBadge,
} from '@/components/hr/loans/LoanStatusBadge'
import { ApprovalDecisionDialog } from '@/components/hr/loans/ApprovalDecisionDialog'
import {
  useLoanRequest,
  usePayInstallment,
  loanEmployeeName,
  userDisplayName,
  type LoanRequest,
} from '@/hooks/useLoanRequests'

export default function LoanRequestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const loanRequestId = params?.id as string

  const { data: loan, isLoading } = useLoanRequest(loanRequestId)
  const { hasPermission } = usePermissionCheck()
  const payInstallment = usePayInstallment()

  const [approvalOpen, setApprovalOpen] = useState(false)
  const [payTargetId, setPayTargetId] = useState<string | null>(null)

  const canApprove = hasPermission('loan-requests.approve')
  const canManage = hasPermission('loan-requests.manage')

  const confirmPay = async () => {
    if (!payTargetId) return
    try {
      await payInstallment.mutateAsync({ id: loanRequestId, installmentId: payTargetId })
    } finally {
      setPayTargetId(null)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="loan-requests.view">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!loan) {
    return (
      <ProtectedRoute requiredPermission="loan-requests.view">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Loan request not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/loans')}>
            Back to Loan Requests
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="loan-requests.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Banknote className="h-8 w-8 text-green-600" />
                {loanEmployeeName(loan.employee)}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <span>{loan.employee.employeeCode}</span>
                <span>•</span>
                <LoanStatusBadge status={loan.status} />
                <LoanRepaymentBadge status={loan.repaymentStatus} />
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canApprove && loan.status === 'PENDING' && (
              <Button
                onClick={() => setApprovalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Gavel className="mr-2 h-4 w-4" /> Decide Approval
              </Button>
            )}
            {loan.status === 'PENDING' && (
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/hr/loans/${loanRequestId}/edit`)}
                className="border-gray-300"
              >
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
            <ViewHistoryButton entityName="LoanRequest" entityId={loanRequestId} size="default" />
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="approvals">Approvals ({loan.approvals.length})</TabsTrigger>
            <TabsTrigger value="installments">Installments ({loan.installments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab loan={loan} />
          </TabsContent>
          <TabsContent value="approvals">
            <ApprovalsTab loan={loan} />
          </TabsContent>
          <TabsContent value="installments">
            <InstallmentsTab
              loan={loan}
              canManage={canManage}
              onPay={(installmentId) => setPayTargetId(installmentId)}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ApprovalDecisionDialog
        loanRequestId={loanRequestId}
        open={approvalOpen}
        onClose={() => setApprovalOpen(false)}
      />

      <ConfirmDialog
        open={payTargetId !== null}
        title="Mark Installment as Paid"
        description="Mark this installment as paid? This adds its amount to the loan's paid total and cannot be undone."
        confirmLabel="Mark as Paid"
        confirmVariant="default"
        onConfirm={confirmPay}
        onCancel={() => setPayTargetId(null)}
      />
    </ProtectedRoute>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  )
}

function OverviewTab({ loan }: { loan: LoanRequest }) {
  const money = useMoney()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan Summary</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <Field label="Employee" value={loanEmployeeName(loan.employee)} />
        <Field label="Employee Code" value={loan.employee.employeeCode} />
        <Field label="Status" value={<LoanStatusBadge status={loan.status} />} />
        <Field label="Total Amount" value={money(loan.totalAmount)} />
        <Field label="Paid Amount" value={<span className="text-green-700">{money(loan.paidAmount)}</span>} />
        <Field label="Remaining" value={money(loan.remainingAmount)} />
        <Field label="Installments" value={loan.totalInstallments} />
        <Field label="Repayment" value={<LoanRepaymentBadge status={loan.repaymentStatus} />} />
        <Field label="Created By" value={userDisplayName(loan.createdBy)} />
        <div className="md:col-span-3">
          <p className="text-muted-foreground text-xs">Description</p>
          <p className="font-medium text-gray-900">{loan.description || '—'}</p>
        </div>
        <Field label="Created" value={format(new Date(loan.createdAt), 'MMM d, yyyy')} />
        <Field label="Last Updated" value={format(new Date(loan.updatedAt), 'MMM d, yyyy')} />
      </CardContent>
    </Card>
  )
}

function ApprovalsTab({ loan }: { loan: LoanRequest }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Approvers</CardTitle>
      </CardHeader>
      <CardContent>
        {loan.approvals.length === 0 ? (
          <p className="text-sm text-gray-500">No approvers assigned.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Approver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Decided At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loan.approvals.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell className="font-medium">
                    {userDisplayName(approval.approver)}
                    <span className="block text-xs text-gray-500">{approval.approver?.email}</span>
                  </TableCell>
                  <TableCell>
                    <LoanApprovalBadge status={approval.status} />
                  </TableCell>
                  <TableCell className="text-gray-600">{approval.remarks || '—'}</TableCell>
                  <TableCell className="text-gray-600">
                    {approval.decidedAt ? format(new Date(approval.decidedAt), 'MMM d, yyyy p') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function InstallmentsTab({
  loan,
  canManage,
  onPay,
}: {
  loan: LoanRequest
  canManage: boolean
  onPay: (installmentId: string) => void
}) {
  const money = useMoney()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repayment Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        {loan.installments.length === 0 ? (
          <p className="text-sm text-gray-500">
            No installments yet — they are generated once the loan request is fully approved.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Return Month</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid At</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loan.installments.map((installment) => (
                <TableRow key={installment.id}>
                  <TableCell>{installment.installmentNumber}</TableCell>
                  <TableCell className="font-mono text-sm">{installment.returnMonth}</TableCell>
                  <TableCell className="text-right font-medium">{money(installment.amount)}</TableCell>
                  <TableCell>
                    <LoanInstallmentBadge status={installment.status} />
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {installment.paidAt ? format(new Date(installment.paidAt), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && installment.status === 'PENDING' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-300"
                        onClick={() => onPay(installment.id)}
                      >
                        Pay
                      </Button>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
