'use client'

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'

export interface ProductLookup {
  id: string
  name: string
  code: string
}

export interface FactoryStockBalance {
  id: string
  productId: string
  quantity: number
  updatedAt: string
  product: ProductLookup
}

export interface FactoryStockFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  search?: string
  productId?: string
}

export interface FactoryStockResponse {
  data: FactoryStockBalance[]
  meta: TerritoryMeta | null
}

const KEY = 'factory-stock'

export function useFactoryStock(filters: FactoryStockFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<FactoryStockResponse> => {
      const { data: response } = await apiClient.get('/sales-management/factory-stock', {
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

export function useStockInFactoryStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { productId: string; quantity: number }) => {
      const { data: response } = await apiClient.post(
        '/sales-management/factory-stock/stock-in',
        payload,
      )
      return (response?.data ?? response) as FactoryStockBalance
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Factory stock added')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to add factory stock'))
    },
  })
}

export function useAdjustFactoryStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { productId: string; delta: number; reason: string }) => {
      const { data: response } = await apiClient.patch(
        '/sales-management/factory-stock/adjust',
        payload,
      )
      return (response?.data ?? response) as FactoryStockBalance
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Factory stock adjusted')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to adjust factory stock'))
    },
  })
}
