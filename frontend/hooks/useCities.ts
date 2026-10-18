import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryStatus, TerritoryMeta, TreeBranchNode } from './useRegions'

export interface City {
  id: string
  name: string
  zoneId: string
  status: TerritoryStatus
  createdAt: string
  updatedAt: string
  // City list/detail embeds the full parent zone plus its region narrowed to { id, name }.
  zone?: {
    id: string
    name: string
    regionId: string
    status: TerritoryStatus
    createdAt: string
    updatedAt: string
    region?: { id: string; name: string }
  }
  _count?: { branches: number }
}

export interface CityDropdownItem {
  id: string
  name: string
  zoneId: string
}

export interface CityTree {
  id: string
  name: string
  zoneId: string
  status: TerritoryStatus
  createdAt: string
  updatedAt: string
  branches: TreeBranchNode[]
}

export interface CityFilters {
  search?: string
  status?: TerritoryStatus
  zoneId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface CitiesResponse {
  data: City[]
  meta: TerritoryMeta | null
}

export interface CityPayload {
  name: string
  zoneId: string
  status?: TerritoryStatus
}

const KEY = 'sales-cities'

export function useCities(filters: CityFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<CitiesResponse> => {
      const { data: response } = await apiClient.get('/sales-management/cities', { params: filters })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useCity(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/sales-management/cities/${id}`)
      return (response?.data || response) as City
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

// Pass a zoneId to scope the dropdown to one zone (cascading Branch create form).
export function useCitiesDropdown(zoneId?: string) {
  return useQuery({
    queryKey: [KEY, 'dropdown', zoneId ?? null],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/sales-management/cities/dropdown', {
        params: zoneId ? { zoneId } : {},
      })
      const responseData = response?.data || response
      return (Array.isArray(responseData) ? responseData : []) as CityDropdownItem[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCityTree(id: string) {
  return useQuery({
    queryKey: [KEY, id, 'tree'],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/sales-management/cities/${id}/tree`)
      return (response?.data || response) as CityTree
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateCity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CityPayload) => {
      const { data: response } = await apiClient.post('/sales-management/cities', data)
      return response?.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('City created successfully')
    },
  })
}

export function useUpdateCity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CityPayload> }) => {
      const { data: response } = await apiClient.patch(`/sales-management/cities/${id}`, data)
      return response?.data || response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: [KEY, variables.id] })
      toast.success('City updated successfully')
    },
  })
}

export function useDeleteCity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/sales-management/cities/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('City deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete city'))
    },
  })
}
