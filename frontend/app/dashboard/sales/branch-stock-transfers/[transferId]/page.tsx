'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
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
import { ArrowLeft, ArrowLeftRight, Loader2, PackageCheck, RotateCcw, XCircle } from 'lucide-react'
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
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import {
  useBranchStockTransfer,
  useCancelBranchStockTransfer,
  formatBranchStockTransferEmployeeName,
  formatTransferFromBranchName,
  BRANCH_STOCK_TRANSFER_STATUS_LABELS,
  type BranchStockTransferStatus,
} from '@/hooks/useBranchStockTransfers'
import { ConfirmTransferReceiptDialog } from '@/components/sales/branch-stock/confirm-transfer-receipt-dialog'
import { formatCurrency } from '@/lib/currency'

function getStatusStyle(status: BranchStockTransferStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'DISPATCHED':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'RECEIVED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function BranchStockTransferDetailPage() {
  const router = useRouter()
  const params = useParams<{ transferId: string }>()
  const transferId = params.transferId
  const { hasPermission } = usePermissionCheck()
  const canConfirmReceipt = hasPermission('branch-stock-transfer.confirm-receipt')
  const canCancel = hasPermission('branch-stock-transfer.cancel')
  const canCreateReturn = hasPermission('branch-stock-return.create')

  const { data: transfer, isLoading, isError, refetch } = useBranchStockTransfer(transferId)
  const cancelMutation = useCancelBranchStockTransfer()
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const isDispatched = transfer?.status === 'DISPATCHED'
  const isReceived = transfer?.status === 'RECEIVED'

  const handleCancel = () => {
    if (!transfer) return
    cancelMutation.mutate(transfer.id, {
      onSuccess: () => {
        setCancelDialogOpen(false)
        refetch()
      },
    })
  }

  return (
    <ProtectedRoute requiredPermission="branch-stock-transfer.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/branch-stock-transfers')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ArrowLeftRight className="h-8 w-8 text-green-600 shrink-0" />
              <span className="truncate">{transfer?.transferNumber ?? 'Branch Stock Transfer'}</span>
            </h1>
            {transfer && (
              <p className="text-gray-600 mt-1">
                {formatTransferFromBranchName(transfer.fromBranch)} → {transfer.toBranch?.name} ·{' '}
                {format(new Date(transfer.createdAt), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          {transfer && (
            <Badge className={getStatusStyle(transfer.status)}>
              {BRANCH_STOCK_TRANSFER_STATUS_LABELS[transfer.status]}
            </Badge>
          )}
          {transfer && isDispatched && canConfirmReceipt && (
            <Button
              onClick={() => setReceiptDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PackageCheck className="mr-2 h-4 w-4" />
              Confirm Receipt
            </Button>
          )}
          {transfer && isDispatched && canCancel && (
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(true)}
              className="border-red-200 text-red-700 hover:bg-red-50"
              disabled={cancelMutation.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Transfer
            </Button>
          )}
          {transfer && isReceived && canCreateReturn && (
            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
              <Link href={`/dashboard/sales/branch-stock-returns/create?transferId=${transfer.id}`}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Record Return
              </Link>
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading transfer…
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="py-10 text-center text-red-600">
              Failed to load this branch stock transfer. It may have been removed or you may not
              have access.
            </CardContent>
          </Card>
        )}

        {transfer && (
          <>
            {isDispatched && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="py-4 text-sm text-blue-900">
                  Dispatched — awaiting receipt confirmation at {transfer.toBranch?.name}. Stock
                  and ledger update only after receipt is confirmed.
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">From</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">
                    {formatTransferFromBranchName(transfer.fromBranch)}
                  </p>
                  {transfer.fromBranch?.code && (
                    <p className="text-sm text-gray-500">{transfer.fromBranch.code}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">To</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">{transfer.toBranch?.name ?? '—'}</p>
                  <p className="text-sm text-gray-500">{transfer.toBranch?.code}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Linked Request</CardTitle>
                </CardHeader>
                <CardContent>
                  {transfer.request ? (
                    <Link
                      href={`/dashboard/sales/branch-stock-requests/${transfer.request.id}`}
                      className="font-mono font-medium text-green-700 hover:text-green-800 hover:underline"
                    >
                      {transfer.request.requestNumber}
                    </Link>
                  ) : (
                    <p className="text-gray-500">—</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Transfer Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(Number(transfer.totalAmount))}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Subtotal {formatCurrency(Number(transfer.subtotal))}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Transfer Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Dispatched</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(transfer.items ?? []).map((item) => (
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
                        <TableCell className="text-right tabular-nums text-gray-700">
                          {item.receivedQuantity != null ? item.receivedQuantity : '—'}
                        </TableCell>
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

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Dispatch</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 space-y-1">
                  <p>
                    Dispatched by:{' '}
                    <span className="font-medium text-gray-900">
                      {formatBranchStockTransferEmployeeName(transfer.dispatchedBy)}
                    </span>
                  </p>
                  <p>
                    Dispatched at:{' '}
                    <span className="font-medium text-gray-900">
                      {transfer.dispatchedAt
                        ? format(new Date(transfer.dispatchedAt), 'MMM d, yyyy h:mm a')
                        : '—'}
                    </span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Receipt</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 space-y-1">
                  {isReceived ? (
                    <>
                      <p>
                        Received by:{' '}
                        <span className="font-medium text-gray-900">
                          {formatBranchStockTransferEmployeeName(transfer.receivedBy)}
                        </span>
                      </p>
                      <p>
                        Received at:{' '}
                        <span className="font-medium text-gray-900">
                          {transfer.receivedAt
                            ? format(new Date(transfer.receivedAt), 'MMM d, yyyy h:mm a')
                            : '—'}
                        </span>
                      </p>
                    </>
                  ) : transfer.status === 'CANCELLED' ? (
                    <p className="text-gray-600">
                      Cancelled
                      {transfer.cancelledAt
                        ? ` on ${format(new Date(transfer.cancelledAt), 'MMM d, yyyy h:mm a')}`
                        : ''}
                      .
                    </p>
                  ) : (
                    <p className="text-blue-800">Awaiting receipt confirmation.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {transfer && (
          <ConfirmTransferReceiptDialog
            open={receiptDialogOpen}
            onOpenChange={setReceiptDialogOpen}
            transfer={transfer}
            onSuccess={() => refetch()}
          />
        )}

        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this transfer?</AlertDialogTitle>
              <AlertDialogDescription>
                Transfer {transfer?.transferNumber} will be cancelled and stock taken from the
                source will be restored. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelMutation.isPending}>Keep Transfer</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault()
                  handleCancel()
                }}
                disabled={cancelMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Transfer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  )
}
