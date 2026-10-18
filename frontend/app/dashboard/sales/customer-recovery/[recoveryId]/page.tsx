'use client'

import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Loader2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  useCustomerRecovery,
  formatRecoverySalesPersonName,
  RECOVERY_PAYMENT_MODE_LABELS,
} from '@/hooks/useCustomerRecovery'
import { formatCurrency } from '@/lib/currency'

export default function CustomerRecoveryDetailPage() {
  const router = useRouter()
  const params = useParams<{ recoveryId: string }>()
  const recoveryId = params.recoveryId

  const { data: recovery, isLoading, isError } = useCustomerRecovery(recoveryId)

  return (
    <ProtectedRoute requiredPermission="customer-recovery.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/customer-recovery')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Wallet className="h-8 w-8 text-green-600 shrink-0" />
              <span className="truncate">{recovery?.recoveryNumber ?? 'Shop Recovery'}</span>
            </h1>
            {recovery && (
              <p className="text-gray-600 mt-1">
                {recovery.customer?.shopName} ·{' '}
                {format(new Date(recovery.collectedAt), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
          {recovery && (
            <Badge className="bg-green-100 text-green-800 border-green-200">Recorded</Badge>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading recovery…
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="py-10 text-center text-red-600">
              Failed to load this shop recovery. It may have been removed or you may not have access.
            </CardContent>
          </Card>
        )}

        {recovery && (
          <>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-4 text-sm text-green-900">
                This payment was posted immediately — the shop ledger was credited and the
                collecting sales person&apos;s cash-in-hand was updated.
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Shop</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">{recovery.customer?.shopName ?? '—'}</p>
                  <p className="text-sm text-gray-500">{recovery.customer?.code}</p>
                  {recovery.customerId && (
                    <Link
                      href={`/dashboard/sales/customer-ledger?customerId=${recovery.customerId}`}
                      className="text-sm text-green-700 hover:text-green-800 hover:underline mt-2 inline-block"
                    >
                      View shop ledger
                    </Link>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Collected By</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">
                    {formatRecoverySalesPersonName(recovery.salesPerson)}
                  </p>
                  <p className="text-sm text-gray-500">{recovery.salesPerson?.employeeCode}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Payment Mode</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">
                    {RECOVERY_PAYMENT_MODE_LABELS[recovery.paymentMode] ?? recovery.paymentMode}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Amount Collected</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(Number(recovery.amount))}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Recorded {format(new Date(recovery.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </CardContent>
              </Card>
            </div>

            {recovery.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-800">{recovery.notes}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
