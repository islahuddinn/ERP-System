// Dummy data generator for plants
// This file provides realistic dummy data for testing and development

import { dummyLocations, dummyUsers } from './warehouses'

export type PlantStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

export interface Plant {
  id: string
  name: string
  code: string
  locationId: string
  location?: {
    id: string
    name: string
    address: string
  }
  managerId?: string
  manager?: {
    id: string
    name: string
    email: string
  }
  status: PlantStatus
  description?: string
  // Additional properties from CreatePlantDto
  plantType?: string
  capacity?: string
  address?: string
  contactPhone?: string
  contactEmail?: string
  contactPerson?: string
  operatingHours?: string
  totalArea?: number
  productionCapacity?: number
  // Counts
  productionLinesCount: number
  machinesCount: number
  activeWorkOrdersCount: number
  lastActivity?: string
  createdAt: string
  updatedAt: string
}

export type ProductionLineStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'IDLE'

export interface ProductionLine {
  id: string
  plantId: string
  plant?: {
    id: string
    name: string
    code: string
  }
  name: string
  code: string
  status: ProductionLineStatus
  capacity: number // units per hour
  currentUtilization: number // percentage
  activeWorkOrdersCount: number
  description?: string
  createdAt: string
  updatedAt: string
}

export type MachineStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'IDLE' | 'BREAKDOWN'

export interface Machine {
  id: string
  plantId: string
  productionLineId?: string
  plant?: {
    id: string
    name: string
    code: string
  }
  productionLine?: {
    id: string
    name: string
    code: string
  }
  name: string
  code: string
  type: string // e.g., 'CNC', 'Assembly', 'Packaging', 'Quality Control'
  manufacturer?: string
  model?: string
  serialNumber?: string
  status: MachineStatus
  lastMaintenanceDate?: string
  nextMaintenanceDate?: string
  maintenanceInterval?: number // days
  description?: string
  createdAt: string
  updatedAt: string
}

// Generate dummy plants
export function generateDummyPlants(count: number = 5): Plant[] {
  const plants: Plant[] = []
  const statuses: PlantStatus[] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE', 'MAINTENANCE']

  for (let i = 1; i <= count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const location = dummyLocations[Math.floor(Math.random() * dummyLocations.length)]
    const manager = Math.random() > 0.2 ? dummyUsers[Math.floor(Math.random() * dummyUsers.length)] : undefined

    const plantCode = `PLANT-${String(i).padStart(3, '0')}`
    const plantName = `Plant ${i}${i === 1 ? ' (Main)' : i === 2 ? ' (North)' : i === 3 ? ' (South)' : i === 4 ? ' (East)' : ' (West)'}`

    const productionLinesCount = Math.floor(Math.random() * 3) + 3 // 3-5 lines
    const machinesCount = Math.floor(Math.random() * 5) + 5 // 5-10 machines
    const activeWorkOrdersCount = Math.floor(Math.random() * 8) // 0-7 work orders

    const createdAt = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    const lastActivity = Math.random() > 0.3
      ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      : undefined

    const plant: Plant = {
      id: `plant-${i}`,
      name: plantName,
      code: plantCode,
      locationId: location.id,
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
      },
      managerId: manager?.id,
      manager: manager ? {
        id: manager.id,
        name: manager.name,
        email: manager.email,
      } : undefined,
      status,
      description: Math.random() > 0.5 ? `Production facility for ${plantName.toLowerCase()}` : undefined,
      productionLinesCount,
      machinesCount,
      activeWorkOrdersCount,
      lastActivity,
      createdAt,
      updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    plants.push(plant)
  }

  return plants
}

// Generate dummy production lines
export function generateDummyProductionLines(plantIds: string[]): ProductionLine[] {
  const lines: ProductionLine[] = []
  const statuses: ProductionLineStatus[] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'IDLE']
  const lineTypes = ['Assembly', 'Packaging', 'Quality Control', 'Finishing', 'Testing']

  let lineIndex = 1

  // Initialize plants first if not already done
  if (dummyPlants.length === 0) {
    dummyPlants.push(...generateDummyPlants(5))
  }

  for (const plantId of plantIds) {
    const plant = dummyPlants.find(p => p.id === plantId)
    const linesCount = plant?.productionLinesCount || 4

    for (let i = 0; i < linesCount; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const lineType = lineTypes[Math.floor(Math.random() * lineTypes.length)]
      const lineCode = `LINE-${String(lineIndex).padStart(3, '0')}`
      const lineName = `${lineType} Line ${i + 1}`

      const capacity = Math.floor(Math.random() * 500) + 100 // 100-600 units/hour
      const currentUtilization = Math.floor(Math.random() * 100) // 0-100%
      const activeWorkOrdersCount = Math.floor(Math.random() * 5) // 0-4 work orders

      const line: ProductionLine = {
        id: `line-${lineIndex}`,
        plantId,
        plant: plant ? {
          id: plant.id,
          name: plant.name,
          code: plant.code,
        } : undefined,
        name: lineName,
        code: lineCode,
        status,
        capacity,
        currentUtilization,
        activeWorkOrdersCount,
        description: Math.random() > 0.6 ? `${lineType} production line` : undefined,
        createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      }

      lines.push(line)
      lineIndex++
    }
  }

  return lines
}

// Generate dummy machines
export function generateDummyMachines(plantIds: string[], productionLineIds: string[]): Machine[] {
  const machines: Machine[] = []
  const statuses: MachineStatus[] = ['OPERATIONAL', 'OPERATIONAL', 'OPERATIONAL', 'MAINTENANCE', 'IDLE', 'BREAKDOWN']
  const machineTypes = ['CNC Machine', 'Assembly Robot', 'Packaging Machine', 'Quality Control System', 'Conveyor Belt', 'Welding Station', 'Cutting Machine', 'Testing Equipment']
  const manufacturers = ['TechCorp', 'Industrial Systems', 'AutoManufacture', 'Precision Tools', 'SmartFactory']

  let machineIndex = 1

  // Initialize plants and lines first if not already done
  if (dummyPlants.length === 0) {
    dummyPlants.push(...generateDummyPlants(5))
  }
  if (dummyProductionLines.length === 0) {
    dummyProductionLines.push(...generateDummyProductionLines(plantIds))
  }

  for (const plantId of plantIds) {
    const plant = dummyPlants.find(p => p.id === plantId)
    const machinesCount = plant?.machinesCount || 7

    // Get production lines for this plant
    const plantLines = productionLineIds.filter((lineId) => {
      const line = dummyProductionLines.find(l => l.id === lineId)
      return line?.plantId === plantId
    })

    for (let i = 0; i < machinesCount; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const machineType = machineTypes[Math.floor(Math.random() * machineTypes.length)]
      const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)]
      const machineCode = `MACH-${String(machineIndex).padStart(4, '0')}`
      const machineName = `${machineType} ${i + 1}`

      // Assign to a production line 70% of the time
      const productionLineId = Math.random() > 0.3 && plantLines.length > 0
        ? plantLines[Math.floor(Math.random() * plantLines.length)]
        : undefined

      const productionLine = productionLineId
        ? dummyProductionLines.find(l => l.id === productionLineId)
        : undefined

      const lastMaintenanceDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
      const maintenanceInterval = Math.floor(Math.random() * 30) + 30 // 30-60 days
      const nextMaintenanceDate = new Date(
        new Date(lastMaintenanceDate).getTime() + maintenanceInterval * 24 * 60 * 60 * 1000
      ).toISOString()

      const machine: Machine = {
        id: `machine-${machineIndex}`,
        plantId,
        productionLineId,
        plant: plant ? {
          id: plant.id,
          name: plant.name,
          code: plant.code,
        } : undefined,
        productionLine: productionLine ? {
          id: productionLine.id,
          name: productionLine.name,
          code: productionLine.code,
        } : undefined,
        name: machineName,
        code: machineCode,
        type: machineType,
        manufacturer,
        model: `${manufacturer} Model ${Math.floor(Math.random() * 100) + 100}`,
        serialNumber: `SN-${Math.floor(Math.random() * 999999) + 100000}`,
        status,
        lastMaintenanceDate,
        nextMaintenanceDate,
        maintenanceInterval,
        description: Math.random() > 0.7 ? `${machineType} for production operations` : undefined,
        createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      }

      machines.push(machine)
      machineIndex++
    }
  }

  return machines
}

// Initialize dummy data
export const dummyPlants = generateDummyPlants(5)
export const dummyProductionLines = generateDummyProductionLines(dummyPlants.map(p => p.id))
export const dummyMachines = generateDummyMachines(
  dummyPlants.map(p => p.id),
  dummyProductionLines.map(l => l.id)
)

// In-memory storage for mutations (lazy initialization)
let plantsStore: Plant[] | null = null
let productionLinesStore: ProductionLine[] | null = null
let machinesStore: Machine[] | null = null

// Initialize stores
function initializeStores() {
  if (!plantsStore) {
    plantsStore = [...dummyPlants]
  }
  if (!productionLinesStore) {
    productionLinesStore = [...dummyProductionLines]
  }
  if (!machinesStore) {
    machinesStore = [...dummyMachines]
  }
}

// Get all plants with filters
export function getDummyPlants(filters?: {
  locationId?: string
  managerId?: string
  status?: PlantStatus
  search?: string
  page?: number
  limit?: number
}): { data: Plant[]; meta: { total: number; page: number; limit: number; totalPages: number } } {
  initializeStores()
  let plants = [...(plantsStore || [])]

  // Apply filters
  if (filters?.locationId) {
    plants = plants.filter(p => p.locationId === filters.locationId)
  }

  if (filters?.managerId) {
    plants = plants.filter(p => p.managerId === filters.managerId)
  }

  if (filters?.status) {
    plants = plants.filter(p => p.status === filters.status)
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    plants = plants.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.code.toLowerCase().includes(searchLower) ||
      p.location?.name.toLowerCase().includes(searchLower)
    )
  }

  // Pagination
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const total = plants.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedPlants = plants.slice(startIndex, endIndex)

  return {
    data: paginatedPlants,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  }
}

// Get plant by ID
export function getDummyPlantById(id: string): Plant | undefined {
  initializeStores()
  return (plantsStore || []).find(p => p.id === id)
}

// Get production lines with filters
export function getDummyProductionLines(filters?: {
  plantId?: string
  status?: ProductionLineStatus
  search?: string
  page?: number
  limit?: number
}): { data: ProductionLine[]; meta: { total: number; page: number; limit: number; totalPages: number } } {
  initializeStores()
  let lines = [...(productionLinesStore || [])]

  // Apply filters
  if (filters?.plantId) {
    lines = lines.filter(l => l.plantId === filters.plantId)
  }

  if (filters?.status) {
    lines = lines.filter(l => l.status === filters.status)
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    lines = lines.filter(l =>
      l.name.toLowerCase().includes(searchLower) ||
      l.code.toLowerCase().includes(searchLower) ||
      l.plant?.name.toLowerCase().includes(searchLower)
    )
  }

  // Pagination
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const total = lines.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedLines = lines.slice(startIndex, endIndex)

  return {
    data: paginatedLines,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  }
}

// Get production line by ID
export function getDummyProductionLineById(id: string): ProductionLine | undefined {
  initializeStores()
  return (productionLinesStore || []).find(l => l.id === id)
}

// Get machines with filters
export function getDummyMachines(filters?: {
  plantId?: string
  productionLineId?: string
  status?: MachineStatus
  type?: string
  search?: string
  page?: number
  limit?: number
}): { data: Machine[]; meta: { total: number; page: number; limit: number; totalPages: number } } {
  initializeStores()
  let machines = [...(machinesStore || [])]

  // Apply filters
  if (filters?.plantId) {
    machines = machines.filter(m => m.plantId === filters.plantId)
  }

  if (filters?.productionLineId) {
    machines = machines.filter(m => m.productionLineId === filters.productionLineId)
  }

  if (filters?.status) {
    machines = machines.filter(m => m.status === filters.status)
  }

  if (filters?.type) {
    machines = machines.filter(m => m.type === filters.type)
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    machines = machines.filter(m =>
      m.name.toLowerCase().includes(searchLower) ||
      m.code.toLowerCase().includes(searchLower) ||
      m.type.toLowerCase().includes(searchLower) ||
      m.manufacturer?.toLowerCase().includes(searchLower) ||
      m.model?.toLowerCase().includes(searchLower)
    )
  }

  // Pagination
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const total = machines.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedMachines = machines.slice(startIndex, endIndex)

  return {
    data: paginatedMachines,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  }
}

// Get machine by ID
export function getDummyMachineById(id: string): Machine | undefined {
  initializeStores()
  return (machinesStore || []).find(m => m.id === id)
}

// Update plant
export function updateDummyPlant(id: string, updates: Partial<Plant>): Plant | null {
  initializeStores()
  const index = (plantsStore || []).findIndex(p => p.id === id)
  if (index === -1) return null

  const updated = {
    ...(plantsStore || [])[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  if (plantsStore) {
    plantsStore[index] = updated
  }
  return updated
}

// Create plant
export function createDummyPlant(plant: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>): Plant {
  initializeStores()
  const newPlant: Plant = {
    ...plant,
    id: `plant-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (plantsStore) {
    plantsStore.push(newPlant)
  }
  return newPlant
}

// Delete plant
export function deleteDummyPlant(id: string): boolean {
  initializeStores()
  const index = (plantsStore || []).findIndex(p => p.id === id)
  if (index === -1) return false

  if (plantsStore) {
    plantsStore.splice(index, 1)
  }
  return true
}

// Create production line
export function createDummyProductionLine(line: Omit<ProductionLine, 'id' | 'createdAt' | 'updatedAt'>): ProductionLine {
  initializeStores()
  const plant = getDummyPlantById(line.plantId)

  const newLine: ProductionLine = {
    ...line,
    id: `line-${Date.now()}`,
    plant: plant ? {
      id: plant.id,
      name: plant.name,
      code: plant.code,
    } : undefined,
    activeWorkOrdersCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (productionLinesStore) {
    productionLinesStore.push(newLine)
  }

  // Update plant counts
  if (plant) {
    updateDummyPlant(plant.id, {
      productionLinesCount: (plant.productionLinesCount || 0) + 1,
    })
  }

  return newLine
}

// Update production line
export function updateDummyProductionLine(id: string, updates: Partial<ProductionLine>): ProductionLine | null {
  initializeStores()
  const index = (productionLinesStore || []).findIndex(l => l.id === id)
  if (index === -1) return null

  const existing = (productionLinesStore || [])[index]
  const plant = updates.plantId ? getDummyPlantById(updates.plantId) : getDummyPlantById(existing.plantId)

  const updated: ProductionLine = {
    ...existing,
    ...updates,
    plant: plant ? {
      id: plant.id,
      name: plant.name,
      code: plant.code,
    } : existing.plant,
    updatedAt: new Date().toISOString(),
  }

  if (productionLinesStore) {
    productionLinesStore[index] = updated
  }
  return updated
}

// Delete production line
export function deleteDummyProductionLine(id: string): boolean {
  initializeStores()
  const index = (productionLinesStore || []).findIndex(l => l.id === id)
  if (index === -1) return false

  const line = (productionLinesStore || [])[index]
  const plant = getDummyPlantById(line.plantId)

  if (productionLinesStore) {
    productionLinesStore.splice(index, 1)
  }

  // Also delete machines associated with this line
  if (machinesStore) {
    const machinesToDelete = machinesStore.filter(m => m.productionLineId === id)
    machinesToDelete.forEach(m => {
      const machineIndex = machinesStore!.findIndex(machine => machine.id === m.id)
      if (machineIndex !== -1) {
        machinesStore!.splice(machineIndex, 1)
      }
    })

    // Update plant machine count
    if (plant) {
      updateDummyPlant(plant.id, {
        machinesCount: Math.max(0, (plant.machinesCount || 0) - machinesToDelete.length),
      })
    }
  }

  // Update plant counts
  if (plant) {
    updateDummyPlant(plant.id, {
      productionLinesCount: Math.max(0, (plant.productionLinesCount || 0) - 1),
    })
  }

  return true
}

// Create machine
export function createDummyMachine(machine: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>): Machine {
  initializeStores()
  const plant = getDummyPlantById(machine.plantId)
  const productionLine = machine.productionLineId
    ? getDummyProductionLineById(machine.productionLineId)
    : undefined

  const newMachine: Machine = {
    ...machine,
    id: `machine-${Date.now()}`,
    plant: plant ? {
      id: plant.id,
      name: plant.name,
      code: plant.code,
    } : undefined,
    productionLine: productionLine ? {
      id: productionLine.id,
      name: productionLine.name,
      code: productionLine.code,
    } : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (machinesStore) {
    machinesStore.push(newMachine)
  }

  // Update plant counts
  if (plant) {
    updateDummyPlant(plant.id, {
      machinesCount: (plant.machinesCount || 0) + 1,
    })
  }

  return newMachine
}

// Update machine
export function updateDummyMachine(id: string, updates: Partial<Machine>): Machine | null {
  initializeStores()
  const index = (machinesStore || []).findIndex(m => m.id === id)
  if (index === -1) return null

  const existing = (machinesStore || [])[index]
  const plant = updates.plantId ? getDummyPlantById(updates.plantId) : getDummyPlantById(existing.plantId)
  const productionLine = updates.productionLineId
    ? getDummyProductionLineById(updates.productionLineId)
    : existing.productionLineId
      ? getDummyProductionLineById(existing.productionLineId)
      : undefined

  const updated: Machine = {
    ...existing,
    ...updates,
    plant: plant ? {
      id: plant.id,
      name: plant.name,
      code: plant.code,
    } : existing.plant,
    productionLine: productionLine ? {
      id: productionLine.id,
      name: productionLine.name,
      code: productionLine.code,
    } : undefined,
    updatedAt: new Date().toISOString(),
  }

  if (machinesStore) {
    machinesStore[index] = updated
  }
  return updated
}

// Delete machine
export function deleteDummyMachine(id: string): boolean {
  initializeStores()
  const index = (machinesStore || []).findIndex(m => m.id === id)
  if (index === -1) return false

  const machine = (machinesStore || [])[index]
  const plant = getDummyPlantById(machine.plantId)

  if (machinesStore) {
    machinesStore.splice(index, 1)
  }

  // Update plant counts
  if (plant) {
    updateDummyPlant(plant.id, {
      machinesCount: Math.max(0, (plant.machinesCount || 0) - 1),
    })
  }

  return true
}

// Export stores for mutations
export function getDummyPlantsStore(): Plant[] {
  initializeStores()
  return plantsStore || []
}

export function getDummyProductionLinesStore(): ProductionLine[] {
  initializeStores()
  return productionLinesStore || []
}

export function getDummyMachinesStore(): Machine[] {
  initializeStores()
  return machinesStore || []
}

