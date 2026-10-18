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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  useAttendanceRecord,
  useUpdateAttendance,
  WORK_MODE_LABELS,
  ATTENDANCE_SOURCE_LABELS,
  type WorkMode,
  type AttendanceSource,
  type UpdateAttendancePayload,
} from '@/hooks/useAttendance'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, CalendarCheck } from 'lucide-react'

interface AttendanceFormData {
  checkIn: string
  checkOut: string
  workMode: WorkMode
  source: AttendanceSource
  notes: string
}

export default function EditAttendancePage() {
  const router = useRouter()
  const params = useParams()
  const attendanceId = params?.id as string
  const { data: record, isLoading: isLoadingRecord } = useAttendanceRecord(attendanceId)
  const updateMutation = useUpdateAttendance()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AttendanceFormData>({
    defaultValues: { checkIn: '', checkOut: '', workMode: 'ON_SITE', source: 'MANUAL', notes: '' },
  })

  useEffect(() => {
    if (record) {
      reset({
        checkIn: record.checkIn || '',
        checkOut: record.checkOut || '',
        workMode: record.workMode,
        source: record.source,
        notes: record.notes || '',
      })
    }
  }, [record, reset])

  const onSubmit = async (data: AttendanceFormData) => {
    // Only send times that are set; the backend recomputes metrics from them.
    const payload: UpdateAttendancePayload = {
      workMode: data.workMode,
      source: data.source,
      notes: data.notes.trim(),
    }
    if (data.checkIn) payload.checkIn = data.checkIn
    if (data.checkOut) payload.checkOut = data.checkOut

    try {
      await updateMutation.mutateAsync({ id: attendanceId, data: payload })
      router.push(`/dashboard/hr/attendance/${attendanceId}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update attendance record'))
    }
  }

  const isLoading = updateMutation.isPending || isLoadingRecord

  if (isLoadingRecord) {
    return (
      <ProtectedRoute requiredPermission="attendance.manage">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!record) {
    return (
      <ProtectedRoute requiredPermission="attendance.manage">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-red-500">
          <p>Attendance record not found</p>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/hr/attendance')}
            className="mt-4"
          >
            Back to Attendance
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="attendance.manage">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/hr/attendance/${attendanceId}`)}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CalendarCheck className="h-8 w-8 text-green-600" />
              Correct Attendance
            </h1>
            <p className="text-gray-600 mt-1">
              Adjust times or details — metrics are recomputed automatically.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Attendance Details</CardTitle>
              <CardDescription>
                {record.employee.employeeCode} — {record.date}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkIn" className="text-gray-700 font-medium">
                    Check-in Time
                  </Label>
                  <Input
                    id="checkIn"
                    type="time"
                    {...register('checkIn')}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                </div>
                <div>
                  <Label htmlFor="checkOut" className="text-gray-700 font-medium">
                    Check-out Time
                  </Label>
                  <Input
                    id="checkOut"
                    type="time"
                    {...register('checkOut')}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workMode" className="text-gray-700 font-medium">
                    Work Mode
                  </Label>
                  <Controller
                    control={control}
                    name="workMode"
                    render={({ field }) => (
                      <Select
                        key={`wm-${record.id}`}
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="workMode" className="mt-1.5 h-11 border-gray-300">
                          <SelectValue placeholder="Select work mode" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(WORK_MODE_LABELS) as WorkMode[]).map((mode) => (
                            <SelectItem key={mode} value={mode}>
                              {WORK_MODE_LABELS[mode]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="source" className="text-gray-700 font-medium">
                    Source
                  </Label>
                  <Controller
                    control={control}
                    name="source"
                    render={({ field }) => (
                      <Select
                        key={`src-${record.id}`}
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="source" className="mt-1.5 h-11 border-gray-300">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ATTENDANCE_SOURCE_LABELS) as AttendanceSource[]).map((src) => (
                            <SelectItem key={src} value={src}>
                              {ATTENDANCE_SOURCE_LABELS[src]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-gray-700 font-medium">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  rows={2}
                  placeholder="Optional notes"
                  className="mt-1.5 border-gray-300"
                />
                {errors.notes && <p className="text-sm text-red-600 mt-1">{errors.notes.message}</p>}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/hr/attendance/${attendanceId}`)}
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
