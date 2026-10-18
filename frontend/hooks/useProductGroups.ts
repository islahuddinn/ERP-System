import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryStatus, TerritoryMeta } from './useRegions'

// ProductGroupStatus shares ACTIVE/INACTIVE with the territory levels.
export interface ProductGroup {
  id: string
  name: string
  status: TerritoryStatus
  createdAt: string
  updatedAt: string
}

export interface ProductGroupDropdownItem {
  id: string
  name: string
}

export interface ProductGroupFilters {
  search?: string
  status?: TerritoryStatus
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface ProductGroupsResponse {
  data: ProductGroup[]
  meta: TerritoryMeta | null
}

export interface ProductGroupPayload {
  name: string
  status?: TerritoryStatus
}

const KEY = 'product-groups'
const BASE = '/product-management/product-groups'

export function useProductGroups(filters: ProductGroupFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<ProductGroupsResponse> => {
      const { data: response } = await apiClient.get(BASE, { params: filters })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useProductGroup(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`${BASE}/${id}`)
      return (response?.data || response) as ProductGroup
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

// ACTIVE-only list — backs both the Product form and the Branch form's multi-select.
export function useProductGroupsDropdown() {
  return useQuery({
    queryKey: [KEY, 'dropdown'],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`${BASE}/dropdown`)
      const responseData = response?.data || response
      return (Array.isArray(responseData) ? responseData : []) as ProductGroupDropdownItem[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateProductGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: ProductGroupPayload) => {
      const { data: response } = await apiClient.post(BASE, data)
      return response?.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Product group created successfully')
    },
  })
}

export function useUpdateProductGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductGroupPayload> }) => {
      const { data: response } = await apiClient.patch(`${BASE}/${id}`, data)
      return response?.data || response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: [KEY, variables.id] })
      toast.success('Product group updated successfully')
    },
  })
}

export function useDeleteProductGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${BASE}/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Product group deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete product group'))
    },
  })
}
