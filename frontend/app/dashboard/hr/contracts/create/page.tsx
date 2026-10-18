'use client'

import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useCreateContract, type ContractType, type SalaryFrequency } from '@/hooks/useContracts'
import { useEmployeesDropdown } from '@/hooks/useEmployees'
import { useDepartmentsDropdown } from '@/hooks/useDepartments'
import { usePositionsDropdown } from '@/hooks/usePositions'
import { CONTRACT_TYPE_OPTIONS, SALARY_FREQUENCY_OPTIONS } from '@/components/hr/contracts/constants'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, FileSignature } from 'lucide-react'

const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/

interface ContractFormData {
  employeeId: string
  contractType: ContractType | ''
  departmentId: string
  positionId: string
  startDate: string
  endDate: string
  probationEndDate: string
  totalLeaves: string
  baseSalary: string
  currency: string
  salaryFrequency: SalaryFrequency
  effectiveDate: string
  reason: string
  notes: string
}

export default function CreateContractPage() {
  const router = useRouter()
  const createMutation = useCreateContract()
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployeesDropdown()
  const { data: departments = [], isLoading: isLoadingDepartments } = useDepartmentsDropdown()
  const { data: positions = [], isLoading: isLoadingPositions } = usePositionsDropdown()

  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors },
  } = useForm<ContractFormData>({
    defaultValues: {
      employeeId: '',
      contractType: '',
      departmentId: '',
      positionId: '',
      startDate: '',
      endDate: '',
      probationEndDate: '',
      totalLeaves: '',
      baseSalary: '',
      currency: '',
      salaryFrequency: 'MONTHLY',
      effectiveDate: '',
      reason: '',
      notes: '',
    },
  })

  const onSubmit = async (data: ContractFormData) => {
    try {
      await createMutation.mutateAsync({
        employeeId: data.employeeId,
        contractType: data.contractType as ContractType,
        departmentId: data.departmentId || undefined,
        positionId: data.positionId || undefined,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        probationEndDate: data.probationEndDate ? new Date(data.probationEndDate).toISOString() : undefined,
        totalLeaves: Number(data.totalLeaves),
        salary: {
          baseSalary: data.baseSalary,
          currency: data.currency.trim() || undefined,
          salaryFrequency: data.salaryFrequency,
          effectiveDate: data.effectiveDate ? new Date(data.effectiveDate).toISOString() : undefined,
          reason: data.reason.trim() || undefined,
        },
        notes: data.notes.trim() || undefined,
      })
      router.push('/dashboard/hr/contracts')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create contract'))
    }
  }

  const isLoading = createMutation.isPending

  return (
    <ProtectedRoute requiredPermission="hr.manage_contracts">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/hr/contracts')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileSignature className="h-8 w-8 text-green-600" />
              Add Contract
            </h1>
            <p className="text-gray-600 mt-1">Create a contract in DRAFT — activate it later.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Assignment</CardTitle>
              <CardDescription>Who the contract is for and their role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="employeeId" className="text-gray-700 font-medium">
                  Employee <span className="text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="employeeId"
                  rules={{ required: 'Employee is required' }}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger id="employeeId" className="mt-1.5 h-11 border-gray-300">
                        <SelectValue placeholder={isLoadingEmployees ? 'Loading…' : 'Select an employee'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[60vh] [&_[data-radix-select-viewport]]:max-h-[60vh]">
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.user ? `${e.user.firstName} ${e.user.lastName}` : e.employeeCode}
                            {' '}
                            <span className="text-gray-400">({e.employeeCode})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.employeeId && <p className="text-sm text-red-600 mt-1">{errors.employeeId.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="departmentId" className="text-gray-700 font-medium">
                    Department
                  </Label>
                  <Controller
                    control={control}
                    name="departmentId"
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger id="departmentId" className="mt-1.5 h-11 border-gray-300">
                          <SelectValue placeholder={isLoadingDepartments ? 'Loading…' : 'Select department'} />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="positionId" className="text-gray-700 font-medium">
                    Position
                  </Label>
                  <Controller
                    control={control}
                    name="positionId"
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger id="positionId" className="mt-1.5 h-11 border-gray-300">
                          <SelectValue placeholder={isLoadingPositions ? 'Loading…' : 'Select position'} />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Classification & Duration</CardTitle>
              <CardDescription>Contract type, dates and leave entitlement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractType" className="text-gray-700 font-medium">
                    Contract Type <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="contractType"
                    rules={{ required: 'Contract type is required' }}
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger id="contractType" className="mt-1.5 h-11 border-gray-300">
                          <SelectValue placeholder="Select contract type" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTRACT_TYPE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.contractType && <p className="text-sm text-red-600 mt-1">{errors.contractType.message}</p>}
                </div>
                <div>
                  <Label htmlFor="totalLeaves" className="text-gray-700 font-medium">
                    Total Leaves <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="totalLeaves"
                    type="number"
                    step="0.5"
                    min={0}
                    {...register('totalLeaves', {
                      required: 'Total leaves is required',
                      validate: (value) => Number(value) >= 0 || 'Must be 0 or more',
                    })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.totalLeaves && <p className="text-sm text-red-600 mt-1">{errors.totalLeaves.message}</p>}
                </div>
                <div>
                  <Label htmlFor="startDate" className="text-gray-700 font-medium">
                    Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate', { required: 'Start date is required' })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.startDate && <p className="text-sm text-red-600 mt-1">{errors.startDate.message}</p>}
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-gray-700 font-medium">
                    End Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register('endDate', { required: 'End date is required' })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.endDate && <p className="text-sm text-red-600 mt-1">{errors.endDate.message}</p>}
                </div>
                <div>
                  <Label htmlFor="probationEndDate" className="text-gray-700 font-medium">
                    Probation End Date
                  </Label>
                  <Input
                    id="probationEndDate"
                    type="date"
                    {...register('probationEndDate', {
                      validate: (value) => {
                        if (!value) return true
                        const startDate = getValues('startDate')
                        if (startDate && value < startDate) {
                          return 'Probation end date cannot be earlier than the start date'
                        }
                        return true
                      },
                    })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.probationEndDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.probationEndDate.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Initial Salary</CardTitle>
              <CardDescription>Creates the first salary revision for this contract.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="baseSalary" className="text-gray-700 font-medium">
                    Base Salary <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="baseSalary"
                    inputMode="decimal"
                    {...register('baseSalary', {
                      required: 'Base salary is required',
                      pattern: { value: DECIMAL_PATTERN, message: 'Enter a valid amount (max 2 decimals)' },
                      validate: (value) => parseFloat(value) > 0 || 'Salary must be greater than 0',
                    })}
                    placeholder="e.g. 100000.00"
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.baseSalary && <p className="text-sm text-red-600 mt-1">{errors.baseSalary.message}</p>}
                </div>
                <div>
                  <Label htmlFor="currency" className="text-gray-700 font-medium">
                    Currency
                  </Label>
                  <Input
                    id="currency"
                    maxLength={3}
                    {...register('currency', { maxLength: { value: 3, message: '3-letter code' } })}
                    placeholder="PKR"
                    className="mt-1.5 h-11 border-gray-300 uppercase"
                  />
                </div>
                <div>
                  <Label htmlFor="salaryFrequency" className="text-gray-700 font-medium">
                    Frequency
                  </Label>
                  <Controller
                    control={control}
                    name="salaryFrequency"
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger id="salaryFrequency" className="mt-1.5 h-11 border-gray-300">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          {SALARY_FREQUENCY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="effectiveDate" className="text-gray-700 font-medium">
                    Effective Date
                  </Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    {...register('effectiveDate')}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                </div>
                <div>
                  <Label htmlFor="reason" className="text-gray-700 font-medium">
                    Reason
                  </Label>
                  <Input
                    id="reason"
                    {...register('reason')}
                    placeholder="e.g. Starting salary"
                    className="mt-1.5 h-11 border-gray-300"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Remarks</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="notes" className="text-gray-700 font-medium">
                Notes
              </Label>
              <Textarea
                id="notes"
                {...register('notes')}
                rows={3}
                placeholder="Optional notes or remarks"
                className="mt-1.5 border-gray-300"
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/hr/contracts')}
              disabled={isLoading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Save Contract</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
