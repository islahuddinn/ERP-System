// React Query hooks for stocktake
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface CreateStocktakeDto {
  productId: string
  locationId?: string
  warehouseId?: string
  zoneId?: string
  countedQuantity: number
  remarks?: string
}

export interface UpdateStocktakeDto {
  countedQuantity?: number
  remarks?: string
}

// Get all stocktakes
export function useStocktakes(filters?: {
  productId?: string
  locationId?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['stocktakes', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.productId) params.append('productId', filters.productId)
      if (filters?.locationId) params.append('locationId', filters.locationId)
      if (filters?.page) params.append('page', String(filters.page))
      if (filters?.limit) params.append('limit', String(filters.limit))

      const response = await apiClient.get(`/stocktake?${params.toString()}`)
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
  })
}

// Get stocktake by ID
export function useStocktake(id: string) {
  return useQuery({
    queryKey: ['stocktakes', id],
    queryFn: async () => {
      const response = await apiClient.get(`/stocktake/${id}`)
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

// Get stocktake summary
export function useStocktakeSummary(locationId?: string) {
  return useQuery({
    queryKey: ['stocktake-summary', locationId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (locationId) params.append('locationId', locationId)

      const response = await apiClient.get(`/stocktake/summary?${params.toString()}`)
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
  })
}

// Create stocktake
export function useCreateStocktake() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateStocktakeDto) => {
      const response = await apiClient.post('/stocktake', data)
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
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] })
      queryClient.invalidateQueries({ queryKey: ['stocktake-summary'] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
    },
  })
}

// Update stocktake
export function useUpdateStocktake() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStocktakeDto }) => {
      const response = await apiClient.patch(`/stocktake/${id}`, data)
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
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] })
      queryClient.invalidateQueries({ queryKey: ['stocktakes', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['stocktake-summary'] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
    },
  })
}

