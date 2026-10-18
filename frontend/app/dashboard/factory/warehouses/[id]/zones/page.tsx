'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import {
  useWarehouse,
  useWarehouseZones,
  type WarehouseZone,
} from '@/hooks/useWarehouses'
import { ArrowLeft, Plus, Package, Loader2, Grid3x3, List, Edit, Trash2 } from 'lucide-react'
import { CreateZoneModal, DeleteZoneModal, ZoneCard } from '@/components/factory/zones'

export default function WarehouseZonesPage() {
  const params = useParams()
  const router = useRouter()
  const warehouseId = params.id as string
  const queryClient = useQueryClient()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<WarehouseZone | null>(null)
  const [zoneToDelete, setZoneToDelete] = useState<WarehouseZone | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const { data: warehouse, isLoading: warehouseLoading } = useWarehouse(warehouseId)
  const { data: zones, isLoading: zonesLoading } = useWarehouseZones(warehouseId)

  const handleEdit = (zone: WarehouseZone) => {
    setEditingZone(zone)
    setIsEditOpen(true)
  }

  const handleDelete = (zone: WarehouseZone) => {
    setZoneToDelete(zone)
    setIsDeleteOpen(true)
  }

  const getZoneTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      RAW_MATERIALS: 'bg-green-50 text-green-700 border-green-200',
      PACKAGING: 'bg-purple-50 text-purple-700 border-purple-200',
      FINISHED_GOODS: 'bg-green-50 text-green-700 border-green-200',
      QUARANTINE: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      REJECTED: 'bg-red-50 text-red-700 border-red-200',
      TEMPORARY: 'bg-gray-50 text-gray-700 border-gray-200',
    }
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  const getCapacityPercentage = (zone: WarehouseZone) => {
    if (zone.totalCapacity === 0) return 0
    return Math.round((zone.usedCapacity / zone.totalCapacity) * 100)
  }

  if (warehouseLoading || zonesLoading) {
    return (
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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
                  <h1 className="factory-heading">Zones</h1>
                  <p className="factory-subheading">{warehouse?.name} • {zones?.length || 0} zone(s)</p>
                </div>
              </div>
              <PermissionGuard requiredPermission="warehouses.update">
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="factory-button-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Zone
                </Button>
              </PermissionGuard>
            </div>

            {/* View Toggle */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {zones?.length || 0} zone{(zones?.length || 0) !== 1 ? 's' : ''}
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

            {/* Zones Grid View */}
            {viewMode === 'grid' && (
              <>
                {zones && zones.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {zones.map((zone: any) => (
                      <ZoneCard
                        key={zone.id}
                        zone={zone}
                        warehouseName={warehouse?.name}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="factory-light-card">
                    <CardContent className="text-center py-16">
                      <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-900 font-semibold text-lg mb-2">No zones found</p>
                      <p className="text-sm text-gray-500 mb-6">Get started by adding your first zone</p>
                      <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Zone
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Zones Table View */}
            {viewMode === 'table' && (
              <Card className="factory-light-card">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="text-gray-700">Name</TableHead>
                      <TableHead className="text-gray-700">Code</TableHead>
                      <TableHead className="text-gray-700">Type</TableHead>
                      <TableHead className="text-gray-700">Capacity</TableHead>
                      <TableHead className="text-gray-700">Status</TableHead>
                      <TableHead className="text-right text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones && zones.length > 0 ? (
                      zones.map((zone: WarehouseZone) => {
                        const capacityPercentage = getCapacityPercentage(zone)
                        return (
                          <TableRow key={zone.id} className="border-gray-200 hover:bg-gray-50">
                            <TableCell className="font-medium text-gray-900">{zone.name}</TableCell>
                            <TableCell className="text-gray-600">{zone.code}</TableCell>
                            <TableCell>
                              <Badge className={getZoneTypeColor(zone.zoneType)}>
                                {zone.zoneType.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-[100px]">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-900 font-medium">{capacityPercentage}%</span>
                                    <span className="text-gray-500">
                                      {zone.usedCapacity.toFixed(1)} / {zone.totalCapacity.toFixed(1)}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${capacityPercentage >= 95 ? 'bg-red-500' :
                                          capacityPercentage >= 85 ? 'bg-orange-500' :
                                            capacityPercentage >= 70 ? 'bg-yellow-500' :
                                              'bg-green-500'
                                        }`}
                                      style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={zone.isActive
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : 'bg-gray-100 text-gray-700 border-gray-200'}
                              >
                                {zone.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                                  onClick={() => handleEdit(zone)}
                                  title="Edit Zone"
                                >
                                  <Edit className="h-4 w-4 text-gray-600" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 border-gray-300 hover:bg-red-50 hover:border-red-300"
                                  onClick={() => handleDelete(zone)}
                                  title="Delete Zone"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-900 font-medium">No zones found</p>
                          <p className="text-sm text-gray-500 mt-2">Get started by adding your first zone</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* Modals */}
            <CreateZoneModal
              isOpen={isCreateOpen}
              onClose={() => setIsCreateOpen(false)}
              warehouseId={warehouseId}
            />
            <CreateZoneModal
              isOpen={isEditOpen}
              onClose={() => {
                setIsEditOpen(false)
                setEditingZone(null)
              }}
              warehouseId={warehouseId}
              zone={editingZone}
            />
            <DeleteZoneModal
              isOpen={isDeleteOpen}
              onClose={() => {
                setIsDeleteOpen(false)
                setZoneToDelete(null)
              }}
              warehouseId={warehouseId}
              zone={zoneToDelete}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

