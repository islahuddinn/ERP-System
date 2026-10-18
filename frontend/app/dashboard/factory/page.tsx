'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWarehouses } from '@/hooks/useWarehouses'
import { useFactoryDashboard } from '@/hooks/useDashboard'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import {
  Factory,
  Warehouse,
  TrendingUp,
  AlertTriangle,
  Package,
  MapPin,
  Users,
  Activity,
  Loader2,
  ArrowRight,
  Gauge,
  CheckCircle,
  X,
  Clock,
  Zap,
  BarChart3,
  Plus,
  Eye,
  Settings
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface FactoryStats {
  totalWarehouses: number
  activeWarehouses: number
  inactiveWarehouses: number
  maintenanceWarehouses: number
  fullWarehouses: number
  totalZones: number
  totalCapacity: number
  usedCapacity: number
  availableCapacity: number
  activeAlerts: number
  storageWarehouses: number
  dispatchWarehouses: number
  warehousesWithManagers: number
}

export default function FactoryDashboardPage() {
  const router = useRouter()

  // Fetch all warehouses for stats
  const { data: warehousesData, isLoading: warehousesLoading, isError: warehousesError, error: warehousesQueryError } = useWarehouses({ limit: 1000 })
  // Handle wrapped response: { success, message, data: { data: [...], meta: {...} } }
  // Or direct response: { data: [...], meta: {...} }
  const warehouses = Array.isArray(warehousesData?.data) 
    ? warehousesData.data 
    : Array.isArray(warehousesData?.data?.data)
    ? warehousesData.data.data
    : Array.isArray(warehousesData)
    ? warehousesData
    : []

  // Use new factory dashboard API hook
  const { data: factoryMetrics, isLoading: factoryMetricsLoading } = useFactoryDashboard()

  // Calculate warehouse stats from warehouses data (for display)
  const warehouseStats: FactoryStats = {
    totalWarehouses: warehouses.length,
    activeWarehouses: warehouses.filter((w: any) => w.isActive && w.status === 'ACTIVE').length,
    inactiveWarehouses: warehouses.filter((w: any) => w.status === 'INACTIVE').length,
    maintenanceWarehouses: warehouses.filter((w: any) => w.status === 'MAINTENANCE').length,
    fullWarehouses: warehouses.filter((w: any) => w.status === 'FULL').length,
    storageWarehouses: warehouses.filter((w: any) => w.warehouseType === 'STORAGE').length,
    dispatchWarehouses: warehouses.filter((w: any) => w.warehouseType === 'DISPATCH').length,
    warehousesWithManagers: warehouses.filter((w: any) => w.managerId).length,
    totalZones: 0, // Will be calculated from API if needed
    totalCapacity: warehouses.reduce((sum: number, w: any) => sum + (w.totalCapacity || 0), 0),
    usedCapacity: warehouses.reduce((sum: number, w: any) => sum + (w.usedCapacity || 0), 0),
    availableCapacity: warehouses.reduce((sum: number, w: any) => sum + (w.availableCapacity || 0), 0),
    activeAlerts: 0, // Will be calculated from API if needed
  }

  // Use factory metrics from API if available, otherwise fall back to calculated stats
  const stats = factoryMetrics ? {
    totalWarehouses: warehouseStats.totalWarehouses,
    activeWarehouses: warehouseStats.activeWarehouses,
    inactiveWarehouses: warehouseStats.inactiveWarehouses,
    maintenanceWarehouses: warehouseStats.maintenanceWarehouses,
    fullWarehouses: warehouseStats.fullWarehouses,
    totalZones: warehouseStats.totalZones,
    totalCapacity: warehouseStats.totalCapacity,
    usedCapacity: warehouseStats.usedCapacity,
    availableCapacity: warehouseStats.availableCapacity,
    activeAlerts: warehouseStats.activeAlerts,
    storageWarehouses: warehouseStats.storageWarehouses,
    dispatchWarehouses: warehouseStats.dispatchWarehouses,
    warehousesWithManagers: warehouseStats.warehousesWithManagers,
    // Add factory metrics
    totalProductionOrders: factoryMetrics.totalProductionOrders || 0,
    inProgressOrders: factoryMetrics.inProgressOrders || 0,
    completedOrders: factoryMetrics.completedOrders || 0,
    totalProductionQuantity: factoryMetrics.totalProductionQuantity || 0,
    totalWaste: factoryMetrics.totalWaste || 0,
    totalQualityInspections: factoryMetrics.totalQualityInspections || 0,
    passedInspections: factoryMetrics.passedInspections || 0,
    failedInspections: factoryMetrics.failedInspections || 0,
    qualityPassRate: factoryMetrics.qualityPassRate || 0,
  } : warehouseStats

  // Fetch factory stats (legacy calculation for zones/alerts)
  const { data: legacyStats, isLoading: statsLoading } = useQuery<FactoryStats>({
    queryKey: ['factory-stats', 'legacy'],
    queryFn: async () => {
      try {
        // Count zones and alerts from API
        let totalZones = 0
        let activeAlerts = 0

        // Fetch zones and alerts for each warehouse
        for (const warehouse of warehouses) {
          try {
            const zonesRes = await apiClient.get(`/warehouses/${warehouse.id}/zones`)
            totalZones += (zonesRes.data || []).length
          } catch (error: any) {
            if (error?.response?.status !== 404) {
              console.warn(`Error fetching zones for warehouse ${warehouse.id}:`, error)
            }
          }

          try {
            const alertsRes = await apiClient.get(`/warehouses/${warehouse.id}/alerts`)
            const alerts = alertsRes.data || []
            activeAlerts += alerts.filter((a: any) => !a.isResolved).length
          } catch (error: any) {
            if (error?.response?.status !== 404) {
              console.warn(`Error fetching alerts for warehouse ${warehouse.id}:`, error)
            }
          }
        }

        return {
          ...warehouseStats,
          totalZones,
          activeAlerts,
        }
      } catch (error) {
        console.error('Error fetching factory stats:', error)
        return warehouseStats
      }
    },
    enabled: warehouses.length > 0 && !warehousesLoading,
  })

  // Merge legacy stats if available
  const finalStats = legacyStats ? { ...stats, totalZones: legacyStats.totalZones, activeAlerts: legacyStats.activeAlerts } : stats
  
  const isLoading = warehousesLoading || factoryMetricsLoading || statsLoading

  const capacityPercentage = finalStats && finalStats.totalCapacity > 0
    ? Math.round((finalStats.usedCapacity / finalStats.totalCapacity) * 100)
    : 0

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 95) return 'text-red-600 bg-red-50 border-red-200'
    if (percentage >= 85) return 'text-orange-600 bg-orange-50 border-orange-200'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const getCapacityBarColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-red-500'
    if (percentage >= 85) return 'bg-orange-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Get warehouses by status for breakdown
  const warehousesByStatus = {
    active: warehouses.filter((w: any) => w.status === 'ACTIVE'),
    inactive: warehouses.filter((w: any) => w.status === 'INACTIVE'),
    maintenance: warehouses.filter((w: any) => w.status === 'MAINTENANCE'),
    full: warehouses.filter((w: any) => w.status === 'FULL'),
  }

  // Get warehouses needing attention (high capacity or alerts)
  const criticalWarehouses = warehouses.filter((w: any) => {
    const pct = w.totalCapacity > 0 ? (w.usedCapacity / w.totalCapacity) * 100 : 0
    return pct >= 85 || w.status === 'FULL' || w.status === 'MAINTENANCE'
  })

  if (isLoading) {
    return (
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute requiredPermission="warehouses.view">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Enhanced Header */}
            <div className="factory-light-card p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                    <Factory className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h1 className="factory-heading flex items-center gap-3 mb-2">
                      Factory Management Dashboard
                    </h1>
                    <p className="factory-subheading">
                      Complete overview of your factory operations, warehouses, and production facilities
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right pr-4 border-r border-gray-200">
                    <div className="text-sm text-gray-500">System Status</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-green-600">Operational</span>
                    </div>
                  </div>
                  <PermissionGuard requiredPermission="warehouses.view">
                    <Button
                      onClick={() => router.push('/dashboard/factory/warehouses')}
                      className="factory-button-primary"
                    >
                      <Warehouse className="mr-2 h-4 w-4" />
                      Manage Warehouses
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
            </div>

            {warehousesError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">Could not load warehouses</p>
                <p className="mt-1 whitespace-pre-line">{getApiErrorMessage(warehousesQueryError)}</p>
              </div>
            )}

            {/* Key Metrics - Enhanced */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="factory-stat-card border-green-200 hover:border-green-300 transition-all cursor-pointer group" onClick={() => router.push('/dashboard/factory/warehouses')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-3 rounded-xl bg-green-50 border border-green-100 group-hover:bg-green-100 transition-colors">
                      <Warehouse className="h-6 w-6 text-green-600" />
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      {finalStats?.activeWarehouses || 0} Active
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-600 font-semibold">
                    Total Warehouses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 mb-2">{finalStats?.totalWarehouses || 0}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-3 w-3" />
                    <span>{finalStats?.storageWarehouses || 0} Storage • {finalStats?.dispatchWarehouses || 0} Dispatch</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="factory-stat-card border-purple-200 hover:border-purple-300 transition-all cursor-pointer group" onClick={() => router.push('/dashboard/factory/zones')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 group-hover:bg-purple-100 transition-colors">
                      <MapPin className="h-6 w-6 text-purple-600" />
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                      {finalStats?.totalWarehouses || 0} Warehouses
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-600 font-semibold">
                    Total Zones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 mb-2">{finalStats?.totalZones || 0}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Package className="h-3 w-3" />
                    <span>Across all warehouses</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="factory-stat-card border-green-200 hover:border-green-300 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                      <Gauge className="h-6 w-6 text-green-600" />
                    </div>
                    <Badge className={`${getCapacityColor(capacityPercentage)}`}>
                      {capacityPercentage}%
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-600 font-semibold">
                    Capacity Usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 mb-2">{capacityPercentage}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getCapacityBarColor(capacityPercentage)}`}
                      style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <span>{finalStats?.usedCapacity.toFixed(0) || 0} used</span>
                    <span>{finalStats?.availableCapacity.toFixed(0) || 0} available</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="factory-stat-card border-red-200 hover:border-red-300 transition-all cursor-pointer group" onClick={() => router.push('/dashboard/factory/warehouses')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100 group-hover:bg-red-100 transition-colors">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    {finalStats && finalStats.activeAlerts > 0 && (
                      <Badge className="bg-red-100 text-red-700 border-red-200 animate-pulse">
                        Action Required
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-gray-600 font-semibold">
                    Active Alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 mb-2">{finalStats?.activeAlerts || 0}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Capacity alerts</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Warehouse Status Breakdown & Zone Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Warehouse Status Breakdown */}
              <Card className="factory-light-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-gray-900 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-green-600" />
                        Warehouse Status Breakdown
                      </CardTitle>
                      <CardDescription className="text-gray-600 mt-1">
                        Distribution of warehouses by operational status
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-gray-900">Active</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{finalStats?.activeWarehouses || 0}</div>
                          <div className="text-xs text-gray-500">
                            {finalStats && finalStats.totalWarehouses > 0
                              ? Math.round((finalStats.activeWarehouses / finalStats.totalWarehouses) * 100)
                              : 0}%
                          </div>
                        </div>
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{
                              width: finalStats && finalStats.totalWarehouses > 0
                                ? `${(finalStats.activeWarehouses / finalStats.totalWarehouses) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium text-gray-900">Maintenance</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{finalStats?.maintenanceWarehouses || 0}</div>
                          <div className="text-xs text-gray-500">
                            {finalStats && finalStats.totalWarehouses > 0
                              ? Math.round((finalStats.maintenanceWarehouses / finalStats.totalWarehouses) * 100)
                              : 0}%
                          </div>
                        </div>
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 rounded-full"
                            style={{
                              width: finalStats && finalStats.totalWarehouses > 0
                                ? `${(finalStats.maintenanceWarehouses / finalStats.totalWarehouses) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center gap-3">
                        <X className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-gray-900">Full</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{finalStats?.fullWarehouses || 0}</div>
                          <div className="text-xs text-gray-500">
                            {finalStats && finalStats.totalWarehouses > 0
                              ? Math.round((finalStats.fullWarehouses / finalStats.totalWarehouses) * 100)
                              : 0}%
                          </div>
                        </div>
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{
                              width: finalStats && finalStats.totalWarehouses > 0
                                ? `${(finalStats.fullWarehouses / finalStats.totalWarehouses) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <X className="h-5 w-5 text-gray-600" />
                        <span className="font-medium text-gray-900">Inactive</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{finalStats?.inactiveWarehouses || 0}</div>
                          <div className="text-xs text-gray-500">
                            {finalStats && finalStats.totalWarehouses > 0
                              ? Math.round((finalStats.inactiveWarehouses / finalStats.totalWarehouses) * 100)
                              : 0}%
                          </div>
                        </div>
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-500 rounded-full"
                            style={{
                              width: finalStats && finalStats.totalWarehouses > 0
                                ? `${(finalStats.inactiveWarehouses / finalStats.totalWarehouses) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warehouse Types */}
              <Card className="factory-light-card">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    Warehouse Types
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Distribution of storage and dispatch warehouses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Warehouse className="h-6 w-6 text-green-600" />
                          <span className="font-semibold text-gray-900">Storage Warehouses</span>
                        </div>
                        <div className="text-3xl font-bold text-green-600">{finalStats?.storageWarehouses || 0}</div>
                      </div>
                      <p className="text-sm text-gray-600">Used for storing raw materials and packaging</p>
                      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-green-500 rounded-full transition-all duration-500"
                          style={{
                            width: finalStats && finalStats.totalWarehouses > 0
                              ? `${(finalStats.storageWarehouses / finalStats.totalWarehouses) * 100}%`
                              : '0%'
                          }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-6 w-6 text-blue-600" />
                          <span className="font-semibold text-gray-900">Dispatch Warehouses</span>
                        </div>
                        <div className="text-3xl font-bold text-blue-600">{finalStats?.dispatchWarehouses || 0}</div>
                      </div>
                      <p className="text-sm text-gray-600">Used for storing finished goods</p>
                      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-blue-500 rounded-full transition-all duration-500"
                          style={{
                            width: finalStats && finalStats.totalWarehouses > 0
                              ? `${(finalStats.dispatchWarehouses / finalStats.totalWarehouses) * 100}%`
                              : '0%'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Warehouses with Managers</span>
                      <span className="font-semibold text-gray-900">
                        {finalStats?.warehousesWithManagers || 0} / {finalStats?.totalWarehouses || 0}
                      </span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-purple-500 rounded-full transition-all duration-500"
                        style={{
                          width: finalStats && finalStats.totalWarehouses > 0
                            ? `${(finalStats.warehousesWithManagers / finalStats.totalWarehouses) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Capacity Overview - Enhanced */}
            <Card className="factory-light-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      Overall Capacity Overview
                    </CardTitle>
                    <CardDescription className="text-gray-600 mt-1">
                      Total capacity utilization across all warehouses
                    </CardDescription>
                  </div>
                  <Link href="/dashboard/factory/warehouses">
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-700">Overall Capacity Usage</span>
                    <Badge className={`text-base font-bold px-4 py-1.5 ${getCapacityColor(capacityPercentage)}`}>
                      {capacityPercentage}%
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                    <div
                      className={`h-4 rounded-full transition-all duration-700 shadow-sm ${getCapacityBarColor(capacityPercentage)}`}
                      style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200">
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-600 mb-2">Total Capacity</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {finalStats?.totalCapacity.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '0'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">All warehouses</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <p className="text-sm text-gray-600 mb-2">Used Capacity</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {finalStats?.usedCapacity.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '0'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {finalStats && finalStats.totalCapacity > 0
                        ? Math.round((finalStats.usedCapacity / finalStats.totalCapacity) * 100)
                        : 0}% utilized
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-sm text-gray-600 mb-2">Available Capacity</p>
                    <p className="text-2xl font-bold text-green-600">
                      {finalStats?.availableCapacity.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '0'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Ready for use</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Critical Warehouses & Recent Warehouses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Critical Warehouses */}
              {criticalWarehouses.length > 0 && (
                <Card className="factory-light-card border-orange-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-gray-900 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          Warehouses Needing Attention
                        </CardTitle>
                        <CardDescription className="text-gray-600 mt-1">
                          Warehouses with high capacity or maintenance issues
                        </CardDescription>
                      </div>
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                        {criticalWarehouses.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {criticalWarehouses.slice(0, 5).map((warehouse: any) => {
                        const capacityPct = warehouse.totalCapacity > 0
                          ? Math.round((warehouse.usedCapacity / warehouse.totalCapacity) * 100)
                          : 0
                        return (
                          <Link
                            key={warehouse.id}
                            href={`/dashboard/factory/warehouses/${warehouse.id}`}
                          >
                            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100 hover:bg-orange-100 hover:border-orange-200 transition-all cursor-pointer">
                              <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-orange-600" />
                                <div>
                                  <div className="font-semibold text-gray-900">{warehouse.name}</div>
                                  <div className="text-xs text-gray-500">{warehouse.code}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-orange-600">{capacityPct}%</div>
                                <Badge className={`mt-1 ${warehouse.status === 'FULL' ? 'bg-red-100 text-red-700 border-red-200' :
                                  warehouse.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                    'bg-orange-100 text-orange-700 border-orange-200'
                                  }`}>
                                  {warehouse.status}
                                </Badge>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Warehouses */}
              {warehouses.length > 0 && (
                <Card className="factory-light-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-gray-900">Recent Warehouses</CardTitle>
                        <CardDescription className="text-gray-600">
                          Latest warehouses in your system
                        </CardDescription>
                      </div>
                      <Link href="/dashboard/factory/warehouses">
                        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                          View All
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {warehouses.slice(0, 5).map((warehouse: any) => {
                        const capacityPct = warehouse.totalCapacity > 0
                          ? Math.round((warehouse.usedCapacity / warehouse.totalCapacity) * 100)
                          : 0
                        return (
                          <Link
                            key={warehouse.id}
                            href={`/dashboard/factory/warehouses/${warehouse.id}`}
                          >
                            <div className="flex items-center justify-between p-4 rounded-lg bg-white hover:bg-gray-50 transition-all cursor-pointer border border-gray-200 hover:border-gray-300 hover:shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${warehouse.status === 'ACTIVE' ? 'bg-green-50' :
                                  warehouse.status === 'MAINTENANCE' ? 'bg-yellow-50' :
                                    warehouse.status === 'FULL' ? 'bg-red-50' :
                                      'bg-gray-50'
                                  }`}>
                                  <Warehouse className={`h-5 w-5 ${warehouse.status === 'ACTIVE' ? 'text-green-600' :
                                    warehouse.status === 'MAINTENANCE' ? 'text-yellow-600' :
                                      warehouse.status === 'FULL' ? 'text-red-600' :
                                        'text-gray-600'
                                    }`} />
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">{warehouse.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {warehouse.code} • {warehouse.warehouseType}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-gray-900">{capacityPct}%</div>
                                  <div className="text-xs text-gray-500">Capacity</div>
                                </div>
                                <Badge
                                  variant={warehouse.status === 'ACTIVE' ? 'default' : 'secondary'}
                                  className={warehouse.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}
                                >
                                  {warehouse.status}
                                </Badge>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Actions - Enhanced */}
            <Card className="factory-light-card">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-600" />
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Common factory management tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link href="/dashboard/factory/warehouses">
                    <Button variant="outline" className="w-full justify-start h-auto p-4 hover:bg-gray-50 transition-all border-gray-200 hover:border-green-200 hover:shadow-sm group">
                      <div className="flex items-center gap-3 w-full">
                        <div className="p-2 rounded-lg bg-green-50 group-hover:bg-green-100 transition-colors">
                          <Warehouse className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-semibold text-gray-900">Manage Warehouses</div>
                          <div className="text-xs text-gray-500">View and manage all warehouses</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-green-600 transition-colors" />
                      </div>
                    </Button>
                  </Link>
                  <Link href="/dashboard/factory/zones">
                    <Button variant="outline" className="w-full justify-start h-auto p-4 hover:bg-gray-50 transition-all border-gray-200 hover:border-purple-200 hover:shadow-sm group">
                      <div className="flex items-center gap-3 w-full">
                        <div className="p-2 rounded-lg bg-purple-50 group-hover:bg-purple-100 transition-colors">
                          <MapPin className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-semibold text-gray-900">Manage Zones</div>
                          <div className="text-xs text-gray-500">View and manage all zones</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                      </div>
                    </Button>
                  </Link>
                  <Link href="/dashboard/factory/warehouses">
                    <Button variant="outline" className="w-full justify-start h-auto p-4 hover:bg-gray-50 transition-all border-gray-200 hover:border-blue-200 hover:shadow-sm group">
                      <div className="flex items-center gap-3 w-full">
                        <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                          <Plus className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-semibold text-gray-900">Create Warehouse</div>
                          <div className="text-xs text-gray-500">Add a new warehouse</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </Button>
                  </Link>
                  <Link href="/dashboard/factory">
                    <Button variant="outline" className="w-full justify-start h-auto p-4 hover:bg-gray-50 transition-all border-gray-200 hover:border-gray-300 hover:shadow-sm group">
                      <div className="flex items-center gap-3 w-full">
                        <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors">
                          <BarChart3 className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-semibold text-gray-900">View Reports</div>
                          <div className="text-xs text-gray-500">Factory analytics</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
