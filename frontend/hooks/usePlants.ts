import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { isDummyDataEnabled } from '@/lib/dummy-data'
import {
  getDummyPlants,
  getDummyPlantById,
  getDummyProductionLines,
  getDummyProductionLineById,
  getDummyMachines,
  getDummyMachineById,
  updateDummyPlant,
  createDummyPlant,
  deleteDummyPlant,
  createDummyProductionLine,
  updateDummyProductionLine,
  deleteDummyProductionLine,
  createDummyMachine,
  updateDummyMachine,
  deleteDummyMachine,
  getDummyPlantsStore,
  getDummyProductionLinesStore,
  getDummyMachinesStore,
  type Plant,
  type ProductionLine,
  type Machine,
  type PlantStatus,
  type ProductionLineStatus,
  type MachineStatus,
} from '@/data/dummy/factory/plants'

const getUseDummyData = () => isDummyDataEnabled()

export type { Plant, ProductionLine, Machine, PlantStatus, ProductionLineStatus, MachineStatus }

export interface PlantFilters {
  page?: number
  limit?: number
  search?: string
  locationId?: string
  managerId?: string
  status?: PlantStatus
}

export interface CreatePlantDto {
  name: string
  code: string
  locationId: string
  plantType: 'MANUFACTURING' | 'ASSEMBLY' | 'PACKAGING' | 'WAREHOUSE' | 'QUALITY_CONTROL' | 'RESEARCH_DEVELOPMENT' | 'ADMINISTRATION' | 'MIXED'
  capacity: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE'
  address: string
  managerId?: string
  description?: string
  contactPhone?: string
  contactEmail?: string
  contactPerson?: string
  operatingHours?: string
  notes?: string
  status?: PlantStatus
  totalArea?: number
  productionCapacity?: number
  certifications?: string[]
  departments?: string[]
}

export interface UpdatePlantDto extends Partial<CreatePlantDto> { }

export interface ProductionLineFilters {
  page?: number
  limit?: number
  search?: string
  plantId?: string
  status?: ProductionLineStatus
}

export interface MachineFilters {
  page?: number
  limit?: number
  search?: string
  plantId?: string
  productionLineId?: string
  status?: MachineStatus
  type?: string
}

export interface CreateProductionLineDto {
  plantId: string
  name: string
  code: string
  lineType: 'ASSEMBLY' | 'PACKAGING' | 'MANUFACTURING' | 'QUALITY_CONTROL' | 'TESTING' | 'MIXED'
  capacity: number
  status?: ProductionLineStatus
  description?: string
  supervisorId?: string
  location?: string
  operatingHours?: string
  notes?: string
  departments?: string[]
  certifications?: string[]
  equipment?: string[]
}

export interface UpdateProductionLineDto extends Partial<CreateProductionLineDto> { }

export interface CreateMachineDto {
  plantId: string
  productionLineId?: string
  name: string
  code: string
  machineType: 'PRODUCTION' | 'ASSEMBLY' | 'PACKAGING' | 'TESTING' | 'QUALITY_CONTROL' | 'MATERIAL_HANDLING' | 'UTILITY' | 'CONVEYOR' | 'CNC' | 'ROBOTIC' | 'OTHER'
  manufacturer?: string
  model?: string
  serialNumber?: string
  status?: MachineStatus
  supervisorId?: string
  location?: string
  operatingHours?: string
  capacity?: number
  efficiency?: number
  description?: string
  notes?: string
  departments?: string[]
  certifications?: string[]
  components?: string[]
  purchaseDate?: string
  installationDate?: string
  warrantyExpiryDate?: string
  lastMaintenanceDate?: string
  nextMaintenanceDate?: string
  maintenanceInterval?: number
}

export interface UpdateMachineDto extends Partial<CreateMachineDto> { }

// Get all plants
export function usePlants(filters?: PlantFilters) {
  return useQuery({
    queryKey: ['plants', filters],
    queryFn: async () => {

      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 300))
        return getDummyPlants(filters)
      }

      const params = new URLSearchParams()
      if (filters?.locationId) params.append('locationId', filters.locationId)
      if (filters?.managerId) params.append('managerId', filters.managerId)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.page) params.append('page', String(filters.page))
      if (filters?.limit) params.append('limit', String(filters.limit))


      const { data: response } = await apiClient.get(`/plants?${params.toString()}`)
      const rawData = response?.data || response

      let plantsArray: Plant[] = []
      if (Array.isArray(rawData)) {
        plantsArray = rawData
      } else if (rawData && typeof rawData === 'object' && 'data' in rawData && Array.isArray(rawData.data)) {
        plantsArray = rawData.data
      } else if (rawData && typeof rawData === 'object' && 'plants' in rawData && Array.isArray(rawData.plants)) {
        plantsArray = rawData.plants
      }

      const meta = (rawData && typeof rawData === 'object' && 'meta' in rawData) ? rawData.meta : {
        total: (rawData && typeof rawData === 'object' && 'total' in rawData && typeof rawData.total === 'number') ? rawData.total : plantsArray.length,
        page: filters?.page || 1,
        limit: filters?.limit || 10,
        totalPages: Math.ceil(((rawData as Record<string, any>)?.total || plantsArray.length) / (filters?.limit || 10))
      }

      return { data: plantsArray, meta }
    },
  })
}

// Get plant by ID
export function usePlant(id: string) {
  return useQuery({
    queryKey: ['plants', id],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200))
        const plant = getDummyPlantById(id)
        if (!plant) throw new Error('Plant not found')
        return plant
      }

      const response = await apiClient.get(`/plants/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

// Get production lines
export function useProductionLines(filters?: ProductionLineFilters) {
  return useQuery({
    queryKey: ['production-lines', filters],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 300))
        return getDummyProductionLines(filters)
      }

      const params = new URLSearchParams()
      if (filters?.plantId) params.append('plantId', filters.plantId)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.page) params.append('page', String(filters.page))
      if (filters?.limit) params.append('limit', String(filters.limit))

      const { data: response } = await apiClient.get(`/production-lines?${params.toString()}`)
      const rawData = response?.data || response

      let productionLinesArray: ProductionLine[] = []
      if (Array.isArray(rawData)) {
        productionLinesArray = rawData
      } else if (rawData && typeof rawData === 'object' && 'productionLines' in rawData && Array.isArray(rawData.productionLines)) {
        productionLinesArray = rawData.productionLines
      } else if (rawData && typeof rawData === 'object' && 'data' in rawData && Array.isArray(rawData.data)) {
        productionLinesArray = rawData.data
      }

      return { data: productionLinesArray }
    },
  })
}

// Get production line by ID
export function useProductionLine(id: string) {
  return useQuery({
    queryKey: ['production-lines', id],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200))
        const line = getDummyProductionLineById(id)
        if (!line) throw new Error('Production line not found')
        return line
      }

      const response = await apiClient.get(`/production-lines/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

// Get machines
export function useMachines(filters?: MachineFilters) {
  return useQuery({
    queryKey: ['machines', filters],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 300))
        return getDummyMachines(filters)
      }

      const params = new URLSearchParams()
      if (filters?.plantId) params.append('plantId', filters.plantId)
      if (filters?.productionLineId) params.append('productionLineId', filters.productionLineId)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.page) params.append('page', String(filters.page))
      if (filters?.limit) params.append('limit', String(filters.limit))

      const response = await apiClient.get(`/machines?${params.toString()}`)
      return response.data
    },
  })
}

// Get machine by ID
export function useMachine(id: string) {
  return useQuery({
    queryKey: ['machines', id],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200))
        const machine = getDummyMachineById(id)
        if (!machine) throw new Error('Machine not found')
        return machine
      }

      const response = await apiClient.get(`/machines/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

// Create plant
export function useCreatePlant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePlantDto) => {

      if (getUseDummyData()) {

        await new Promise(resolve => setTimeout(resolve, 500))
        const newPlant = createDummyPlant({
          ...data,
          status: data.status || 'ACTIVE',
          productionLinesCount: 0,
          machinesCount: 0,
          activeWorkOrdersCount: 0,
        })

        // Update store reference
        queryClient.setQueryData(['plants'], (old: any) => {
          if (!old) return { data: [newPlant], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }
          return {
            ...old,
            data: [...old.data, newPlant],
            meta: { ...old.meta, total: old.meta.total + 1 },
          }
        })

        return newPlant
      }


      // Step 1: Build payload with REQUIRED fields ONLY
      const payload: any = {
        name: String(data.name).trim(),
        code: String(data.code).trim(),
        locationId: String(data.locationId),
        plantType: String(data.plantType).toUpperCase(),
        capacity: String(data.capacity).toUpperCase(),
        address: String(data.address).trim(),
      }


      // Validate locationId is a valid UUID
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.locationId)) {
        throw new Error('Invalid locationId UUID')
      }

      // Validate capacity is a valid enum value
      const validCapacities = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']
      if (!validCapacities.includes(payload.capacity)) {
        throw new Error(`Invalid capacity value. Must be one of: ${validCapacities.join(', ')}`)
      }

      // Step 2: Add OPTIONAL fields ONLY if valid (key must be ABSENT if invalid)
      const addString = (key: string, value: unknown) => {
        if (typeof value === 'string' && value.trim() !== '') {
          payload[key] = value.trim()
        }
      }

      addString('description', data.description)
      addString('contactPhone', data.contactPhone)
      addString('contactEmail', data.contactEmail)
      addString('contactPerson', data.contactPerson)
      addString('operatingHours', data.operatingHours)
      addString('notes', data.notes)


      // Handle managerId (must be valid UUID if provided)
      if (data.managerId && data.managerId !== 'none' && typeof data.managerId === 'string' && data.managerId.trim() !== '') {
        const managerId = data.managerId.trim()
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(managerId)) {
          payload.managerId = managerId
        }
      }

      // Step 3: Add NUMBER fields SAFELY
      const addNumber = (key: string, value: unknown) => {
        const num = typeof value === 'string' ? Number(value) : value
        if (typeof num === 'number' && !isNaN(num) && num >= 0) {
          payload[key] = num
        }
      }

      addNumber('totalArea', data.totalArea)
      addNumber('productionCapacity', data.productionCapacity)

      // Add array fields ONLY if valid and non-empty
      if (data.certifications && Array.isArray(data.certifications) && data.certifications.length > 0) {
        const validCerts = data.certifications.filter(c => c && String(c).trim() !== '').map(c => String(c).trim())
        if (validCerts.length > 0) {
          payload.certifications = validCerts
        }
      }

      if (data.departments && Array.isArray(data.departments) && data.departments.length > 0) {
        const validDepts = data.departments.filter(d => d && String(d).trim() !== '').map(d => String(d).trim())
        if (validDepts.length > 0) {
          payload.departments = validDepts
        }
      }


      try {
        // Type assertion to CreatePlantDto for API call
        const { data: response } = await apiClient.post('/plants', payload as CreatePlantDto)


        return response?.data || response
      } catch (error: any) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}

// Update plant
export function useUpdatePlant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePlantDto }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const updated = updateDummyPlant(id, data)
        if (!updated) throw new Error('Plant not found')

        // Update store reference
        queryClient.setQueryData(['plants'], (old: any) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map((p: Plant) => p.id === id ? updated : p),
          }
        })
        queryClient.setQueryData(['plants', id], updated)

        return updated
      }

      const response = await apiClient.patch(`/plants/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plants'] })
      queryClient.invalidateQueries({ queryKey: ['plants', variables.id] })
    },
  })
}

// Delete plant
export function useDeletePlant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const deleted = deleteDummyPlant(id)
        if (!deleted) throw new Error('Plant not found')

        // Update store reference
        queryClient.setQueryData(['plants'], (old: any) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.filter((p: Plant) => p.id !== id),
            meta: { ...old.meta, total: old.meta.total - 1 },
          }
        })

        return { success: true }
      }

      const response = await apiClient.delete(`/plants/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}

// Assign plant manager
export function useAssignPlantManager() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ plantId, managerId }: { plantId: string; managerId: string | null }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const updated = updateDummyPlant(plantId, { managerId: managerId || undefined })
        if (!updated) throw new Error('Plant not found')

        queryClient.setQueryData(['plants', plantId], updated)
        queryClient.invalidateQueries({ queryKey: ['plants'] })

        return updated
      }

      const response = await apiClient.patch(`/plants/${plantId}/manager`, { managerId })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plants', variables.plantId] })
      queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}

// Create production line
export function useCreateProductionLine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProductionLineDto) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const newLine = createDummyProductionLine({
          ...data,
          status: data.status || 'ACTIVE',
          capacity: data.capacity || 100,
          currentUtilization: 0,
          activeWorkOrdersCount: 0,
        })

        // Update store reference
        queryClient.setQueryData(['production-lines'], (old: any) => {
          if (!old) return { data: [newLine], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }
          return {
            ...old,
            data: [...old.data, newLine],
            meta: { ...old.meta, total: old.meta.total + 1 },
          }
        })

        return newLine
      }

      const { data: response } = await apiClient.post('/production-lines', data)
      // Backend ResponseInterceptor wraps: { success: true, data: {...}, message: "..." }
      // Extract the actual data from the wrapped response
      const extracted = response?.data || response
      return extracted
    },
    onSuccess: async (newLine) => {

      // Optimistically update the cache if we have the new line
      // useProductionLines returns { data: [...] } structure
      if (newLine?.id) {
        queryClient.setQueriesData({ queryKey: ['production-lines'] }, (oldData: any) => {
          if (!oldData) return oldData

          // useProductionLines returns { data: [...] }
          const dataArray = oldData?.data || []

          // Check if line already exists (avoid duplicates)
          if (Array.isArray(dataArray) && dataArray.some((l: any) => l.id === newLine.id)) {
            return oldData
          }

          // Add new line to the beginning of the array
          const updated = {
            ...oldData,
            data: [newLine, ...(Array.isArray(dataArray) ? dataArray : [])],
            meta: oldData.meta ? {
              ...oldData.meta,
              total: (oldData.meta.total || 0) + 1
            } : undefined
          }
          return updated
        })
      }

      // Invalidate and refetch all production line queries (with any filters)
      await queryClient.invalidateQueries({ queryKey: ['production-lines'] })
      // Explicitly refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: ['production-lines'] })
      await queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}

// Update production line
export function useUpdateProductionLine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductionLineDto }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const updated = updateDummyProductionLine(id, data)
        if (!updated) throw new Error('Production line not found')

        // Update store reference
        queryClient.setQueryData(['production-lines'], (old: any) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map((l: ProductionLine) => l.id === id ? updated : l),
          }
        })
        queryClient.setQueryData(['production-lines', id], updated)

        return updated
      }

      const { data: response } = await apiClient.patch(`/production-lines/${id}`, data)
      // Backend ResponseInterceptor wraps: { success: true, data: {...}, message: "..." }
      // Extract the actual data from the wrapped response
      return response?.data || response
    },
    onSuccess: async (_, variables) => {
      // Invalidate and refetch all production line queries
      await queryClient.invalidateQueries({ queryKey: ['production-lines'] })
      await queryClient.invalidateQueries({ queryKey: ['production-lines', variables.id] })
      // Explicitly refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: ['production-lines'] })
      await queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}

// Delete production line
export function useDeleteProductionLine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const deleted = deleteDummyProductionLine(id)
        if (!deleted) throw new Error('Production line not found')

        // Update store reference
        queryClient.setQueryData(['production-lines'], (old: any) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.filter((l: ProductionLine) => l.id !== id),
            meta: { ...old.meta, total: old.meta.total - 1 },
          }
        })

        return { success: true }
      }

      const response = await apiClient.delete(`/production-lines/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-lines'] })
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}

// Create machine
export function useCreateMachine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMachineDto) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const newMachine = createDummyMachine({
          ...data,
          type: data.machineType, // Map machineType to type for dummy data
          status: data.status || 'OPERATIONAL',
        })

        // Update store reference
        queryClient.setQueryData(['machines'], (old: any) => {
          if (!old) return { data: [newMachine], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }
          return {
            ...old,
            data: [...old.data, newMachine],
            meta: { ...old.meta, total: old.meta.total + 1 },
          }
        })

        return newMachine
      }

      const { data: response } = await apiClient.post('/machines', data)
      return response.data?.data || response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}

// Update machine
export function useUpdateMachine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMachineDto }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const updated = updateDummyMachine(id, data)
        if (!updated) throw new Error('Machine not found')

        // Update store reference
        queryClient.setQueryData(['machines'], (old: any) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map((m: Machine) => m.id === id ? updated : m),
          }
        })
        queryClient.setQueryData(['machines', id], updated)

        return updated
      }

      const response = await apiClient.patch(`/machines/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['machines', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}

// Delete machine
export function useDeleteMachine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const deleted = deleteDummyMachine(id)
        if (!deleted) throw new Error('Machine not found')

        // Update store reference
        queryClient.setQueryData(['machines'], (old: any) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.filter((m: Machine) => m.id !== id),
            meta: { ...old.meta, total: old.meta.total - 1 },
          }
        })

        return { success: true }
      }

      const response = await apiClient.delete(`/machines/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}

// Export store for mutations
export function getDummyDataStore() {
  return {
    plants: getDummyPlantsStore(),
    productionLines: getDummyProductionLinesStore(),
    machines: getDummyMachinesStore(),
  }
}

