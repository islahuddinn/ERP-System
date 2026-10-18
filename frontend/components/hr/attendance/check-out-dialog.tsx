'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { useCheckOut } from '@/hooks/useAttendance'
import { getApiErrorMessage } from '@/lib/api-error'
import { Loader2, LogOut } from 'lucide-react'

interface CheckOutFormData {
  checkOut: string
}

interface CheckOutDialogProps {
  attendanceId: string | null
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}

export function CheckOutDialog({ attendanceId, onOpenChange, onDone }: CheckOutDialogProps) {
  const checkOutMutation = useCheckOut()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CheckOutFormData>({ defaultValues: { checkOut: '' } })

  useEffect(() => {
    if (attendanceId) reset({ checkOut: '' })
  }, [attendanceId, reset])

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = async (data: CheckOutFormData) => {
    if (!attendanceId) return
    try {
      await checkOutMutation.mutateAsync({ id: attendanceId, checkOut: data.checkOut })
      close()
      onDone?.()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to record check-out'))
    }
  }

  const isLoading = checkOutMutation.isPending

  return (
    <Dialog open={!!attendanceId} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-green-600" /> Record Check-out
          </DialogTitle>
          <DialogDescription>
            Enter the check-out time. Worked, late, early-exit and overtime minutes are computed
            automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="checkOut" className="text-gray-700 font-medium">
              Check-out Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="checkOut"
              type="time"
              {...register('checkOut', { required: 'Check-out time is required' })}
              className="mt-1.5 h-11 border-gray-300"
            />
            {errors.checkOut && (
              <p className="text-sm text-red-600 mt-1">{errors.checkOut.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={close} disabled={isLoading}>
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
                'Check out'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
