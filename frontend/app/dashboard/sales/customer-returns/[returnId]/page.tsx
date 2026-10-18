'use client'

import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import {
  useCustomerReturn,
  formatReturnSalesPersonName,
  CUSTOMER_RETURN_REASON_LABELS,
  CUSTOMER_RETURN_STATUS_LABELS,
  type CustomerReturnStatus,
} from '@/hooks/useCustomerReturns'
import { ReturnStatusActions } from '@/components/sales/customer-returns/return-status-actions'
import { formatCurrency } from '@/lib/currency'

function getStatusStyle(status: CustomerReturnStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'APPROVED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'REJECTED':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function CustomerReturnDetailPage() {
  const router = useRouter()
  const params = useParams<{ returnId: string }>()
  const returnId = params.returnId
  const { hasPermission } = usePermissionCheck()
  const canApprove = hasPermission('customer-return.approve')

  const { data: customerReturn, isLoading, isError, refetch } = useCustomerReturn(returnId)

  const deliveryId = customerReturn?.deliveryItem?.delivery?.id
  const deliveryNumber = customerReturn?.deliveryItem?.delivery?.deliveryNumber

  return (
    <ProtectedRoute requiredPermission="customer-return.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/customer-returns')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <RotateCcw className="h-8 w-8 text-green-600 shrink-0" />
              <span className="truncate">{customerReturn?.returnNumber ?? 'Shop Return'}</span>
            </h1>
            {customerReturn && (
              <p className="text-gray-600 mt-1">
                {customerReturn.customer?.shopName} ·{' '}
                {format(new Date(customerReturn.returnDate), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          {customerReturn && (
            <Badge className={getStatusStyle(customerReturn.status)}>
              {CUSTOMER_RETURN_STATUS_LABELS[customerReturn.status]}
            </Badge>
          )}
          {customerReturn && canApprove && customerReturn.status === 'PENDING' && (
            <ReturnStatusActions customerReturn={customerReturn} onSuccess={() => refetch()} />
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading return…
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="py-10 text-center text-red-600">
              Failed to load this shop return. It may have been removed or you may not have access.
            </CardContent>
          </Card>
        )}

        {customerReturn && (
          <>
            {customerReturn.status === 'PENDING' && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="py-4 text-sm text-amber-900">
                  This return is pending approval. Stock and the shop ledger are not updated until
                  an approver confirms it.
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Shop</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">
                    {customerReturn.customer?.shopName ?? '—'}
                  </p>
                  <p className="text-sm text-gray-500">{customerReturn.customer?.code}</p>
                  {customerReturn.customerId && (
                    <Link
                      href={`/dashboard/sales/customer-ledger?customerId=${customerReturn.customerId}`}
                      className="text-sm text-green-700 hover:text-green-800 hover:underline mt-2 inline-block"
                    >
                      View shop ledger
                    </Link>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Product</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">
                    {customerReturn.product?.name ?? customerReturn.productId}
                  </p>
                  <p className="text-sm text-gray-500">{customerReturn.product?.code}</p>
                  <p className="text-sm text-gray-700 mt-2 tabular-nums">
                    Qty {customerReturn.quantity} ×{' '}
                    {formatCurrency(Number(customerReturn.unitPrice))}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Sales Person</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">
                    {formatReturnSalesPersonName(customerReturn.salesPerson)}
                  </p>
                  <p className="text-sm text-gray-500">{customerReturn.salesPerson?.employeeCode}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Return Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(Number(customerReturn.totalAmount))}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Reason: {CUSTOMER_RETURN_REASON_LABELS[customerReturn.reason]}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Source Delivery
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 space-y-1">
                  {deliveryId && deliveryNumber ? (
                    <Link
                      href={`/dashboard/sales/customer-deliveries/${deliveryId}`}
                      className="font-mono font-medium text-green-700 hover:text-green-800 hover:underline"
                    >
                      {deliveryNumber}
                    </Link>
                  ) : (
                    <p className="text-gray-500">—</p>
                  )}
                  <p>
                    Delivered qty on line:{' '}
                    <span className="font-medium text-gray-900">
                      {customerReturn.deliveryItem?.quantity ?? '—'}
                    </span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Approval</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 space-y-1">
                  {customerReturn.status === 'APPROVED' ? (
                    <>
                      <p>
                        Approved by:{' '}
                        <span className="font-medium text-gray-900">
                          {formatReturnSalesPersonName(customerReturn.approvedBy)}
                        </span>
                      </p>
                      <p>
                        Approved at:{' '}
                        <span className="font-medium text-gray-900">
                          {customerReturn.approvedAt
                            ? format(new Date(customerReturn.approvedAt), 'MMM d, yyyy h:mm a')
                            : '—'}
                        </span>
                      </p>
                    </>
                  ) : customerReturn.status === 'REJECTED' ? (
                    <p className="text-gray-600">This return was rejected — no ledger or stock impact.</p>
                  ) : (
                    <p className="text-amber-800">Awaiting approver action.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {customerReturn.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-800">{customerReturn.notes}</p>
                </CardContent>
              </Card>
            )}

            {customerReturn.status === 'PENDING' && canApprove && (
              <Card>
                <CardHeader>
                  <CardTitle>Approver Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReturnStatusActions
                    customerReturn={customerReturn}
                    onSuccess={() => refetch()}
                    layout="stacked"
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
