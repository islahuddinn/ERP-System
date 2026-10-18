import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

// Shared across the whole territory hierarchy (Region → Zone → City → Branch → Area).
export type TerritoryStatus = 'ACTIVE' | 'INACTIVE'

export interface TerritoryMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface Region {
  id: string
  name: string
  countryName: string
  status: TerritoryStatus
  createdAt: string
  updatedAt: string
  _count?: { zones: number }
}

export interface RegionDropdownItem {
  id: string
  name: string
}

// Nested tree (region → zones → cities → branches → areas). Branch nodes carry
// RAW fields only — distributor/productGroups are NOT resolved inside the tree.
export interface TreeAreaNode {
  id: string
  name: string
  branchId: string
  status: TerritoryStatus
  createdAt: string
  updatedAt: string
}
export interface TreeBranchNode {
  id: string
  code: string
  name: string
  cityId: string
  distributorId: string
  address: string
  productGroupIds: string[]
  status: TerritoryStatus
  createdAt: string
  updatedAt: string
  areas: TreeAreaNode[]
}
export interface TreeCityNode {
  id: string
  name: string
  zoneId: string
  status: TerritoryStatus
  createdAt: string
  updatedAt: string
  branches: TreeBranchNode[]
}
export interface TreeZoneNode {
  id: string
  name: string
  regionId: string
  status: TerritoryStatus
  createdAt: string
  updatedAt: string
  cities: TreeCityNode[]
}
export interface RegionTree extends Region {
  zones: TreeZoneNode[]
}

export interface RegionFilters {
  search?: string
  status?: TerritoryStatus
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface RegionsResponse {
  data: Region[]
  meta: TerritoryMeta | null
}

export interface RegionPayload {
  name: string
  countryName: string
  status?: TerritoryStatus
}

const KEY = 'sales-regions'

export function useRegions(filters: RegionFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<RegionsResponse> => {
      const { data: response } = await apiClient.get('/sales-management/regions', { params: filters })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useRegion(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/sales-management/regions/${id}`)
      return (response?.data || response) as Region
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useRegionsDropdown() {
  return useQuery({
    queryKey: [KEY, 'dropdown'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/sales-management/regions/dropdown')
      const responseData = response?.data || response
      return (Array.isArray(responseData) ? responseData : []) as RegionDropdownItem[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useRegionTree(id: string) {
  return useQuery({
    queryKey: [KEY, id, 'tree'],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/sales-management/regions/${id}/tree`)
      return (response?.data || response) as RegionTree
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateRegion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: RegionPayload) => {
      const { data: response } = await apiClient.post('/sales-management/regions', data)
      return response?.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Region created successfully')
    },
  })
}

export function useUpdateRegion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RegionPayload> }) => {
      const { data: response } = await apiClient.patch(`/sales-management/regions/${id}`, data)
      return response?.data || response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: [KEY, variables.id] })
      toast.success('Region updated successfully')
    },
  })
}

export function useDeleteRegion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/sales-management/regions/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Region deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete region'))
    },
  })
}
