'use client'

import { useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, Loader2, Truck } from 'lucide-react'
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
  useBranchStockRequest,
  formatBranchStockEmployeeName,
  formatFulfillerBranchName,
  computeRemainingRequestBalance,
  BRANCH_STOCK_REQUEST_STATUS_LABELS,
  type BranchStockRequestStatus,
} from '@/hooks/useBranchStockRequests'
import { BRANCH_STOCK_TRANSFER_STATUS_LABELS } from '@/hooks/useBranchStockTransfers'
import { BranchStockRequestStatusActions } from '@/components/sales/branch-stock/branch-stock-request-status-actions'
import { ShipRequestDialog } from '@/components/sales/branch-stock/ship-request-dialog'
import { formatCurrency } from '@/lib/currency'

function getStatusStyle(status: BranchStockRequestStatus) {
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

export default function BranchStockRequestDetailPage() {
  const router = useRouter()
  const params = useParams<{ requestId: string }>()
  const requestId = params.requestId
  const { hasPermission } = usePermissionCheck()
  const canApprove = hasPermission('branch-stock-request.approve')
  const canShip = canApprove

  const { data: request, isLoading, isError, refetch } = useBranchStockRequest(requestId)
  const [shipDialogOpen, setShipDialogOpen] = useState(false)

  const remainingByItemId = useMemo(
    () => (request ? computeRemainingRequestBalance(request) : {}),
    [request],
  )

  const hasOutstandingBalance = Object.values(remainingByItemId).some((remaining) => remaining > 0)

  const requestTotal = (request?.items ?? []).reduce(
    (sum, item) => sum + Number(item.totalAmount ?? 0),
    0,
  )

  return (
    <ProtectedRoute requiredPermission="branch-stock-request.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/branch-stock-requests')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-green-600 shrink-0" />
              <span className="truncate">{request?.requestNumber ?? 'Branch Stock Request'}</span>
            </h1>
            {request && (
              <p className="text-gray-600 mt-1">
                {request.requesterBranch?.name} → {formatFulfillerBranchName(request.fulfillerBranch)}{' '}
                · {format(new Date(request.requestDate), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          {request && (
            <Badge className={getStatusStyle(request.status)}>
              {BRANCH_STOCK_REQUEST_STATUS_LABELS[request.status]}
            </Badge>
          )}
          {request && canApprove && request.status === 'PENDING' && (
            <BranchStockRequestStatusActions branchStockRequest={request} onSuccess={() => refetch()} />
          )}
          {request && canShip && request.status === 'APPROVED' && hasOutstandingBalance && (
            <Button
              onClick={() => setShipDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Truck className="mr-2 h-4 w-4" />
              Ship Transfer
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading request…
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="py-10 text-center text-red-600">
              Failed to load this branch stock request. It may have been removed or you may not have
              access.
            </CardContent>
          </Card>
        )}

        {request && (
          <>
            {request.status === 'PENDING' && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="py-4 text-sm text-amber-900">
                  This request is pending approval. No stock moves until an approver confirms it,
                  then ships via a separate transfer.
                </CardContent>
              </Card>
            )}

            {request.status === 'APPROVED' && hasOutstandingBalance && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="py-4 text-sm text-green-900">
                  Approved — {Object.values(remainingByItemId).reduce((sum, qty) => sum + qty, 0)}{' '}
                  units still outstanding across line items. Ship in one or more transfers.
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Requesting Branch</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">{request.requesterBranch?.name ?? '—'}</p>
                  <p className="text-sm text-gray-500">{request.requesterBranch?.code}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Fulfilling Branch</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">
                    {formatFulfillerBranchName(request.fulfillerBranch)}
                  </p>
                  {request.fulfillerBranch?.code && (
                    <p className="text-sm text-gray-500">{request.fulfillerBranch.code}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Requested By</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">
                    {formatBranchStockEmployeeName(request.requestedBy)}
                  </p>
                  <p className="text-sm text-gray-500">{request.requestedBy?.employeeCode}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Request Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(requestTotal)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(request.items ?? []).length} line item(s)
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Requested Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Requested</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(request.items ?? []).map((item) => (
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
                        <TableCell className="text-right tabular-nums text-green-700 font-medium">
                          {remainingByItemId[item.id] ?? 0}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.unitPrice != null ? formatCurrency(Number(item.unitPrice)) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {item.totalAmount != null ? formatCurrency(Number(item.totalAmount)) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {(request.transfers ?? []).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Linked Transfers</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(request.transfers ?? []).map((transfer) => (
                        <TableRow key={transfer.id}>
                          <TableCell className="font-mono text-sm">{transfer.transferNumber}</TableCell>
                          <TableCell>
                            <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                              {BRANCH_STOCK_TRANSFER_STATUS_LABELS[transfer.status] ??
                                transfer.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(transfer.createdAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/sales/branch-stock-transfers/${transfer.id}`}>
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {request.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-800">{request.notes}</p>
                </CardContent>
              </Card>
            )}

            {request.status === 'PENDING' && canApprove && (
              <Card>
                <CardHeader>
                  <CardTitle>Approver Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <BranchStockRequestStatusActions
                    branchStockRequest={request}
                    onSuccess={() => refetch()}
                    layout="stacked"
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}

        {request && (
          <ShipRequestDialog
            open={shipDialogOpen}
            onOpenChange={setShipDialogOpen}
            branchStockRequest={request}
            onSuccess={() => refetch()}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
