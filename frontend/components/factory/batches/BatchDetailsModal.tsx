'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Package, Calendar, MapPin, AlertTriangle, FileText, TrendingUp, CheckCircle, X } from 'lucide-react'
import { format } from 'date-fns'
import type { Batch } from '@/data/dummy/factory/batches'
import Link from 'next/link'

interface BatchDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  batch: Batch | null
  onEdit?: (batch: Batch) => void
}

export function BatchDetailsModal({ isOpen, onClose, batch, onEdit }: BatchDetailsModalProps) {
  if (!batch) return null
  
  // Normalize batch data to handle both API and dummy data formats
  // API might return: quantity, availableQty, consumedQuantity
  // Dummy data has: totalQuantity, availableQuantity, consumedQuantity
  const totalQuantity = (batch as any).totalQuantity ?? (batch as any).quantity ?? 0
  const availableQuantity = (batch as any).availableQuantity ?? (batch as any).availableQty ?? 0
  const consumedQuantity = (batch as any).consumedQuantity ?? 0
  const reservedQuantity = (batch as any).reservedQuantity ?? 0
  
  const expiryDate = new Date(batch.expiryDate)
  const today = new Date()
  const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-700 border-green-200">{status}</Badge>
      case 'EXPIRED':
        return <Badge className="bg-red-100 text-red-700 border-red-200">{status}</Badge>
      case 'QUARANTINE':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">{status}</Badge>
      case 'CONSUMED':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{status}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }
  
  const getQualityBadge = (qualityStatus?: string) => {
    if (!qualityStatus) return null
    
    switch (qualityStatus) {
      case 'PASSED':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Passed</Badge>
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Failed</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>
      case 'CONDITIONAL':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Conditional</Badge>
      default:
        return null
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Batch Details
          </DialogTitle>
          <DialogDescription>
            {batch.batchNumber} • {batch.product?.name}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="overview" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
              Overview
            </TabsTrigger>
            <TabsTrigger value="locations" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
              Stock Locations
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
              Consumption History
            </TabsTrigger>
            <TabsTrigger value="quality" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
              Quality
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Batch Information */}
              <Card className="factory-light-card">
                <CardHeader>
                  <CardTitle className="text-gray-900">Batch Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Batch Number</p>
                    <p className="text-gray-900 font-semibold font-mono">{batch.batchNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Product</p>
                    <p className="text-gray-900 font-semibold">{batch.product?.name}</p>
                    <p className="text-sm text-gray-500">{batch.product?.sku}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500">Status:</p>
                    {getStatusBadge(batch.status)}
                  </div>
                  {batch.qualityStatus && (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500">Quality:</p>
                      {getQualityBadge(batch.qualityStatus)}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Quantities */}
              <Card className="factory-light-card">
                <CardHeader>
                  <CardTitle className="text-gray-900">Quantities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total Quantity</p>
                      <p className="text-2xl font-bold text-gray-900">{totalQuantity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Available</p>
                      <p className="text-2xl font-bold text-green-600">{availableQuantity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Consumed</p>
                      <p className="text-2xl font-bold text-gray-600">{consumedQuantity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Reserved</p>
                      <p className="text-2xl font-bold text-orange-600">{reservedQuantity.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Location */}
              <Card className="factory-light-card">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Warehouse</p>
                    <Link
                      href={`/dashboard/factory/warehouses/${batch.warehouseId}`}
                      className="text-green-600 hover:text-green-700 font-semibold"
                    >
                      {batch.warehouse?.name} ({batch.warehouse?.code})
                    </Link>
                  </div>
                  {batch.zone && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Zone</p>
                      <p className="text-gray-900 font-semibold">{batch.zone.name} ({batch.zone.code})</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Dates */}
              <Card className="factory-light-card">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Manufacturing Date</p>
                    <p className="text-gray-900 font-semibold">
                      {format(new Date(batch.manufacturingDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Expiry Date</p>
                    <p className={`font-semibold ${daysToExpiry < 0 ? 'text-red-600' : daysToExpiry <= 30 ? 'text-orange-600' : 'text-gray-900'}`}>
                      {format(expiryDate, 'MMM dd, yyyy')}
                    </p>
                    {daysToExpiry >= 0 && (
                      <p className={`text-xs ${daysToExpiry <= 30 ? 'text-orange-600' : 'text-gray-500'}`}>
                        {daysToExpiry === 0 ? 'Expires today' : `${daysToExpiry} days remaining`}
                      </p>
                    )}
                    {daysToExpiry < 0 && (
                      <p className="text-xs text-red-600">
                        Expired {Math.abs(daysToExpiry)} days ago
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Received Date</p>
                    <p className="text-gray-900 font-semibold">
                      {format(new Date(batch.receivedDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Notes */}
            {batch.notes && (
              <Card className="factory-light-card">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{batch.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Stock Locations Tab */}
          <TabsContent value="locations" className="space-y-4">
            <Card className="factory-light-card">
              <CardHeader>
                <CardTitle className="text-gray-900">Stock Locations</CardTitle>
                <CardDescription>Where this batch is stored</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Link
                          href={`/dashboard/factory/warehouses/${batch.warehouseId}`}
                          className="text-green-600 hover:text-green-700 font-semibold"
                        >
                          {batch.warehouse?.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {batch.zone ? (
                          <span className="font-semibold">{batch.zone.name}</span>
                        ) : (
                          <span className="text-gray-400">No Zone</span>
                        )}
                      </TableCell>
                      <TableCell>{totalQuantity.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        {availableQuantity.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Consumption History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card className="factory-light-card">
              <CardHeader>
                <CardTitle className="text-gray-900">Consumption History</CardTitle>
                <CardDescription>When and where this batch was consumed</CardDescription>
              </CardHeader>
              <CardContent>
                {consumedQuantity > 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Total Consumed</p>
                          <p className="text-2xl font-bold text-gray-900">{consumedQuantity.toLocaleString()}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 text-center py-4">
                      Detailed consumption history will be available when production orders and material requests are implemented.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 font-medium">No consumption history</p>
                    <p className="text-sm text-gray-500 mt-2">This batch has not been consumed yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Quality Tab */}
          <TabsContent value="quality" className="space-y-4">
            <Card className="factory-light-card">
              <CardHeader>
                <CardTitle className="text-gray-900">Quality Information</CardTitle>
                <CardDescription>Quality check results and status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {batch.qualityStatus ? (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500">Quality Status:</p>
                      {getQualityBadge(batch.qualityStatus)}
                    </div>
                    {batch.qualityCheckDate && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Quality Check Date</p>
                        <p className="text-gray-900 font-semibold">
                          {format(new Date(batch.qualityCheckDate), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    )}
                    {batch.qualityCheckBy && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Checked By</p>
                        <p className="text-gray-900 font-semibold">{batch.qualityCheckBy.name}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 font-medium">No quality check performed</p>
                    <p className="text-sm text-gray-500 mt-2">Quality check information is not available for this batch.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          {onEdit && (
            <Button onClick={() => onEdit(batch)} className="factory-button-primary">
              Edit Batch
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="factory-button-secondary">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

