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
  useApproveCustomerReturn,
  useRejectCustomerReturn,
  type CustomerReturn,
} from '@/hooks/useCustomerReturns'
import { formatCurrency } from '@/lib/currency'

interface ReturnStatusActionsProps {
  customerReturn: CustomerReturn
  onSuccess?: () => void
  layout?: 'inline' | 'stacked'
}

export function ReturnStatusActions({
  customerReturn,
  onSuccess,
  layout = 'inline',
}: ReturnStatusActionsProps) {
  const approveMutation = useApproveCustomerReturn()
  const rejectMutation = useRejectCustomerReturn()
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const isPending = customerReturn.status === 'PENDING'
  const isBusy = approveMutation.isPending || rejectMutation.isPending

  if (!isPending) {
    return null
  }

  const handleApprove = () => {
    approveMutation.mutate(customerReturn.id, {
      onSuccess: () => {
        setApproveOpen(false)
        onSuccess?.()
      },
    })
  }

  const handleReject = () => {
    rejectMutation.mutate(customerReturn.id, {
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
          Approve Return
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
            <AlertDialogTitle>Approve shop return?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore{' '}
              <span className="font-medium text-gray-900">
                {customerReturn.quantity} × {customerReturn.product?.name ?? 'product'}
              </span>{' '}
              to the delivering sales person&apos;s branch stock and post a{' '}
              <span className="font-medium text-gray-900">
                {formatCurrency(Number(customerReturn.totalAmount))}
              </span>{' '}
              credit on the shop ledger. This action cannot be undone.
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
            <AlertDialogTitle>Reject shop return?</AlertDialogTitle>
            <AlertDialogDescription>
              Return {customerReturn.returnNumber} will be marked rejected. No stock or ledger
              changes will occur.
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
              {rejectMutation.isPending ? 'Rejecting…' : 'Reject Return'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
