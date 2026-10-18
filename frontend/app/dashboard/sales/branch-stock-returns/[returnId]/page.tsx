'use client'

import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react'
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
  useBranchStockReturn,
  formatBranchStockReturnEmployeeName,
  formatReceivingBranchName,
  BRANCH_STOCK_RETURN_STATUS_LABELS,
  type BranchStockReturnStatus,
} from '@/hooks/useBranchStockReturns'
import { BranchStockReturnStatusActions } from '@/components/sales/branch-stock/branch-stock-return-status-actions'
import { formatCurrency } from '@/lib/currency'

function getStatusStyle(status: BranchStockReturnStatus) {
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

export default function BranchStockReturnDetailPage() {
  const router = useRouter()
  const params = useParams<{ returnId: string }>()
  const returnId = params.returnId
  const { hasPermission } = usePermissionCheck()
  const canApprove = hasPermission('branch-stock-return.approve')

  const { data: stockReturn, isLoading, isError, refetch } = useBranchStockReturn(returnId)

  return (
    <ProtectedRoute requiredPermission="branch-stock-return.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/branch-stock-returns')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <RotateCcw className="h-8 w-8 text-green-600 shrink-0" />
              <span className="truncate">{stockReturn?.returnNumber ?? 'Branch Stock Return'}</span>
            </h1>
            {stockReturn && (
              <p className="text-gray-600 mt-1">
                {stockReturn.returningBranch?.name} →{' '}
                {formatReceivingBranchName(stockReturn.receivingBranch)} ·{' '}
                {format(new Date(stockReturn.requestDate), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          {stockReturn && (
            <Badge className={getStatusStyle(stockReturn.status)}>
              {BRANCH_STOCK_RETURN_STATUS_LABELS[stockReturn.status]}
            </Badge>
          )}
          {stockReturn && canApprove && stockReturn.status === 'PENDING' && (
            <BranchStockReturnStatusActions branchStockReturn={stockReturn} onSuccess={() => refetch()} />
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
              Failed to load this branch stock return. It may have been removed or you may not have
              access.
            </CardContent>
          </Card>
        )}

        {stockReturn && (
          <>
            {stockReturn.status === 'PENDING' && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="py-4 text-sm text-amber-900">
                  This return is pending approval. Stock and the branch ledger are not updated until
                  an approver confirms it.
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Returning Branch</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">
                    {stockReturn.returningBranch?.name ?? '—'}
                  </p>
                  <p className="text-sm text-gray-500">{stockReturn.returningBranch?.code}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Receiving Branch</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">
                    {formatReceivingBranchName(stockReturn.receivingBranch)}
                  </p>
                  {stockReturn.receivingBranch?.code && (
                    <p className="text-sm text-gray-500">{stockReturn.receivingBranch.code}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Requested By</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900">
                    {formatBranchStockReturnEmployeeName(stockReturn.requestedBy)}
                  </p>
                  <p className="text-sm text-gray-500">{stockReturn.requestedBy?.employeeCode}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Return Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(Number(stockReturn.totalAmount))}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Reason: {stockReturn.reason}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Return Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stockReturn.items ?? []).map((item) => (
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

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Source Transfer</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 space-y-1">
                  {stockReturn.transfer ? (
                    <Link
                      href={`/dashboard/sales/branch-stock-transfers/${stockReturn.transfer.id}`}
                      className="font-mono font-medium text-green-700 hover:text-green-800 hover:underline"
                    >
                      {stockReturn.transfer.transferNumber}
                    </Link>
                  ) : (
                    <p className="text-gray-500">—</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Approval</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 space-y-1">
                  {stockReturn.status === 'APPROVED' ? (
                    <>
                      <p>
                        Approved by:{' '}
                        <span className="font-medium text-gray-900">
                          {formatBranchStockReturnEmployeeName(stockReturn.approvedBy)}
                        </span>
                      </p>
                      <p>
                        Approved at:{' '}
                        <span className="font-medium text-gray-900">
                          {stockReturn.approvedAt
                            ? format(new Date(stockReturn.approvedAt), 'MMM d, yyyy h:mm a')
                            : '—'}
                        </span>
                      </p>
                    </>
                  ) : stockReturn.status === 'REJECTED' ? (
                    <p className="text-gray-600">
                      This return was rejected — no ledger or stock impact.
                    </p>
                  ) : (
                    <p className="text-amber-800">Awaiting approver action.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {stockReturn.status === 'PENDING' && canApprove && (
              <Card>
                <CardHeader>
                  <CardTitle>Approver Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <BranchStockReturnStatusActions
                    branchStockReturn={stockReturn}
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
