'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDecideLoanApproval, type LoanApprovalStatus } from '@/hooks/useLoanRequests'

/**
 * Records the logged-in user's decision for a loan request. The backend only
 * accepts it if the caller is an assigned approver. Once every approver approves,
 * the request is confirmed and installments are generated.
 */
export function ApprovalDecisionDialog({
  loanRequestId,
  open,
  onClose,
}: {
  loanRequestId: string
  open: boolean
  onClose: () => void
}) {
  const decideMutation = useDecideLoanApproval()
  const [decision, setDecision] = useState<LoanApprovalStatus>('APPROVED')
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (open) {
      setDecision('APPROVED')
      setRemarks('')
    }
  }, [open])

  const handleSubmit = async () => {
    try {
      await decideMutation.mutateAsync({
        id: loanRequestId,
        data: { decision, remarks: remarks.trim() || undefined },
      })
      onClose()
    } catch {
      // toast surfaced by the mutation's onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Approval Decision</DialogTitle>
          <DialogDescription>
            Submit your decision for this loan request. All approvers must approve to confirm it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-gray-700 font-medium">Decision</Label>
            <Select value={decision} onValueChange={(v) => setDecision(v as LoanApprovalStatus)}>
              <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                <SelectValue placeholder="Select decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVED">Approve</SelectItem>
                <SelectItem value="REJECTED">Reject</SelectItem>
                <SelectItem value="PENDING">Reset to Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="remarks" className="text-gray-700 font-medium">
              Remarks
            </Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Optional note for this decision"
              className="mt-1.5 border-gray-300"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={decideMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={decideMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white min-w-[130px]"
          >
            {decideMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
            ) : (
              'Submit Decision'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
