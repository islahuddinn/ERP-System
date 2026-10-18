import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryStatus, TerritoryMeta, TreeCityNode } from './useRegions'

export interface Zone {
  id: string
  name: string
  regionId: string
  status: TerritoryStatus
  createdAt: string
  updatedAt: string
  region?: { id: string; name: string }
  _count?: { cities: number }
}

export interface ZoneDropdownItem {
  id: string
  name: string
  regionId: string
}

export interface ZoneTree {
  id: string
  name: string
  regionId: string
  status: TerritoryStatus
  createdAt: string
  updatedAt: string
  cities: TreeCityNode[]
}

export interface ZoneFilters {
  search?: string
  status?: TerritoryStatus
  regionId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface ZonesResponse {
  data: Zone[]
  meta: TerritoryMeta | null
}

export interface ZonePayload {
  name: string
  regionId: string
  status?: TerritoryStatus
}

const KEY = 'sales-zones'

export function useZones(filters: ZoneFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<ZonesResponse> => {
      const { data: response } = await apiClient.get('/sales-management/zones', { params: filters })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useZone(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/sales-management/zones/${id}`)
      return (response?.data || response) as Zone
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

// Pass a regionId to scope the dropdown to one region (used by the cascading
// City create form after the user picks a region/zone).
export function useZonesDropdown(regionId?: string) {
  return useQuery({
    queryKey: [KEY, 'dropdown', regionId ?? null],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/sales-management/zones/dropdown', {
        params: regionId ? { regionId } : {},
      })
      const responseData = response?.data || response
      return (Array.isArray(responseData) ? responseData : []) as ZoneDropdownItem[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useZoneTree(id: string) {
  return useQuery({
    queryKey: [KEY, id, 'tree'],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/sales-management/zones/${id}/tree`)
      return (response?.data || response) as ZoneTree
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: ZonePayload) => {
      const { data: response } = await apiClient.post('/sales-management/zones', data)
      return response?.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Zone created successfully')
    },
  })
}

export function useUpdateZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ZonePayload> }) => {
      const { data: response } = await apiClient.patch(`/sales-management/zones/${id}`, data)
      return response?.data || response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: [KEY, variables.id] })
      toast.success('Zone updated successfully')
    },
  })
}

export function useDeleteZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/sales-management/zones/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Zone deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete zone'))
    },
  })
}
