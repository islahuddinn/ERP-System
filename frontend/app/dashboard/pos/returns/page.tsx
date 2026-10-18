'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { userResolver } from '@/lib/user-resolver'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import {
  RefundStatusBadge,
  ReturnStatusBadge,
} from '@/app/dashboard/pos/returns/components/return-status-badge'
import { ReturnDetailsDialog } from '@/app/dashboard/pos/returns/components/return-details-dialog'
import {
  useApproveSaleReturn,
  useCancelSaleReturn,
  useProcessSaleReturn,
  useSaleReturn,
  useSaleReturns,
  SaleReturn,
  SaleReturnStatus,
  PaymentMethod,
} from '@/hooks/pos/useReturns'
import { useLocations, Location } from '@/hooks/pos/useLocations'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  DollarSign,
  FileSpreadsheet,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Undo2,
  XCircle,
} from 'lucide-react'

import { formatCurrency } from '@/lib/currency';

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'MOBILE_PAYMENT', 'BANK_TRANSFER', 'CHEQUE', 'OTHER', 'CREDIT']

export default function SaleReturnsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | SaleReturnStatus>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const { locations } = useLocations()

  const queryParams = {
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    locationId: locationFilter !== 'all' ? locationFilter : undefined,
    startDate: dateRange?.from ? dateRange.from.toISOString() : undefined,
    endDate: dateRange?.to ? dateRange.to.toISOString() : undefined,
    page,
    limit: 20,
  }

  const { data, isLoading, isFetching } = useSaleReturns(queryParams)
  const saleReturns = data?.data ?? []
  const meta = data?.meta

  const approveMutation = useApproveSaleReturn()
  const processMutation = useProcessSaleReturn()
  const cancelMutation = useCancelSaleReturn()

  const [detailsId, setDetailsId] = useState<string | null>(null)
  const { data: detailedReturn } = useSaleReturn(detailsId)

  const [processTarget, setProcessTarget] = useState<SaleReturn | null>(null)
  const [processData, setProcessData] = useState<{ refundMethod: PaymentMethod; notes: string }>({
    refundMethod: 'CASH',
    notes: '',
  })

  const [cancelTarget, setCancelTarget] = useState<SaleReturn | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const summary = useMemo(() => {
    const total = saleReturns.reduce((sum, current) => sum + Number(current.totalAmount || 0), 0)
    const pending = saleReturns.filter((r) => r.status === 'PENDING').length
    const processed = saleReturns.filter((r) => r.status === 'PROCESSED').length
    return { totalRefunded: total, pending, processed }
  }, [saleReturns])

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
  }

  const handleApprove = (saleReturn: SaleReturn) => {
    approveMutation.mutate(saleReturn.id)
  }

  const handleProcessSubmit = () => {
    if (!processTarget) return
    processMutation.mutate(
      {
        id: processTarget.id,
        data: processData,
      },
      {
        onSuccess: () => {
          setProcessTarget(null)
          setProcessData({ refundMethod: 'CASH', notes: '' })
        },
      },
    )
  }

  const handleCancelSubmit = () => {
    if (!cancelTarget) return
    cancelMutation.mutate(
      {
        id: cancelTarget.id,
        data: { reason: cancelReason },
      },
      {
        onSuccess: () => {
          setCancelTarget(null)
          setCancelReason('')
        },
      },
    )
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setLocationFilter('all')
    setDateRange(undefined)
    setPage(1)
  }

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && meta?.hasPrev) {
      setPage((prev) => Math.max(1, prev - 1))
    } else if (direction === 'next' && meta?.hasNext) {
      setPage((prev) => (meta?.hasNext ? prev + 1 : prev))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-gray-400 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">Sale Returns</h1>
          <p className="text-gray-400">Mirror the purchase-return workflow for POS sales.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link href="/dashboard/pos/history">
            <Button variant="outline" className="border-gray-600 text-gray-200 hover:text-white">
              <Undo2 className="mr-2 h-4 w-4" />
              Sales History
            </Button>
          </Link>
          <Button onClick={() => router.push('/dashboard/pos/returns/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Sale Return
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <Card className="bg-gradient-to-r from-indigo-600 to-indigo-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center">
              <RotateCcw className="h-8 w-8 text-white" />
              <div className="ml-4">
                <p className="text-sm font-medium text-indigo-100">Total Returns</p>
                <p className="text-2xl font-semibold text-white">{meta?.total ?? saleReturns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-600 to-yellow-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-white" />
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-100">Pending Approval</p>
                <p className="text-2xl font-semibold text-white">{summary.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-white" />
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Processed Returns</p>
                <p className="text-2xl font-semibold text-white">{summary.processed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-white" />
              <div className="ml-4">
                <p className="text-sm font-medium text-emerald-100">Refund Value</p>
                <p className="text-2xl font-semibold text-white">{formatCurrency(summary.totalRefunded)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSearchSubmit}>
            <div className="space-y-2">
              <Label htmlFor="search" className="text-gray-300">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Return #, Sale #, customer..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as typeof statusFilter)
                  setPage(1)
                }}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PROCESSED">Processed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Location</Label>
              <Select
                value={locationFilter}
                onValueChange={(value) => {
                  setLocationFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((location: Location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 min-w-0">
              <Label className="text-gray-300">Return period</Label>
              <DatePickerWithRange
                className="w-full min-w-0"
                date={dateRange}
                onDateChange={(range) => {
                  setDateRange(range)
                  setPage(1)
                }}
              />
            </div>
          </form>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              className="border-gray-600 text-gray-200 hover:text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset filters
            </Button>
            <Badge variant="outline" className="border-gray-600 text-gray-200">
              Showing {saleReturns.length} return(s)
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-white">Return records</CardTitle>
          {isFetching && (
            <div className="flex items-center text-sm text-gray-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return</TableHead>
                  <TableHead>Sale</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Refund</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Refund status</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading sale returns...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : saleReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-gray-400">
                      No sale returns found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  saleReturns.map((saleReturn) => (
                    <TableRow key={saleReturn.id} className="border-gray-700">
                      <TableCell className="text-white">
                        <div className="font-semibold">{saleReturn.returnNumber}</div>
                        <div className="text-xs text-gray-400">
                          {format(new Date(saleReturn.returnDate), 'PPpp')}
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="font-medium">{saleReturn.originalSale?.saleNumber ?? 'N/A'}</div>
                        <div className="text-xs text-gray-400">{saleReturn.location?.name ?? 'N/A'}</div>
                      </TableCell>
                      <TableCell className="text-white">
                        {saleReturn.originalSale?.customer?.name ? (
                          saleReturn.originalSale.customer.name
                        ) : (
                          <span className="text-gray-400">Walk-in</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-white">
                        {formatCurrency(Number(saleReturn.totalAmount || 0))}
                      </TableCell>
                      <TableCell>
                        <ReturnStatusBadge status={saleReturn.status} />
                      </TableCell>
                      <TableCell>
                        <RefundStatusBadge status={saleReturn.refundStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-white">{saleReturn.processorId ? userResolver.getUserName(saleReturn.processorId) : 'N/A'}</div>
                        <div className="text-xs text-gray-400">
                          {saleReturn.processedBy ? 'Initiated' : 'Pending'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailsId(saleReturn.id)}>
                              View details
                            </DropdownMenuItem>
                            {saleReturn.status === 'PENDING' && (
                              <DropdownMenuItem onClick={() => handleApprove(saleReturn)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {['PENDING', 'APPROVED'].includes(saleReturn.status) && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setProcessTarget(saleReturn)
                                  setProcessData({
                                    refundMethod: saleReturn.refundMethod,
                                    notes: '',
                                  })
                                }}
                              >
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Process return
                              </DropdownMenuItem>
                            )}
                            {!['PROCESSED', 'CANCELLED'].includes(saleReturn.status) && (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => {
                                  setCancelTarget(saleReturn)
                                  setCancelReason('')
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel return
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              disabled={!meta?.hasPrev}
              onClick={() => handlePageChange('prev')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}
            </div>
            <Button
              variant="outline"
              disabled={!meta?.hasNext}
              onClick={() => handlePageChange('next')}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ReturnDetailsDialog open={!!detailsId} onOpenChange={(open) => !open && setDetailsId(null)} saleReturn={detailedReturn} />

      {/* Process return dialog */}
      <Dialog open={!!processTarget} onOpenChange={(open) => !open && !processMutation.isPending && setProcessTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process sale return</DialogTitle>
            <DialogDescription>
              Confirm refund and inventory adjustments for {processTarget?.returnNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Refund method</Label>
              <Select
                value={processData.refundMethod}
                onValueChange={(value) =>
                  setProcessData((prev) => ({ ...prev, refundMethod: value as PaymentMethod }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="process-notes">Notes</Label>
              <Textarea
                id="process-notes"
                placeholder="Optional notes (e.g. cash drawer reference)"
                value={processData.notes}
                onChange={(event) => setProcessData((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setProcessTarget(null)}
              disabled={processMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleProcessSubmit} disabled={processMutation.isPending}>
              {processMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process return
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel return dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && !cancelMutation.isPending && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel sale return</DialogTitle>
            <DialogDescription>
              Provide an optional reason before cancelling {cancelTarget?.returnNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Optional cancellation reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelTarget(null)}
              disabled={cancelMutation.isPending}
            >
              Keep return
            </Button>
            <Button variant="destructive" onClick={handleCancelSubmit} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel return
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


