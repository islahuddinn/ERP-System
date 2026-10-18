'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import {
  useMaterialRequest,
  useApproveMaterialRequest,
  useRejectMaterialRequest,
  useFulfillMaterialRequest,
  useSubmitMaterialRequest,
  type MaterialRequestStatus,
  type MaterialRequestPriority,
} from '@/hooks/useMaterialRequests'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Loader2, Package, CheckCircle, XCircle, Send, FileText, History, PackageSearch, Calendar, User, AlertCircle, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export default function MaterialRequestDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  const { data: request, isLoading } = useMaterialRequest(requestId)
  const approveMutation = useApproveMaterialRequest()
  const rejectMutation = useRejectMaterialRequest()
  const fulfillMutation = useFulfillMaterialRequest()
  const submitMutation = useSubmitMaterialRequest()

  const [rejectReason, setRejectReason] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  const getStatusBadge = (status: MaterialRequestStatus) => {
    const badges: Record<MaterialRequestStatus, { label: string; className: string }> = {
      PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200' },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
      FULFILLED: { label: 'Fulfilled', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700 border-gray-200' },
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    }
    const badge = badges[status] || badges.PENDING
    return <Badge className={badge.className}>{badge.label}</Badge>
  }

  const getPriorityBadge = (priority: MaterialRequestPriority) => {
    const badges: Record<MaterialRequestPriority, { label: string; className: string }> = {
      LOW: { label: 'Low', className: 'bg-gray-100 text-gray-700 border-gray-200' },
      MEDIUM: { label: 'Medium', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      HIGH: { label: 'High', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      URGENT: { label: 'Urgent', className: 'bg-red-100 text-red-700 border-red-200' },
    }
    const badge = badges[priority] || badges.MEDIUM
    return <Badge className={badge.className}>{badge.label}</Badge>
  }

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ id: requestId, notes: undefined })
      toast.success('Material request approved successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve request')
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    try {
      await rejectMutation.mutateAsync({ id: requestId, reason: rejectReason })
      toast.success('Material request rejected')
      setShowRejectDialog(false)
      setRejectReason('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject request')
    }
  }

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync(requestId)
      toast.success('Material request submitted for approval')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit request')
    }
  }

  const handleFulfill = async () => {
    try {
      await fulfillMutation.mutateAsync({ id: requestId })
      toast.success('Materials fulfilled successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fulfill materials')
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="raw-materials.read">
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

  if (!request) {
    return (
      <ProtectedRoute requiredPermission="raw-materials.read">
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-900 font-medium">Material request not found</p>
              <Button
                onClick={() => router.push('/dashboard/factory/material-requests')}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Requests
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Normalize values so both dummy data and backend responses work
  const items = Array.isArray((request as any).items) ? (request as any).items : []
  const itemsCount =
    (request as any).itemsCount != null
      ? (request as any).itemsCount
      : items.length

  let totalQuantity: number =
    (request as any).totalQuantity != null ? Number((request as any).totalQuantity) : NaN

  if (!Number.isFinite(totalQuantity)) {
    totalQuantity = items.reduce((sum: number, item: any) => {
      const qty =
        item.quantity ??
        item.requestedQuantity ??
        item.approvedQuantity ??
        item.fulfilledQuantity ??
        0
      return sum + (Number(qty) || 0)
    }, 0)
  }

  const safeTotalQuantity = Number.isFinite(totalQuantity) ? totalQuantity : 0

  return (
    <ProtectedRoute requiredPermission="raw-materials.read">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dashboard/factory/material-requests')}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{request.requestNumber}</h1>
                  <p className="text-gray-600 mt-1">
                    {request.plant ? `Plant: ${request.plant.name}` : `Warehouse: ${request.warehouse?.name || 'N/A'}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {request.status === 'DRAFT' && (
                  <PermissionGuard requiredPermission="raw-materials.manage_stock">
                    <Button
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                    </Button>
                  </PermissionGuard>
                )}
                {request.status === 'PENDING' && (
                  <>
                    <PermissionGuard requiredPermission="raw-materials.manage_stock">
                      <Button
                        onClick={handleApprove}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard requiredPermission="raw-materials.manage_stock">
                      <Button
                        onClick={() => setShowRejectDialog(true)}
                        disabled={rejectMutation.isPending}
                        variant="destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </PermissionGuard>
                  </>
                )}
                {request.status === 'APPROVED' && (
                  <PermissionGuard requiredPermission="raw-materials.manage_stock">
                    <Button
                      onClick={handleFulfill}
                      disabled={fulfillMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Fulfill Request
                    </Button>
                  </PermissionGuard>
                )}
              </div>
            </div>

            {/* Status and Priority Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="factory-stat-card border-green-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Status</CardDescription>
                </CardHeader>
                <CardContent>
                  {getStatusBadge(request.status)}
                </CardContent>
              </Card>
              <Card className="factory-stat-card border-blue-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Priority</CardDescription>
                </CardHeader>
                <CardContent>
                  {getPriorityBadge(request.priority)}
                </CardContent>
              </Card>
              <Card className="factory-stat-card border-purple-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Items</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{itemsCount}</div>
                </CardContent>
              </Card>
              <Card className="factory-stat-card border-orange-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Total Quantity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {safeTotalQuantity.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="bg-white border border-gray-200">
                <TabsTrigger 
                  value="overview"
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="items"
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
                >
                  Items ({request.itemsCount})
                </TabsTrigger>
                <TabsTrigger 
                  value="history"
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
                >
                  History
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Request Information */}
                  <Card className="factory-light-card">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Request Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Request Number</p>
                        <p className="text-gray-900 font-mono font-semibold">{request.requestNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Requested By
                        </p>
                        <p className="text-gray-900 font-medium">{request.requestedBy.name}</p>
                        <p className="text-gray-600 text-sm">{request.requestedBy.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Request Date
                        </p>
                        <p className="text-gray-900">
                          {(() => {
                            const rawDate =
                              (request as any).requestDate ||
                              (request as any).createdAt ||
                              (request as any).requiredDate

                            if (!rawDate) return 'N/A'
                            const d = new Date(rawDate)
                            if (isNaN(d.getTime())) return 'N/A'
                            return format(d, 'MMM dd, yyyy HH:mm')
                          })()}
                        </p>
                      </div>
                      {request.requiredDate && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Required Date
                          </p>
                          <p className="text-gray-900">{format(new Date(request.requiredDate), 'MMM dd, yyyy')}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Location
                        </p>
                        <p className="text-gray-900">
                          {request.plant ? `Plant: ${request.plant.name}` : `Warehouse: ${request.warehouse?.name || 'N/A'}`}
                        </p>
                      </div>
                      {request.notes && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Notes</p>
                          <p className="text-gray-900 text-sm">{request.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Status Information */}
                  <Card className="factory-light-card">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Status Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {request.approvedBy && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Approved By</p>
                          <p className="text-gray-900 font-medium">{request.approvedBy.name}</p>
                          {request.approvedAt && (
                            <p className="text-gray-600 text-sm">{format(new Date(request.approvedAt), 'MMM dd, yyyy HH:mm')}</p>
                          )}
                        </div>
                      )}
                      {request.rejectedBy && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Rejected By</p>
                          <p className="text-gray-900 font-medium">{request.rejectedBy.name}</p>
                          {request.rejectedAt && (
                            <p className="text-gray-600 text-sm">{format(new Date(request.rejectedAt), 'MMM dd, yyyy HH:mm')}</p>
                          )}
                          {request.rejectionReason && (
                            <p className="text-red-600 text-sm mt-1">{request.rejectionReason}</p>
                          )}
                        </div>
                      )}
                      {request.fulfilledBy && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Fulfilled By</p>
                          <p className="text-gray-900 font-medium">{request.fulfilledBy.name}</p>
                          {request.fulfilledAt && (
                            <p className="text-gray-600 text-sm">{format(new Date(request.fulfilledAt), 'MMM dd, yyyy HH:mm')}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Items Tab */}
              <TabsContent value="items" className="space-y-4">
                <Card className="factory-light-card">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Request Items</CardTitle>
                    <CardDescription className="text-gray-600">
                      {itemsCount} item{itemsCount !== 1 ? 's' : ''} • Total:{' '}
                      {safeTotalQuantity.toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 bg-gray-50">
                            <TableHead className="text-gray-700 font-semibold">Product</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Code</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Quantity</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Unit</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Available Stock</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item: any) => {
                            const product = (item as any).product || (item as any).material || {}
                            const qty =
                              item.quantity ??
                              item.requestedQuantity ??
                              item.approvedQuantity ??
                              item.fulfilledQuantity ??
                              0
                            const unit = item.unit ?? product.unit ?? product.uom?.symbol ?? ''

                            return (
                              <TableRow key={item.id} className="border-gray-200 hover:bg-gray-50">
                                <TableCell className="font-medium text-gray-900">
                                  {product.name ?? 'Unknown Product'}
                                </TableCell>
                                <TableCell className="text-gray-600 font-mono text-sm">
                                  {product.code ?? product.sku ?? 'UNK'}
                                </TableCell>
                                <TableCell className="text-gray-900 font-semibold">
                                  {Number(qty || 0).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-gray-600">
                                  {unit || 'N/A'}
                                </TableCell>
                                <TableCell className="text-gray-600">
                                  {item.availableStock !== undefined ? (
                                    <span className={item.availableStock >= item.quantity ? 'text-green-600' : 'text-red-600'}>
                                      {item.availableStock.toLocaleString()}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-gray-600 text-sm">
                                  {item.notes || '-'}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <Card className="factory-light-card">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <History className="h-5 w-5 text-green-600" />
                      Status History
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Complete history of status changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {request.statusHistory && request.statusHistory.length > 0 ? (
                      <div className="space-y-4">
                        {request.statusHistory.map((history: any, index: number) => (
                          <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-200 last:border-0">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                <History className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getStatusBadge(history.status).props.className}>
                                  {history.status}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                  by {history.changedBy.name}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {format(new Date(history.changedAt), 'MMM dd, yyyy HH:mm')}
                              </p>
                              {history.notes && (
                                <p className="text-sm text-gray-700 mt-2">{history.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600">No history available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">Reject Material Request</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Please provide a reason for rejecting this material request.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="rejectReason" className="text-gray-700">Rejection Reason *</Label>
                    <Textarea
                      id="rejectReason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Enter the reason for rejection..."
                      className="mt-1 border-gray-300"
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectDialog(false)
                      setRejectReason('')
                    }}
                    className="border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || rejectMutation.isPending}
                    variant="destructive"
                  >
                    {rejectMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Request
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

