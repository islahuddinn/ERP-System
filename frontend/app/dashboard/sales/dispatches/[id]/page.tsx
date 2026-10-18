'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ArrowLeft,
  Truck,
  MapPin,
  User,
  FileText,
  CheckCircle2,
  PackageCheck,
  Undo2,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useSaleDispatch, useUpdateSaleDispatch } from '@/hooks/useSaleDispatches'
import { useUsersDropdown, buildUserName } from '@/hooks/useUsers'

export default function SaleDispatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const saleDispatchId = params?.id as string

  const { data: dispatch, isLoading, error } = useSaleDispatch(saleDispatchId)
  const { data: users = [] } = useUsersDropdown()
  const updateMutation = useUpdateSaleDispatch()

  const [officerId, setOfficerId] = useState<string | undefined>(undefined)
  const [notes, setNotes] = useState('')

  // Seed officer/notes inputs from the loaded dispatch (DRAFT-only edits).
  useEffect(() => {
    if (!dispatch) return
    setOfficerId(dispatch.dispatchOfficer?.id || dispatch.dispatchOfficerId || undefined)
    setNotes(dispatch.notes || '')
  }, [dispatch])

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
      APPROVED: 'bg-teal-100 text-teal-700 border-teal-200',
      DELIVERED: 'bg-green-100 text-green-700 border-green-200',
    }
    return <Badge className={map[status] || map.DRAFT}>{status}</Badge>
  }

  const onError = (err: any, fallback: string) =>
    toast.error(err?.response?.data?.message || err?.message || fallback)

  // Approve: DRAFT → APPROVED. Officer + notes can only be set on a DRAFT, so we
  // send them together with the approval in a single PATCH.
  const handleApprove = () => {
    updateMutation.mutate(
      {
        saleDispatchId,
        data: {
          status: 'APPROVED',
          dispatchOfficerId: officerId || undefined,
          notes: notes.trim() !== '' ? notes : undefined,
        },
      },
      {
        onSuccess: () => toast.success('Dispatch approved'),
        onError: (err) => onError(err, 'Failed to approve dispatch'),
      },
    )
  }

  // Save officer/notes without changing status (DRAFT only).
  const handleSaveOfficer = () => {
    updateMutation.mutate(
      {
        saleDispatchId,
        data: {
          dispatchOfficerId: officerId || undefined,
          notes: notes.trim() !== '' ? notes : undefined,
        },
      },
      {
        onSuccess: () => toast.success('Officer / notes updated'),
        onError: (err) => onError(err, 'Failed to update dispatch'),
      },
    )
  }

  // Reject: APPROVED → DRAFT.
  const handleReject = () => {
    updateMutation.mutate(
      { saleDispatchId, data: { status: 'DRAFT' } },
      {
        onSuccess: () => toast.success('Dispatch sent back to draft'),
        onError: (err) => onError(err, 'Failed to reject dispatch'),
      },
    )
  }

  // Mark Delivered: APPROVED → DELIVERED (terminal; deducts stock).
  const handleDeliver = () => {
    updateMutation.mutate(
      { saleDispatchId, data: { status: 'DELIVERED' } },
      {
        onSuccess: () => toast.success('Dispatch marked as delivered'),
        onError: (err) => onError(err, 'Failed to mark as delivered'),
      },
    )
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !dispatch) {
    return (
      <ProtectedRoute>
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="text-center py-12">
              <p className="text-red-600">Error loading dispatch</p>
              <Button onClick={() => router.back()} className="mt-4">
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const isDraft = dispatch.status === 'DRAFT'
  const isApproved = dispatch.status === 'APPROVED'
  const isDelivered = dispatch.status === 'DELIVERED'
  const isBusy = updateMutation.isPending

  return (
    <ProtectedRoute>
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
                    <Truck className="h-8 w-8 text-green-600" />
                    {dispatch.dispatchNumber}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {dispatch.sale?.saleNumber ? `Sale: ${dispatch.sale.saleNumber}` : 'Dispatch'}
                    {dispatch.sale?.customer?.name ? ` · ${dispatch.sale.customer.name}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                {getStatusBadge(dispatch.status)}

                {isDraft && (
                  <Button
                    onClick={handleApprove}
                    disabled={isBusy}
                    className="bg-green-600 hover:bg-green-700 text-white h-9"
                  >
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                )}

                {isApproved && (
                  <>
                    <Button
                      onClick={handleReject}
                      disabled={isBusy}
                      variant="outline"
                      className="h-9 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Undo2 className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                    <Button
                      onClick={handleDeliver}
                      disabled={isBusy}
                      className="bg-green-600 hover:bg-green-700 text-white h-9"
                    >
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <PackageCheck className="h-4 w-4 mr-2" />
                      )}
                      Mark Delivered
                    </Button>
                  </>
                )}
              </div>
            </div>

            {isDelivered && (
              <Card className="bg-green-50 border-green-200 shadow-sm">
                <CardContent className="py-3 text-sm text-green-700">
                  This dispatch has been delivered and is now locked. No further changes are
                  allowed.
                </CardContent>
              </Card>
            )}

            {/* Info cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900">Dispatch Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Site</p>
                      <p className="font-medium text-gray-900">
                        {dispatch.site?.name || '-'}
                        {dispatch.site?.code ? ` (${dispatch.site.code})` : ''}
                      </p>
                      {dispatch.site?.location?.city && (
                        <p className="text-xs text-gray-500">
                          {[
                            dispatch.site.location.address,
                            dispatch.site.location.city,
                            dispatch.site.location.state,
                            dispatch.site.location.country,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Dispatch Officer</p>
                      <p className="font-medium text-gray-900">
                        {dispatch.dispatchOfficer
                          ? buildUserName(dispatch.dispatchOfficer)
                          : 'Unassigned'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Site Manager</p>
                      <p className="font-medium text-gray-900">
                        {dispatch.siteManager ? buildUserName(dispatch.siteManager) : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Created By</p>
                      <p className="font-medium text-gray-900">
                        {dispatch.createdBy ? buildUserName(dispatch.createdBy) : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900">Status & Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    {getStatusBadge(dispatch.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created</span>
                    <span className="text-gray-900">
                      {dispatch.createdAt
                        ? format(new Date(dispatch.createdAt), 'MMM dd, yyyy HH:mm')
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Approved</span>
                    <span className="text-gray-900">
                      {dispatch.approvedAt
                        ? format(new Date(dispatch.approvedAt), 'MMM dd, yyyy HH:mm')
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivered</span>
                    <span className="text-gray-900">
                      {dispatch.deliveredAt
                        ? format(new Date(dispatch.deliveredAt), 'MMM dd, yyyy HH:mm')
                        : '—'}
                    </span>
                  </div>
                  {dispatch.notes && (
                    <div className="border-t pt-2">
                      <p className="text-gray-500">Notes</p>
                      <p className="text-gray-900 whitespace-pre-wrap">{dispatch.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Officer & notes editor — DRAFT only */}
            {isDraft && (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                  <CardTitle className="text-gray-900">Assign Officer & Notes</CardTitle>
                  <CardDescription>
                    Officer and notes can only be changed while the dispatch is a draft.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Dispatch Officer</Label>
                      <Select value={officerId || undefined} onValueChange={setOfficerId}>
                        <SelectTrigger className="bg-white border-gray-300 h-11">
                          <SelectValue placeholder="Select officer" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                              {u.email ? ` · ${u.email}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-gray-700 font-medium">
                      Notes
                    </Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Handling instructions, pickup details…"
                      className="bg-white border-gray-300 resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveOfficer}
                      disabled={isBusy}
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save Officer / Notes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Items + batch breakdown */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">Items</CardTitle>
                <CardDescription>
                  Allocated quantities per sale item with batch-level breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-gray-200">
                      <TableHead className="font-semibold text-gray-700">Item</TableHead>
                      <TableHead className="font-semibold text-gray-700">SKU</TableHead>
                      <TableHead className="font-semibold text-gray-700">Ordered</TableHead>
                      <TableHead className="font-semibold text-gray-700">Dispatched</TableHead>
                      <TableHead className="font-semibold text-gray-700">Batches</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dispatch.items || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                          No items.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (dispatch.items || []).map((item) => {
                        const dispatchTotal = (item.batches || []).reduce(
                          (s, b) => s + Number(b.quantity || 0),
                          0,
                        )
                        return (
                          <TableRow key={item.saleItemId} className="border-gray-100 align-top">
                            <TableCell className="font-medium text-gray-900">
                              {item.itemName}
                            </TableCell>
                            <TableCell className="text-gray-600">{item.sku || '-'}</TableCell>
                            <TableCell className="text-gray-900">
                              {Number(item.orderedQuantity || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-gray-900">
                              {Number(item.dispatchedQuantity || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500">
                                  {dispatchTotal.toLocaleString()} units in this dispatch
                                </p>
                                {(item.batches || []).map((b) => (
                                  <div
                                    key={b.dispatchItemId}
                                    className="flex items-center justify-between gap-3 text-sm"
                                  >
                                    <span className="text-gray-700">{b.batchNumber}</span>
                                    <span className="font-medium text-gray-900">
                                      {Number(b.quantity || 0).toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
