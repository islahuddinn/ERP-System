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
  useMaterialTransfer,
  useApproveMaterialTransfer,
  useStartMaterialTransfer,
  useReceiveMaterialTransfer,
  useCancelMaterialTransfer,
  type MaterialTransferStatus,
} from '@/hooks/useMaterialTransfers'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Loader2, Package, CheckCircle, MapPin, Calendar, User, ArrowLeftRight, X, Truck, Ban } from 'lucide-react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { userResolver } from '@/lib/user-resolver'

export default function MaterialTransferDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const transferId = params.id as string

  const { data: transfer, isLoading } = useMaterialTransfer(transferId)
  const approveMutation = useApproveMaterialTransfer()
  const startMutation = useStartMaterialTransfer()
  const receiveMutation = useReceiveMaterialTransfer()
  const cancelMutation = useCancelMaterialTransfer()

  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showStartDialog, setShowStartDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({})
  const [damagedQuantities, setDamagedQuantities] = useState<Record<string, number>>({})
  const [approveComments, setApproveComments] = useState('')
  const [startTransportDetails, setStartTransportDetails] = useState('')
  const [cancelComments, setCancelComments] = useState('')
  const [receiveComments, setReceiveComments] = useState('')

  const getStatusBadge = (status: MaterialTransferStatus) => {
    const badges: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      APPROVED: { label: 'Approved', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      IN_TRANSIT: { label: 'In Transit', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      RECEIVED: { label: 'Received', className: 'bg-green-100 text-green-700 border-green-200' },
      CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
    }
    const badge = badges[status] || badges.PENDING
    return <Badge className={badge.className}>{badge.label}</Badge>
  }

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ id: transferId, comments: approveComments })
      toast.success('Transfer approved successfully')
      setShowApproveDialog(false)
      setApproveComments('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve transfer')
    }
  }

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync({ id: transferId, transportDetails: startTransportDetails })
      toast.success('Transfer started successfully')
      setShowStartDialog(false)
      setStartTransportDetails('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start transfer')
    }
  }

  const handleReceive = async () => {
    if (!transfer) return

    const items = transfer.items.map((item: any) => ({
      id: item.id,
      actualQuantity: receivedQuantities[item.id] || item.quantity,
      damagedQuantity: damagedQuantities[item.id] || 0,
      receivingNotes: '',
    }))

    try {
      await receiveMutation.mutateAsync({ 
        id: transferId, 
        data: { 
          receivingComments: receiveComments,
          items 
        } 
      })
      toast.success('Transfer received successfully')
      setShowReceiveDialog(false)
      setReceivedQuantities({})
      setDamagedQuantities({})
      setReceiveComments('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to receive transfer')
    }
  }

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ id: transferId, comments: cancelComments })
      toast.success('Transfer cancelled successfully')
      setShowCancelDialog(false)
      setCancelComments('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel transfer')
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="stock.transfer">
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

  if (!transfer) {
    return (
      <ProtectedRoute requiredPermission="stock.transfer">
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-900 font-medium">Material transfer not found</p>
              <Button
                onClick={() => router.push('/dashboard/factory/material-transfers')}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Transfers
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="stock.transfer">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dashboard/factory/material-transfers')}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{transfer.transferNumber}</h1>
                  <p className="text-gray-600 mt-1">
                    {transfer.fromWarehouse?.name || 
                     (transfer as any).sourceLocationDetails || 
                     `${(transfer as any).sourceLocationType || 'Location'}: ${(transfer as any).sourceLocationId?.slice(0, 8) || 'N/A'}`} → {' '}
                    {transfer.toWarehouse?.name || 
                     (transfer as any).destinationLocationDetails || 
                     `${(transfer as any).destinationLocationType || 'Location'}: ${(transfer as any).destinationLocationId?.slice(0, 8) || 'N/A'}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {transfer.status === 'PENDING' && (
                  <>
                    <PermissionGuard requiredPermission="stock.transfer">
                      <Button
                        onClick={() => setShowApproveDialog(true)}
                        disabled={approveMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard requiredPermission="stock.transfer">
                      <Button
                        onClick={() => setShowCancelDialog(true)}
                        disabled={cancelMutation.isPending}
                        variant="destructive"
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </PermissionGuard>
                  </>
                )}
                {transfer.status === 'APPROVED' && (
                  <>
                    <PermissionGuard requiredPermission="stock.transfer">
                      <Button
                        onClick={() => setShowStartDialog(true)}
                        disabled={startMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Start Transfer
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard requiredPermission="stock.transfer">
                      <Button
                        onClick={() => setShowCancelDialog(true)}
                        disabled={cancelMutation.isPending}
                        variant="destructive"
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </PermissionGuard>
                  </>
                )}
                {transfer.status === 'IN_TRANSIT' && (
                  <>
                    <PermissionGuard requiredPermission="stock.transfer">
                      <Button
                        onClick={() => {
                          // Initialize received quantities with original quantities
                          const initialQuantities: Record<string, number> = {}
                          const initialDamaged: Record<string, number> = {}
                          transfer.items.forEach((item: any) => {
                            initialQuantities[item.id] = item.quantity
                            initialDamaged[item.id] = 0
                          })
                          setReceivedQuantities(initialQuantities)
                          setDamagedQuantities(initialDamaged)
                          setShowReceiveDialog(true)
                        }}
                        disabled={receiveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Receive Transfer
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard requiredPermission="stock.transfer">
                      <Button
                        onClick={() => setShowCancelDialog(true)}
                        disabled={cancelMutation.isPending}
                        variant="destructive"
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </PermissionGuard>
                  </>
                )}
                {transfer.status === 'RECEIVED' && (
                  <div className="text-sm text-gray-600 italic">
                    Transfer completed
                  </div>
                )}
                {transfer.status === 'CANCELLED' && (
                  <div className="text-sm text-gray-600 italic">
                    Transfer cancelled
                  </div>
                )}
              </div>
            </div>

            {/* Status Card */}
            <Card className="factory-stat-card border-green-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-600">Status</CardDescription>
              </CardHeader>
              <CardContent>
                {getStatusBadge(transfer.status)}
              </CardContent>
            </Card>

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
                  Items ({transfer.itemsCount || transfer.items?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Transfer Information */}
                  <Card className="factory-light-card">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Transfer Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Transfer Number</p>
                        <p className="text-gray-900 font-mono font-semibold">{transfer.transferNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          From Location
                        </p>
                        <p className="text-gray-900 font-medium">
                          {transfer.fromWarehouse?.name || 
                           (transfer as any).sourceLocationDetails || 
                           `${(transfer as any).sourceLocationType || 'Location'}: ${(transfer as any).sourceLocationId?.slice(0, 8) || 'N/A'}`}
                        </p>
                        {(transfer as any).sourceLocationDetails && !transfer.fromWarehouse?.name && (
                          <p className="text-gray-600 text-sm">{(transfer as any).sourceLocationType || 'Location'}</p>
                        )}
                        {transfer.fromZone && (
                          <p className="text-gray-600 text-sm">Zone: {transfer.fromZone.name}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          <ArrowLeftRight className="h-4 w-4" />
                          To Location
                        </p>
                        <p className="text-gray-900 font-medium">
                          {transfer.toWarehouse?.name || 
                           (transfer as any).destinationLocationDetails || 
                           `${(transfer as any).destinationLocationType || 'Location'}: ${(transfer as any).destinationLocationId?.slice(0, 8) || 'N/A'}`}
                        </p>
                        {(transfer as any).destinationLocationDetails && !transfer.toWarehouse?.name && (
                          <p className="text-gray-600 text-sm">{(transfer as any).destinationLocationType || 'Location'}</p>
                        )}
                        {transfer.toZone && (
                          <p className="text-gray-600 text-sm">Zone: {transfer.toZone.name}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Transfer Date
                        </p>
                        <p className="text-gray-900">
                          {transfer.transferDate ? format(new Date(transfer.transferDate), 'MMM dd, yyyy HH:mm') : 
                           (transfer as any).scheduledDate ? format(new Date((transfer as any).scheduledDate), 'MMM dd, yyyy HH:mm') : 
                           'N/A'}
                        </p>
                      </div>
                      {transfer.expectedDeliveryDate && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Expected Delivery</p>
                          <p className="text-gray-900">{format(new Date(transfer.expectedDeliveryDate), 'MMM dd, yyyy')}</p>
                        </div>
                      )}
                      {transfer.receivedDate && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Received Date</p>
                          <p className="text-gray-900">{format(new Date(transfer.receivedDate), 'MMM dd, yyyy HH:mm')}</p>
                        </div>
                      )}
                      {transfer.notes && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Notes</p>
                          <p className="text-gray-900 text-sm">{transfer.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Created By */}
                  <Card className="factory-light-card">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Created By</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Requested By
                        </p>
                        <p className="text-gray-900 font-medium">
                          {userResolver.getUserName(transfer.createdById || '')}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {userResolver.getUserEmail(transfer.createdById || '')}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">
                          {transfer.createdAt ? format(new Date(transfer.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                        </p>
                      </div>
                      {transfer.receivedById && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Received By</p>
                          <p className="text-gray-900 font-medium">{userResolver.getUserName(transfer.receivedById)}</p>
                          <p className="text-gray-600 text-sm">{userResolver.getUserEmail(transfer.receivedById)}</p>
                        </div>
                      )}
                      {transfer.approvedById && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Approved By</p>
                          <p className="text-gray-900 font-medium">{userResolver.getUserName(transfer.approvedById)}</p>
                          <p className="text-gray-600 text-sm">{userResolver.getUserEmail(transfer.approvedById)}</p>
                        </div>
                      )}
                      {transfer.transporter && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Transporter</p>
                          <p className="text-gray-900 font-medium">{transfer.transporter?.name || 'N/A'}</p>
                          <p className="text-gray-600 text-sm">{transfer.transporter?.email || 'N/A'}</p>
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
                    <CardTitle className="text-gray-900">Transfer Items</CardTitle>
                    <CardDescription className="text-gray-600">
                      {transfer.itemsCount || transfer.items?.length || 0} item{(transfer.itemsCount || transfer.items?.length || 0) !== 1 ? 's' : ''} • Total: {(transfer.totalQuantity || (transfer.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0)).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 bg-gray-50">
                            <TableHead className="text-gray-700 font-semibold">Product</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Batch</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Quantity</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Received Qty</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Unit</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transfer.items.map((item: any) => (
                            <TableRow key={item.id} className="border-gray-200 hover:bg-gray-50">
                              <TableCell className="font-medium text-gray-900">
                                {item.material?.name || item.product?.name || 'Unknown'}
                              </TableCell>
                              <TableCell className="text-gray-600 font-mono text-sm">
                                {item.batch?.batchNumber || '-'}
                              </TableCell>
                              <TableCell className="text-gray-900 font-semibold">
                                {(item.quantity || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-gray-900 font-semibold">
                                {item.actualQuantity != null ? (
                                  <span className={Number(item.actualQuantity) === Number(item.quantity) ? 'text-green-600' : 'text-orange-600'}>
                                    {Number(item.actualQuantity).toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-600">
                                {item.material?.uom?.symbol || item.unit || '-'}
                              </TableCell>
                              <TableCell className="text-gray-600 text-sm">
                                {item.receivingNotes || item.notes || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
              <DialogContent className="bg-white max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">Approve Transfer</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Approve this material transfer to proceed
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="approve-comments" className="text-gray-700">Comments (Optional)</Label>
                    <Textarea
                      id="approve-comments"
                      value={approveComments}
                      onChange={(e) => setApproveComments(e.target.value)}
                      className="mt-1 border-gray-300"
                      rows={3}
                      placeholder="Add any approval comments..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowApproveDialog(false)
                      setApproveComments('')
                    }}
                    className="border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {approveMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Start Transfer Dialog */}
            <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
              <DialogContent className="bg-white max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">Start Transfer</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Start the transfer and deduct stock from source warehouse
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="transport-details" className="text-gray-700">Transport Details (Optional)</Label>
                    <Textarea
                      id="transport-details"
                      value={startTransportDetails}
                      onChange={(e) => setStartTransportDetails(e.target.value)}
                      className="mt-1 border-gray-300"
                      rows={3}
                      placeholder="Add transport details, vehicle info, etc..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowStartDialog(false)
                      setStartTransportDetails('')
                    }}
                    className="border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStart}
                    disabled={startMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {startMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Truck className="h-4 w-4 mr-2" />
                        Start Transfer
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Receive Dialog */}
            <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
              <DialogContent className="bg-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">Receive Transfer</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Verify and update received quantities for each item
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto">
                  {transfer.items.map((item: any) => (
                    <div key={item.id} className="space-y-3 p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.material?.name || item.product?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">Expected: {(item.quantity || 0).toLocaleString()} {item.material?.uom?.symbol || item.unit || ''}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`received-${item.id}`} className="text-gray-700">Actual Quantity *</Label>
                          <Input
                            id={`received-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={receivedQuantities[item.id] ?? item.quantity}
                            onChange={(e) => setReceivedQuantities({
                              ...receivedQuantities,
                              [item.id]: parseFloat(e.target.value) || 0,
                            })}
                            className="mt-1 border-gray-300"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`damaged-${item.id}`} className="text-gray-700">Damaged Quantity</Label>
                          <Input
                            id={`damaged-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            max={receivedQuantities[item.id] ?? item.quantity}
                            value={damagedQuantities[item.id] ?? 0}
                            onChange={(e) => setDamagedQuantities({
                              ...damagedQuantities,
                              [item.id]: parseFloat(e.target.value) || 0,
                            })}
                            className="mt-1 border-gray-300"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div>
                    <Label htmlFor="receive-comments" className="text-gray-700">Receiving Comments (Optional)</Label>
                    <Textarea
                      id="receive-comments"
                      value={receiveComments}
                      onChange={(e) => setReceiveComments(e.target.value)}
                      className="mt-1 border-gray-300"
                      rows={3}
                      placeholder="Add any receiving comments..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowReceiveDialog(false)
                      setReceivedQuantities({})
                      setDamagedQuantities({})
                      setReceiveComments('')
                    }}
                    className="border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReceive}
                    disabled={receiveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {receiveMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Receiving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Receive
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Cancel Dialog */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <DialogContent className="bg-white max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">Cancel Transfer</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Cancel this material transfer. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="cancel-comments" className="text-gray-700">Cancellation Reason *</Label>
                    <Textarea
                      id="cancel-comments"
                      value={cancelComments}
                      onChange={(e) => setCancelComments(e.target.value)}
                      className="mt-1 border-gray-300"
                      rows={3}
                      placeholder="Please provide a reason for cancellation..."
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancelDialog(false)
                      setCancelComments('')
                    }}
                    className="border-gray-300"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending || !cancelComments.trim()}
                    variant="destructive"
                  >
                    {cancelMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4 mr-2" />
                        Cancel Transfer
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

