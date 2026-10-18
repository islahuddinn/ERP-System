'use client'

import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useEmployeesDropdown, employeeLabel } from '@/hooks/useEmployees'
import {
  useCreateLeaveRequest,
  useApproverUsersDropdown,
  approverLabel,
  type LeaveDurationType,
} from '@/hooks/useLeaveRequests'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, CalendarClock, ChevronDown } from 'lucide-react'

interface LeaveFormData {
  employeeId: string
  durationType: LeaveDurationType
  startDate: string
  endDate: string
  isPaid: boolean
  reason?: string
  approverIds: string[]
}

export default function CreateLeaveRequestPage() {
  const router = useRouter()
  const createMutation = useCreateLeaveRequest()
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployeesDropdown()
  const { data: approvers = [], isLoading: isLoadingApprovers } = useApproverUsersDropdown()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LeaveFormData>({
    defaultValues: {
      employeeId: '',
      durationType: 'FULL_DAY',
      startDate: '',
      endDate: '',
      isPaid: true,
      reason: '',
      approverIds: [],
    },
  })

  const durationType = watch('durationType')
  const isHalfDay = durationType === 'HALF_DAY'
  const isPaid = watch('isPaid')

  const onSubmit = async (data: LeaveFormData) => {
    try {
      await createMutation.mutateAsync({
        employeeId: data.employeeId,
        startDate: data.startDate,
        ...(isHalfDay ? {} : { endDate: data.endDate }),
        durationType: data.durationType,
        isPaid: data.isPaid,
        reason: data.reason?.trim() || null,
        approverIds: data.approverIds,
      })
      router.push('/dashboard/hr/leave')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create leave request'))
    }
  }

  const isLoading = createMutation.isPending

  return (
    <ProtectedRoute requiredPermission="leave-requests.manage">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/hr/leave')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CalendarClock className="h-8 w-8 text-green-600" />
              New Leave Request
            </h1>
            <p className="text-gray-600 mt-1">Create a leave request and assign approvers.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Request Details</CardTitle>
              <CardDescription>Choose the employee, dates and approvers.</CardDescription>
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
                        <SelectValue
                          placeholder={isLoadingEmployees ? 'Loading…' : 'Select employee'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employeeLabel(employee)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.employeeId && (
                  <p className="text-sm text-red-600 mt-1">{errors.employeeId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="durationType" className="text-gray-700 font-medium">
                  Duration <span className="text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="durationType"
                  rules={{ required: 'Duration is required' }}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(value) => field.onChange(value as LeaveDurationType)}
                    >
                      <SelectTrigger id="durationType" className="mt-1.5 h-11 border-gray-300">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL_DAY">Full day — spans one or more dates</SelectItem>
                        <SelectItem value="HALF_DAY">Half day — a single date</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-gray-700 font-medium">
                    {isHalfDay ? 'Date' : 'Start Date'} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate', { required: 'Start date is required' })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.startDate.message}</p>
                  )}
                </div>
                {!isHalfDay && (
                  <div>
                    <Label htmlFor="endDate" className="text-gray-700 font-medium">
                      End Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      {...register('endDate', {
                        required: isHalfDay ? false : 'End date is required for a full-day leave',
                      })}
                      className="mt-1.5 h-11 border-gray-300"
                    />
                    {errors.endDate && (
                      <p className="text-sm text-red-600 mt-1">{errors.endDate.message}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPaid"
                  checked={isPaid}
                  onCheckedChange={(checked) => setValue('isPaid', checked === true)}
                />
                <Label htmlFor="isPaid" className="text-gray-700 font-medium cursor-pointer">
                  Paid leave (deducts from the employee's active contract balance on approval)
                </Label>
              </div>

              <div>
                <Label htmlFor="reason" className="text-gray-700 font-medium">
                  Reason
                </Label>
                <Textarea
                  id="reason"
                  {...register('reason', {
                    maxLength: { value: 512, message: 'Reason must be 512 characters or fewer' },
                  })}
                  rows={2}
                  placeholder="Optional reason for the leave"
                  className="mt-1.5 border-gray-300"
                />
                {errors.reason && (
                  <p className="text-sm text-red-600 mt-1">{errors.reason.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Approvers</CardTitle>
              <CardDescription>
                Select at least one user who must approve this request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label className="text-gray-700 font-medium">
                Approvers <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="approverIds"
                rules={{ validate: (value) => value.length > 0 || 'Select at least one approver' }}
                render={({ field }) => {
                  const selectedCount = field.value.length
                  return (
                    // Collapsed dropdown — the user list only appears when the trigger is opened,
                    // so the screen isn't flooded with every user by default.
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-1.5 h-11 w-full justify-between border-gray-300 font-normal"
                        >
                          <span className={selectedCount ? 'text-gray-900' : 'text-gray-500'}>
                            {selectedCount === 0
                              ? 'Select approvers'
                              : `${selectedCount} approver${selectedCount > 1 ? 's' : ''} selected`}
                          </span>
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-[--radix-popover-trigger-width] p-0"
                      >
                        <div className="max-h-64 space-y-2 overflow-y-auto p-3">
                          {isLoadingApprovers && <p className="text-sm text-gray-500">Loading…</p>}
                          {!isLoadingApprovers && approvers.length === 0 && (
                            <p className="text-sm text-gray-500">No active users available.</p>
                          )}
                          {approvers.map((user) => {
                            const checked = field.value.includes(user.id)
                            return (
                              <div key={user.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`approver-${user.id}`}
                                  checked={checked}
                                  onCheckedChange={(next) => {
                                    if (next === true) {
                                      field.onChange([...field.value, user.id])
                                    } else {
                                      field.onChange(field.value.filter((id) => id !== user.id))
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`approver-${user.id}`}
                                  className="text-gray-700 cursor-pointer font-normal"
                                >
                                  {approverLabel(user)}
                                </Label>
                              </div>
                            )
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )
                }}
              />
              {errors.approverIds && (
                <p className="text-sm text-red-600 mt-1">{errors.approverIds.message as string}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/hr/leave')}
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
                <><Save className="mr-2 h-4 w-4" />Save Request</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
