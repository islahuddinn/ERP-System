'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Loader2, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useHrEmployeesDropdown, employeeOptionLabel } from '@/hooks/useLoanRequests'
import { useUsersDropdown } from '@/hooks/useUsers'

export interface LoanRequestFormValues {
  employeeId: string
  description: string
  totalAmount: string
  totalInstallments: string
  approverIds: string[]
}

export interface LoanFormInitialValues {
  employeeId?: string
  description?: string | null
  totalAmount?: number
  totalInstallments?: number
  approverIds?: string[]
}

interface LoanRequestFormProps {
  mode: 'create' | 'edit'
  initialValues?: LoanFormInitialValues
  isSubmitting: boolean
  onSubmit: (values: LoanRequestFormValues) => void
  onCancel: () => void
}

export function LoanRequestForm({
  mode,
  initialValues,
  isSubmitting,
  onSubmit,
  onCancel,
}: LoanRequestFormProps) {
  const { data: employees = [], isLoading: isLoadingEmployees } = useHrEmployeesDropdown()
  const { data: users = [], isLoading: isLoadingUsers } = useUsersDropdown()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<LoanRequestFormValues>({
    defaultValues: {
      employeeId: '',
      description: '',
      totalAmount: '',
      totalInstallments: '',
      approverIds: [],
    },
  })

  useEffect(() => {
    if (initialValues) {
      reset({
        employeeId: initialValues.employeeId || '',
        description: initialValues.description || '',
        totalAmount: initialValues.totalAmount != null ? String(initialValues.totalAmount) : '',
        totalInstallments:
          initialValues.totalInstallments != null ? String(initialValues.totalInstallments) : '',
        approverIds: initialValues.approverIds || [],
      })
    }
  }, [initialValues, reset])

  const isEdit = mode === 'edit'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Loan Details</CardTitle>
          <CardDescription>
            {isEdit
              ? 'Update the loan request. The employee cannot be changed.'
              : 'Create a loan request. Installments are generated once every approver approves.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="employeeId" className="text-gray-700 font-medium">
              Employee <span className="text-red-500">*</span>
            </Label>
            <Controller
              control={control}
              name="employeeId"
              rules={{ required: !isEdit && 'Employee is required' }}
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={isEdit}
                >
                  <SelectTrigger id="employeeId" className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder={isLoadingEmployees ? 'Loading…' : 'Select employee'} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {employeeOptionLabel(emp)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {isEdit && (
              <p className="text-xs text-gray-500 mt-1">The employee cannot be reassigned.</p>
            )}
            {errors.employeeId && (
              <p className="text-sm text-red-600 mt-1">{errors.employeeId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalAmount" className="text-gray-700 font-medium">
                Total Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                min="0"
                {...register('totalAmount', {
                  required: 'Amount is required',
                  validate: (v) => Number(v) > 0 || 'Amount must be greater than zero',
                })}
                placeholder="e.g. 10000"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.totalAmount && (
                <p className="text-sm text-red-600 mt-1">{errors.totalAmount.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="totalInstallments" className="text-gray-700 font-medium">
                Installments <span className="text-red-500">*</span>
              </Label>
              <Input
                id="totalInstallments"
                type="number"
                min="1"
                max="60"
                step="1"
                {...register('totalInstallments', {
                  required: 'Installments are required',
                  validate: (v) => {
                    const n = Number(v)
                    if (!Number.isInteger(n)) return 'Must be a whole number'
                    if (n < 1 || n > 60) return 'Must be between 1 and 60'
                    return true
                  },
                })}
                placeholder="e.g. 4"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.totalInstallments && (
                <p className="text-sm text-red-600 mt-1">{errors.totalInstallments.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-700 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              {...register('description', {
                maxLength: { value: 512, message: 'Description must be 512 characters or fewer' },
              })}
              rows={3}
              placeholder="Optional reason for the loan request"
              className="mt-1.5 border-gray-300"
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <Label className="text-gray-700 font-medium">
              Approvers <span className="text-red-500">*</span>
            </Label>
            <Controller
              control={control}
              name="approverIds"
              rules={{ validate: (v) => v.length > 0 || 'Select at least one approver' }}
              render={({ field }) => (
                <div className="mt-1.5 max-h-56 overflow-y-auto rounded-md border border-gray-300 divide-y divide-gray-100">
                  {isLoadingUsers ? (
                    <p className="p-3 text-sm text-gray-500">Loading…</p>
                  ) : users.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500">No users available.</p>
                  ) : (
                    users.map((user) => {
                      const checked = field.value.includes(user.id)
                      return (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) =>
                              field.onChange(
                                c === true
                                  ? [...field.value, user.id]
                                  : field.value.filter((id) => id !== user.id),
                              )
                            }
                          />
                          <span className="text-sm text-gray-800">
                            {user.name}
                            <span className="block text-xs text-gray-500">{user.email}</span>
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
              )}
            />
            <p className="text-xs text-gray-500 mt-1">
              Every selected approver must approve before installments are generated.
            </p>
            {errors.approverIds && (
              <p className="text-sm text-red-600 mt-1">{errors.approverIds.message as string}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
        >
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" />{isEdit ? 'Save Changes' : 'Create Request'}</>
          )}
        </Button>
      </div>
    </form>
  )
}
