'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ArrowLeft,
  Calendar,
  User,
  FileText,
  DollarSign,
  CheckCircle2,
  XCircle,
  Pencil,
  Truck,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { AddPaymentDialog } from '@/components/sales/AddPaymentDialog'
import { EditPaymentDialog } from '@/components/sales/EditPaymentDialog'
import { useSale, useConfirmSale, useCancelSale, type SalePayment } from '@/hooks/useSales'
import { formatCurrency } from '@/lib/currency'
import { useGenerateSaleDispatches, useSaleDispatches } from '@/hooks/useSaleDispatches'

export default function SaleDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const saleId = params?.id as string

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<SalePayment | null>(null)

  const { data: sale, isLoading, error } = useSale(saleId)
  const confirmMutation = useConfirmSale()
  const cancelMutation = useCancelSale()
  const generateDispatchesMutation = useGenerateSaleDispatches()

  // Detect existing dispatches for this sale so the "Generate Dispatches" button
  // hides once they exist (the backend also rejects regeneration). CANCELLED
  // dispatches don't count — they can be regenerated.
  const { data: dispatchesData } = useSaleDispatches({ saleId, limit: 100 })
  const dispatches = dispatchesData?.data ?? []
  const hasActiveDispatches = dispatches.some((d) => (d.status as string) !== 'CANCELLED')
  // Only surface "View Dispatches" once at least one dispatch exists for this sale.
  const hasAnyDispatches = dispatches.length > 0

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100',
      COMPLETED: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
      CANCELLED: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
    }
    return <Badge className={map[status] || map.DRAFT}>{status}</Badge>
  }

  const getPaymentBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100',
      PARTIAL: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
      PAID: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
    }
    return <Badge className={map[status] || map.PENDING}>{status}</Badge>
  }

  const handleConfirm = () => {
    confirmMutation.mutate(saleId, {
      onSuccess: () => toast.success('Sale confirmed'),
      onError: (err: any) =>
        toast.error(
          err?.response?.data?.message || err?.message || 'Failed to confirm sale',
        ),
    })
  }

  const handleCancel = () => {
    cancelMutation.mutate(saleId, {
      onSuccess: () => toast.success('Sale cancelled'),
      onError: (err: any) =>
        toast.error(
          err?.response?.data?.message || err?.message || 'Failed to cancel sale',
        ),
    })
  }

  // Generate dispatches (one per site) from a confirmed/completed sale, then
  // navigate to the dispatches list filtered by this sale.
  const handleGenerateDispatches = () => {
    generateDispatchesMutation.mutate(saleId, {
      onSuccess: () => {
        toast.success('Dispatches generated')
        router.push(`/dashboard/sales/dispatches?saleId=${saleId}`)
      },
      onError: (err: any) => {
        const message =
          err?.response?.data?.message || err?.message || 'Failed to generate dispatches'
        // The backend rejects regeneration when active dispatches already exist —
        // guide the user to the existing dispatches instead of just showing an error.
        if (typeof message === 'string' && message.toLowerCase().includes('already exist')) {
          toast.error('Dispatches already exist for this sale. Opening the dispatches list.')
          router.push(`/dashboard/sales/dispatches?saleId=${saleId}`)
          return
        }
        toast.error(Array.isArray(message) ? message[0] : message)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !sale) {
    return (
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="text-center py-12">
            <p className="text-red-600">Error loading sale</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const isDraft = sale.status === 'DRAFT'
  const isCompleted = sale.status === 'COMPLETED'
  const balance = Number(sale.totalAmount || 0) - Number(sale.amountPaid || 0)
  // Sale-level discount = total discount − item-level discounts. This includes
  // both the flat discountAmount and the percentage-derived portion, matching
  // the backend's totalSaleDiscount; the raw discountAmount field is flat-only.
  const saleLevelDiscount =
    Number(sale.totalDiscountAmount || 0) - Number(sale.itemsDiscountAmount || 0)

  return (
    <div className="factory-section">
      <div className="factory-page-container">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  {sale.saleNumber}
                </h1>
                <p className="text-gray-600 mt-1">
                  {sale.customer?.name ? `Customer: ${sale.customer.name}` : 'Walk-in sale'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              {getStatusBadge(sale.status)}
              {getPaymentBadge(sale.paymentStatus)}

              {isDraft && (
                <>
                  <Link href={`/dashboard/sales/${saleId}/edit`}>
                    <Button variant="outline" className="h-9 border-gray-300 text-gray-700">
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    onClick={handleConfirm}
                    disabled={confirmMutation.isPending || (sale.saleItems?.length ?? 0) === 0}
                    className="bg-green-600 hover:bg-green-700 text-white h-9"
                  >
                    {confirmMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Confirm
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                    variant="outline"
                    className="h-9 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {cancelMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Cancel
                  </Button>
                </>
              )}

              {isCompleted && (
                <>
                  {/* Only offer generation while no active dispatches exist yet. */}
                  {!hasActiveDispatches && (
                    <Button
                      onClick={handleGenerateDispatches}
                      disabled={generateDispatchesMutation.isPending}
                      variant="outline"
                      className="h-9 border-gray-300 text-gray-700 hover:bg-green-50"
                    >
                      {generateDispatchesMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Truck className="h-4 w-4 mr-2" />
                      )}
                      Generate Dispatches
                    </Button>
                  )}
                  {hasAnyDispatches && (
                    <Link href={`/dashboard/sales/dispatches?saleId=${saleId}`}>
                      <Button
                        variant="outline"
                        className="h-9 border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        View Dispatches
                      </Button>
                    </Link>
                  )}
                </>
              )}

              {isCompleted && sale.paymentStatus !== 'PAID' && (
                <Button
                  onClick={() => setIsPaymentDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white h-9"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Add Payment
                </Button>
              )}
            </div>
          </div>

          {/* Info + Financial summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">Sale Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Sale Date</p>
                    <p className="font-medium text-gray-900">
                      {sale.saleDate ? format(new Date(sale.saleDate), 'MMM dd, yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium text-gray-900">{sale.customer?.name || 'Walk-in'}</p>
                    {sale.customer?.phone && (
                      <p className="text-xs text-gray-500">{sale.customer.phone}</p>
                    )}
                    {sale.customer?.email && (
                      <p className="text-xs text-gray-500">{sale.customer.email}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(Number(sale.subtotal || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Item Discounts</span>
                  <span className="text-red-600">
                    - {formatCurrency(Number(sale.itemsDiscountAmount || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Sale Discount{sale.discountPercentage ? ` (${Number(sale.discountPercentage)}%)` : ''}
                  </span>
                  <span className="text-red-600">
                    - {formatCurrency(saleLevelDiscount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Discount</span>
                  <span className="text-red-600">
                    - {formatCurrency(Number(sale.totalDiscountAmount || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Tax{sale.taxPercentage ? ` (${Number(sale.taxPercentage)}%)` : ''}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(Number(sale.totalTaxAmount || 0))}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">Total Amount</span>
                  <span className="font-bold text-lg text-gray-900">
                    {formatCurrency(Number(sale.totalAmount || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(Number(sale.amountPaid || 0))}
                  </span>
                </div>
                {balance > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Balance</span>
                    <span className="font-medium">{formatCurrency(balance)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Items */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Items</CardTitle>
              <CardDescription>Products included in this sale</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-gray-200">
                    <TableHead className="font-semibold text-gray-700">Product</TableHead>
                    <TableHead className="font-semibold text-gray-700">SKU</TableHead>
                    <TableHead className="font-semibold text-gray-700">Qty</TableHead>
                    <TableHead className="font-semibold text-gray-700">Unit Price</TableHead>
                    <TableHead className="font-semibold text-gray-700">Discount</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sale.saleItems || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                        No items.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (sale.saleItems || []).map((item) => (
                      <TableRow key={item.id} className="border-gray-100">
                        <TableCell className="font-medium text-gray-900">
                          {item.itemName || item.product?.name || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-gray-600">{item.sku || '-'}</TableCell>
                        <TableCell className="text-gray-900">
                          {Number(item.quantity || 0).toLocaleString()}
                          {item.product?.uom?.symbol ? ` ${item.product.uom.symbol}` : ''}
                        </TableCell>
                        <TableCell className="text-gray-900">
                          {formatCurrency(Number(item.unitPrice || 0))}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {formatCurrency(Number(item.itemTotalDiscountAmount || 0))}
                        </TableCell>
                        <TableCell className="text-right font-medium text-gray-900">
                          {formatCurrency(Number(item.lineTotal || 0))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-gray-900">Payments</CardTitle>
                <CardDescription>Payments recorded against this sale</CardDescription>
              </div>
              {isCompleted && sale.paymentStatus !== 'PAID' && (
                <Button
                  onClick={() => setIsPaymentDialogOpen(true)}
                  variant="outline"
                  className="h-9 border-gray-300 text-gray-700"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Add Payment
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-gray-200">
                    <TableHead className="font-semibold text-gray-700">Date</TableHead>
                    <TableHead className="font-semibold text-gray-700">Method</TableHead>
                    <TableHead className="font-semibold text-gray-700">Reference</TableHead>
                    <TableHead className="font-semibold text-gray-700">Notes</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sale.payments || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                        No payments recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (sale.payments || []).map((p) => (
                      <TableRow key={p.id} className="border-gray-100">
                        <TableCell className="text-gray-600">
                          {p.paymentDate ? format(new Date(p.paymentDate), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-gray-900">{p.paymentMethod}</TableCell>
                        <TableCell className="text-gray-600">{p.referenceNumber || '-'}</TableCell>
                        <TableCell className="text-gray-600">{p.notes || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(Number(p.amount || 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCompleted && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-green-600"
                              onClick={() => setEditingPayment(p)}
                              title="Update payment"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          {sale.notes && (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{sale.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AddPaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        sale={sale}
      />

      <EditPaymentDialog
        isOpen={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        sale={sale}
        payment={editingPayment}
      />
    </div>
  )
}
