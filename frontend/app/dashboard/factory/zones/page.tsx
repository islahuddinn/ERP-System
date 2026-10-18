'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable, applyClientPaging } from '@/hooks/useDataTable'
import { useWarehouses } from '@/hooks/useWarehouses'
import { apiClient } from '@/lib/api-client'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { Search, MapPin, RefreshCw, X, Loader2, Grid3x3, List, Eye, Warehouse, Plus, Edit, Trash2 } from 'lucide-react'
import { ZoneCard, CreateZoneModal, DeleteZoneModal } from '@/components/factory/zones'
import { isDummyDataEnabled } from '@/lib/dummy-data'

const ALL = '__all__'

interface Zone {
  id: string
  name: string
  code: string
  zoneType: 'RAW_MATERIALS' | 'PACKAGING' | 'FINISHED_GOODS' | 'QUARANTINE' | 'REJECTED' | 'TEMPORARY'
  description?: string
  totalCapacity: number
  usedCapacity: number
  availableCapacity: number
  isActive: boolean
  temperature?: number
  humidity?: number
  notes?: string
  warehouse?: {
    id: string
    name: string
    code: string
  }
  _count?: {
    stockBalances: number
  }
}

export default function ZonesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const controller = useDataTable()

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [allZones, setAllZones] = useState<Zone[]>([])
  const [isLoadingZones, setIsLoadingZones] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('')

  // Fetch all warehouses
  const { data: warehousesData, isLoading: warehousesLoading } = useWarehouses({ limit: 1000 })
  const warehouses = warehousesData?.data || []

  // Fetch all zones from all warehouses
  useEffect(() => {
    const fetchAllZones = async () => {
      setIsLoadingZones(true)
      try {
        const USE_DUMMY_DATA = isDummyDataEnabled()

        if (USE_DUMMY_DATA) {
          await new Promise((resolve) => setTimeout(resolve, 200))
          const { getAllDummyZones } = await import('@/data/dummy/factory/warehouses')
          const { getDummyDataStore } = await import('@/hooks/useWarehouses')
          const store = getDummyDataStore()
          const allZonesData = getAllDummyZones(warehouses, store.zones)
          setAllZones(allZonesData)
        } else {
          const zonesPromises = warehouses.map(async (warehouse: any) => {
            try {
              const response = await apiClient.get(`/warehouses/${warehouse.id}/zones`)
              let zones = []
              if (Array.isArray(response.data)) {
                zones = response.data
              } else if (response.data?.data && Array.isArray(response.data.data)) {
                zones = response.data.data
              } else if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
                zones = response.data.data.data
              }
              return zones.map((zone: any) => ({
                ...zone,
                warehouse: {
                  id: warehouse.id,
                  name: warehouse.name,
                  code: warehouse.code,
                },
              }))
            } catch (error) {
              return []
            }
          })
          const zonesArrays = await Promise.all(zonesPromises)
          setAllZones(zonesArrays.flat())
        }
      } catch (error) {
        console.error('Error fetching zones:', error)
      } finally {
        setIsLoadingZones(false)
      }
    }

    if (warehouses.length > 0) {
      fetchAllZones()
    }
  }, [warehouses])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    await queryClient.refetchQueries({ queryKey: ['warehouses'] })
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const clearFilters = () => {
    controller.setSearchInput('')
    controller.resetFilters()
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

  const getCapacityPercentage = (zone: Zone) => {
    if (zone.totalCapacity === 0) return 0
    return Math.round((zone.usedCapacity / zone.totalCapacity) * 100)
  }

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-red-500'
    if (percentage >= 85) return 'bg-orange-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Client-side search / filter / sort / paginate over the assembled zones list.
  const accessors = {
    search: (z: Zone) => `${z.name} ${z.code} ${z.warehouse?.name ?? ''}`,
    filters: {
      zoneType: (z: Zone) => z.zoneType,
      warehouseId: (z: Zone) => z.warehouse?.id,
      status: (z: Zone) => (z.isActive ? 'active' : 'inactive'),
    },
    sort: {
      name: (z: Zone) => z.name,
      code: (z: Zone) => z.code,
    },
  }

  const paged = applyClientPaging(allZones, controller, accessors)
  // Grid keeps showing every matching zone (no page slicing), like the original.
  const filteredZones = applyClientPaging(allZones, controller, accessors, { ignorePaging: true }).data

  const isFiltered =
    Boolean(controller.searchInput) ||
    controller.filters.zoneType !== undefined ||
    controller.filters.warehouseId !== undefined ||
    controller.filters.status !== undefined

  const filters: DataTableFilter<Zone>[] = [
    {
      key: 'zoneType',
      label: 'Zone Type',
      options: [
        { value: 'RAW_MATERIALS', label: 'Raw Materials' },
        { value: 'PACKAGING', label: 'Packaging' },
        { value: 'FINISHED_GOODS', label: 'Finished Goods' },
        { value: 'QUARANTINE', label: 'Quarantine' },
        { value: 'REJECTED', label: 'Rejected' },
        { value: 'TEMPORARY', label: 'Temporary' },
      ],
    },
    {
      // Warehouse filter sourced from the full warehouses list (matches the grid-view
      // Select), so every warehouse is selectable regardless of the visible zones.
      key: 'warehouseId',
      label: 'Warehouse',
      searchable: true,
      options: (warehouses as any[]).map((w) => ({ value: w.id, label: w.name })),
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ]

  const columns: DataTableColumn<Zone>[] = [
    { key: 'name', header: 'Zone Name', sortable: true, render: (z) => <span className="font-medium text-gray-900">{z.name}</span> },
    { key: 'code', header: 'Code', sortable: true, render: (z) => <span className="text-gray-600 font-mono text-sm">{z.code}</span> },
    {
      key: 'zoneType',
      header: 'Type',
      render: (z) => <Badge className={getZoneTypeColor(z.zoneType)}>{z.zoneType.replace('_', ' ')}</Badge>,
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (z) => (
        <div className="flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">{z.warehouse?.name || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (z) => {
        const capacityPercentage = getCapacityPercentage(z)
        return (
          <div className="flex items-center gap-2 min-w-[150px]">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className={`font-semibold ${getCapacityColor(capacityPercentage).replace('bg-', 'text-')}`}>
                  {capacityPercentage}%
                </span>
                <span className="text-gray-500">
                  {z.usedCapacity.toFixed(1)} / {z.totalCapacity.toFixed(1)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getCapacityColor(capacityPercentage)}`}
                  style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (z) =>
        z.isActive ? (
          <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200">Inactive</Badge>
        ),
    },
    { key: 'products', header: 'Products', render: (z) => z._count?.stockBalances || 0 },
  ]

  const isLoading = warehousesLoading || isLoadingZones

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="warehouses.view">
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

  return (
    <ProtectedRoute requiredPermission="warehouses.view">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <MapPin className="h-8 w-8 text-green-600" />
                  Zones Management
                </h1>
                <p className="text-gray-600 mt-1">Manage all zones across all warehouses</p>
              </div>
              <PermissionGuard requiredPermission="warehouses.update">
                <Button
                  onClick={() => {
                    if (warehouses.length > 0) {
                      setSelectedWarehouseId(warehouses[0].id)
                      setIsCreateOpen(true)
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={warehouses.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Zone
                </Button>
              </PermissionGuard>
            </div>

            {/* Grid-mode toolbar (table mode uses the DataTable toolbar) */}
            {viewMode === 'grid' && (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search zones by name, code, or warehouse..."
                          value={controller.searchInput}
                          onChange={(e) => controller.setSearchInput(e.target.value)}
                          className="pl-10 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>
                    <Select
                      value={controller.filters.zoneType ?? ALL}
                      onValueChange={(v) => controller.setFilter('zoneType', v === ALL ? undefined : v)}
                    >
                      <SelectTrigger className="w-full lg:w-48 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        <SelectValue placeholder="Zone Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All Types</SelectItem>
                        <SelectItem value="RAW_MATERIALS">Raw Materials</SelectItem>
                        <SelectItem value="PACKAGING">Packaging</SelectItem>
                        <SelectItem value="FINISHED_GOODS">Finished Goods</SelectItem>
                        <SelectItem value="QUARANTINE">Quarantine</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="TEMPORARY">Temporary</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={controller.filters.warehouseId ?? ALL}
                      onValueChange={(v) => controller.setFilter('warehouseId', v === ALL ? undefined : v)}
                    >
                      <SelectTrigger className="w-full lg:w-48 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        <SelectValue placeholder="Warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All Warehouses</SelectItem>
                        {warehouses.map((warehouse: any) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={controller.filters.status ?? ALL}
                      onValueChange={(v) => controller.setFilter('status', v === ALL ? undefined : v)}
                    >
                      <SelectTrigger className="w-full lg:w-48 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                      {isFiltered && (
                        <Button
                          variant="outline"
                          onClick={clearFilters}
                          className="h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* View Toggle and Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredZones.length} zone{filteredZones.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                >
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={viewMode === 'table' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                >
                  <List className="h-4 w-4 mr-2" />
                  Table
                </Button>
              </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <>
                {filteredZones.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredZones.map((zone) => (
                      <ZoneCard
                        key={zone.id}
                        zone={zone as any}
                        warehouseName={zone.warehouse?.name}
                        onEdit={() => {
                          setEditingZone(zone)
                          setSelectedWarehouseId(zone.warehouse?.id || '')
                          setIsEditOpen(true)
                        }}
                        onDelete={() => {
                          setZoneToDelete(zone)
                          setSelectedWarehouseId(zone.warehouse?.id || '')
                          setIsDeleteOpen(true)
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="text-center py-16">
                      <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-900 font-semibold text-lg mb-2">No zones found</p>
                      <p className="text-sm text-gray-500 mb-6">
                        {isFiltered
                          ? 'Try adjusting your search or filters'
                          : 'Zones will appear here once they are created in warehouses'}
                      </p>
                      {!isFiltered && (
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={() => router.push('/dashboard/factory/warehouses')}
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <Warehouse className="h-4 w-4 mr-2" />
                            Go to Warehouses
                          </Button>
                          <PermissionGuard requiredPermission="warehouses.update">
                            <Button
                              onClick={() => {
                                if (warehouses.length > 0) {
                                  setSelectedWarehouseId(warehouses[0].id)
                                  setIsCreateOpen(true)
                                }
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              disabled={warehouses.length === 0}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create Zone
                            </Button>
                          </PermissionGuard>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <DataTable<Zone>
                    columns={columns}
                    data={paged.data}
                    meta={paged.meta}
                    controller={controller}
                    rowKey={(z) => z.id}
                    searchable
                    searchPlaceholder="Search zones by name, code, or warehouse..."
                    filters={filters}
                    pageSizeOptions
                    emptyMessage="No zones found"
                    toolbarRight={
                      <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    }
                    actions={(zone) => (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-green-50"
                          onClick={() => router.push(`/dashboard/factory/warehouses/${zone.warehouse?.id}/zones`)}
                          title="View Zone Details"
                        >
                          <Eye className="h-4 w-4 text-gray-600" />
                        </Button>
                        <PermissionGuard requiredPermission="warehouses.update">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-50"
                            onClick={() => {
                              setEditingZone(zone)
                              setSelectedWarehouseId(zone.warehouse?.id || '')
                              setIsEditOpen(true)
                            }}
                            title="Edit Zone"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-red-50"
                            onClick={() => {
                              setZoneToDelete(zone)
                              setSelectedWarehouseId(zone.warehouse?.id || '')
                              setIsDeleteOpen(true)
                            }}
                            title="Delete Zone"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </PermissionGuard>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Modals */}
            {selectedWarehouseId && (
              <>
                <CreateZoneModal
                  isOpen={isCreateOpen}
                  onClose={() => {
                    setIsCreateOpen(false)
                    setSelectedWarehouseId('')
                    handleRefresh()
                  }}
                  warehouseId={selectedWarehouseId}
                />
                <CreateZoneModal
                  isOpen={isEditOpen}
                  onClose={() => {
                    setIsEditOpen(false)
                    setEditingZone(null)
                    setSelectedWarehouseId('')
                    handleRefresh()
                  }}
                  warehouseId={selectedWarehouseId}
                  zone={editingZone as any}
                />
                <DeleteZoneModal
                  isOpen={isDeleteOpen}
                  onClose={() => {
                    setIsDeleteOpen(false)
                    setZoneToDelete(null)
                    setSelectedWarehouseId('')
                    handleRefresh()
                  }}
                  warehouseId={selectedWarehouseId}
                  zone={zoneToDelete as any}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
