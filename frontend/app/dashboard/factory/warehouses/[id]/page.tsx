'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { 
  useWarehouse, 
  useWarehouseStats, 
  useWarehouseCapacityInfo,
  useWarehouseCapacityAlerts,
  useWarehouseZones,
  useWarehouseStockSummary,
  useAssignWarehouseManager,
  useRemoveWarehouseManager,
  useUpdateWarehouseStatus,
  type Warehouse,
} from '@/hooks/useWarehouses'
import { ArrowLeft, Edit, Package, AlertTriangle, TrendingUp, Users, MapPin, Phone, Mail, Settings, Activity, Boxes } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ZoneCard } from '@/components/factory/zones'
import { DeleteWarehouseModal, AssignManagerModal } from '@/components/factory/warehouses'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { dummyUsers } from '@/data/dummy/factory/warehouses'
import { isDummyDataEnabled } from '@/lib/dummy-data'

export default function WarehouseDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const warehouseId = params.id as string

  const { data: warehouse, isLoading: warehouseLoading } = useWarehouse(warehouseId)
  const { data: stats, isLoading: statsLoading } = useWarehouseStats(warehouseId)
  const { data: capacityInfo, isLoading: capacityLoading } = useWarehouseCapacityInfo(warehouseId)
  const { data: alerts, isLoading: alertsLoading } = useWarehouseCapacityAlerts(warehouseId)
  const { data: zones, isLoading: zonesLoading } = useWarehouseZones(warehouseId)
  const { data: stockSummary, isLoading: stockLoading } = useWarehouseStockSummary(warehouseId)

  const assignManagerMutation = useAssignWarehouseManager()
  const removeManagerMutation = useRemoveWarehouseManager()
  const updateStatusMutation = useUpdateWarehouseStatus()

  // Fetch users for manager assignment
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Use dummy data when in frontend-only mode
      const USE_DUMMY_DATA = isDummyDataEnabled()
      if (USE_DUMMY_DATA) {
        await new Promise(resolve => setTimeout(resolve, 100))
        return dummyUsers.map(u => ({ id: u.id, name: u.name, email: u.email }))
      }
      const response = await apiClient.get('/users?limit=100')
      const responseData = response.data
      // Handle wrapped response from ResponseInterceptor
      if (responseData && typeof responseData === 'object' && 'data' in responseData && !Array.isArray(responseData.data)) {
        return responseData.data
      }
      return responseData
    },
  })
  // Handle wrapped response: { success, message, data: { data: [...], meta: {...} } }
  // Or direct response: { data: [...], meta: {...} }
  const users: Array<{ id: string; name: string; email: string }> = Array.isArray(usersData?.data) 
    ? usersData.data 
    : Array.isArray(usersData?.data?.data)
    ? usersData.data.data
    : Array.isArray(usersData)
    ? usersData
    : []

  // Modal states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isAssignManagerOpen, setIsAssignManagerOpen] = useState(false)
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null)
  const [warehouseForManager, setWarehouseForManager] = useState<Warehouse | null>(null)

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return <Badge className="bg-green-100 text-green-700 border-green-200">{status}</Badge>
    } else if (status === 'INACTIVE') {
      return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{status}</Badge>
    } else if (status === 'MAINTENANCE') {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">{status}</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-700 border-red-200">{status}</Badge>
    }
  }

  const getCapacityPercentage = () => {
    if (!warehouse || !warehouse.totalCapacity || warehouse.totalCapacity === 0) return 0
    if (!warehouse.usedCapacity) return 0
    return Math.round((warehouse.usedCapacity / warehouse.totalCapacity) * 100)
  }

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 95) return 'text-red-600 bg-red-50 border-red-200'
    if (percentage >= 85) return 'text-orange-600 bg-orange-50 border-orange-200'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const getAlertLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      NORMAL: 'bg-green-50 text-green-700 border-green-200',
      WARNING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      CRITICAL: 'bg-orange-50 text-orange-700 border-orange-200',
      FULL: 'bg-red-50 text-red-700 border-red-200',
    }
    return colors[level] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  if (warehouseLoading) {
    return (
      <ProtectedRoute requiredPermission="warehouses.view">
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

  if (!warehouse) {
    return (
      <ProtectedRoute requiredPermission="warehouses.view">
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-900 font-medium">Warehouse not found</p>
              <Button 
                onClick={() => router.push('/dashboard/factory/warehouses')} 
                className="mt-4 factory-button-primary"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Warehouses
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const capacityPercentage = getCapacityPercentage()

  return (
    <ProtectedRoute requiredPermission="warehouses.view">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard/factory/warehouses')}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="factory-heading">{warehouse.name}</h1>
                <p className="factory-subheading">{warehouse.code} • {warehouse.location?.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push(`/dashboard/factory/warehouses/${warehouseId}/zones`)}
                variant="outline"
                className="factory-button-secondary"
              >
                <Settings className="mr-2 h-4 w-4" />
                Manage Zones
              </Button>
              <Button 
                onClick={() => router.push(`/dashboard/factory/warehouses/${warehouseId}/capacity`)}
                variant="outline"
                className="factory-button-secondary"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Capacity
              </Button>
              <Button 
                onClick={() => router.push(`/dashboard/factory/warehouses/${warehouseId}/edit`)}
                className="factory-button-primary"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="factory-stat-card border-green-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Zones</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.counts?.zones || 0}</div>
                </CardContent>
              </Card>
              <Card className="factory-stat-card border-purple-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Stock Items</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.counts?.stockBalances || 0}</div>
                </CardContent>
              </Card>
              <Card className="factory-stat-card border-red-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Active Alerts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.counts?.activeAlerts || 0}</div>
                </CardContent>
              </Card>
              <Card className="factory-stat-card border-green-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Capacity Used</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{capacityPercentage}%</div>
                </CardContent>
              </Card>
            </div>
          )}

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
                value="zones"
                className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
              >
                Zones ({zones?.length || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="stock"
                className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
              >
                Stock
              </TabsTrigger>
              <TabsTrigger 
                value="capacity"
                className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
              >
                Capacity
              </TabsTrigger>
              <TabsTrigger 
                value="alerts"
                className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
              >
                Alerts ({alerts?.length || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
              >
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Warehouse Information */}
                <Card className="factory-light-card">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Warehouse Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Type</p>
                        <Badge 
                          className={warehouse.warehouseType === 'STORAGE' 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : 'bg-green-100 text-green-700 border-green-200'}
                        >
                          {warehouse.warehouseType}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Status</p>
                        {getStatusBadge(warehouse.status)}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4" />
                        Location
                      </p>
                      <p className="text-gray-900 font-medium">{warehouse.location?.name || 'N/A'}</p>
                      {warehouse.address && (
                        <p className="text-gray-600 text-sm mt-1">{warehouse.address}</p>
                      )}
                    </div>
                    {warehouse.manager && (
                      <div>
                        <p className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4" />
                          Manager
                        </p>
                        <p className="text-gray-900 font-medium">{warehouse.manager.name}</p>
                        <p className="text-gray-600 text-sm">{warehouse.manager.email}</p>
                      </div>
                    )}
                    {(warehouse.contactPerson || warehouse.contactPhone || warehouse.contactEmail) && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Contact Information</p>
                        {warehouse.contactPerson && (
                          <p className="text-gray-900 text-sm font-medium">{warehouse.contactPerson}</p>
                        )}
                        {warehouse.contactPhone && (
                          <p className="text-gray-600 text-sm flex items-center gap-2 mt-1">
                            <Phone className="h-4 w-4" />
                            {warehouse.contactPhone}
                          </p>
                        )}
                        {warehouse.contactEmail && (
                          <p className="text-gray-600 text-sm flex items-center gap-2 mt-1">
                            <Mail className="h-4 w-4" />
                            {warehouse.contactEmail}
                          </p>
                        )}
                      </div>
                    )}
                    {warehouse.description && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Description</p>
                        <p className="text-gray-900 text-sm">{warehouse.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Capacity Overview */}
                <Card className="factory-light-card">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Capacity Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Capacity Usage</span>
                        <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${getCapacityColor(capacityPercentage)}`}>
                          {capacityPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full ${
                            capacityPercentage >= 95 ? 'bg-red-500' :
                            capacityPercentage >= 85 ? 'bg-orange-500' :
                            capacityPercentage >= 70 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Capacity</p>
                        <p className="text-gray-900 font-semibold">
                          {warehouse?.totalCapacity != null ? warehouse.totalCapacity.toFixed(2) : 'N/A'} {warehouse?.capacityUnit || ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Used Capacity</p>
                        <p className="text-gray-900 font-semibold">
                          {warehouse?.usedCapacity != null ? warehouse.usedCapacity.toFixed(2) : 'N/A'} {warehouse?.capacityUnit || ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Available Capacity</p>
                        <p className="text-gray-900 font-semibold">
                          {warehouse?.availableCapacity != null ? warehouse.availableCapacity.toFixed(2) : 'N/A'} {warehouse?.capacityUnit || ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Status</p>
                        {getStatusBadge(warehouse.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Zones Tab */}
            <TabsContent value="zones" className="space-y-4">
              <Card className="factory-light-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-gray-900">Zones</CardTitle>
                      <CardDescription className="text-gray-600">
                        Manage zones in this warehouse
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => router.push(`/dashboard/factory/warehouses/${warehouseId}/zones`)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Zones
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {zonesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : !zones || !Array.isArray(zones) || zones.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 font-medium">No zones found</p>
                      <p className="text-sm text-gray-500 mt-2">Create zones to organize your warehouse</p>
                      <Button
                        onClick={() => router.push(`/dashboard/factory/warehouses/${warehouseId}/zones`)}
                        className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Package className="mr-2 h-4 w-4" />
                        Create First Zone
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(Array.isArray(zones) ? zones : []).slice(0, 6).map((zone) => (
                        <ZoneCard
                          key={zone.id}
                          zone={zone}
                          warehouseName={warehouse.name}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stock Tab */}
            <TabsContent value="stock" className="space-y-4">
              <Card className="factory-light-card">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Boxes className="h-5 w-5 text-green-600" />
                    Stock Summary
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Product-wise stock in this warehouse
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stockLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : !stockSummary || !Array.isArray(stockSummary?.data) || stockSummary.data.length === 0 ? (
                    <div className="text-center py-12">
                      <Boxes className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 font-medium">No stock found</p>
                      <p className="text-sm text-gray-500 mt-2">Stock will appear here once products are added</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 bg-gray-50">
                            <TableHead className="text-gray-700 font-semibold">Product</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Zone</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Quantity</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Unit</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Last Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(Array.isArray(stockSummary?.data) ? stockSummary.data : []).slice(0, 10).map((item: any, index: number) => (
                            <TableRow key={index} className="border-gray-200 hover:bg-gray-50">
                              <TableCell className="font-medium text-gray-900">
                                {item.product?.name || `Product ${index + 1}`}
                              </TableCell>
                              <TableCell className="text-gray-600">
                                {item.zone?.name || 'N/A'}
                              </TableCell>
                              <TableCell className="text-gray-900 font-semibold">
                                {item.quantity?.toFixed(2) || '0.00'}
                              </TableCell>
                              <TableCell className="text-gray-600">
                                {item.unit || 'UNIT'}
                              </TableCell>
                              <TableCell className="text-gray-600 text-sm">
                                {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Capacity Tab */}
            <TabsContent value="capacity" className="space-y-4">
              <Card className="factory-light-card">
                <CardHeader>
                  <CardTitle className="text-gray-900">Capacity Details</CardTitle>
                  <CardDescription className="text-gray-600">
                    Detailed capacity information and metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {capacityLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : capacityInfo ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Total Capacity</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {(() => {
                              const value = capacityInfo?.totalCapacity ?? warehouse?.totalCapacity;
                              return value != null ? value.toFixed(2) : 'N/A';
                            })()} {warehouse?.capacityUnit || ''}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Used Capacity</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {(() => {
                              const value = capacityInfo?.usedCapacity ?? warehouse?.usedCapacity;
                              return value != null ? value.toFixed(2) : 'N/A';
                            })()} {warehouse?.capacityUnit || ''}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Available Capacity</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {(() => {
                              const value = capacityInfo?.availableCapacity ?? warehouse?.availableCapacity;
                              return value != null ? value.toFixed(2) : 'N/A';
                            })()} {warehouse?.capacityUnit || ''}
                          </p>
                        </div>
                      </div>
                      {capacityInfo?.capacityPercentage != null && (
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm text-gray-600">Capacity Percentage</span>
                            <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${getCapacityColor(capacityInfo.capacityPercentage)}`}>
                              {capacityInfo?.capacityPercentage?.toFixed(2) || '0.00'}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-6">
                            <div
                              className={`h-6 rounded-full ${
                                capacityInfo.capacityPercentage >= 95 ? 'bg-red-500' :
                                capacityInfo.capacityPercentage >= 85 ? 'bg-orange-500' :
                                capacityInfo.capacityPercentage >= 70 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(capacityInfo.capacityPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600">No capacity information available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="space-y-4">
              <Card className="factory-light-card">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Capacity Alerts
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {alertsLoading ? 'Loading alerts...' : `${alerts?.length || 0} active alert(s)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {alertsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : !alerts || !Array.isArray(alerts) || alerts.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 font-medium">No active alerts</p>
                      <p className="text-sm text-gray-500 mt-2">All capacity levels are within normal thresholds</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(Array.isArray(alerts) ? alerts : []).map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-4 rounded-lg border ${getAlertLevelColor(alert.alertLevel)}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getAlertLevelColor(alert.alertLevel)}>
                                  {alert.alertLevel}
                                </Badge>
                                {alert.zone && (
                                  <span className="text-sm text-gray-600">Zone: {alert.zone.name}</span>
                                )}
                              </div>
                              {alert.message && (
                                <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                              )}
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600">Current Capacity</p>
                                  <p className="text-gray-900 font-semibold">{alert.currentCapacity != null ? alert.currentCapacity.toFixed(2) : 'N/A'}%</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Threshold</p>
                                  <p className="text-gray-900 font-semibold">{alert.threshold != null ? alert.threshold.toFixed(2) : 'N/A'}%</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Created</p>
                                  <p className="text-gray-900 font-semibold">
                                    {new Date(alert.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card className="factory-light-card">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-green-600" />
                    Warehouse Settings
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Manage warehouse settings and actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Edit Warehouse */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-gray-900 font-semibold mb-1">Edit Warehouse</h3>
                        <p className="text-sm text-gray-600">Update warehouse information and settings</p>
                      </div>
                      <Button
                        onClick={() => router.push(`/dashboard/factory/warehouses/${warehouseId}/edit`)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </div>

                  {/* Assign Manager */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-gray-900 font-semibold mb-1">Manager</h3>
                        <p className="text-sm text-gray-600">
                          {warehouse.manager ? `Current: ${warehouse.manager.name}` : 'No manager assigned'}
                        </p>
                      </div>
                      <PermissionGuard requiredPermission="warehouses.update">
                        <Button
                          onClick={() => {
                            setWarehouseForManager(warehouse)
                            setIsAssignManagerOpen(true)
                          }}
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          {warehouse.manager ? 'Change Manager' : 'Assign Manager'}
                        </Button>
                      </PermissionGuard>
                    </div>
                  </div>

                  {/* Status Management */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-gray-900 font-semibold mb-1">Status</h3>
                        <p className="text-sm text-gray-600">Current status: {warehouse.status}</p>
                      </div>
                      {getStatusBadge(warehouse.status)}
                    </div>
                    <PermissionGuard requiredPermission="warehouses.update">
                      <div className="flex gap-2">
                        {warehouse.status !== 'ACTIVE' && (
                          <Button
                            onClick={async () => {
                              try {
                                await updateStatusMutation.mutateAsync({ id: warehouseId, status: 'ACTIVE' })
                                toast.success('Warehouse status updated to ACTIVE')
                              } catch (error) {
                                toast.error('Failed to update status')
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="border-green-300 text-green-700 hover:bg-green-50"
                          >
                            Set Active
                          </Button>
                        )}
                        {warehouse.status !== 'INACTIVE' && (
                          <Button
                            onClick={async () => {
                              try {
                                await updateStatusMutation.mutateAsync({ id: warehouseId, status: 'INACTIVE' })
                                toast.success('Warehouse status updated to INACTIVE')
                              } catch (error) {
                                toast.error('Failed to update status')
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Set Inactive
                          </Button>
                        )}
                        {warehouse.status !== 'MAINTENANCE' && (
                          <Button
                            onClick={async () => {
                              try {
                                await updateStatusMutation.mutateAsync({ id: warehouseId, status: 'MAINTENANCE' })
                                toast.success('Warehouse status updated to MAINTENANCE')
                              } catch (error) {
                                toast.error('Failed to update status')
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                          >
                            Set Maintenance
                          </Button>
                        )}
                      </div>
                    </PermissionGuard>
                  </div>

                  {/* Danger Zone */}
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-red-900 font-semibold mb-1">Delete Warehouse</h3>
                        <p className="text-sm text-red-700">
                          Permanently delete this warehouse. This action cannot be undone.
                        </p>
                      </div>
                      <PermissionGuard requiredPermission="warehouses.delete">
                        <Button
                          onClick={() => {
                            setWarehouseToDelete(warehouse)
                            setIsDeleteOpen(true)
                          }}
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Delete
                        </Button>
                      </PermissionGuard>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Modals */}
          <DeleteWarehouseModal
            isOpen={isDeleteOpen}
            onClose={() => {
              setIsDeleteOpen(false)
              setWarehouseToDelete(null)
            }}
            warehouse={warehouseToDelete}
          />
          <AssignManagerModal
            isOpen={isAssignManagerOpen}
            onClose={() => {
              setIsAssignManagerOpen(false)
              setWarehouseForManager(null)
            }}
            warehouse={warehouseForManager}
            users={users}
          />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
