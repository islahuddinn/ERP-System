import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from '@/hooks/useRegions'

export type ProductBonusSchemeStatus = 'ACTIVE' | 'INACTIVE'
export type ProductBonusSchemeType = 'QTY_BONUS'

export interface ProductBonusSchemeGroupSummary {
  id: string
  code: string
  name: string
  status: string
  productCount: number
}

export interface ProductBonusScheme {
  id: string
  code: string
  name: string
  description: string | null
  productBonusGroupId: string
  type: ProductBonusSchemeType
  minPurchaseQty: number
  bonusQty: number
  validFrom: string
  validTo: string | null
  status: ProductBonusSchemeStatus
  productBonusGroup: ProductBonusSchemeGroupSummary
  createdAt: string
  updatedAt: string
}

export interface ProductBonusSchemeDropdownItem {
  id: string
  code: string
  name: string
  productBonusGroupId: string
}

export interface ProductBonusSchemeFilters {
  search?: string
  status?: ProductBonusSchemeStatus
  productBonusGroupId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface ProductBonusSchemesResponse {
  data: ProductBonusScheme[]
  meta: TerritoryMeta | null
}

export interface ProductBonusSchemePayload {
  code: string
  name: string
  description?: string
  productBonusGroupId: string
  type?: ProductBonusSchemeType
  minPurchaseQty: number
  bonusQty: number
  validFrom: string
  validTo?: string
  status?: ProductBonusSchemeStatus
}

const KEY = 'product-bonus-schemes'

export function useProductBonusSchemes(filters: ProductBonusSchemeFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<ProductBonusSchemesResponse> => {
      const { data: response } = await apiClient.get('/sales-management/product-bonus-schemes', {
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

export function useProductBonusScheme(productBonusSchemeId: string) {
  return useQuery({
    queryKey: [KEY, productBonusSchemeId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(
        `/sales-management/product-bonus-schemes/${productBonusSchemeId}`,
      )
      return (response?.data || response) as ProductBonusScheme
    },
    enabled: !!productBonusSchemeId,
  })
}

export function useProductBonusSchemesDropdown() {
  return useQuery({
    queryKey: [KEY, 'dropdown'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/sales-management/product-bonus-schemes/dropdown')
      const responseData = response?.data || response
      return (Array.isArray(responseData) ? responseData : []) as ProductBonusSchemeDropdownItem[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateProductBonusScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ProductBonusSchemePayload) => {
      const { data: response } = await apiClient.post('/sales-management/product-bonus-schemes', payload)
      return (response?.data || response) as ProductBonusScheme
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Product bonus scheme created successfully')
    },
  })
}

export function useUpdateProductBonusScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productBonusSchemeId,
      data,
    }: {
      productBonusSchemeId: string
      data: Partial<ProductBonusSchemePayload>
    }) => {
      const { data: response } = await apiClient.patch(
        `/sales-management/product-bonus-schemes/${productBonusSchemeId}`,
        data,
      )
      return (response?.data || response) as ProductBonusScheme
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: [KEY, variables.productBonusSchemeId] })
      toast.success('Product bonus scheme updated successfully')
    },
  })
}

export function useDeleteProductBonusScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (productBonusSchemeId: string) => {
      await apiClient.delete(`/sales-management/product-bonus-schemes/${productBonusSchemeId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Product bonus scheme deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete product bonus scheme'))
    },
  })
}
