import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from '@/hooks/useRegions'

export type ProductBonusGroupStatus = 'ACTIVE' | 'INACTIVE'

export interface ProductBonusGroupProductSummary {
  id: string
  code: string
  name: string
  isActive: boolean
}

export interface ProductBonusGroup {
  id: string
  code: string
  name: string
  description: string | null
  status: ProductBonusGroupStatus
  productCount: number
  products?: ProductBonusGroupProductSummary[]
  createdAt: string
  updatedAt: string
}

export interface ProductBonusGroupDropdownItem {
  id: string
  code: string
  name: string
}

export interface ProductBonusGroupFilters {
  search?: string
  status?: ProductBonusGroupStatus
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface ProductBonusGroupsResponse {
  data: ProductBonusGroup[]
  meta: TerritoryMeta | null
}

export interface ProductBonusGroupPayload {
  code: string
  name: string
  description?: string
  status?: ProductBonusGroupStatus
  productIds: string[]
}

const KEY = 'product-bonus-groups'

export function useProductBonusGroups(filters: ProductBonusGroupFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<ProductBonusGroupsResponse> => {
      const { data: response } = await apiClient.get('/sales-management/product-bonus-groups', {
        params: filters,
      })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useProductBonusGroup(productBonusGroupId: string) {
  return useQuery({
    queryKey: [KEY, productBonusGroupId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(
        `/sales-management/product-bonus-groups/${productBonusGroupId}`,
      )
      return (response?.data || response) as ProductBonusGroup
    },
    enabled: !!productBonusGroupId,
  })
}

export function useProductBonusGroupsDropdown() {
  return useQuery({
    queryKey: [KEY, 'dropdown'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/sales-management/product-bonus-groups/dropdown')
      const responseData = response?.data || response
      return (Array.isArray(responseData) ? responseData : []) as ProductBonusGroupDropdownItem[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateProductBonusGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ProductBonusGroupPayload) => {
      const { data: response } = await apiClient.post('/sales-management/product-bonus-groups', payload)
      return (response?.data || response) as ProductBonusGroup
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Product bonus group created successfully')
    },
  })
}

export function useUpdateProductBonusGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productBonusGroupId,
      data,
    }: {
      productBonusGroupId: string
      data: Partial<ProductBonusGroupPayload>
    }) => {
      const { data: response } = await apiClient.patch(
        `/sales-management/product-bonus-groups/${productBonusGroupId}`,
        data,
      )
      return (response?.data || response) as ProductBonusGroup
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: [KEY, variables.productBonusGroupId] })
      toast.success('Product bonus group updated successfully')
    },
  })
}

export function useDeleteProductBonusGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (productBonusGroupId: string) => {
      await apiClient.delete(`/sales-management/product-bonus-groups/${productBonusGroupId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Product bonus group deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete product bonus group'))
    },
  })
}
