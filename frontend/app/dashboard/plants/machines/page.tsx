'use client'

import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useMachines, usePlants, type MachineFilters, type Plant, type Machine } from '@/hooks/usePlants'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Search, RefreshCw, X, Loader2, Settings, Factory, Calendar } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { format } from 'date-fns'

export default function MachinesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [plantFilter, setPlantFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  // Fetch plants for filter
  const { data: plantsResponse } = usePlants({ limit: 100 })
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

  // Build filters
  const filters: MachineFilters = {
    page: currentPage,
    limit: 20,
    search: debouncedSearch || undefined,
    plantId: plantFilter !== 'all' ? plantFilter : undefined,
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
  }

  // Fetch machines
  const { data: machinesResponse, isLoading } = useMachines(filters)
  const machines = useMemo(() => {
    if (!machinesResponse) return []
    // Deep probe for data array
    const rawData = (machinesResponse as any).data ?? machinesResponse
    if (!Array.isArray(rawData) && typeof rawData === 'object' && rawData !== null) {
      const arrayKey = Object.keys(rawData).find(key => Array.isArray((rawData as any)[key]))
      if (arrayKey) return (rawData as any)[arrayKey]
    }
    return Array.isArray(rawData) ? rawData : []
  }, [machinesResponse])

  const totalPages = useMemo(() => {
    if (!machinesResponse || Array.isArray(machinesResponse)) return 1
    return (machinesResponse as any).meta?.totalPages || 1
  }, [machinesResponse])

  // Get unique machine types for filter
  const machineTypes = useMemo(() => {
    if (!Array.isArray(machines)) return []
    // Extract types, filter out invalid values, and ensure uniqueness
    const types = machines
      .map((m: Machine) => m.type || (m as any).machineType)
      .filter((type): type is string => typeof type === 'string' && type.trim() !== '')
    return Array.from(new Set(types)) as string[]
  }, [machines])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['machines'] })
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const clearFilters = () => {
    setSearch('')
    setPlantFilter('all')
    setStatusFilter('all')
    setTypeFilter('all')
    setCurrentPage(1)
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      OPERATIONAL: 'bg-green-100 text-green-700 border-green-200',
      MAINTENANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      IDLE: 'bg-blue-100 text-blue-700 border-blue-200',
      BREAKDOWN: 'bg-red-100 text-red-700 border-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="plants.read">
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
    <ProtectedRoute requiredPermission="plants.read">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="h-8 w-8 text-green-600" />
                Machines
              </h1>
              <p className="text-gray-600 mt-1">
                Manage machines across all plants
              </p>
            </div>

            {/* Filters */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search machines..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                  <Select value={plantFilter} onValueChange={setPlantFilter}>
                    <SelectTrigger className="w-full lg:w-48 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                      <SelectValue placeholder="Plant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plants</SelectItem>
                      {Array.isArray(plants) && plants.map((plant: Plant) => (
                        <SelectItem key={plant.id} value={plant.id}>
                          {plant.name}
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
                      <SelectItem value="OPERATIONAL">Operational</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="IDLE">Idle</SelectItem>
                      <SelectItem value="BREAKDOWN">Breakdown</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full lg:w-48 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Array.isArray(machineTypes) && machineTypes
                        .filter((type: string) => type && type.trim() !== '')
                        .map((type: string) => (
                          <SelectItem key={`machine-type-${type}`} value={type}>
                            {type}
                          </SelectItem>
                        ))}
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
                    {(search || plantFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all') && (
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

            {/* Results */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">Machines</CardTitle>
                <CardDescription>
                  Showing {machines.length} machine{machines.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {machines.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 bg-gray-50">
                        <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Code</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Type</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Plant</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Production Line</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Next Maintenance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(machines) && machines.map((machine: Machine) => (
                        <TableRow
                          key={machine.id}
                          className="border-gray-200 hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/dashboard/factory/plants/${machine.plantId}`)}
                        >
                          <TableCell className="font-medium text-gray-900">{machine.name}</TableCell>
                          <TableCell className="text-gray-600">{machine.code}</TableCell>
                          <TableCell className="text-gray-600">{machine.type}</TableCell>
                          <TableCell className="text-gray-600">
                            <div className="flex items-center gap-2">
                              <Factory className="h-4 w-4 text-gray-400" />
                              {machine.plant?.name || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {machine.productionLine?.name || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(machine.status)}>
                              {machine.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {machine.nextMaintenanceDate ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {format(new Date(machine.nextMaintenanceDate), 'PP')}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 font-medium">No machines found</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {search || plantFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Machines will appear here once created'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

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
    </ProtectedRoute>
  )
}

