'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, ArrowLeftRight, Loader2, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  useBranchStockTransfers,
  useBranchStockTransfer,
  formatTransferFromBranchName,
  BRANCH_STOCK_TRANSFER_STATUS_LABELS,
} from '@/hooks/useBranchStockTransfers'
import {
  useBranchStockReturnsForTransfer,
  useCreateBranchStockReturn,
  computeReturnableQuantitiesForTransferItems,
  validateReturnQuantity,
} from '@/hooks/useBranchStockReturns'
import { formatCurrency } from '@/lib/currency'

export default function CreateBranchStockReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const transferIdFromQuery = searchParams.get('transferId') ?? undefined

  const { data: transfer, isLoading: transferLoading, isError: transferError } =
    useBranchStockTransfer(transferIdFromQuery ?? '')

  const { data: recentTransfers, isLoading: pickerLoading } = useBranchStockTransfers({
    status: 'RECEIVED',
    limit: 15,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  })

  const { data: existingReturns = [] } = useBranchStockReturnsForTransfer(transferIdFromQuery, {
    enabled: !!transferIdFromQuery && transfer?.status === 'RECEIVED',
  })

  const createMutation = useCreateBranchStockReturn()
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const returnableByItemId = useMemo(() => {
    if (!transfer?.items?.length) return {}
    return computeReturnableQuantitiesForTransferItems(transfer.items, existingReturns)
  }, [transfer?.items, existingReturns])

  const hasReturnableLines = Object.values(returnableByItemId).some(
    (summary) => summary.remainingQuantity > 0,
  )

  const handleQuantityChange = (transferItemId: string, rawValue: string) => {
    setValidationError(null)
    if (rawValue.trim() === '') {
      setReturnQuantities((current) => ({ ...current, [transferItemId]: Number.NaN }))
      return
    }
    setReturnQuantities((current) => ({ ...current, [transferItemId]: Number(rawValue) }))
  }

  const handleSubmit = async () => {
    if (!transfer) return

    if (!reason.trim()) {
      setValidationError('Enter a reason for this return.')
      return
    }

    const items = (transfer.items ?? [])
      .map((item) => ({
        transferItemId: item.id,
        quantity: returnQuantities[item.id],
        productName: item.product?.name,
        remaining: returnableByItemId[item.id]?.remainingQuantity ?? 0,
      }))
      .filter((item) => item.quantity !== undefined && !Number.isNaN(item.quantity) && item.quantity > 0)

    if (items.length === 0) {
      setValidationError('Include at least one item with a return quantity greater than zero.')
      return
    }

    for (const item of items) {
      const errorMessage = validateReturnQuantity(item.quantity, item.remaining, item.productName)
      if (errorMessage) {
        setValidationError(errorMessage)
        return
      }
    }

    const stockReturn = await createMutation.mutateAsync({
      transferId: transfer.id,
      reason: reason.trim(),
      items: items.map((item) => ({
        transferItemId: item.transferItemId,
        quantity: item.quantity,
      })),
    })
    router.push(`/dashboard/sales/branch-stock-returns/${stockReturn.id}`)
  }

  const isLoading = createMutation.isPending

  return (
    <ProtectedRoute requiredPermission="branch-stock-return.create">
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
              Record Branch Stock Return
            </h1>
            <p className="text-gray-600 mt-1">
              Select a received transfer, then return quantity against specific line items. Prices
              are copied from the transfer — returns are created pending approval.
            </p>
          </div>
        </div>

        {!transferIdFromQuery && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-green-600" />
                Select a Received Transfer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {pickerLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading transfers…
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transfer #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(recentTransfers?.data ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-10">
                          No received transfers yet. Confirm receipt on a dispatched transfer first.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (recentTransfers?.data ?? []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.transferNumber}</TableCell>
                          <TableCell>{format(new Date(item.createdAt), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{formatTransferFromBranchName(item.fromBranch)}</TableCell>
                          <TableCell>{item.toBranch?.name ?? '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(Number(item.totalAmount))}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/dashboard/sales/branch-stock-returns/create?transferId=${item.id}`,
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
                  href="/dashboard/sales/branch-stock-transfers"
                  className="text-green-700 hover:text-green-800 hover:underline font-medium"
                >
                  transfer detail
                </Link>{' '}
                and use &quot;Record Return&quot; for a specific received transfer.
              </div>
            </CardContent>
          </Card>
        )}

        {transferIdFromQuery && transferLoading && (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading transfer…
          </div>
        )}

        {transferIdFromQuery && transferError && (
          <Card>
            <CardContent className="py-10 text-center text-red-600">
              Failed to load this transfer. It may not exist or you may not have access.
            </CardContent>
          </Card>
        )}

        {transfer && transferIdFromQuery && (
          <>
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{transfer.transferNumber}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatTransferFromBranchName(transfer.fromBranch)} → {transfer.toBranch?.name}{' '}
                    · {format(new Date(transfer.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {BRANCH_STOCK_TRANSFER_STATUS_LABELS[transfer.status]}
                  </Badge>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/sales/branch-stock-transfers/${transfer.id}`}>
                      View Transfer
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard/sales/branch-stock-returns/create')}
                  >
                    Change Transfer
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {transfer.status !== 'RECEIVED' ? (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="py-6 text-amber-900">
                  Returns can only be recorded against transfers that have been marked{' '}
                  <span className="font-medium">RECEIVED</span>. Confirm receipt first, then return
                  stock to the source branch.
                </CardContent>
              </Card>
            ) : !hasReturnableLines ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-600">
                  All line items on this transfer have been fully returned (or have pending returns
                  covering the received quantity).
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Returnable Line Items</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {(transfer.items ?? []).map((item) => {
                      const returnable = returnableByItemId[item.id]
                      if (!returnable || returnable.remainingQuantity <= 0) return null

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
                                Received:{' '}
                                <span className="font-medium text-gray-900">
                                  {returnable.receivedQuantity}
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
                              <p className="mt-1">
                                Unit price:{' '}
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(Number(item.unitPrice))}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="max-w-xs">
                            <Label htmlFor={`qty-${item.id}`}>Return Quantity</Label>
                            <Input
                              id={`qty-${item.id}`}
                              type="number"
                              min={0.01}
                              max={returnable.remainingQuantity}
                              step="any"
                              value={
                                Number.isFinite(returnQuantities[item.id])
                                  ? returnQuantities[item.id]
                                  : ''
                              }
                              onChange={(event) =>
                                handleQuantityChange(item.id, event.target.value)
                              }
                              disabled={isLoading}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Return Reason</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Why is this stock being returned?"
                      value={reason}
                      onChange={(event) => {
                        setValidationError(null)
                        setReason(event.target.value)
                      }}
                      disabled={isLoading}
                      rows={3}
                    />
                  </CardContent>
                </Card>

                {validationError && (
                  <Alert variant="destructive">
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white min-w-[160px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Submit Return
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
