'use client'

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'

export interface BranchProductPriceBranch {
  id: string
  name: string
  code: string
}

export interface BranchProductPriceProduct {
  id: string
  name: string
  code: string
}

export interface BranchProductPriceEntry {
  id: string
  sellerBranchId: string | null
  productId: string
  price: number
  updatedAt: string
  sellerBranch: BranchProductPriceBranch | null
  product: BranchProductPriceProduct
}

export interface BranchProductPriceFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  search?: string
  /** Omit for Factory price list (sellerBranchId null). */
  sellerBranchId?: string
}

export interface BranchProductPricesResponse {
  data: BranchProductPriceEntry[]
  meta: TerritoryMeta | null
}

const KEY = 'branch-product-prices'

export function useBranchProductPrices(filters: BranchProductPriceFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<BranchProductPricesResponse> => {
      const { data: response } = await apiClient.get('/sales-management/branch-product-prices', {
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

export function useSetMyBranchProductPrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { productId: string; price: number }) => {
      const { data: response } = await apiClient.post(
        '/sales-management/branch-product-prices/mine',
        payload,
      )
      return response?.data ?? response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Branch price saved')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to save branch price'))
    },
  })
}

export function useSetFactoryBranchProductPrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { productId: string; price: number }) => {
      const { data: response } = await apiClient.post(
        '/sales-management/branch-product-prices/factory',
        payload,
      )
      return response?.data ?? response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Factory price saved')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to save factory price'))
    },
  })
}
