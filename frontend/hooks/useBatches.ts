// React Query hooks for batches
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { isDummyDataEnabled } from '@/lib/dummy-data'
import {
  getDummyBatches,
  getDummyBatchById,
  getDummyExpiringBatches,
  updateDummyBatch,
  createDummyBatch,
  getDummyBatchesStore,
  type Batch,
  type BatchStatus,
} from '@/data/dummy/factory/batches'

// Export Batch type for use in components
export type { Batch, BatchStatus }

const getUseDummyData = () => isDummyDataEnabled()

// In-memory storage for dummy data mutations (will be initialized on first use)
let dummyDataStore: Batch[] | null = null

export interface BatchFilters {
  productId?: string
  warehouseId?: string
  zoneId?: string
  status?: BatchStatus
  expiringDays?: number
  search?: string
  page?: number
  limit?: number
  sortBy?: 'expiryDate' | 'batchNumber' | 'product' | 'manufacturingDate'
  sortOrder?: 'asc' | 'desc'
}

// Get all batches
export function useBatches(filters?: BatchFilters) {
  return useQuery({
    queryKey: ['batches', filters],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 300))
        return getDummyBatches(filters)
      }

      const params = new URLSearchParams()
      if (filters?.productId) params.append('productId', filters.productId)
      if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId)
      if (filters?.zoneId) params.append('zoneId', filters.zoneId)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.expiringDays) params.append('expiringDays', String(filters.expiringDays))
      if (filters?.search) params.append('search', filters.search)
      if (filters?.page) params.append('page', String(filters.page))
      if (filters?.limit) params.append('limit', String(filters.limit))
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)

      const response = await apiClient.get(`/batches?${params.toString()}`)
      const responseData = response.data

      // Handle wrapped response: { success, message, data: { data: [...], meta: {...} } } or direct { data: [...], meta: {...} }
      if (
        responseData &&
        typeof responseData === 'object' &&
        'data' in responseData &&
        !Array.isArray(responseData.data) &&
        'data' in responseData.data &&
        Array.isArray(responseData.data.data)
      ) {
        // Triple-nested: { success: true, data: { data: [...], meta: {...} } }
        return responseData.data
      }

      // If already in correct format, return as is
      return responseData
    },
  })
}

// Get batch by ID
export function useBatch(id: string) {
  return useQuery({
    queryKey: ['batches', id],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200))
        const batch = getDummyBatchById(id)
        if (!batch) throw new Error('Batch not found')
        return batch
      }

      const response = await apiClient.get(`/batches/${id}`)
      const responseData = response.data

      // Handle wrapped response
      if (
        responseData &&
        typeof responseData === 'object' &&
        'data' in responseData &&
        !Array.isArray(responseData.data)
      ) {
        return responseData.data
      }

      return responseData
    },
    enabled: !!id,
  })
}

// Get expiring batches
export function useExpiringBatches(days: number = 30) {
  return useQuery({
    queryKey: ['batches', 'expiring', days],
    queryFn: async () => {
      if (getUseDummyData()) {
        // Add a small delay to ensure dependencies are ready
        await new Promise(resolve => setTimeout(resolve, 100))

        try {
          const batches = getDummyExpiringBatches(days)

          // If we got an empty array, wait a bit more and retry once
          if (batches.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 200))
            const retryBatches = getDummyExpiringBatches(days)
            return retryBatches
          }

          return batches
        } catch (error) {
          console.error('Error fetching expiring batches:', error)
          // Wait and retry once
          await new Promise(resolve => setTimeout(resolve, 200))
          return getDummyExpiringBatches(days)
        }
      }

      const response = await apiClient.get(`/batches/expiring?days=${days}`)
      const responseData = response.data

      // Handle wrapped response: { success, message, data: [...] } or direct array
      if (
        responseData &&
        typeof responseData === 'object' &&
        'data' in responseData &&
        Array.isArray(responseData.data)
      ) {
        return responseData.data
      }

      // If already an array, return as is
      if (Array.isArray(responseData)) {
        return responseData
      }

      return responseData
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })
}

// Update batch
export function useUpdateBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Batch> }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 300))
        const updated = updateDummyBatch(id, data)
        if (!updated) throw new Error('Batch not found')

        // Update store reference
        dummyDataStore = getDummyBatchesStore()
        return updated
      }

      const response = await apiClient.patch(`/batches/${id}`, data)
      const responseData = response.data

      // Handle wrapped response
      if (
        responseData &&
        typeof responseData === 'object' &&
        'data' in responseData &&
        !Array.isArray(responseData.data)
      ) {
        return responseData.data
      }

      return responseData
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      queryClient.invalidateQueries({ queryKey: ['batches', variables.id] })
    },
  })
}

// Create batch
export interface CreateBatchDto {
  batchNumber?: string
  productId: string
  warehouseId?: string
  zoneId?: string
  quantity: number
  manufacturingDate?: string
  expiryDate?: string
  receivedDate?: string
  status?: BatchStatus
  notes?: string
}

export function useCreateBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateBatchDto) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 300))
        // Convert DTO to Batch format for dummy data
        const batchData: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'> = {
          batchNumber: data.batchNumber || `BATCH-${Date.now()}`,
          productId: data.productId,
          warehouseId: data.warehouseId || '',
          zoneId: data.zoneId,
          totalQuantity: data.quantity,
          availableQuantity: data.quantity,
          consumedQuantity: 0,
          reservedQuantity: 0,
          manufacturingDate: data.manufacturingDate || new Date().toISOString(),
          expiryDate: data.expiryDate || new Date().toISOString(),
          receivedDate: data.receivedDate || new Date().toISOString(),
          status: data.status || 'ACTIVE',
          notes: data.notes,
        }
        const newBatch = createDummyBatch(batchData)

        // Update store reference
        dummyDataStore = getDummyBatchesStore()
        return newBatch
      }

      const response = await apiClient.post('/batches', data)
      const responseData = response.data

      // Handle wrapped response
      if (
        responseData &&
        typeof responseData === 'object' &&
        'data' in responseData &&
        !Array.isArray(responseData.data)
      ) {
        return responseData.data
      }

      return responseData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
    },
  })
}

// Get batches by product (for FIFO selection)
export function useBatchesByProduct(productId: string, warehouseId?: string, zoneId?: string) {
  return useQuery({
    queryKey: ['batches', 'product', productId, warehouseId, zoneId],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200))
        let batches = getDummyBatches({ productId, status: 'ACTIVE' }).data

        if (warehouseId) {
          batches = batches.filter(b => b.warehouseId === warehouseId)
        }

        if (zoneId) {
          batches = batches.filter(b => b.zoneId === zoneId)
        }

        // Sort by FIFO (expiry date, then received date, then manufacturing date)
        batches.sort((a, b) => {
          const aExpiry = new Date(a.expiryDate).getTime()
          const bExpiry = new Date(b.expiryDate).getTime()
          if (aExpiry !== bExpiry) return aExpiry - bExpiry

          const aReceived = new Date(a.receivedDate).getTime()
          const bReceived = new Date(b.receivedDate).getTime()
          if (aReceived !== bReceived) return aReceived - bReceived

          const aManufacturing = new Date(a.manufacturingDate).getTime()
          const bManufacturing = new Date(b.manufacturingDate).getTime()
          return aManufacturing - bManufacturing
        })

        return batches
      }

      const params = new URLSearchParams()
      params.append('productId', productId)
      params.append('status', 'ACTIVE')
      if (warehouseId) params.append('warehouseId', warehouseId)
      if (zoneId) params.append('zoneId', zoneId)
      params.append('sortBy', 'expiryDate')
      params.append('sortOrder', 'asc')

      const response = await apiClient.get(`/batches?${params.toString()}`)
      const responseData = response.data

      // Handle wrapped response
      if (
        responseData &&
        typeof responseData === 'object' &&
        'data' in responseData &&
        Array.isArray(responseData.data)
      ) {
        return responseData.data
      }

      // If already an array, return as is
      if (Array.isArray(responseData)) {
        return responseData
      }

      return []
    },
    enabled: !!productId,
  })
}

// Export store for mutations
export function getDummyDataStore() {
  if (!dummyDataStore) {
    dummyDataStore = getDummyBatchesStore()
  }
  return dummyDataStore
}

