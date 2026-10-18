'use client'

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'

export type PriceListTier =
  | 'FACTORY_PRICE'
  | 'DISTRIBUTOR_PRICE'
  | 'TRADE_PRICE'
  | 'MRP'

export const PRICE_LIST_TIER_LABELS: Record<PriceListTier, string> = {
  FACTORY_PRICE: 'Factory Price',
  DISTRIBUTOR_PRICE: 'Distributor Price',
  TRADE_PRICE: 'Trade Price',
  MRP: 'MRP',
}

export interface PriceListTierValue {
  id: string
  price: number
  updatedAt: string
}

export interface ProductPriceListEntry {
  productId: string
  productName: string
  productCode: string
  prices: {
    factoryPrice: PriceListTierValue | null
    distributorPrice: PriceListTierValue | null
    tradePrice: PriceListTierValue | null
    mrp: PriceListTierValue | null
  }
}

export interface PriceListFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  search?: string
}

export interface PriceListResponse {
  data: ProductPriceListEntry[]
  meta: TerritoryMeta | null
}

const KEY = 'price-lists'

export function usePriceLists(filters: PriceListFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<PriceListResponse> => {
      const { data: response } = await apiClient.get('/sales-management/price-lists', {
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

export function useUpsertPriceListEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { tier: PriceListTier; productId: string; price: number }) => {
      const { data: response } = await apiClient.post('/sales-management/price-lists', payload)
      return response?.data ?? response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Price saved')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to save price'))
    },
  })
}
