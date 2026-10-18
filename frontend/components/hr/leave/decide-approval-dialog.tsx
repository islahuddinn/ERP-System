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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDecideLeaveApproval, type LeaveApprovalStatus } from '@/hooks/useLeaveRequests'
import { getApiErrorMessage } from '@/lib/api-error'
import { Loader2 } from 'lucide-react'

interface DecideFormData {
  remarks: string
}

interface DecideApprovalDialogProps {
  leaveRequestId: string | null
  decision: Extract<LeaveApprovalStatus, 'APPROVED' | 'REJECTED'> | null
  onOpenChange: (open: boolean) => void
}

export function DecideApprovalDialog({
  leaveRequestId,
  decision,
  onOpenChange,
}: DecideApprovalDialogProps) {
  const decideMutation = useDecideLeaveApproval()

  const { register, handleSubmit, reset } = useForm<DecideFormData>({
    defaultValues: { remarks: '' },
  })

  useEffect(() => {
    if (leaveRequestId) reset({ remarks: '' })
  }, [leaveRequestId, decision, reset])

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const isApprove = decision === 'APPROVED'

  const onSubmit = async (data: DecideFormData) => {
    if (!leaveRequestId || !decision) return
    try {
      await decideMutation.mutateAsync({
        id: leaveRequestId,
        data: { decision, remarks: data.remarks.trim() || null },
      })
      toast.success(isApprove ? 'Leave request approved' : 'Leave request rejected')
      close()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to record decision'))
    }
  }

  const isLoading = decideMutation.isPending
  const open = !!leaveRequestId && !!decision

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isApprove ? 'Approve Leave Request' : 'Reject Leave Request'}</DialogTitle>
          <DialogDescription>
            {isApprove
              ? 'Record your approval. Once every assigned approver approves, the request is confirmed.'
              : 'Record your rejection. A single rejection rejects the whole request.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="remarks" className="text-gray-700 font-medium">
              Remarks
            </Label>
            <Textarea
              id="remarks"
              {...register('remarks')}
              rows={3}
              placeholder="Optional remarks for this decision"
              className="mt-1.5 border-gray-300"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={close} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={
                isApprove
                  ? 'bg-green-600 hover:bg-green-700 text-white min-w-[110px]'
                  : 'bg-red-600 hover:bg-red-700 text-white min-w-[110px]'
              }
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : isApprove ? (
                'Approve'
              ) : (
                'Reject'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
