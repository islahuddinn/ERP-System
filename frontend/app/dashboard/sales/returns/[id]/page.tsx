'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ArrowLeft, RotateCcw, Loader2 } from 'lucide-react'
import { useSaleReturn } from '@/hooks/useSaleReturns'
import { formatCurrency } from '@/lib/currency'

const getRefundBadge = (status: string) => {
  switch (status) {
    case 'PROCESSED':
      return <Badge className="bg-green-100 text-green-700 border-green-200">Processed</Badge>
    case 'PENDING':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>
    case 'FAILED':
      return <Badge className="bg-red-100 text-red-700 border-red-200">Failed</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{status}</Badge>
  }
}

export default function SaleReturnDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnId = (params?.id as string) || ''
  const saleId = searchParams.get('saleId') || ''

  const { data: ret, isLoading } = useSaleReturn(saleId, returnId)

  if (!saleId) {
    return (
      <ProtectedRoute>
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Missing sale reference. Open this return from the{' '}
              <Link href="/dashboard/sales/returns" className="text-green-600 underline">
                returns list
              </Link>
              .
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <RotateCcw className="h-8 w-8 text-green-600" />
              {ret?.returnNumber || 'Sale Return'}
            </h1>
            <p className="text-gray-600 mt-1">Return details</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading return...
          </div>
        ) : !ret ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Return not found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 max-w-4xl">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Return #</p>
                  <p className="font-medium text-gray-900">{ret.returnNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500">Sale #</p>
                  {ret.sale?.id ? (
                    <Link
                      href={`/dashboard/sales/${ret.sale.id}`}
                      className="font-medium text-green-600 hover:underline"
                    >
                      {ret.sale.saleNumber}
                    </Link>
                  ) : (
                    <p className="font-medium text-gray-900">-</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500">Customer</p>
                  <p className="font-medium text-gray-900">
                    {ret.sale?.customer?.name || 'Walk-in'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Return Date</p>
                  <p className="font-medium text-gray-900">
                    {ret.returnDate ? format(new Date(ret.returnDate), 'MMM dd, yyyy') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    {ret.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-500">Refund</p>
                  <div className="flex items-center gap-2">
                    {getRefundBadge(ret.refundStatus)}
                    <span className="text-gray-600">{ret.refundMethod?.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div className="col-span-2 md:col-span-3">
                  <p className="text-gray-500">Reason</p>
                  <p className="font-medium text-gray-900">{ret.reason || '-'}</p>
                </div>
                {ret.notes && (
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-gray-500">Notes</p>
                    <p className="font-medium text-gray-900">{ret.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4">
                <CardTitle className="text-base">Returned Items</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Returned Qty</TableHead>
                    <TableHead className="text-right">Original Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ret.returnItems ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-20 text-center text-gray-500">
                        No items on this return.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ret.returnItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium text-sm text-gray-900">{item.itemName}</div>
                          {item.sku && <div className="text-xs text-gray-400">{item.sku}</div>}
                        </TableCell>
                        <TableCell className="text-right text-gray-900">
                          {Number(item.quantityReturned)}
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {Number(item.originalQuantity)}
                        </TableCell>
                        <TableCell className="text-right text-gray-700">
                          {formatCurrency(Number(item.unitPrice || 0))}
                        </TableCell>
                        <TableCell className="text-right text-gray-700">
                          {formatCurrency(Number(item.itemDiscountAmount || 0))}
                        </TableCell>
                        <TableCell className="text-right font-medium text-gray-900">
                          {formatCurrency(Number(item.lineTotal || 0))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Totals */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-end">
                  <div className="w-72 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(Number(ret.subtotal || 0))}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Discount:</span>
                      <span>{formatCurrency(Number(ret.discountAmount || 0))}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax:</span>
                      <span>{formatCurrency(Number(ret.taxAmount || 0))}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t">
                      <span>Total Refund:</span>
                      <span>{formatCurrency(Number(ret.totalAmount || 0))}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
