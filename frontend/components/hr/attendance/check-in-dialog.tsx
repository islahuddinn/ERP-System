'use client'

import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useCheckIn,
  useEmployeesDropdown,
  employeeLabel,
  WORK_MODE_LABELS,
  ATTENDANCE_SOURCE_LABELS,
  type WorkMode,
  type AttendanceSource,
} from '@/hooks/useAttendance'
import { getApiErrorMessage } from '@/lib/api-error'
import { Loader2, LogIn } from 'lucide-react'

interface CheckInFormData {
  employeeId: string
  date: string
  checkIn: string
  workMode: WorkMode
  source: AttendanceSource
  notes?: string
}

interface CheckInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// The check-in shift is derived from the employee's assigned shift on the backend,
// so this dialog does not ask for a shift.
export function CheckInDialog({ open, onOpenChange }: CheckInDialogProps) {
  const checkInMutation = useCheckIn()
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployeesDropdown()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CheckInFormData>({
    defaultValues: {
      employeeId: '',
      // Do not prefill today's date — the user must pick the date explicitly (#10).
      date: '',
      checkIn: '',
      workMode: 'ON_SITE',
      source: 'MANUAL',
      notes: '',
    },
  })

  // Local calendar "today" (YYYY-MM-DD) used to block future-dated check-ins (#14).
  const todayStr = (() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })()

  const closeAndReset = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = async (data: CheckInFormData) => {
    try {
      await checkInMutation.mutateAsync({
        employeeId: data.employeeId,
        date: data.date,
        checkIn: data.checkIn,
        workMode: data.workMode,
        source: data.source,
        notes: data.notes?.trim() || null,
      })
      closeAndReset()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to record check-in'))
    }
  }

  const isLoading = checkInMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : closeAndReset())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-green-600" /> Record Check-in
          </DialogTitle>
          <DialogDescription>
            Record an employee's check-in. The shift is taken from the employee's assigned shift.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                    <SelectValue placeholder={isLoadingEmployees ? 'Loading…' : 'Select employee'} />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="text-gray-700 font-medium">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                max={todayStr}
                {...register('date', {
                  required: 'Date is required',
                  validate: (value) =>
                    !value || value <= todayStr || 'Check-in date cannot be in the future',
                })}
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <Label htmlFor="checkIn" className="text-gray-700 font-medium">
                Check-in Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="checkIn"
                type="time"
                {...register('checkIn', { required: 'Check-in time is required' })}
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.checkIn && (
                <p className="text-sm text-red-600 mt-1">{errors.checkIn.message}</p>
              )}
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
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
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
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
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
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={closeAndReset} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[110px]"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                'Check in'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
