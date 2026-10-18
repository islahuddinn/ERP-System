'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, CheckCircle, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import { useCurrentUser } from '@/hooks/useUsers'
import {
  EMPLOYEE_CASH_TRANSFER_STATUS_LABELS,
  formatTransferEmployeeName,
  useEmployeeCashTransfer,
  useRespondEmployeeCashTransfer,
  type EmployeeCashTransferStatus,
} from '@/hooks/useEmployeeCashTransfers'
import { formatCurrency } from '@/lib/currency'

function statusClass(status: EmployeeCashTransferStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'RECEIVED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function EmployeeCashTransferDetailPage() {
  const params = useParams()
  const router = useRouter()
  const transferId = params.transferId as string
  const { hasPermission } = usePermissionCheck()
  const { data: currentUser } = useCurrentUser()
  const { data: transfer, isLoading, isError } = useEmployeeCashTransfer(transferId)
  const respondMutation = useRespondEmployeeCashTransfer(transferId)
  const [responseNotes, setResponseNotes] = useState('')

  const canRespond =
    hasPermission('employee-cash-transfer.respond') &&
    transfer?.status === 'PENDING' &&
    transfer.toEmployee?.user?.id === currentUser?.id

  const handleRespond = async (decision: 'RECEIVED' | 'REJECTED') => {
    await respondMutation.mutateAsync({
      decision,
      notes: responseNotes.trim() || undefined,
    })
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (isError || !transfer) {
    return (
      <div className="p-8">
        <p className="text-red-600">Failed to load transfer.</p>
        <Button variant="link" asChild className="px-0">
          <Link href="/dashboard/sales/employee-cash/transfers">Back to transfers</Link>
        </Button>
      </div>
    )
  }

  return (
    <ProtectedRoute requiredPermission="employee-cash-transfer.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/employee-cash/transfers')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono">{transfer.transferNumber}</h1>
            <p className="text-gray-600 mt-1">Employee cash transfer detail</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Summary</CardTitle>
            <Badge variant="outline" className={statusClass(transfer.status)}>
              {EMPLOYEE_CASH_TRANSFER_STATUS_LABELS[transfer.status]}
            </Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">From</p>
              <p className="font-medium text-gray-900">
                {formatTransferEmployeeName(transfer.fromEmployee)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">To</p>
              <p className="font-medium text-gray-900">
                {formatTransferEmployeeName(transfer.toEmployee)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Amount</p>
              <p className="font-medium text-gray-900 text-lg">{formatCurrency(transfer.amount)}</p>
            </div>
            <div>
              <p className="text-gray-500">Transferred</p>
              <p className="font-medium text-gray-900">
                {format(new Date(transfer.transferredAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            {transfer.senderNotes && (
              <div className="md:col-span-2">
                <p className="text-gray-500">Sender notes</p>
                <p className="text-gray-800">{transfer.senderNotes}</p>
              </div>
            )}
            {transfer.receiverNotes && (
              <div className="md:col-span-2">
                <p className="text-gray-500">Receiver notes</p>
                <p className="text-gray-800">{transfer.receiverNotes}</p>
              </div>
            )}
            {transfer.settlesTransfer && (
              <div className="md:col-span-2">
                <p className="text-gray-500">Settles stock transfer</p>
                <p className="font-mono text-gray-800">{transfer.settlesTransfer.transferNumber}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {canRespond && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm Receipt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Confirm only if you have physically received this cash. Reject if the amount was
                not handed over.
              </p>
              <div>
                <Label htmlFor="responseNotes">Your notes (optional)</Label>
                <Textarea
                  id="responseNotes"
                  value={responseNotes}
                  onChange={(event) => setResponseNotes(event.target.value)}
                  className="mt-1.5"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRespond('RECEIVED')}
                  disabled={respondMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {respondMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Confirm Received
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRespond('REJECTED')}
                  disabled={respondMutation.isPending}
                  className="text-red-700 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
