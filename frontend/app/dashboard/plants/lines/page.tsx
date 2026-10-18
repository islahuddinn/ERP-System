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
import { useProductionLines, usePlants, type ProductionLineFilters, type Plant, type ProductionLine } from '@/hooks/usePlants'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Search, RefreshCw, X, Loader2, TrendingUp, Factory } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

export default function ProductionLinesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [plantFilter, setPlantFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
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
  const filters: ProductionLineFilters = {
    page: currentPage,
    limit: 20,
    search: debouncedSearch || undefined,
    plantId: plantFilter !== 'all' ? plantFilter : undefined,
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
  }

  // Fetch production lines
  const { data: linesResponse, isLoading } = useProductionLines(filters)
  const lines = useMemo(() => {
    if (!linesResponse) return []
    // useProductionLines returns { data: [...] }
    const linesArray = linesResponse?.data || []
    const result = Array.isArray(linesArray) ? linesArray : []
    return result
  }, [linesResponse, filters])

  const totalPages = useMemo(() => {
    if (!linesResponse || Array.isArray(linesResponse)) return 1
    return (linesResponse as any).meta?.totalPages || 1
  }, [linesResponse])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['production-lines'] })
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const clearFilters = () => {
    setSearch('')
    setPlantFilter('all')
    setStatusFilter('all')
    setCurrentPage(1)
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700 border-green-200',
      INACTIVE: 'bg-gray-100 text-gray-700 border-gray-200',
      MAINTENANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      IDLE: 'bg-blue-100 text-blue-700 border-blue-200',
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
                <TrendingUp className="h-8 w-8 text-green-600" />
                Production Lines
              </h1>
              <p className="text-gray-600 mt-1">
                Manage production lines across all plants
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
                        placeholder="Search production lines..."
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
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="IDLE">Idle</SelectItem>
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
                    {(search || plantFilter !== 'all' || statusFilter !== 'all') && (
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
                <CardTitle className="text-gray-900">Production Lines</CardTitle>
                <CardDescription>
                  Showing {lines.length} production line{lines.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lines.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 bg-gray-50">
                        <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Code</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Plant</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Capacity</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Utilization</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Active WO</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(lines) && lines.map((line: ProductionLine) => (
                        <TableRow
                          key={line.id}
                          className="border-gray-200 hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/dashboard/factory/plants/${line.plantId}`)}
                        >
                          <TableCell className="font-medium text-gray-900">{line.name}</TableCell>
                          <TableCell className="text-gray-600">{line.code}</TableCell>
                          <TableCell className="text-gray-600">
                            <div className="flex items-center gap-2">
                              <Factory className="h-4 w-4 text-gray-400" />
                              {line.plant?.name || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(line.status)}>
                              {line.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">{line.capacity} units/hr</TableCell>
                          <TableCell className="text-gray-600">{line.currentUtilization}%</TableCell>
                          <TableCell className="text-gray-600">{line.activeWorkOrdersCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 font-medium">No production lines found</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {search || plantFilter !== 'all' || statusFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Production lines will appear here once created'}
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

