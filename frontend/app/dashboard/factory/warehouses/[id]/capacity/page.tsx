'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  useWarehouse,
  useWarehouseCapacityInfo,
  useWarehouseCapacityAlerts,
  useWarehouseZones,
} from '@/hooks/useWarehouses'
import { apiClient } from '@/lib/api-client'
import { ArrowLeft, TrendingUp, AlertTriangle, RefreshCw, Loader2, Gauge, MapPin } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CapacityGauge, CapacityAlerts } from '@/components/factory/warehouses'

export default function WarehouseCapacityPage() {
  const params = useParams()
  const router = useRouter()
  const warehouseId = params.id as string
  const queryClient = useQueryClient()

  const { data: warehouse, isLoading: warehouseLoading } = useWarehouse(warehouseId)
  const { data: capacityInfo, isLoading: capacityLoading, refetch: refetchCapacity } = useWarehouseCapacityInfo(warehouseId)
  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useWarehouseCapacityAlerts(warehouseId)
  const { data: zones, isLoading: zonesLoading } = useWarehouseZones(warehouseId)


  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdateCapacity = async () => {
    setIsUpdating(true)
    try {
      await apiClient.post(`/warehouses/${warehouseId}/capacity/update`)
      await refetchCapacity()
      await refetchAlerts()
      toast.success('Capacity updated successfully')
      setTimeout(() => setIsUpdating(false), 1000)
    } catch (error: any) {
      console.error('Failed to update capacity:', error)
      toast.error(error.response?.data?.message || 'Failed to update capacity')
      setIsUpdating(false)
    }
  }

  const handleCheckAlerts = async () => {
    try {
      await apiClient.post(`/warehouses/${warehouseId}/capacity/check-alerts`)
      await refetchAlerts()
      toast.success('Alerts checked successfully')
    } catch (error: any) {
      console.error('Failed to check alerts:', error)
      toast.error(error.response?.data?.message || 'Failed to check alerts')
    }
  }

  if (warehouseLoading || capacityLoading) {
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
              <Gauge className="h-12 w-12 mx-auto mb-4 text-gray-400" />
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
                  onClick={() => router.push(`/dashboard/factory/warehouses/${warehouseId}`)}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h1 className="factory-heading">Capacity Management</h1>
                  <p className="factory-subheading">{warehouse.name} • {warehouse.code}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCheckAlerts}
                  disabled={alertsLoading}
                  className="factory-button-secondary"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Check Alerts
                </Button>
                <Button
                  onClick={handleUpdateCapacity}
                  disabled={isUpdating}
                  className="factory-button-primary"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                  {isUpdating ? 'Updating...' : 'Update Capacity'}
                </Button>
              </div>
            </div>

            {/* Capacity Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="factory-stat-card border-green-200">
                <CardHeader>
                  <CardDescription className="text-gray-600">Total Capacity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const value = capacityInfo?.totalCapacity ?? warehouse?.totalCapacity;
                      return value != null ? value.toFixed(2) : 'N/A';
                    })()} {warehouse?.capacityUnit || ''}
                  </div>
                </CardContent>
              </Card>
              <Card className="factory-stat-card border-orange-200">
                <CardHeader>
                  <CardDescription className="text-gray-600">Used Capacity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const value = capacityInfo?.usedCapacity ?? warehouse?.usedCapacity;
                      return value != null ? value.toFixed(2) : 'N/A';
                    })()} {warehouse?.capacityUnit || ''}
                  </div>
                </CardContent>
              </Card>
              <Card className="factory-stat-card border-green-200">
                <CardHeader>
                  <CardDescription className="text-gray-600">Available Capacity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const value = capacityInfo?.availableCapacity ?? warehouse?.availableCapacity;
                      return value != null ? value.toFixed(2) : 'N/A';
                    })()} {warehouse?.capacityUnit || ''}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="gauge" className="space-y-4">
              <TabsList className="bg-white border border-gray-200">
                <TabsTrigger
                  value="gauge"
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
                >
                  <Gauge className="mr-2 h-4 w-4" />
                  Capacity Gauge
                </TabsTrigger>
                <TabsTrigger
                  value="alerts"
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Alerts
                </TabsTrigger>
              </TabsList>

              {/* Capacity Gauge Tab */}
              <TabsContent value="gauge" className="space-y-4">
                <Card className="factory-light-card">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Capacity Visualization</CardTitle>
                    <CardDescription className="text-gray-600">
                      Real-time capacity monitoring and visualization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CapacityGauge
                      warehouse={warehouse}
                      capacityInfo={capacityInfo}
                      isLoading={capacityLoading}
                    />
                  </CardContent>
                </Card>

                {/* Zone-wise Capacity Breakdown */}
                <Card className="factory-light-card">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Zone-wise Capacity</CardTitle>
                    <CardDescription className="text-gray-600">
                      Capacity breakdown by zone
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {zonesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : !zones || zones.length === 0 ? (
                      <div className="text-center py-12">
                        <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600 font-medium">No zones found</p>
                        <p className="text-sm text-gray-500 mt-2">Create zones to see capacity breakdown</p>
                        <Button
                          onClick={() => router.push(`/dashboard/factory/warehouses/${warehouseId}/zones`)}
                          className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                        >
                          Create Zone
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-gray-200 bg-gray-50">
                                <TableHead className="text-gray-700 font-semibold">Zone</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Type</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Total Capacity</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Used</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Available</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Utilization</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {zones.map((zone: any) => {
                                const zoneCapacityPercentage = zone.totalCapacity != null && zone.totalCapacity > 0 && zone.usedCapacity != null
                                  ? (zone.usedCapacity / zone.totalCapacity) * 100
                                  : 0
                                const getZoneCapacityColor = (percentage: number) => {
                                  if (percentage >= 95) return 'bg-red-500'
                                  if (percentage >= 85) return 'bg-orange-500'
                                  if (percentage >= 70) return 'bg-yellow-500'
                                  return 'bg-green-500'
                                }
                                const getZoneTypeColor = (type: string) => {
                                  const colors: Record<string, string> = {
                                    RAW_MATERIALS: 'bg-green-100 text-green-700 border-green-200',
                                    PACKAGING: 'bg-blue-100 text-blue-700 border-blue-200',
                                    FINISHED_GOODS: 'bg-purple-100 text-purple-700 border-purple-200',
                                    QUARANTINE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                                    REJECTED: 'bg-red-100 text-red-700 border-red-200',
                                    TEMPORARY: 'bg-gray-100 text-gray-700 border-gray-200',
                                  }
                                  return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200'
                                }

                                return (
                                  <TableRow key={zone.id} className="border-gray-200 hover:bg-gray-50">
                                    <TableCell className="font-medium text-gray-900">
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        <div>
                                          <div>{zone.name}</div>
                                          <div className="text-xs text-gray-500 font-mono">{zone.code}</div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={getZoneTypeColor(zone.zoneType)}>
                                        {zone.zoneType.replace('_', ' ')}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-600">
                                      {zone.totalCapacity != null ? zone.totalCapacity.toFixed(2) : 'N/A'} {warehouse?.capacityUnit || ''}
                                    </TableCell>
                                    <TableCell className="text-gray-600">
                                      {zone.usedCapacity != null ? zone.usedCapacity.toFixed(2) : 'N/A'} {warehouse?.capacityUnit || ''}
                                    </TableCell>
                                    <TableCell className="text-gray-600">
                                      {zone.availableCapacity != null ? zone.availableCapacity.toFixed(2) : 'N/A'} {warehouse?.capacityUnit || ''}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2 min-w-[150px]">
                                        <div className="flex-1">
                                          <div className="flex justify-between text-xs mb-1">
                                            <span className="font-semibold text-gray-700">
                                              {zoneCapacityPercentage.toFixed(1)}%
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                              className={`h-2 rounded-full transition-all ${getZoneCapacityColor(zoneCapacityPercentage)}`}
                                              style={{ width: `${Math.min(zoneCapacityPercentage, 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            onClick={() => router.push(`/dashboard/factory/warehouses/${warehouseId}/zones`)}
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Manage Zones
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Capacity History */}
                <Card className="factory-light-card">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Capacity History</CardTitle>
                    <CardDescription className="text-gray-600">
                      Historical capacity trends (Last 30 days)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 font-medium">Capacity History Chart</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Historical capacity data visualization will be available here
                      </p>
                      <p className="text-xs text-gray-400 mt-4">
                        Note: This feature requires historical data collection
                      </p>
                    </div>
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
                    <CapacityAlerts
                      alerts={alerts || []}
                      isLoading={alertsLoading}
                      warehouseId={warehouseId}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
