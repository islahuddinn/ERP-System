import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import {
  getDummyMaterialRequests,
  getMaterialRequestById,
  createDummyMaterialRequest,
  updateDummyMaterialRequest,
  updateDummyMaterialRequestStatus,
  getDummyMaterialRequestsStore,
  type MaterialRequest,
  type MaterialRequestStatus,
  type MaterialRequestPriority,
  type MaterialRequestItem
} from '@/data/dummy/factory/material-requests'
import { dummyUsers } from '@/data/dummy/factory/warehouses'
import { isDummyDataEnabled } from '@/lib/dummy-data'

// Use dummy data when backend is not available
const getUseDummyData = () => isDummyDataEnabled()

export interface MaterialRequestFilters {
  page?: number
  limit?: number
  search?: string
  status?: MaterialRequestStatus
  priority?: MaterialRequestPriority
  requestedBy?: string
  plantId?: string
  warehouseId?: string
  dateFrom?: string
  dateTo?: string
}

export function useMaterialRequests(filters?: MaterialRequestFilters) {
  return useQuery({
    queryKey: ['material-requests', filters],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 300))
        return getDummyMaterialRequests(filters)
      }

      const response = await apiClient.get('/material-requests', { params: filters })

      // Backend responses are wrapped by the global ResponseInterceptor as:
      // { success: boolean; message: string; data: any }
      // For material requests, the service/repository return:
      // { requests: MaterialRequest[]; total: number }
      //
      // This block normalizes that shape into:
      // { data: MaterialRequest[]; meta: { total, page, limit, totalPages } }
      const root = response.data
      const payload = root?.data ?? root

      // Preferred shape: { requests, total }
      if (payload && Array.isArray(payload.requests)) {
        const page = filters?.page ?? 1
        const limit = filters?.limit ?? 20
        const total = payload.total ?? payload.requests.length
        const totalPages = Math.max(1, Math.ceil(total / limit))

        return {
          data: payload.requests,
          meta: {
            total,
            page,
            limit,
            totalPages,
          },
        }
      }

      // Fallback: backend returned a plain array
      if (Array.isArray(payload)) {
        const page = filters?.page ?? 1
        const limit = filters?.limit ?? 20
        const total = payload.length

        return {
          data: payload,
          meta: {
            total,
            page,
            limit,
            totalPages: 1,
          },
        }
      }

      // Defensive fallback: no usable data
      return {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      }
    },
  })
}

export function useMaterialRequest(id: string) {
  return useQuery({
    queryKey: ['material-request', id],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200))
        const request = getMaterialRequestById(id)
        if (!request) throw new Error('Material request not found')
        return request
      }

      const response = await apiClient.get(`/material-requests/${id}`)
      // Backend responses are wrapped by the global ResponseInterceptor as:
      // { success: boolean; message: string; data: MaterialRequest }
      // Unwrap to return the actual material request entity
      const root = response.data
      const payload = root?.data ?? root
      return payload
    },
    enabled: !!id,
  })
}

// Export store for mutations
export function getDummyDataStore() {
  return {
    materialRequests: getDummyMaterialRequestsStore(),
  }
}

export interface CreateMaterialRequestDto {
  plantId?: string
  warehouseId?: string
  priority: MaterialRequestPriority
  requiredDate?: string
  notes?: string
  items: Array<{
    productId: string
    quantity: number
    unit: string
    notes?: string
  }>
}

// Backend DTO structure (what the API actually expects)
interface BackendCreateMaterialRequestDto {
  requestNumber: string // Required by DTO validation, backend may regenerate
  title: string
  description: string
  requestType: 'PRODUCTION' | 'MAINTENANCE' | 'QUALITY_CONTROL' | 'RESEARCH' | 'GENERAL'
  priority: MaterialRequestPriority
  requiredDate: string // ISO date string, required
  plantId?: string // Optional - backend will auto-assign if not provided
  warehouseId?: string // Optional - warehouse to fetch products from
  productionOrderId?: string
  departmentId?: string
  requestedById?: string
  approvedById?: string
  notes?: string
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED'
  materials: Array<{
    materialId: string // productId mapped to materialId
    requestedQuantity: number // quantity mapped to requestedQuantity
  }>
}

export function useCreateMaterialRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMaterialRequestDto) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))

        // Get current user (dummy)
        const currentUser = dummyUsers[0]

        // Get products for items
        const { dummyProducts } = await import('@/data/dummy/factory/material-requests')

        const items = data.items.map(item => {
          const product = dummyProducts.find(p => p.id === item.productId)
          return {
            id: `item-${Date.now()}-${Math.random()}`,
            productId: item.productId,
            product: product ? {
              id: product.id,
              name: product.name,
              code: product.code,
              unit: product.unit,
            } : { id: item.productId, name: 'Unknown Product', code: 'UNK', unit: item.unit },
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes,
          }
        })

        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

        const newRequest = createDummyMaterialRequest({
          requestedById: currentUser?.id || 'user-1',
          requestDate: new Date().toISOString(),
          requiredDate: data.requiredDate,
          plantId: data.plantId,
          plant: data.plantId ? { id: data.plantId, name: 'Plant', code: 'PLT' } : undefined,
          warehouseId: data.warehouseId,
          warehouse: data.warehouseId ? { id: data.warehouseId, name: 'Warehouse', code: 'WH' } : undefined,
          status: 'DRAFT',
          priority: data.priority,
          items,
          itemsCount: items.length,
          totalQuantity,
          notes: data.notes,
        })

        queryClient.setQueryData(['material-requests'], (old: any) => {
          if (!old) return { data: [newRequest], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }
          return {
            ...old,
            data: [newRequest, ...old.data],
            meta: { ...old.meta, total: old.meta.total + 1 },
          }
        })

        return newRequest
      }

      // Transform frontend DTO to backend DTO format
      // Backend requires: title, description, requestType, requiredDate (required), plantId (required), materials array
      if (!data.plantId && !data.warehouseId) {
        throw new Error('Either plant or warehouse must be selected')
      }

      if (!data.items || data.items.length === 0) {
        throw new Error('At least one item is required')
      }


      // Backend requires plantId (valid plant UUID), not warehouseId
      // If warehouse is selected, we need to get a plant
      let finalPlantId = data.plantId
      if (!finalPlantId && data.warehouseId) {
        
        // Fetch first active plant as fallback when warehouse is selected
        try {
          const plantsResponse = await apiClient.get('/plants?status=ACTIVE&limit=1')
          // Backend ResponseInterceptor wraps: { success: true, data: { data: [...], meta: {...} }, message: "..." }
          // OR: { success: true, data: { plants: [...], total: number }, message: "..." }
          const responseData = plantsResponse.data?.data || plantsResponse.data || {}
          // Extract plants array - check both formats
          const plantsArray = Array.isArray(responseData?.data) 
            ? responseData.data 
            : Array.isArray(responseData?.plants)
            ? responseData.plants
            : Array.isArray(responseData)
            ? responseData
            : []
          
          
          if (plantsArray.length > 0 && plantsArray[0]?.id) {
            finalPlantId = plantsArray[0].id
          } else {
            throw new Error('No active plants found. Please select a plant instead of warehouse, or create a plant first.')
          }
        } catch (error: any) {
          throw new Error('No active plants found. Material requests require a plant. Please select a plant or create one first.')
        }
      }

      if (!finalPlantId) {
        throw new Error('Plant ID is required. Please select a plant.')
      }

      // Generate title and description from items
      const itemDescriptions = data.items.map(item => {
        // We'll need to fetch product names, but for now use productId
        return `Product ${item.productId}: ${item.quantity} ${item.unit}`
      }).join('; ')

      // Ensure requiredDate is in ISO format (required by backend)
      let requiredDate: string
      if (data.requiredDate) {
        // If it's just a date (YYYY-MM-DD), convert to ISO string
        const date = new Date(data.requiredDate)
        requiredDate = date.toISOString()
      } else {
        // Default to 7 days from now if not provided
        requiredDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }

      // Generate temporary request number (backend will regenerate if needed)
      // Format: MR-YYYYMMDD-HHMMSS for uniqueness
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const tempRequestNumber = `MR-${year}${month}${day}-${hours}${minutes}${seconds}`

      const backendDto: BackendCreateMaterialRequestDto = {
        requestNumber: tempRequestNumber, // Temporary, backend will regenerate if needed
        title: `Material Request - ${new Date().toLocaleDateString()}`,
        description: data.notes || itemDescriptions || 'Material request for production',
        requestType: 'GENERAL', // Default type, can be enhanced later
        priority: data.priority,
        requiredDate: requiredDate,
        plantId: finalPlantId, // Use resolved plantId
        warehouseId: data.warehouseId, // Include warehouse ID if selected
        notes: data.notes,
        status: 'DRAFT', // Create as draft by default
        materials: data.items.map(item => ({
          materialId: item.productId, // Map productId to materialId
          requestedQuantity: Number(item.quantity) || 0, // Map quantity to requestedQuantity, ensure it's a number
        })).filter(item => item.requestedQuantity > 0), // Filter out items with zero quantity
      }


      try {
        const response = await apiClient.post('/material-requests', backendDto)
        return response.data
      } catch (error: any) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
    },
  })
}

export interface UpdateMaterialRequestDto {
  priority?: MaterialRequestPriority
  requiredDate?: string
  notes?: string
  items?: Array<{
    productId: string
    quantity: number
    unit: string
    notes?: string
  }>
}

export function useUpdateMaterialRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMaterialRequestDto }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        // Convert DTO items to MaterialRequestItem format
        const { dummyProducts } = await import('@/data/dummy/factory/material-requests')
        const items = data.items?.map(item => {
          const product = dummyProducts.find((p: any) => p.id === item.productId)
          return {
            id: `item-${Date.now()}-${Math.random()}`,
            productId: item.productId,
            product: product ? {
              id: product.id,
              name: product.name,
              code: product.code,
              unit: product.unit,
            } : {
              id: item.productId,
              name: 'Unknown Product',
              code: 'UNK',
              unit: item.unit,
            },
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes,
          }
        }) || undefined

        const updateData: Partial<MaterialRequest> = {
          ...data,
          items,
        }
        const updated = updateDummyMaterialRequest(id, updateData)
        if (!updated) throw new Error('Material request not found')

        queryClient.setQueryData(['material-request', id], updated)
        queryClient.invalidateQueries({ queryKey: ['material-requests'] })

        return updated
      }

      const response = await apiClient.patch(`/material-requests/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
      queryClient.invalidateQueries({ queryKey: ['material-request', variables.id] })
    },
  })
}

export function useApproveMaterialRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const currentUser = dummyUsers[0]
        const updated = updateDummyMaterialRequestStatus(id, 'APPROVED', currentUser.id, notes)
        if (!updated) throw new Error('Material request not found')

        queryClient.setQueryData(['material-request', id], updated)
        queryClient.invalidateQueries({ queryKey: ['material-requests'] })

        return updated
      }

      // Backend expects PATCH /material-requests/:id/approve with body { comments }
      const response = await apiClient.patch(`/material-requests/${id}/approve`, { comments: notes })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
      queryClient.invalidateQueries({ queryKey: ['material-request', variables.id] })
    },
  })
}

export function useRejectMaterialRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const currentUser = dummyUsers[0]
        const updated = updateDummyMaterialRequestStatus(id, 'REJECTED', currentUser.id, reason)
        if (!updated) throw new Error('Material request not found')

        // Update rejection reason
        const store = getDummyMaterialRequestsStore()
        const index = store.findIndex(r => r.id === id)
        if (index !== -1) {
          store[index] = { ...updated, rejectionReason: reason }
        }

        queryClient.setQueryData(['material-request', id], store[index])
        queryClient.invalidateQueries({ queryKey: ['material-requests'] })

        return store[index]
      }

      // Backend expects PATCH /material-requests/:id/reject with body { comments }
      const response = await apiClient.patch(`/material-requests/${id}/reject`, { comments: reason })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
      queryClient.invalidateQueries({ queryKey: ['material-request', variables.id] })
    },
  })
}

export function useSubmitMaterialRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const currentUser = dummyUsers[0]
        const updated = updateDummyMaterialRequestStatus(id, 'PENDING', currentUser.id)
        if (!updated) throw new Error('Material request not found')

        queryClient.setQueryData(['material-request', id], updated)
        queryClient.invalidateQueries({ queryKey: ['material-requests'] })

        return updated
      }

      // Backend expects PATCH /material-requests/:id/submit
      const response = await apiClient.patch(`/material-requests/${id}/submit`)
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
      queryClient.invalidateQueries({ queryKey: ['material-request', id] })
    },
  })
}

export function useFulfillMaterialRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, warehouseId }: { id: string; warehouseId?: string }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const currentUser = dummyUsers[0]
        const updated = updateDummyMaterialRequestStatus(id, 'FULFILLED', currentUser.id)
        if (!updated) throw new Error('Material request not found')

        queryClient.setQueryData(['material-request', id], updated)
        queryClient.invalidateQueries({ queryKey: ['material-requests'] })
        queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] })

        return updated
      }

      const response = await apiClient.patch(`/material-requests/${id}/fulfill`, { warehouseId })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
      queryClient.invalidateQueries({ queryKey: ['material-request', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock-summary'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock-transactions'] })
    },
  })
}

export function useDeleteMaterialRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        return { id }
      }

      const response = await apiClient.delete(`/material-requests/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
    },
  })
}

export type { MaterialRequest, MaterialRequestStatus, MaterialRequestPriority, MaterialRequestItem }

