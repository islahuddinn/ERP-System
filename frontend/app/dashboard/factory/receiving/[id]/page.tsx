'use client'

import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useGrn, type GrnStatus, type BatchStatus } from '@/hooks/useMaterialReceiving'
import { ArrowLeft, Loader2, Package, Calendar, Building2, Truck, FileText } from 'lucide-react'
import { format } from 'date-fns'

export default function GrnDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const grnId = params.id as string

  const { data: grn, isLoading } = useGrn(grnId)

  const itemsCount = grn?.items?.length || 0
  const totalReceived = grn?.items?.reduce(
    (sum, item) => sum + (Number(item.receivedQuantity) || 0),
    0
  ) || 0

  const getStatusBadge = (status: GrnStatus) => {
    const badges: Record<GrnStatus, { label: string; className: string }> = {
      PENDING:    { label: 'Pending',    className: 'bg-gray-100 text-gray-700 border-gray-200' },
      INSPECTING: { label: 'Inspecting', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      APPROVED:   { label: 'Approved',   className: 'bg-teal-100 text-teal-700 border-teal-200' },
      REJECTED:   { label: 'Rejected',   className: 'bg-red-100 text-red-700 border-red-200' },
      COMPLETED:  { label: 'Completed',  className: 'bg-green-100 text-green-700 border-green-200' },
    }
    const badge = badges[status] || badges.PENDING
    return <Badge className={badge.className}>{badge.label}</Badge>
  }

  const getBatchStatusBadge = (status: BatchStatus) => {
    const badges: Record<BatchStatus, { label: string; className: string }> = {
      QUARANTINE: { label: 'Quarantine', className: 'bg-amber-100 text-amber-700 border-amber-200' },
      ACTIVE:     { label: 'Active',     className: 'bg-green-100 text-green-700 border-green-200' },
      PARTIAL:    { label: 'Partial',    className: 'bg-amber-100 text-amber-700 border-amber-200' },
      CONSUMED:   { label: 'Consumed',   className: 'bg-gray-100 text-gray-500 border-gray-200' },
      EXPIRED:    { label: 'Expired',    className: 'bg-red-900 text-red-100 border-red-800' },
      BLOCKED:    { label: 'Blocked',    className: 'bg-red-100 text-red-700 border-red-200' },
    }
    const badge = badges[status] || badges.QUARANTINE
    return <Badge className={badge.className}>{badge.label}</Badge>
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="grn.read">
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

  if (!grn) {
    return (
      <ProtectedRoute requiredPermission="grn.read">
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-900 font-medium">GRN not found</p>
              <Button
                onClick={() => router.push('/dashboard/factory/receiving')}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Receiving
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="grn.read">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dashboard/factory/receiving')}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 font-mono">
                    {grn.receivingNumber}
                  </h1>
                  {/* Supplier name only — the PO number is already shown in the dedicated
                      "Purchase Order" card below, so it is not repeated here (QA #5). */}
                  <p className="text-gray-600 mt-1">
                    {grn.purchaseOrder?.supplier?.name || 'N/A'}
                  </p>
                </div>
              </div>
              <div>{getStatusBadge(grn.status)}</div>
            </div>

            {/* Main Tabs */}
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
                  Items ({itemsCount})
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GRN Details */}
                  <Card className="factory-light-card">
                    <CardHeader>
                      <CardTitle className="text-gray-900">GRN Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <DetailRow label="Receiving Number">
                        <span className="font-mono font-semibold">{grn.receivingNumber}</span>
                      </DetailRow>
                      <DetailRow label="Status">
                        {getStatusBadge(grn.status)}
                      </DetailRow>
                      <DetailRow label="Receiving Type">
                        {grn.receivingType.replace(/_/g, ' ')}
                      </DetailRow>
                      <DetailRow label="Received Date">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {grn.receivedDate
                            ? format(new Date(grn.receivedDate), 'MMM dd, yyyy')
                            : 'N/A'}
                        </div>
                      </DetailRow>
                      {grn.deliveryNoteNumber && (
                        <DetailRow label="Delivery Note">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="font-mono">{grn.deliveryNoteNumber}</span>
                          </div>
                        </DetailRow>
                      )}
                      {grn.vehicleDetails && (
                        <DetailRow label="Vehicle">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-gray-400" />
                            {grn.vehicleDetails}
                          </div>
                        </DetailRow>
                      )}
                      {grn.notes && (
                        <DetailRow label="Notes">
                          <p className="text-gray-900 text-sm">{grn.notes}</p>
                        </DetailRow>
                      )}
                    </CardContent>
                  </Card>

                  {/* Purchase Order Info */}
                  <Card className="factory-light-card">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Purchase Order</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <DetailRow label="PO Number">
                        <span className="font-mono font-semibold">
                          {grn.purchaseOrder?.orderNumber || 'N/A'}
                        </span>
                      </DetailRow>
                      <DetailRow label="Supplier">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {grn.purchaseOrder?.supplier?.name || 'N/A'}
                          </span>
                        </div>
                      </DetailRow>
                      <DetailRow label="Items Received">
                        <span className="font-semibold">{itemsCount}</span>
                      </DetailRow>
                      <DetailRow label="Total Received Qty">
                        <span className="font-semibold">{totalReceived.toLocaleString()}</span>
                      </DetailRow>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Items Tab */}
              <TabsContent value="items" className="space-y-4">
                {grn.items.map((item, idx) => {
                  const batches = item.rawMaterialBatches || []
                  return (
                    <Card key={item.id} className="factory-light-card">
                      <CardHeader>
                        <CardTitle className="text-gray-900 text-base">
                          {idx + 1}. {item.rawMaterial?.name || 'Unknown Material'}
                          {item.rawMaterial?.code && (
                            <span className="text-gray-500 text-sm font-normal ml-2 font-mono">
                              ({item.rawMaterial.code})
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                          Expected: {(Number(item.expectedQuantity) || 0).toLocaleString()}{' '}
                          {item.uom?.symbol || ''} — Received:{' '}
                          {(Number(item.receivedQuantity) || 0).toLocaleString()}{' '}
                          {item.uom?.symbol || ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          {item.specifications && (
                            <div>
                              <p className="text-gray-500">Specifications</p>
                              <p className="text-gray-900">{item.specifications}</p>
                            </div>
                          )}
                          {item.receivingNotes && (
                            <div>
                              <p className="text-gray-500">Notes</p>
                              <p className="text-gray-900">{item.receivingNotes}</p>
                            </div>
                          )}
                        </div>

                        {/* Batches */}
                        {batches.length > 0 ? (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              Storage Batches ({batches.length})
                            </p>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="border-gray-200 bg-gray-50">
                                    <TableHead className="text-gray-700 font-semibold text-xs">Batch #</TableHead>
                                    <TableHead className="text-gray-700 font-semibold text-xs">Site</TableHead>
                                    <TableHead className="text-gray-700 font-semibold text-xs">Qty</TableHead>
                                    <TableHead className="text-gray-700 font-semibold text-xs">Status</TableHead>
                                    <TableHead className="text-gray-700 font-semibold text-xs">Unit Cost</TableHead>
                                    <TableHead className="text-gray-700 font-semibold text-xs">Mfg Date</TableHead>
                                    <TableHead className="text-gray-700 font-semibold text-xs">Expiry Date</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {batches.map(batch => (
                                    <TableRow
                                      key={batch.id}
                                      className="border-gray-200 hover:bg-gray-50"
                                    >
                                      <TableCell className="font-mono text-xs text-gray-600">
                                        {batch.batchNumber || '—'}
                                      </TableCell>
                                      <TableCell className="text-gray-900">
                                        {batch.site?.name || '—'}
                                      </TableCell>
                                      <TableCell className="text-gray-900 font-semibold">
                                        {(
                                          Number(
                                            batch.availableQuantity ??
                                              batch.quantity ??
                                              batch.receivedQuantity,
                                          ) || 0
                                        ).toLocaleString()}
                                      </TableCell>
                                      <TableCell>
                                        {getBatchStatusBadge(batch.status)}
                                      </TableCell>
                                      <TableCell className="text-gray-600">
                                        {batch.unitCost != null
                                          ? Number(batch.unitCost).toLocaleString()
                                          : '—'}
                                      </TableCell>
                                      <TableCell className="text-gray-600 text-xs">
                                        {batch.manufacturingDate
                                          ? format(new Date(batch.manufacturingDate), 'MMM dd, yyyy')
                                          : '—'}
                                      </TableCell>
                                      <TableCell className="text-gray-600 text-xs">
                                        {batch.expiryDate
                                          ? format(new Date(batch.expiryDate), 'MMM dd, yyyy')
                                          : '—'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No batches recorded</p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

// ─── Helper component ─────────────────────────────────────────────────────────

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <div className="text-gray-900">{children}</div>
    </div>
  )
}
