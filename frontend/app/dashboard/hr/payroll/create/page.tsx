'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Loader2, Wallet, Calculator, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useMoney } from '@/contexts/currency-context'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  useHrEmployeesDropdown,
  usePayrollPreview,
  useCreatePayroll,
  employeeOptionLabel,
  isBulkPayrollResult,
  type PayrollPreview,
  type PayrollPeriodPayload,
} from '@/hooks/usePayroll'

export default function CreatePayrollPage() {
  const router = useRouter()
  const money = useMoney()

  const { data: employees = [], isLoading: isLoadingEmployees } = useHrEmployeesDropdown()
  const previewMutation = usePayrollPreview()
  const createMutation = useCreatePayroll()

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [paidMonth, setPaidMonth] = useState('')
  const [preview, setPreview] = useState<PayrollPreview | null>(null)

  const toggleEmployee = (id: string) => {
    setPreview(null)
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const validate = (): PayrollPeriodPayload | null => {
    if (selectedEmployeeIds.length === 0) {
      toast.error('Select at least one employee')
      return null
    }
    if (!periodStart || !periodEnd || !paidMonth) {
      toast.error('Period start, period end, and paid month are all required')
      return null
    }
    if (periodEnd < periodStart) {
      toast.error('Period end cannot be before period start')
      return null
    }
    return { employeeIds: selectedEmployeeIds, periodStart, periodEnd, paidMonth }
  }

  const handlePreview = async () => {
    const payload = validate()
    if (!payload) return
    try {
      const result = await previewMutation.mutateAsync(payload)
      setPreview(result)
      toast.success('Preview calculated for the first selected employee')
    } catch (error) {
      setPreview(null)
      toast.error(getApiErrorMessage(error, 'Failed to preview payroll'))
    }
  }

  const handleCreate = async () => {
    const payload = validate()
    if (!payload) return
    try {
      const result = await createMutation.mutateAsync(payload)
      if (isBulkPayrollResult(result)) {
        toast.success(`Payroll created for ${result.created.length} employee(s)`)
        if (result.failed.length > 0) {
          toast.error(`${result.failed.length} employee(s) failed: ${result.failed[0].reason}`)
        }
        router.push('/dashboard/hr/payroll')
      } else {
        toast.success('Payroll created successfully')
        router.push(`/dashboard/hr/payroll/${result.id}`)
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create payroll'))
    }
  }

  return (
    <ProtectedRoute requiredPermission="payroll.create">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/hr/payroll')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Wallet className="h-8 w-8 text-green-600" />
              Run Payroll
            </h1>
            <p className="text-gray-600 mt-1">
              Select employees and a period, preview the calculation, then create the payroll.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Payroll Period</CardTitle>
              <CardDescription>
                Choose the pay period and the month the payroll is paid in (used to match loan installments).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="periodStart" className="text-gray-700 font-medium">
                    Period Start <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="periodStart"
                    type="date"
                    value={periodStart}
                    onChange={(e) => {
                      setPeriodStart(e.target.value)
                      setPreview(null)
                    }}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                </div>
                <div>
                  <Label htmlFor="periodEnd" className="text-gray-700 font-medium">
                    Period End <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="periodEnd"
                    type="date"
                    value={periodEnd}
                    onChange={(e) => {
                      setPeriodEnd(e.target.value)
                      setPreview(null)
                    }}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="paidMonth" className="text-gray-700 font-medium">
                  Paid Month <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="paidMonth"
                  type="month"
                  value={paidMonth}
                  onChange={(e) => {
                    setPaidMonth(e.target.value)
                    setPreview(null)
                  }}
                  className="mt-1.5 h-11 border-gray-300"
                />
              </div>

              <div>
                <Label className="text-gray-700 font-medium">
                  Employees <span className="text-red-500">*</span>
                </Label>
                <div className="mt-1.5 max-h-64 overflow-y-auto rounded-md border border-gray-300 divide-y divide-gray-100">
                  {isLoadingEmployees ? (
                    <p className="p-3 text-sm text-gray-500">Loading…</p>
                  ) : employees.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500">No active employees found.</p>
                  ) : (
                    employees.map((emp) => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={selectedEmployeeIds.includes(emp.id)}
                          onCheckedChange={() => toggleEmployee(emp.id)}
                        />
                        <span className="text-sm text-gray-800">{employeeOptionLabel(emp)}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedEmployeeIds.length} selected. Preview shows the first selected employee only.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreview}
                  disabled={previewMutation.isPending}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {previewMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Calculating...</>
                  ) : (
                    <><Calculator className="mr-2 h-4 w-4" />Preview</>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" />Create Payroll</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Calculation Preview</CardTitle>
              <CardDescription>
                A read-only estimate for the first selected employee. Nothing is saved until you create.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!preview ? (
                <p className="text-sm text-gray-500">
                  Run a preview to see the salary breakdown and deductions.
                </p>
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <PreviewRow label="Gross Salary" value={money(Number(preview.grossSalary))} />
                    <PreviewRow label="Allowances" value={money(Number(preview.allowancesTotal))} />
                    <PreviewRow label="Salary / Day" value={money(Number(preview.salaryPerDay))} />
                    <PreviewRow label="Salary / Hour" value={money(Number(preview.salaryPerHour))} />
                    <PreviewRow label="Calendar Days" value={String(preview.totalCalendarDays)} />
                    <PreviewRow label="Working Days" value={String(preview.workingDays)} />
                    <PreviewRow label="Holidays" value={String(preview.holidays)} />
                    <PreviewRow label="Weekends" value={String(preview.weekends)} />
                    <PreviewRow label="Paid Leave Days" value={String(preview.paidLeaveDays)} />
                    <PreviewRow label="Unpaid Leave Days" value={String(preview.unpaidLeaveDays)} />
                    <PreviewRow label="Present Days" value={String(preview.presentDays)} />
                    <PreviewRow label="Absent Days" value={String(preview.absentDays)} />
                    <PreviewRow label="Late Minutes" value={String(preview.timingMinutes)} />
                  </div>

                  <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3">
                    <PreviewRow label="Absence Deduction" value={money(Number(preview.absentDaysDeduction))} negative />
                    <PreviewRow label="Timing Deduction" value={money(Number(preview.timingDeduction))} negative />
                    <PreviewRow label="Unpaid Leave Deduction" value={money(Number(preview.unpaidLeaveDeduction))} negative />
                    <PreviewRow label="Loan Deduction" value={money(Number(preview.loanDeduction))} negative />
                    <PreviewRow label="Total Deductions" value={money(Number(preview.totalDeductions))} negative />
                  </div>

                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                    <span className="font-medium text-gray-700">Net Pay</span>
                    <span className="text-lg font-bold text-green-700">{money(Number(preview.netPay))}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}

function PreviewRow({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`font-medium ${negative ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
