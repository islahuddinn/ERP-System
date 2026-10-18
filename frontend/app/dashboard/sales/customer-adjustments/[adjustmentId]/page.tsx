'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  useCustomerLedgerAdjustment,
  CUSTOMER_LEDGER_ADJUSTMENT_TYPE_LABELS,
} from '@/hooks/useCustomerLedgerAdjustments'
import { formatCurrency } from '@/lib/currency'

export default function CustomerAdjustmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const adjustmentId = params.adjustmentId as string
  const { data: adjustment, isLoading, isError } = useCustomerLedgerAdjustment(adjustmentId)

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (isError || !adjustment) {
    return (
      <div className="p-8">
        <p className="text-red-600">Failed to load adjustment.</p>
        <Button variant="link" asChild className="px-0">
          <Link href="/dashboard/sales/customer-adjustments">Back to list</Link>
        </Button>
      </div>
    )
  }

  const isCredit = adjustment.type === 'CREDIT_NOTE'

  return (
    <ProtectedRoute requiredPermission="customer-ledger-adjustment.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/customer-adjustments')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono">{adjustment.adjustmentNumber}</h1>
            <p className="text-gray-600 mt-1">
              {CUSTOMER_LEDGER_ADJUSTMENT_TYPE_LABELS[adjustment.type]}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Details</CardTitle>
            <Badge
              variant="outline"
              className={
                isCredit
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-red-100 text-red-800 border-red-200'
              }
            >
              {CUSTOMER_LEDGER_ADJUSTMENT_TYPE_LABELS[adjustment.type]}
            </Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Shop</p>
              <p className="font-medium text-gray-900">{adjustment.customer?.shopName ?? '—'}</p>
              {adjustment.customer?.code && (
                <p className="text-xs text-gray-500">{adjustment.customer.code}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500">Amount</p>
              <p className="font-medium text-gray-900 text-lg">
                {formatCurrency(Number(adjustment.amount))}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Posted</p>
              <p className="font-medium text-gray-900">
                {format(new Date(adjustment.adjustedAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Ledger effect</p>
              <p className="font-medium text-gray-900">
                {isCredit ? 'Credit — reduces balance owed' : 'Debit — increases balance owed'}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-500">Reason</p>
              <p className="text-gray-800">{adjustment.reason}</p>
            </div>
            {adjustment.notes && (
              <div className="md:col-span-2">
                <p className="text-gray-500">Notes</p>
                <p className="text-gray-800">{adjustment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {adjustment.customerId && (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/sales/customer-ledger?customerId=${adjustment.customerId}`}>
              <BookOpen className="mr-2 h-4 w-4" />
              View Shop Ledger
            </Link>
          </Button>
        )}
      </div>
    </ProtectedRoute>
  )
}
