'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { TerritoryMeta } from './useRegions'

export interface BranchLookup {
  id: string
  name: string
  code: string
}

export interface ProductLookup {
  id: string
  name: string
  code: string
}

export interface BranchStockBalance {
  id: string
  branchId: string
  productId: string
  quantity: number
  updatedAt: string
  branch: BranchLookup
  product: ProductLookup
}

export interface BranchStockFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  search?: string
  branchId?: string
  productId?: string
}

export interface BranchStockResponse {
  data: BranchStockBalance[]
  meta: TerritoryMeta | null
}

const KEY = 'branch-stock'

export function useBranchStock(filters: BranchStockFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<BranchStockResponse> => {
      const { data: response } = await apiClient.get('/sales-management/branch-stock', {
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

