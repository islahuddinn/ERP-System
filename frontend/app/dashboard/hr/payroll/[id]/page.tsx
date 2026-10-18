'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Loader2, Wallet, CheckCircle2, BadgeDollarSign, Gift } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { useMoney } from '@/contexts/currency-context'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import { PayrollStatusBadge } from '@/components/hr/payroll/PayrollStatusBadge'
import { BonusDialog } from '@/components/hr/payroll/BonusDialog'
import {
  usePayroll,
  useApprovePayroll,
  usePayPayroll,
  payrollEmployeeName,
  type Payroll,
} from '@/hooks/usePayroll'

type WorkflowAction = 'approve' | 'pay' | null

export default function PayrollDetailPage() {
  const router = useRouter()
  const params = useParams()
  const payrollId = params?.id as string

  const { data: payroll, isLoading } = usePayroll(payrollId)
  const { hasPermission } = usePermissionCheck()
  const approveMutation = useApprovePayroll()
  const payMutation = usePayPayroll()

  const [workflowAction, setWorkflowAction] = useState<WorkflowAction>(null)
  const [bonusOpen, setBonusOpen] = useState(false)

  const canApprove = hasPermission('payroll.approve')
  const canManage = hasPermission('payroll.create')

  const confirmWorkflow = async () => {
    if (!payroll) return
    try {
      if (workflowAction === 'approve') await approveMutation.mutateAsync(payroll.id)
      if (workflowAction === 'pay') await payMutation.mutateAsync(payroll.id)
    } finally {
      setWorkflowAction(null)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="payroll.view">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!payroll) {
    return (
      <ProtectedRoute requiredPermission="payroll.view">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Payroll record not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/payroll')}>
            Back to Payroll
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="payroll.view">
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
                <Wallet className="h-8 w-8 text-green-600" />
                {payrollEmployeeName(payroll.employee)}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <span>{payroll.employee.employeeCode}</span>
                <span>•</span>
                <span className="font-mono">{payroll.paidMonth}</span>
                <PayrollStatusBadge status={payroll.status} />
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canManage && payroll.status === 'DRAFT' && (
              <Button variant="outline" onClick={() => setBonusOpen(true)} className="border-gray-300">
                <Gift className="mr-2 h-4 w-4" /> Bonus
              </Button>
            )}
            {canApprove && payroll.status === 'DRAFT' && (
              <Button
                onClick={() => setWorkflowAction('approve')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
              </Button>
            )}
            {canApprove && payroll.status === 'APPROVED' && (
              <Button
                onClick={() => setWorkflowAction('pay')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <BadgeDollarSign className="mr-2 h-4 w-4" /> Mark as Paid
              </Button>
            )}
            <ViewHistoryButton entityName="Payroll" entityId={payrollId} size="default" />
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="earnings">Earnings & Deductions</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab payroll={payroll} />
          </TabsContent>
          <TabsContent value="earnings">
            <EarningsTab payroll={payroll} />
          </TabsContent>
          <TabsContent value="attendance">
            <AttendanceTab payroll={payroll} />
          </TabsContent>
        </Tabs>
      </div>

      {payroll.status === 'DRAFT' && (
        <BonusDialog payroll={payroll} open={bonusOpen} onClose={() => setBonusOpen(false)} />
      )}

      <ConfirmDialog
        open={workflowAction !== null}
        title={workflowAction === 'approve' ? 'Approve Payroll' : 'Mark Payroll as Paid'}
        description={
          workflowAction === 'approve'
            ? 'Approve this payroll? Once approved it can no longer be edited, only paid.'
            : 'Mark this payroll as paid? Any matching loan installment for the paid month will also be settled.'
        }
        confirmLabel={workflowAction === 'approve' ? 'Approve' : 'Mark as Paid'}
        confirmVariant="default"
        onConfirm={confirmWorkflow}
        onCancel={() => setWorkflowAction(null)}
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

function MoneyField({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`font-medium ${negative ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function OverviewTab({ payroll }: { payroll: Payroll }) {
  const money = useMoney()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Summary</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <Field label="Employee" value={payrollEmployeeName(payroll.employee)} />
        <Field label="Employee Code" value={payroll.employee.employeeCode} />
        <Field label="Status" value={<PayrollStatusBadge status={payroll.status} />} />
        <Field label="Period Start" value={format(new Date(payroll.periodStart), 'MMM d, yyyy')} />
        <Field label="Period End" value={format(new Date(payroll.periodEnd), 'MMM d, yyyy')} />
        <Field label="Paid Month" value={<span className="font-mono">{payroll.paidMonth}</span>} />
        <MoneyField label="Gross Salary" value={money(Number(payroll.grossSalary))} />
        <MoneyField label="Total Deductions" value={money(Number(payroll.totalDeductions))} negative />
        <div>
          <p className="text-muted-foreground text-xs">Net Pay</p>
          <p className="text-lg font-bold text-green-700">{money(Number(payroll.netPay))}</p>
        </div>
        <Field
          label="Approved At"
          value={payroll.approvedAt ? format(new Date(payroll.approvedAt), 'MMM d, yyyy p') : '—'}
        />
        <Field
          label="Paid At"
          value={payroll.paidAt ? format(new Date(payroll.paidAt), 'MMM d, yyyy p') : '—'}
        />
        <Field label="Created" value={format(new Date(payroll.createdAt), 'MMM d, yyyy')} />
      </CardContent>
    </Card>
  )
}

function EarningsTab({ payroll }: { payroll: Payroll }) {
  const money = useMoney()
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Earnings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <MoneyField label="Base + Allowances (Gross)" value={money(Number(payroll.grossSalary))} />
          <MoneyField label="Allowances Total" value={money(Number(payroll.allowancesTotal))} />
          <MoneyField label="Bonus Amount" value={money(Number(payroll.bonusAmount))} />
          <Field label="Bonus Reason" value={payroll.bonusReason || '—'} />
          <MoneyField label="Salary / Day" value={money(Number(payroll.salaryPerDay))} />
          <MoneyField label="Salary / Hour" value={money(Number(payroll.salaryPerHour))} />
          <MoneyField label="Salary / Minute" value={money(Number(payroll.salaryPerMinute))} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Deductions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <MoneyField label="Absence Deduction" value={money(Number(payroll.absentDaysDeduction))} negative />
          <MoneyField label="Timing Deduction" value={money(Number(payroll.timingDeduction))} negative />
          <MoneyField label="Unpaid Leave Deduction" value={money(Number(payroll.unpaidLeaveDeduction))} negative />
          <MoneyField label="Loan Deduction" value={money(Number(payroll.loanDeduction))} negative />
          <div className="col-span-2 border-t border-gray-100 pt-3 flex items-center justify-between">
            <span className="font-medium text-gray-700">Total Deductions</span>
            <span className="font-bold text-red-600">{money(Number(payroll.totalDeductions))}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AttendanceTab({ payroll }: { payroll: Payroll }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance & Working Days</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <Field label="Calendar Days" value={payroll.totalCalendarDays} />
        <Field label="Working Days" value={payroll.workingDays} />
        <Field label="Holidays" value={payroll.holidays} />
        <Field label="Weekends" value={payroll.weekends} />
        <Field label="Present Days" value={payroll.presentDays} />
        <Field label="Absent Days" value={payroll.absentDays} />
        <Field label="Paid Leave Days" value={payroll.paidLeaveDays} />
        <Field label="Unpaid Leave Days" value={payroll.unpaidLeaveDays} />
        <Field label="Late / Timing Minutes" value={payroll.timingMinutes} />
      </CardContent>
    </Card>
  )
}
