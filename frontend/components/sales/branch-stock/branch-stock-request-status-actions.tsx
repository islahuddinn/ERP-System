'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useApproveBranchStockRequest,
  useRejectBranchStockRequest,
  type BranchStockRequest,
} from '@/hooks/useBranchStockRequests'

interface BranchStockRequestStatusActionsProps {
  branchStockRequest: BranchStockRequest
  onSuccess?: () => void
  layout?: 'inline' | 'stacked'
}

export function BranchStockRequestStatusActions({
  branchStockRequest,
  onSuccess,
  layout = 'inline',
}: BranchStockRequestStatusActionsProps) {
  const approveMutation = useApproveBranchStockRequest()
  const rejectMutation = useRejectBranchStockRequest()
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const isPending = branchStockRequest.status === 'PENDING'
  const isBusy = approveMutation.isPending || rejectMutation.isPending

  if (!isPending) {
    return null
  }

  const handleApprove = () => {
    approveMutation.mutate(branchStockRequest.id, {
      onSuccess: () => {
        setApproveOpen(false)
        onSuccess?.()
      },
    })
  }

  const handleReject = () => {
    rejectMutation.mutate(branchStockRequest.id, {
      onSuccess: () => {
        setRejectOpen(false)
        onSuccess?.()
      },
    })
  }

  const buttonClass = layout === 'stacked' ? 'w-full sm:w-auto' : ''

  return (
    <>
      <div
        className={
          layout === 'stacked'
            ? 'flex flex-col sm:flex-row gap-2'
            : 'flex flex-wrap items-center gap-2'
        }
      >
        <Button
          onClick={() => setApproveOpen(true)}
          disabled={isBusy}
          className={`bg-green-600 hover:bg-green-700 text-white ${buttonClass}`}
        >
          {approveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Approve Request
        </Button>
        <Button
          variant="outline"
          onClick={() => setRejectOpen(true)}
          disabled={isBusy}
          className={`border-red-200 text-red-700 hover:bg-red-50 ${buttonClass}`}
        >
          {rejectMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          Reject
        </Button>
      </div>

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve branch stock request?</AlertDialogTitle>
            <AlertDialogDescription>
              Request {branchStockRequest.requestNumber} will be marked approved. No stock moves
              until you ship a transfer separately from the approved request detail page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleApprove()
              }}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? 'Approving…' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject branch stock request?</AlertDialogTitle>
            <AlertDialogDescription>
              Request {branchStockRequest.requestNumber} will be marked rejected. No stock or
              ledger changes will occur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleReject()
              }}
              disabled={rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {rejectMutation.isPending ? 'Rejecting…' : 'Reject Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
