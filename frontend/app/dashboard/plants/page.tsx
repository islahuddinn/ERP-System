'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  usePlants,
  type Plant,
  type PlantFilters,
} from '@/hooks/usePlants'
import { apiClient } from '@/lib/api-client'
import { userResolver } from '@/lib/user-resolver'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import {
  CreatePlantModal,
  DeletePlantModal,
  AssignManagerModal,
  PlantCard,
  CreateProductionLineModal,
  CreateMachineModal,
} from '@/components/factory/plants'
import { Plus, Search, Factory, RefreshCw, X, Loader2, Grid3x3, List, Eye, Edit, Trash2, User } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { dummyLocations, dummyUsers } from '@/data/dummy/factory/warehouses'

export default function PlantsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isAssignManagerOpen, setIsAssignManagerOpen] = useState(false)
  const [isCreateLineOpen, setIsCreateLineOpen] = useState(false)
  const [isCreateMachineOpen, setIsCreateMachineOpen] = useState(false)
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null)
  const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null)
  const [plantForManager, setPlantForManager] = useState<Plant | null>(null)
  const [plantForLine, setPlantForLine] = useState<Plant | null>(null)
  const [plantForMachine, setPlantForMachine] = useState<Plant | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  // Build filters
  const filters: PlantFilters = {
    page: currentPage,
    limit: 20,
    search: debouncedSearch || undefined,
    locationId: locationFilter !== 'all' ? locationFilter : undefined,
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
  }

  // Fetch plants
  const { data: plantsResponse, isLoading } = usePlants(filters)
  const plants = useMemo(() => {
    if (!plantsResponse) return []
    // Deep probe for data array
    const rawData = (plantsResponse as any).data ?? plantsResponse
    if (!Array.isArray(rawData) && typeof rawData === 'object' && rawData !== null) {
      const arrayKey = Object.keys(rawData).find(key => Array.isArray((rawData as any)[key]))
      if (arrayKey) return (rawData as any)[arrayKey]
    }
    return Array.isArray(rawData) ? rawData : []
  }, [plantsResponse])

  const totalPages = useMemo(() => {
    if (!plantsResponse || Array.isArray(plantsResponse)) return 1
    return (plantsResponse as any).meta?.totalPages || 1
  }, [plantsResponse])

  // Use dummy locations and users
  const locations = dummyLocations
  const users = dummyUsers

  const handleEdit = (plant: Plant) => {
    setEditingPlant(plant)
    setIsEditOpen(true)
  }

  const handleDelete = (plant: Plant) => {
    setPlantToDelete(plant)
    setIsDeleteOpen(true)
  }

  const handleAssignManager = (plant: Plant) => {
    setPlantForManager(plant)
    setIsAssignManagerOpen(true)
  }

  const handleCreateLine = (plant: Plant) => {
    setPlantForLine(plant)
    setIsCreateLineOpen(true)
  }

  const handleCreateMachine = (plant: Plant) => {
    setPlantForMachine(plant)
    setIsCreateMachineOpen(true)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['plants'] })
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const clearFilters = () => {
    setSearch('')
    setLocationFilter('all')
    setStatusFilter('all')
    setCurrentPage(1)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700 border-green-200',
      INACTIVE: 'bg-gray-100 text-gray-700 border-gray-200',
      MAINTENANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

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
    <ProtectedRoute requiredPermission="plants.read">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Factory className="h-8 w-8 text-green-600" />
                  Plants
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage production plants and facilities
                </p>
              </div>
              <PermissionGuard requiredPermission="plants.create">
                <Button
                  onClick={() => router.push('/dashboard/factory/plants/create')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Plant
                </Button>
              </PermissionGuard>
            </div>

            {/* Filters and Search */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search plants by name or code..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="w-full lg:w-48 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full lg:w-48 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
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
                    {(search || locationFilter !== 'all' || statusFilter !== 'all') && (
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

            {/* View Toggle and Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {plants.length} plant{plants.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                >
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={viewMode === 'table'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                >
                  <List className="h-4 w-4 mr-2" />
                  Table
                </Button>
              </div>
            </div>

            {/* Plants Grid View */}
            {viewMode === 'grid' && plants.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.isArray(plants) && plants.map((plant: Plant) => (
                  <PlantCard
                    key={plant.id}
                    plant={plant}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAssignManager={handleAssignManager}
                    onCreateLine={handleCreateLine}
                    onCreateMachine={handleCreateMachine}
                  />
                ))}
              </div>
            )}

            {/* Plants Table View */}
            {viewMode === 'table' && plants.length > 0 && (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 bg-gray-50">
                        <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Code</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Location</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Manager</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Lines</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Machines</TableHead>
                        <TableHead className="text-right text-gray-700 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(plants) && plants.map((plant: Plant) => (
                        <TableRow key={plant.id} className="border-gray-200 hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">{plant.name}</TableCell>
                          <TableCell className="text-gray-600">{plant.code}</TableCell>
                          <TableCell className="text-gray-600">{plant.location?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(plant.status)}>
                              {plant.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">{plant.managerId ? userResolver.getUserName(plant.managerId) : '-'}</TableCell>
                          <TableCell className="text-gray-600">{plant.productionLinesCount}</TableCell>
                          <TableCell className="text-gray-600">{plant.machinesCount}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/dashboard/factory/plants/${plant.id}`)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <PermissionGuard requiredPermission="plants.update">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(plant)}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </PermissionGuard>
                              <PermissionGuard requiredPermission="plants.delete">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(plant)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </PermissionGuard>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* Empty State */}
            {plants.length === 0 && (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="py-12 text-center">
                  <Factory className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 font-medium">No plants found</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {search || locationFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first plant to get started'}
                  </p>
                  {!search && locationFilter === 'all' && statusFilter === 'all' && (
                    <PermissionGuard requiredPermission="plants.create">
                      <Button
                        onClick={() => router.push('/dashboard/factory/plants/create')}
                        className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Plant
                      </Button>
                    </PermissionGuard>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreatePlantModal
        isOpen={isCreateOpen || isEditOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setIsEditOpen(false)
          setEditingPlant(null)
        }}
        plant={editingPlant}
        locations={locations}
        users={users}
      />
      <DeletePlantModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setPlantToDelete(null)
        }}
        plant={plantToDelete}
      />
      <AssignManagerModal
        isOpen={isAssignManagerOpen}
        onClose={() => {
          setIsAssignManagerOpen(false)
          setPlantForManager(null)
        }}
        plant={plantForManager}
        users={users}
      />
      {plantForLine && (
        <CreateProductionLineModal
          isOpen={isCreateLineOpen}
          onClose={() => {
            setIsCreateLineOpen(false)
            setPlantForLine(null)
          }}
          plantId={plantForLine.id}
        />
      )}
      {plantForMachine && (
        <CreateMachineModal
          isOpen={isCreateMachineOpen}
          onClose={() => {
            setIsCreateMachineOpen(false)
            setPlantForMachine(null)
          }}
          plantId={plantForMachine.id}
        />
      )}
    </ProtectedRoute>
  )
}

