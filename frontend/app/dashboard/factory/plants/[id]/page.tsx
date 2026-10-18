'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import {
  usePlant,
  useProductionLines,
  useMachines,
  type Plant,
  type ProductionLine,
  type Machine,
} from '@/hooks/usePlants'
import { userResolver } from '@/lib/user-resolver'
import { ArrowLeft, Edit, Factory, Settings, Activity, TrendingUp, MapPin, User, Calendar, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import {
  DeletePlantModal,
  AssignManagerModal,
  CreatePlantModal,
  CreateProductionLineModal,
  DeleteProductionLineModal,
  CreateMachineModal,
  DeleteMachineModal,
} from '@/components/factory/plants'
import { dummyUsers, dummyLocations } from '@/data/dummy/factory/warehouses'
import { format } from 'date-fns'

export default function PlantDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const plantId = params.id as string

  const { data: plant, isLoading: plantLoading } = usePlant(plantId)
  const { data: productionLinesData } = useProductionLines({ plantId, limit: 100 })
  const { data: machinesData } = useMachines({ plantId, limit: 100 })

  const productionLines = useMemo(() => {
    if (!productionLinesData) return []
    const rawData = productionLinesData.data ?? productionLinesData
    return Array.isArray(rawData) ? rawData : []
  }, [productionLinesData])

  const machines = useMemo(() => {
    if (!machinesData) return []
    const rawData = machinesData.data ?? machinesData
    return Array.isArray(rawData) ? rawData : []
  }, [machinesData])

  // Modal states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isAssignManagerOpen, setIsAssignManagerOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null)
  const [plantForManager, setPlantForManager] = useState<Plant | null>(null)

  // Production Line modals
  const [isCreateLineOpen, setIsCreateLineOpen] = useState(false)
  const [isDeleteLineOpen, setIsDeleteLineOpen] = useState(false)
  const [lineToEdit, setLineToEdit] = useState<ProductionLine | null>(null)
  const [lineToDelete, setLineToDelete] = useState<ProductionLine | null>(null)

  // Machine modals
  const [isCreateMachineOpen, setIsCreateMachineOpen] = useState(false)
  const [isDeleteMachineOpen, setIsDeleteMachineOpen] = useState(false)
  const [machineToEdit, setMachineToEdit] = useState<Machine | null>(null)
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null)

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return <Badge className="bg-green-100 text-green-700 border-green-200">{status}</Badge>
    } else if (status === 'INACTIVE') {
      return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{status}</Badge>
    } else {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">{status}</Badge>
    }
  }

  const getLineStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700 border-green-200',
      INACTIVE: 'bg-gray-100 text-gray-700 border-gray-200',
      MAINTENANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      IDLE: 'bg-blue-100 text-blue-700 border-blue-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getMachineStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      OPERATIONAL: 'bg-green-100 text-green-700 border-green-200',
      MAINTENANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      IDLE: 'bg-blue-100 text-blue-700 border-blue-200',
      BREAKDOWN: 'bg-red-100 text-red-700 border-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  if (plantLoading) {
    return (
      <ProtectedRoute requiredPermission="plants.read">
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

  if (!plant) {
    return (
      <ProtectedRoute requiredPermission="plants.read">
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="text-center py-12">
              <Factory className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-900 font-medium">Plant not found</p>
              <Button
                onClick={() => router.push('/dashboard/plants')}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Plants
              </Button>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dashboard/plants')}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{plant.name}</h1>
                  <p className="text-gray-600 mt-1">{plant.code} • {plant.location?.name}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsEditOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-green-200 bg-white">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Production Lines</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{plant.productionLinesCount}</div>
                </CardContent>
              </Card>
              <Card className="border-purple-200 bg-white">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Machines</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{plant.machinesCount}</div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-white">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Active Work Orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{plant.activeWorkOrdersCount}</div>
                </CardContent>
              </Card>
              <Card className="border-gray-200 bg-white">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Status</CardDescription>
                </CardHeader>
                <CardContent>
                  {getStatusBadge(plant.status)}
                </CardContent>
              </Card>
            </div>

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
                  value="production-lines"
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
                >
                  Production Lines ({productionLines.length})
                </TabsTrigger>
                <TabsTrigger
                  value="machines"
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
                >
                  Machines ({machines.length})
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200"
                >
                  Settings
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="text-gray-900 font-medium">{plant.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Code</p>
                        <p className="text-gray-900 font-medium">{plant.code}</p>
                      </div>
                      {plant.description && (
                        <div>
                          <p className="text-sm text-gray-600">Description</p>
                          <p className="text-gray-900">{plant.description}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        {getStatusBadge(plant.status)}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Location & Manager */}
                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Location & Manager</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {plant.location && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <p className="text-sm text-gray-600">Location</p>
                          </div>
                          <p className="text-gray-900 font-medium">{plant.location.name}</p>
                          <p className="text-sm text-gray-600">{plant.location.address}</p>
                        </div>
                      )}
                      {plant.managerId ? (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-gray-500" />
                            <p className="text-sm text-gray-600">Manager</p>
                          </div>
                          <p className="text-gray-900 font-medium">{userResolver.getUserName(plant.managerId)}</p>
                          <p className="text-sm text-gray-600">{userResolver.getUserEmail(plant.managerId)}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600">No manager assigned</p>
                        </div>
                      )}
                      {plant.lastActivity && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="h-4 w-4 text-gray-500" />
                            <p className="text-sm text-gray-600">Last Activity</p>
                          </div>
                          <p className="text-gray-900">{format(new Date(plant.lastActivity), 'PPp')}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Production Lines Tab */}
              <TabsContent value="production-lines" className="space-y-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-gray-900">Production Lines</CardTitle>
                        <CardDescription>Manage production lines for this plant</CardDescription>
                      </div>
                      <PermissionGuard requiredPermission="plants.create">
                        <Button
                          onClick={() => {
                            setLineToEdit(null)
                            setIsCreateLineOpen(true)
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Production Line
                        </Button>
                      </PermissionGuard>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {productionLines.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 bg-gray-50">
                            <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Code</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Capacity</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Utilization</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Active WO</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productionLines.map((line: ProductionLine) => (
                            <TableRow key={line.id} className="border-gray-200 hover:bg-gray-50">
                              <TableCell className="font-medium text-gray-900">{line.name}</TableCell>
                              <TableCell className="text-gray-600">{line.code}</TableCell>
                              <TableCell>
                                <Badge className={getLineStatusBadge(line.status)}>
                                  {line.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-600">{line.capacity} units/hr</TableCell>
                              <TableCell className="text-gray-600">{line.currentUtilization}%</TableCell>
                              <TableCell className="text-gray-600">{line.activeWorkOrdersCount}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <PermissionGuard requiredPermission="plants.update">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setLineToEdit(line)
                                        setIsCreateLineOpen(true)
                                      }}
                                      className="text-gray-600 hover:text-gray-900"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </PermissionGuard>
                                  <PermissionGuard requiredPermission="plants.delete">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setLineToDelete(line)
                                        setIsDeleteLineOpen(true)
                                      }}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-600 mb-4">No production lines found</p>
                        <PermissionGuard requiredPermission="plants.create">
                          <Button
                            onClick={() => {
                              setLineToEdit(null)
                              setIsCreateLineOpen(true)
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Production Line
                          </Button>
                        </PermissionGuard>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Machines Tab */}
              <TabsContent value="machines" className="space-y-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-gray-900">Machines</CardTitle>
                        <CardDescription>Manage machines for this plant</CardDescription>
                      </div>
                      <PermissionGuard requiredPermission="plants.create">
                        <Button
                          onClick={() => {
                            setMachineToEdit(null)
                            setIsCreateMachineOpen(true)
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Machine
                        </Button>
                      </PermissionGuard>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {machines.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 bg-gray-50">
                            <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Code</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Type</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Production Line</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Next Maintenance</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {machines.map((machine: Machine) => (
                            <TableRow key={machine.id} className="border-gray-200 hover:bg-gray-50">
                              <TableCell className="font-medium text-gray-900">{machine.name}</TableCell>
                              <TableCell className="text-gray-600">{machine.code}</TableCell>
                              <TableCell className="text-gray-600">{machine.type}</TableCell>
                              <TableCell>
                                <Badge className={getMachineStatusBadge(machine.status)}>
                                  {machine.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-600">
                                {machine.productionLine?.name || '-'}
                              </TableCell>
                              <TableCell className="text-gray-600">
                                {machine.nextMaintenanceDate
                                  ? format(new Date(machine.nextMaintenanceDate), 'PP')
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <PermissionGuard requiredPermission="plants.update">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setMachineToEdit(machine)
                                        setIsCreateMachineOpen(true)
                                      }}
                                      className="text-gray-600 hover:text-gray-900"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </PermissionGuard>
                                  <PermissionGuard requiredPermission="plants.delete">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setMachineToDelete(machine)
                                        setIsDeleteMachineOpen(true)
                                      }}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-600 mb-4">No machines found</p>
                        <PermissionGuard requiredPermission="plants.create">
                          <Button
                            onClick={() => {
                              setMachineToEdit(null)
                              setIsCreateMachineOpen(true)
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Machine
                          </Button>
                        </PermissionGuard>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Plant Settings</CardTitle>
                    <CardDescription>Manage plant configuration and settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Edit Plant</p>
                        <p className="text-sm text-gray-600">Update plant information</p>
                      </div>
                      <Button
                        onClick={() => setIsEditOpen(true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Assign Manager</p>
                        <p className="text-sm text-gray-600">Assign or change plant manager</p>
                      </div>
                      <Button
                        onClick={() => {
                          setPlantForManager(plant)
                          setIsAssignManagerOpen(true)
                        }}
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <User className="mr-2 h-4 w-4" />
                        {plant.managerId ? 'Change Manager' : 'Assign Manager'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                      <div>
                        <p className="font-medium text-red-900">Delete Plant</p>
                        <p className="text-sm text-red-700">Permanently delete this plant</p>
                      </div>
                      <Button
                        onClick={() => {
                          setPlantToDelete(plant)
                          setIsDeleteOpen(true)
                        }}
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreatePlantModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false)
        }}
        plant={plant}
        locations={dummyLocations}
        users={dummyUsers}
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
        users={dummyUsers}
      />

      {/* Production Line Modals */}
      <CreateProductionLineModal
        isOpen={isCreateLineOpen}
        onClose={() => {
          setIsCreateLineOpen(false)
          setLineToEdit(null)
        }}
        line={lineToEdit}
        plantId={plantId}
      />
      <DeleteProductionLineModal
        isOpen={isDeleteLineOpen}
        onClose={() => {
          setIsDeleteLineOpen(false)
          setLineToDelete(null)
        }}
        line={lineToDelete}
        plantId={plantId}
      />

      {/* Machine Modals */}
      <CreateMachineModal
        isOpen={isCreateMachineOpen}
        onClose={() => {
          setIsCreateMachineOpen(false)
          setMachineToEdit(null)
        }}
        machine={machineToEdit}
        plantId={plantId}
      />
      <DeleteMachineModal
        isOpen={isDeleteMachineOpen}
        onClose={() => {
          setIsDeleteMachineOpen(false)
          setMachineToDelete(null)
        }}
        machine={machineToDelete}
        plantId={plantId}
      />
    </ProtectedRoute>
  )
}

