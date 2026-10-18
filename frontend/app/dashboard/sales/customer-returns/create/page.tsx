'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Loader2, RotateCcw, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  useCustomerDeliveries,
  useCustomerDelivery,
  formatDeliverySalesPersonName,
} from '@/hooks/useCustomerDeliveries'
import {
  useCustomerReturnsForCustomer,
  computeReturnableQuantitiesForDeliveryItems,
} from '@/hooks/useCustomerReturns'
import { ReturnLineForm } from '@/components/sales/customer-returns/return-line-form'
import { formatCurrency } from '@/lib/currency'

export default function CreateCustomerReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const deliveryIdFromQuery = searchParams.get('deliveryId') ?? undefined

  const { data: delivery, isLoading: deliveryLoading, isError: deliveryError, refetch } =
    useCustomerDelivery(deliveryIdFromQuery ?? '')

  const { data: recentDeliveries, isLoading: pickerLoading } = useCustomerDeliveries({
    status: 'DELIVERED',
    limit: 15,
    sortBy: 'deliveryDate',
    sortOrder: 'DESC',
  })

  const customerId = delivery?.customerId
  const { data: existingReturns = [], refetch: refetchReturns } = useCustomerReturnsForCustomer(
    customerId,
    { enabled: !!customerId && delivery?.status === 'DELIVERED' },
  )

  const returnableByItemId = useMemo(() => {
    if (!delivery?.items?.length) return {}
    return computeReturnableQuantitiesForDeliveryItems(delivery.items, existingReturns)
  }, [delivery?.items, existingReturns])

  const hasReturnableLines = Object.values(returnableByItemId).some(
    (summary) => summary.remainingQuantity > 0,
  )

  const handleReturnRecorded = () => {
    refetch()
    refetchReturns()
  }

  return (
    <ProtectedRoute requiredPermission="customer-return.create">
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
              Record Shop Return
            </h1>
            <p className="text-gray-600 mt-1">
              Select a delivered shop delivery, then return quantity against a specific line item.
              Price is copied from the delivery — returns are created pending approval.
            </p>
          </div>
        </div>

        {!deliveryIdFromQuery && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-600" />
                Select a Delivered Shop Delivery
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {pickerLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading deliveries…
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Delivery #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Shop</TableHead>
                      <TableHead>Sales Person</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(recentDeliveries?.data ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-10">
                          No delivered shop deliveries yet. Mark a delivery as delivered first.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (recentDeliveries?.data ?? []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.deliveryNumber}</TableCell>
                          <TableCell>
                            {format(new Date(item.deliveryDate), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{item.customer?.shopName ?? '—'}</TableCell>
                          <TableCell>{formatDeliverySalesPersonName(item.salesPerson)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(Number(item.totalAmount))}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/dashboard/sales/customer-returns/create?deliveryId=${item.id}`,
                                )
                              }
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Return Items
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
              <div className="p-4 border-t text-sm text-gray-600">
                Or open a{' '}
                <Link
                  href="/dashboard/sales/customer-deliveries"
                  className="text-green-700 hover:text-green-800 hover:underline font-medium"
                >
                  shop delivery detail
                </Link>{' '}
                and use &quot;Record Return&quot; for a specific delivery.
              </div>
            </CardContent>
          </Card>
        )}

        {deliveryIdFromQuery && deliveryLoading && (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading delivery…
          </div>
        )}

        {deliveryIdFromQuery && deliveryError && (
          <Card>
            <CardContent className="py-10 text-center text-red-600">
              Failed to load this delivery. It may not exist or you may not have access.
            </CardContent>
          </Card>
        )}

        {delivery && deliveryIdFromQuery && (
          <>
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{delivery.deliveryNumber}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {delivery.customer?.shopName} ·{' '}
                    {format(new Date(delivery.deliveryDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      delivery.status === 'DELIVERED'
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }
                  >
                    {delivery.status}
                  </Badge>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/sales/customer-deliveries/${delivery.id}`}>
                      View Delivery
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard/sales/customer-returns/create')}
                  >
                    Change Delivery
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {delivery.status !== 'DELIVERED' ? (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="py-6 text-amber-900">
                  Returns can only be recorded against deliveries that have been marked{' '}
                  <span className="font-medium">DELIVERED</span>. Confirm delivery first, then return
                  goods from the shop.
                </CardContent>
              </Card>
            ) : !hasReturnableLines ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-600">
                  All line items on this delivery have been fully returned (or have pending returns
                  covering the delivered quantity).
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Returnable Line Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  {(delivery.items ?? []).map((item) => {
                    const returnable = returnableByItemId[item.id]
                    if (!returnable) return null

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-gray-200 p-4 space-y-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {item.product?.name ?? item.productId}
                            </p>
                            {item.product?.code && (
                              <p className="text-xs text-gray-500">{item.product.code}</p>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 text-right tabular-nums">
                            <p>
                              Delivered:{' '}
                              <span className="font-medium text-gray-900">
                                {returnable.deliveredQuantity}
                              </span>
                            </p>
                            <p>
                              Already returned:{' '}
                              <span className="font-medium text-gray-900">
                                {returnable.returnedQuantity}
                              </span>
                            </p>
                            <p>
                              Returnable:{' '}
                              <span className="font-medium text-green-700">
                                {returnable.remainingQuantity}
                              </span>
                            </p>
                          </div>
                        </div>
                        <ReturnLineForm
                          deliveryItem={item}
                          returnable={returnable}
                          onSuccess={handleReturnRecorded}
                        />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
