'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { 
  AlertTriangle, 
  Warehouse, 
  MapPin,
  Search, 
  RefreshCw, 
  X,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { useWarehouseCapacityAlerts } from '@/hooks/useWarehouseStock'
import { useWarehouses } from '@/hooks/useWarehouses'
import { CapacityAlertDetailsModal } from '@/components/factory/warehouses'
import Link from 'next/link'
import { format } from 'date-fns'

// Custom hook for debounced search
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function CapacityAlertsPage() {
  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')
  const [alertLevelFilter, setAlertLevelFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  
  const debouncedSearch = useDebounce(search, 300)

  const { data: warehousesData, isLoading: warehousesLoading } = useWarehouses({ limit: 1000 })
  const warehouses = warehousesData?.data || []

  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useWarehouseCapacityAlerts()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetchAlerts()
    setIsRefreshing(false)
  }

  const handleClearFilters = () => {
    setSearch('')
    setWarehouseFilter('all')
    setAlertLevelFilter('all')
    setStatusFilter('active')
  }

  // Filter alerts
  const filteredAlerts = (alerts || []).filter((alert: any) => {
    const matchesSearch = !debouncedSearch || 
      alert.warehouse?.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      alert.zone?.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    
    const matchesWarehouse = warehouseFilter === 'all' || alert.warehouseId === warehouseFilter
    const matchesLevel = alertLevelFilter === 'all' || alert.alertLevel === alertLevelFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && !alert.isResolved) ||
      (statusFilter === 'resolved' && alert.isResolved)
    
    return matchesSearch && matchesWarehouse && matchesLevel && matchesStatus
  })

  const activeAlerts = filteredAlerts.filter((a: any) => !a.isResolved)
  const resolvedAlerts = filteredAlerts.filter((a: any) => a.isResolved)

  const getAlertLevelBadge = (level: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      NORMAL: { label: 'Normal', className: 'bg-green-100 text-green-700 border-green-200' },
      WARNING: { label: 'Warning', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      CRITICAL: { label: 'Critical', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      FULL: { label: 'Full', className: 'bg-red-100 text-red-700 border-red-200' },
    }
    const badge = badges[level] || { label: level, className: 'bg-gray-100 text-gray-700 border-gray-200' }
    return (
      <Badge className={badge.className}>
        {badge.label}
      </Badge>
    )
  }

  const getAlertLevelIcon = (level: string) => {
    if (level === 'FULL') return <XCircle className="h-5 w-5 text-red-600" />
    if (level === 'CRITICAL') return <AlertTriangle className="h-5 w-5 text-orange-600" />
    if (level === 'WARNING') return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    return <CheckCircle className="h-5 w-5 text-green-600" />
  }

  if (warehousesLoading || alertsLoading) {
    return (
      <ProtectedRoute requiredPermission="warehouses.view">
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-transparent border-t-green-600"></div>
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
                <Link href="/dashboard/warehouse-stock">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="factory-heading flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-orange-600" />
                    Capacity Alerts
                  </h1>
                  <p className="factory-subheading">
                    View and manage warehouse capacity alerts
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="factory-stat-card border-orange-200">
                <CardHeader className="pb-3">
                  <CardDescription className="text-gray-600 font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Active Alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">{activeAlerts.length}</div>
                  <p className="text-sm text-gray-500 mt-1">Requiring attention</p>
                </CardContent>
              </Card>

              <Card className="factory-stat-card border-red-200">
                <CardHeader className="pb-3">
                  <CardDescription className="text-gray-600 font-semibold flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Critical Alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {activeAlerts.filter((a: any) => a.alertLevel === 'CRITICAL' || a.alertLevel === 'FULL').length}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Urgent action needed</p>
                </CardContent>
              </Card>

              <Card className="factory-stat-card border-green-200">
                <CardHeader className="pb-3">
                  <CardDescription className="text-gray-600 font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Resolved Alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{resolvedAlerts.length}</div>
                  <p className="text-sm text-gray-500 mt-1">Recently resolved</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="factory-light-card">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by warehouse or zone name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 factory-input"
                      />
                    </div>
                  </div>
                  <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                    <SelectTrigger className="w-full md:w-[200px] factory-input">
                      <SelectValue placeholder="All Warehouses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Warehouses</SelectItem>
                      {warehouses.map((warehouse: any) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={alertLevelFilter} onValueChange={setAlertLevelFilter}>
                    <SelectTrigger className="w-full md:w-[200px] factory-input">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="WARNING">Warning</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="FULL">Full</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[200px] factory-input">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Alerts Table */}
            <Card className="factory-light-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900">Capacity Alerts</CardTitle>
                    <CardDescription className="text-gray-600">
                      {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''} found
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredAlerts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-200">
                          <TableHead className="text-gray-700 font-semibold">Alert Level</TableHead>
                          <TableHead className="text-gray-700 font-semibold">Warehouse</TableHead>
                          <TableHead className="text-gray-700 font-semibold">Zone</TableHead>
                          <TableHead className="text-gray-700 font-semibold">Capacity</TableHead>
                          <TableHead className="text-gray-700 font-semibold">Threshold</TableHead>
                          <TableHead className="text-gray-700 font-semibold">Message</TableHead>
                          <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                          <TableHead className="text-gray-700 font-semibold">Created</TableHead>
                          <TableHead className="text-gray-700 font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAlerts.map((alert: any) => (
                          <TableRow key={alert.id} className="border-gray-200 hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getAlertLevelIcon(alert.alertLevel)}
                                {getAlertLevelBadge(alert.alertLevel)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link 
                                href={`/dashboard/factory/warehouses/${alert.warehouseId}`}
                                className="flex items-center gap-2 text-gray-900 hover:text-green-600"
                              >
                                <Warehouse className="h-4 w-4" />
                                {alert.warehouse?.name || 'Unknown Warehouse'}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {alert.zone ? (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span className="text-gray-600">{alert.zone.name}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">Warehouse-wide</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-semibold text-gray-900">{alert.currentCapacity.toFixed(1)}%</div>
                                <div className="text-xs text-gray-500">
                                  {alert.currentUsed.toFixed(0)} / {(alert.currentUsed + alert.currentAvailable).toFixed(0)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">{alert.threshold}%</span>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm text-gray-700 truncate" title={alert.message}>
                                {alert.message}
                              </p>
                            </TableCell>
                            <TableCell>
                              {alert.isResolved ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Resolved
                                </Badge>
                              ) : (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {format(new Date(alert.createdAt), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedAlert(alert)
                                  setIsDetailsModalOpen(true)
                                }}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium mb-2">No alerts found</p>
                    <p className="text-sm text-gray-500">All warehouses are operating normally</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alert Details Modal */}
            {selectedAlert && (
              <CapacityAlertDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                  setIsDetailsModalOpen(false)
                  setSelectedAlert(null)
                }}
                alert={selectedAlert}
                warehouseId={selectedAlert.warehouseId || ''}
              />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

