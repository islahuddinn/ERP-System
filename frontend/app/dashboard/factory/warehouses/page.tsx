'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import {
  useWarehouses,
  type Warehouse,
} from '@/hooks/useWarehouses'
import { apiClient } from '@/lib/api-client'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import {
  CreateWarehouseModal,
  DeleteWarehouseModal,
  AssignManagerModal,
  WarehouseCard,
} from '@/components/factory/warehouses'
import { Plus, Search, Warehouse as WarehouseIcon, RefreshCw, X, Grid3x3, List, LayoutGrid } from 'lucide-react'

const ALL = '__all__'

interface Location {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
}

export default function WarehousesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  // Read type from URL query parameter
  const typeFromUrl = searchParams.get('type')
  const initialType = typeFromUrl === 'STORAGE' || typeFromUrl === 'DISPATCH' ? typeFromUrl : undefined

  const controller = useDataTable({
    initialLimit: 20,
    initialFilters: {
      isActive: 'true',
      ...(initialType ? { warehouseType: initialType } : {}),
    },
  })

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isAssignManagerOpen, setIsAssignManagerOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null)
  const [warehouseForManager, setWarehouseForManager] = useState<Warehouse | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const warehouseTypeFilter = controller.filters.warehouseType

  // Update filter when URL changes
  useEffect(() => {
    const t = searchParams.get('type')
    if (t === 'STORAGE' || t === 'DISPATCH') {
      controller.setFilter('warehouseType', t)
    } else if (!t) {
      controller.setFilter('warehouseType', undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Fetch warehouses (server-side: search / warehouseType / status / isActive / locationId)
  const { data: warehousesData, isLoading, isError } = useWarehouses({ ...(controller.queryParams as any) })
  const warehouses: Warehouse[] = warehousesData?.data || []
  const meta = warehousesData?.meta

  // Fetch locations for dropdown
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await apiClient.get('/locations')
      const responseData = response.data
      if (responseData && typeof responseData === 'object' && 'data' in responseData && !Array.isArray(responseData.data)) {
        return responseData.data
      }
      return responseData
    },
  })
  const locations: Location[] = Array.isArray(locationsData?.data)
    ? locationsData.data
    : Array.isArray(locationsData?.data?.data)
    ? locationsData.data.data
    : Array.isArray(locationsData)
    ? locationsData
    : []

  // Fetch users for manager dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get('/users?limit=100')
      const responseData = response.data
      if (responseData && typeof responseData === 'object' && 'data' in responseData && !Array.isArray(responseData.data)) {
        return responseData.data
      }
      return responseData
    },
  })
  const users: User[] = Array.isArray(usersData?.data)
    ? usersData.data
    : Array.isArray(usersData?.data?.data)
    ? usersData.data.data
    : Array.isArray(usersData)
    ? usersData
    : []

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse)
    setIsEditOpen(true)
  }

  const handleDelete = (warehouse: Warehouse) => {
    setWarehouseToDelete(warehouse)
    setIsDeleteOpen(true)
  }

  const handleAssignManager = (warehouse: Warehouse) => {
    setWarehouseForManager(warehouse)
    setIsAssignManagerOpen(true)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const clearFilters = () => {
    controller.setSearchInput('')
    controller.resetFilters()
    controller.setFilter('isActive', 'true')
  }

  const getCapacityPercentage = (warehouse: Warehouse) => {
    if (warehouse.totalCapacity === 0) return 0
    return Math.round((warehouse.usedCapacity / warehouse.totalCapacity) * 100)
  }

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 95) return 'text-red-500'
    if (percentage >= 85) return 'text-orange-500'
    if (percentage >= 70) return 'text-yellow-500'
    return 'text-green-500'
  }

  const isFiltered =
    Boolean(controller.searchInput) ||
    warehouseTypeFilter !== undefined ||
    controller.filters.status !== undefined ||
    controller.filters.isActive !== 'true'

  const filters: DataTableFilter<Warehouse>[] = [
    {
      key: 'warehouseType',
      label: 'Type',
      options: [
        { value: 'STORAGE', label: 'Storage' },
        { value: 'DISPATCH', label: 'Dispatch' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
        { value: 'MAINTENANCE', label: 'Maintenance' },
        { value: 'FULL', label: 'Full' },
      ],
    },
    {
      key: 'isActive',
      label: 'Active',
      options: [
        { value: 'true', label: 'Active Only' },
        { value: 'false', label: 'Inactive Only' },
      ],
    },
    {
      // Location filter sourced from the full locations list (not just the current
      // page), so every location is selectable even under server-side pagination.
      key: 'locationId',
      label: 'Location',
      searchable: true,
      options: locations.map((l) => ({ value: l.id, label: l.name })),
    },
  ]

  const columns: DataTableColumn<Warehouse>[] = [
    { key: 'name', header: 'Name', render: (w) => <span className="font-medium text-gray-900">{w.name}</span> },
    { key: 'code', header: 'Code', render: (w) => <span className="text-gray-600 font-mono text-sm">{w.code}</span> },
    {
      key: 'warehouseType',
      header: 'Type',
      render: (w) => <Badge className="bg-green-100 text-green-700 border-green-200">{w.warehouseType}</Badge>,
    },
    { key: 'location', header: 'Location', render: (w) => w.location?.name || 'N/A' },
    {
      key: 'status',
      header: 'Status',
      render: (w) =>
        w.status === 'ACTIVE' ? (
          <Badge className="bg-green-100 text-green-700 border-green-200">{w.status}</Badge>
        ) : w.status === 'INACTIVE' ? (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200">{w.status}</Badge>
        ) : w.status === 'MAINTENANCE' ? (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">{w.status}</Badge>
        ) : (
          <Badge className="bg-red-100 text-red-700 border-red-200">{w.status}</Badge>
        ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (w) => {
        const capacityPercentage = getCapacityPercentage(w)
        return (
          <div className="flex items-center gap-2 min-w-[150px]">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className={`font-semibold ${getCapacityColor(capacityPercentage)}`}>{capacityPercentage}%</span>
                <span className="text-gray-500">
                  {w.usedCapacity.toFixed(1)} / {w.totalCapacity.toFixed(1)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    capacityPercentage >= 95
                      ? 'bg-red-500'
                      : capacityPercentage >= 85
                      ? 'bg-orange-500'
                      : capacityPercentage >= 70
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'manager',
      header: 'Manager',
      render: (w) => w.manager?.name || <span className="text-gray-400 italic">Unassigned</span>,
    },
  ]

  return (
    <ProtectedRoute requiredPermission="warehouses.view">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <WarehouseIcon className="h-8 w-8 text-green-600" />
                  {warehouseTypeFilter === 'STORAGE'
                    ? 'Storage Warehouses'
                    : warehouseTypeFilter === 'DISPATCH'
                    ? 'Dispatch Warehouses'
                    : 'Warehouses'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {warehouseTypeFilter === 'STORAGE'
                    ? 'Manage storage warehouses for inventory'
                    : warehouseTypeFilter === 'DISPATCH'
                    ? 'Manage dispatch warehouses for shipping'
                    : 'Manage storage and dispatch warehouses'}
                </p>
              </div>
              <PermissionGuard requiredPermission="warehouses.create">
                <Button onClick={() => setIsCreateOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Warehouse
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
                          placeholder="Search warehouses by name or code..."
                          value={controller.searchInput}
                          onChange={(e) => controller.setSearchInput(e.target.value)}
                          className="pl-10 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>
                    <Select
                      value={warehouseTypeFilter ?? ALL}
                      onValueChange={(v) => controller.setFilter('warehouseType', v === ALL ? undefined : v)}
                    >
                      <SelectTrigger className="w-full lg:w-48 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All Types</SelectItem>
                        <SelectItem value="STORAGE">Storage</SelectItem>
                        <SelectItem value="DISPATCH">Dispatch</SelectItem>
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
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="FULL">Full</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={controller.filters.isActive ?? ALL}
                      onValueChange={(v) => controller.setFilter('isActive', v === ALL ? undefined : v)}
                    >
                      <SelectTrigger className="w-full lg:w-48 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        <SelectValue placeholder="Active" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All</SelectItem>
                        <SelectItem value="true">Active Only</SelectItem>
                        <SelectItem value="false">Inactive Only</SelectItem>
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
                Showing {warehouses.length} warehouse{warehouses.length !== 1 ? 's' : ''}
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
                {warehouses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {warehouses.map((warehouse: Warehouse) => (
                      <WarehouseCard
                        key={warehouse.id}
                        warehouse={warehouse}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAssignManager={handleAssignManager}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="text-center py-16">
                      <WarehouseIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-900 font-semibold text-lg mb-2">No warehouses found</p>
                      <p className="text-sm text-gray-500 mb-6">
                        {isFiltered ? 'Try adjusting your search or filters' : 'Get started by adding your first warehouse'}
                      </p>
                      {!isFiltered && (
                        <PermissionGuard requiredPermission="warehouses.create">
                          <Button onClick={() => setIsCreateOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Warehouse
                          </Button>
                        </PermissionGuard>
                      )}
                    </CardContent>
                  </Card>
                )}
                <Pagination meta={meta} onPageChange={controller.setPage} />
              </>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <DataTable<Warehouse>
                    columns={columns}
                    data={warehouses}
                    meta={meta}
                    controller={controller}
                    rowKey={(w) => w.id}
                    isLoading={isLoading}
                    isError={isError}
                    searchable
                    searchPlaceholder="Search warehouses by name or code..."
                    filters={filters}
                    pageSizeOptions={[20, 50, 100]}
                    emptyMessage="No warehouses found"
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
                    actions={(warehouse) => (
                      <div className="flex justify-end gap-1">
                        <PermissionGuard requiredPermission="warehouses.view">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                            onClick={() => router.push(`/dashboard/factory/warehouses/${warehouse.id}`)}
                            title="View Details"
                          >
                            <LayoutGrid className="h-4 w-4 text-gray-600" />
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard requiredPermission="warehouses.update">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-green-50"
                            onClick={() => handleEdit(warehouse)}
                            title="Edit Warehouse"
                          >
                            <span className="text-green-600 text-sm">✏️</span>
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard requiredPermission="warehouses.delete">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-red-50"
                            onClick={() => handleDelete(warehouse)}
                            title="Delete Warehouse"
                          >
                            <span className="text-red-600 text-sm">🗑️</span>
                          </Button>
                        </PermissionGuard>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Modals */}
            <CreateWarehouseModal
              isOpen={isCreateOpen}
              onClose={() => {
                setIsCreateOpen(false)
                setEditingWarehouse(null)
              }}
              warehouse={null}
              locations={locations}
              users={users}
            />

            <CreateWarehouseModal
              isOpen={isEditOpen}
              onClose={() => {
                setIsEditOpen(false)
                setEditingWarehouse(null)
              }}
              warehouse={editingWarehouse}
              locations={locations}
              users={users}
            />

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
