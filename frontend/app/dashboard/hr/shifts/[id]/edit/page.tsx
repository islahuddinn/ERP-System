'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useShift, useUpdateShift, type ShiftType } from '@/hooks/useShifts'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, Clock } from 'lucide-react'

interface ShiftFormData {
  name: string
  description?: string
  type: ShiftType | ''
  startTime: string
  endTime: string
  crossesMidnight: boolean
  // Kept as a raw string (like Create) so a cleared field can be told apart
  // from an explicit "0" — an empty string is sent to the API as null (#13).
  graceMinutes: string
}

export default function EditShiftPage() {
  const router = useRouter()
  const params = useParams()
  const shiftId = params?.id as string
  const { data: shift, isLoading: isLoadingShift } = useShift(shiftId)
  const updateMutation = useUpdateShift()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ShiftFormData>({
    defaultValues: {
      name: '',
      description: '',
      type: '',
      startTime: '',
      endTime: '',
      crossesMidnight: false,
      graceMinutes: '',
    },
  })

  const shiftType = watch('type')
  const crossesMidnight = watch('crossesMidnight')

  useEffect(() => {
    if (shift) {
      reset({
        name: shift.name || '',
        description: shift.description || '',
        type: shift.type,
        startTime: shift.startTime || '',
        endTime: shift.endTime || '',
        crossesMidnight: shift.crossesMidnight ?? false,
        graceMinutes: shift.graceMinutes === null || shift.graceMinutes === undefined
          ? ''
          : String(shift.graceMinutes),
      })
    }
  }, [shift, reset])

  const onSubmit = async (data: ShiftFormData) => {
    try {
      // For FIXED, only send a number when the user actually left one entered;
      // an emptied field is sent as null so the list can show "—" rather than
      // silently coercing back to 0 (#13).
      const enteredGrace = data.graceMinutes.trim()
      const graceMinutes =
        data.type === 'FIXED' ? (enteredGrace === '' ? null : Number(enteredGrace)) : null

      await updateMutation.mutateAsync({
        id: shiftId,
        data: {
          name: data.name.trim(),
          description: data.description?.trim() || null,
          type: data.type as ShiftType,
          startTime: data.startTime,
          endTime: data.endTime,
          crossesMidnight: data.crossesMidnight,
          graceMinutes,
        },
      })
      router.push('/dashboard/hr/shifts')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update shift'))
    }
  }

  const isLoading = updateMutation.isPending || isLoadingShift

  if (isLoadingShift) {
    return (
      <ProtectedRoute requiredPermission="shifts.manage">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!shift) {
    return (
      <ProtectedRoute requiredPermission="shifts.manage">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-red-500">
          <p>Shift not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/shifts')} className="mt-4">
            Back to Shifts
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="shifts.manage">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/hr/shifts')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Clock className="h-8 w-8 text-green-600" />
              Edit Shift
            </h1>
            <p className="text-gray-600 mt-1">Update the shift configuration.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Shift Details</CardTitle>
              <CardDescription>Update the shift name, type and timing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-gray-700 font-medium">
                  Shift Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name', {
                    required: 'Name is required',
                    validate: (v) => v.trim().length > 0 || 'Name is required',
                    maxLength: { value: 64, message: 'Name must be 64 characters or fewer' },
                  })}
                  placeholder="e.g. Morning Shift"
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="type" className="text-gray-700 font-medium">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="type"
                  rules={{ required: 'Type is required' }}
                  render={({ field }) => (
                    // key is derived from field.value (not shift.id, which never
                    // changes) so the Select remounts once reset() applies the
                    // saved type — Radix locks its internal uncontrolled state on
                    // first mount and ignores later `value` prop updates, so the
                    // component must remount to pick up the prefilled value
                    // (edit-prefill gotcha).
                    <Select
                      key={field.value || 'k'}
                      value={field.value || undefined}
                      onValueChange={(value) => field.onChange(value as ShiftType)}
                    >
                      <SelectTrigger id="type" className="mt-1.5 h-11 border-gray-300">
                        <SelectValue placeholder="Select shift type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED">Fixed — tracks late arrivals via grace period</SelectItem>
                        <SelectItem value="FLEXIBLE">Flexible — only total hours matter</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime" className="text-gray-700 font-medium">
                    Start Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    {...register('startTime', { required: 'Start time is required' })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.startTime && <p className="text-sm text-red-600 mt-1">{errors.startTime.message}</p>}
                </div>
                <div>
                  <Label htmlFor="endTime" className="text-gray-700 font-medium">
                    End Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    {...register('endTime', {
                      required: 'End time is required',
                      // #10/#11/#12: End Time must differ from Start Time, and must
                      // be strictly after it unless the shift is flagged as
                      // crossing midnight (in which case an overnight wrap is fine).
                      validate: (value) => {
                        const start = watch('startTime')
                        if (!start || !value) return true
                        if (value === start) return 'End Time cannot be the same as Start Time'
                        if (!watch('crossesMidnight') && value < start) {
                          return 'End Time cannot be earlier than Start Time'
                        }
                        return true
                      },
                    })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.endTime && <p className="text-sm text-red-600 mt-1">{errors.endTime.message}</p>}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="crossesMidnight"
                  checked={crossesMidnight}
                  onCheckedChange={(checked) => setValue('crossesMidnight', checked === true)}
                />
                <Label htmlFor="crossesMidnight" className="text-gray-700 font-medium cursor-pointer">
                  Shift crosses midnight (e.g. 22:00 – 06:00)
                </Label>
              </div>

              {/*
                Kept mounted at all times (visibility toggled via className) rather
                than conditionally rendered. Unmounting/remounting this input while
                switching Shift Type was clobbering the loaded grace value back to 0
                (#7); staying mounted means the registered field value is never
                touched by the Type switch, only its visibility is.
              */}
              <div className={shiftType === 'FIXED' ? '' : 'hidden'}>
                <Label htmlFor="graceMinutes" className="text-gray-700 font-medium">
                  Grace Period (minutes)
                </Label>
                <Input
                  id="graceMinutes"
                  type="number"
                  min={0}
                  max={120}
                  {...register('graceMinutes', {
                    validate: (value) => {
                      if (value.trim() === '') return true
                      const parsed = Number(value)
                      if (Number.isNaN(parsed)) return 'Grace must be a number'
                      if (parsed < 0) return 'Grace must be 0 or more'
                      if (parsed > 120) return 'Grace cannot exceed 120 minutes'
                      return true
                    },
                  })}
                  placeholder="0"
                  className="mt-1.5 h-11 border-gray-300"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minutes of grace after start time before an employee is marked late.
                </p>
                {errors.graceMinutes && (
                  <p className="text-sm text-red-600 mt-1">{errors.graceMinutes.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="text-gray-700 font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  {...register('description', {
                    maxLength: { value: 256, message: 'Description must be 256 characters or fewer' },
                  })}
                  rows={2}
                  className="mt-1.5 border-gray-300"
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/hr/shifts')}
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
                <><Save className="mr-2 h-4 w-4" />Save Changes</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
