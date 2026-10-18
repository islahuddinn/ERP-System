'use client'

import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { useBatch } from '@/hooks/useBatches'
import { EditBatchModal } from '@/components/factory/batches'
import { 
  ArrowLeft, 
  Edit, 
  Package, 
  Calendar, 
  MapPin, 
  AlertTriangle, 
  FileText, 
  TrendingUp, 
  Loader2,
  Download,
} from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import Link from 'next/link'

export default function BatchDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const batchId = params.id as string
  
  const { data: batch, isLoading } = useBatch(batchId)
  const [isEditOpen, setIsEditOpen] = useState(false)
  
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
  
  const getDaysToExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    const today = new Date()
    const diffTime = expiry.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
  
  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="stock.read">
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }
  
  if (!batch) {
    return (
      <ProtectedRoute requiredPermission="stock.read">
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-900 font-medium">Batch not found</p>
              <Button 
                onClick={() => router.push('/dashboard/batches')} 
                className="mt-4 factory-button-primary"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Batches
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }
  
  const daysToExpiry = getDaysToExpiry(batch.expiryDate)
  
  return (
    <ProtectedRoute requiredPermission="stock.read">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dashboard/batches')}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h1 className="factory-heading">{batch.batchNumber}</h1>
                  <p className="factory-subheading">{batch.product?.name} • {batch.product?.sku}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <PermissionGuard requiredPermission="stock.read">
                  <Button
                    variant="outline"
                    className="factory-button-secondary"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </PermissionGuard>
                <PermissionGuard requiredPermission="stock.update">
                  <Button 
                    onClick={() => setIsEditOpen(true)}
                    className="factory-button-primary"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </PermissionGuard>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="factory-stat-card border-green-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Total Quantity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{batch.totalQuantity.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="factory-stat-card border-green-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Available</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{batch.availableQuantity.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="factory-stat-card border-gray-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Consumed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-600">{batch.consumedQuantity.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="factory-stat-card border-orange-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Reserved</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{batch.reservedQuantity.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>
            
            {/* Main Content */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="bg-white border border-gray-200">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="locations"
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
                >
                  Stock Locations
                </TabsTrigger>
                <TabsTrigger 
                  value="history"
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
                >
                  Consumption History
                </TabsTrigger>
                <TabsTrigger 
                  value="quality"
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
                >
                  Quality
                </TabsTrigger>
              </TabsList>
              
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          {format(new Date(batch.expiryDate), 'MMM dd, yyyy')}
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
                  
                  {/* Supplier */}
                  {batch.supplier && (
                    <Card className="factory-light-card">
                      <CardHeader>
                        <CardTitle className="text-gray-900">Supplier</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-900 font-semibold">{batch.supplier.name}</p>
                      </CardContent>
                    </Card>
                  )}
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
                          <TableCell>{batch.totalQuantity.toLocaleString()}</TableCell>
                          <TableCell className="text-green-600 font-semibold">
                            {batch.availableQuantity.toLocaleString()}
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
                    {batch.consumedQuantity > 0 ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-500">Total Consumed</p>
                              <p className="text-2xl font-bold text-gray-900">{batch.consumedQuantity.toLocaleString()}</p>
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
          </div>
        </div>
      </div>
      
      {/* Edit Modal */}
      <EditBatchModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        batch={batch}
      />
    </ProtectedRoute>
  )
}

