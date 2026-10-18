'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Loader2, PackageCheck, RotateCcw, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import {
  useCustomerDelivery,
  formatDeliverySalesPersonName,
  type CustomerDeliveryStatus,
} from '@/hooks/useCustomerDeliveries'
import { MarkDeliveryDeliveredDialog } from '@/components/sales/customer-deliveries/mark-delivery-delivered-dialog'
import { formatCurrency } from '@/lib/currency'

const STATUS_LABELS: Record<CustomerDeliveryStatus, string> = {
  PENDING: 'Pending',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

function getStatusStyle(status: CustomerDeliveryStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function CustomerDeliveryDetailPage() {
  const router = useRouter()
  const params = useParams<{ deliveryId: string }>()
  const deliveryId = params.deliveryId
  const { hasPermission } = usePermissionCheck()
  const canDeliver = hasPermission('customer-delivery.deliver')
  const canCreateReturn = hasPermission('customer-return.create')

  const { data: delivery, isLoading, isError, refetch } = useCustomerDelivery(deliveryId)
  const [deliverDialogOpen, setDeliverDialogOpen] = useState(false)

  const isPending = delivery?.status === 'PENDING'

  return (
    <ProtectedRoute requiredPermission="customer-delivery.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/customer-deliveries')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Truck className="h-8 w-8 text-green-600 shrink-0" />
              <span className="truncate">{delivery?.deliveryNumber ?? 'Shop Delivery'}</span>
            </h1>
            {delivery && (
              <p className="text-gray-600 mt-1">
                {delivery.customer?.shopName} ·{' '}
                {format(new Date(delivery.deliveryDate), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          {delivery && (
            <Badge className={getStatusStyle(delivery.status)}>
              {STATUS_LABELS[delivery.status]}
            </Badge>
          )}
          {delivery && isPending && canDeliver && (
            <Button
              onClick={() => setDeliverDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PackageCheck className="mr-2 h-4 w-4" />
              Mark Delivered
            </Button>
          )}
          {delivery?.status === 'DELIVERED' && canCreateReturn && (
            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
              <Link href={`/dashboard/sales/customer-returns/create?deliveryId=${delivery.id}`}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Record Return
              </Link>
            </Button>
          )}
          {delivery?.status === 'DELIVERED' && delivery.customerId && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/sales/customer-ledger?customerId=${delivery.customerId}`}>
                View Shop Ledger
              </Link>
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading delivery…
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="py-10 text-center text-red-600">
              Failed to load this shop delivery. It may have been removed or you may not have access.
            </CardContent>
          </Card>
        )}

        {delivery && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Shop</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">{delivery.customer?.shopName ?? '—'}</p>
                  <p className="text-sm text-gray-500">{delivery.customer?.code}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Sales Person</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">
                    {formatDeliverySalesPersonName(delivery.salesPerson)}
                  </p>
                  <p className="text-sm text-gray-500">{delivery.salesPerson?.employeeCode}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Linked Shop Order</CardTitle>
                </CardHeader>
                <CardContent>
                  {delivery.order ? (
                    <Link
                      href={`/dashboard/sales/customer-orders/${delivery.order.id}`}
                      className="font-mono font-semibold text-green-700 hover:text-green-800 hover:underline"
                    >
                      {delivery.order.orderNumber}
                    </Link>
                  ) : (
                    <p className="text-gray-500">Standalone delivery</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Delivery Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(Number(delivery.totalAmount))}
                  </p>
                  {Number(delivery.discountAmount) > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Subtotal {formatCurrency(Number(delivery.subtotal))} · Discount{' '}
                      {formatCurrency(Number(delivery.discountAmount))}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {delivery.status === 'DELIVERED' && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Delivery Confirmation</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 text-sm text-gray-700">
                  <p>
                    Delivered by:{' '}
                    <span className="font-medium text-gray-900">
                      {formatDeliverySalesPersonName(delivery.deliveredBy)}
                    </span>
                  </p>
                  <p>
                    Delivered at:{' '}
                    <span className="font-medium text-gray-900">
                      {delivery.deliveredAt
                        ? format(new Date(delivery.deliveredAt), 'MMM d, yyyy h:mm a')
                        : '—'}
                    </span>
                  </p>
                </CardContent>
              </Card>
            )}

            {delivery.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-800">{delivery.notes}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(delivery.items ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium text-gray-900">
                            {item.product?.name ?? item.productId}
                          </p>
                          {item.product?.code && (
                            <p className="text-xs text-gray-500">{item.product.code}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(Number(item.unitPrice))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatCurrency(Number(item.totalAmount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {delivery && isPending && canDeliver && (
          <MarkDeliveryDeliveredDialog
            open={deliverDialogOpen}
            onOpenChange={setDeliverDialogOpen}
            delivery={delivery}
            onSuccess={() => refetch()}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
