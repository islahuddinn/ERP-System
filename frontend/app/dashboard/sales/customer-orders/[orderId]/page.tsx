'use client'

import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, Loader2, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  useCustomerOrder,
  formatSalesPersonName,
  type CustomerOrderStatus,
} from '@/hooks/useCustomerOrders'
import { formatCurrency } from '@/lib/currency'

const STATUS_LABELS: Record<CustomerOrderStatus, string> = {
  PENDING: 'Pending',
  PARTIALLY_DELIVERED: 'Partially Delivered',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

function getStatusStyle(status: CustomerOrderStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'PARTIALLY_DELIVERED':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function CustomerOrderDetailPage() {
  const router = useRouter()
  const params = useParams<{ orderId: string }>()
  const orderId = params.orderId
  const { data: order, isLoading, isError } = useCustomerOrder(orderId)

  return (
    <ProtectedRoute requiredPermission="customer-order.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/customer-orders')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-green-600 shrink-0" />
              <span className="truncate">{order?.orderNumber ?? 'Shop Order'}</span>
            </h1>
            {order && (
              <p className="text-gray-600 mt-1">
                {order.customer?.shopName} · {format(new Date(order.orderDate), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          {order && (
            <Badge className={getStatusStyle(order.status)}>{STATUS_LABELS[order.status]}</Badge>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading order…
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="py-10 text-center text-red-600">Failed to load this shop order.</CardContent>
          </Card>
        )}

        {order && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Shop</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">{order.customer?.shopName ?? '—'}</p>
                  <p className="text-sm text-gray-500">{order.customer?.code}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Sales Person</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">{formatSalesPersonName(order.salesPerson)}</p>
                  <p className="text-sm text-gray-500">{order.salesPerson?.employeeCode}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Order Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(Number(order.totalAmount))}</p>
                </CardContent>
              </Card>
            </div>

            {order.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-800">{order.notes}</p>
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
                    {(order.items ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium text-gray-900">{item.product?.name ?? item.productId}</p>
                          {item.product?.code && <p className="text-xs text-gray-500">{item.product.code}</p>}
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

            {(order.deliveries?.length ?? 0) > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-gray-500" />
                    Linked Deliveries
                  </CardTitle>
                  <Link
                    href={`/dashboard/sales/customer-deliveries?orderId=${order.id}`}
                    className="text-sm font-medium text-green-700 hover:text-green-800 hover:underline"
                  >
                    View all
                  </Link>
                </CardHeader>
                <CardContent className="space-y-2">
                  {order.deliveries?.map((delivery) => (
                    <Link
                      key={delivery.id}
                      href={`/dashboard/sales/customer-deliveries/${delivery.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-mono text-sm font-medium text-gray-900">{delivery.deliveryNumber}</p>
                        <p className="text-xs text-gray-500">
                          {delivery.deliveredAt
                            ? `Delivered ${format(new Date(delivery.deliveredAt), 'MMM d, yyyy')}`
                            : 'Pending — open to confirm delivery'}
                        </p>
                      </div>
                      <Badge variant="outline">{delivery.status}</Badge>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
