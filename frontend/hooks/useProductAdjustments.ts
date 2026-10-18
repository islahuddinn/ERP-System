'use client'

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'

export type ProductAdjustmentType = 'ADDITION' | 'DEDUCTION'

export const PRODUCT_ADJUSTMENT_TYPE_LABELS: Record<ProductAdjustmentType, string> = {
  ADDITION: 'Addition',
  DEDUCTION: 'Deduction',
}

export interface ProductAdjustmentCustomer {
  id: string
  code: string
  shopName: string
}

export interface ProductAdjustmentProduct {
  id: string
  code: string
  name: string
}

export interface ProductAdjustment {
  id: string
  adjustmentNumber: string
  customerId: string
  productId: string
  type: ProductAdjustmentType
  quantity: number
  reason: string
  notes?: string | null
  adjustedAt: string
  createdAt: string
  customer?: ProductAdjustmentCustomer
  product?: ProductAdjustmentProduct
}

export interface ProductAdjustmentFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  search?: string
  customerId?: string
  productId?: string
  type?: ProductAdjustmentType
}

export interface ProductAdjustmentsResponse {
  data: ProductAdjustment[]
  meta: TerritoryMeta | null
}

export interface CreateProductAdjustmentPayload {
  customerId: string
  productId: string
  type: ProductAdjustmentType
  quantity: number
  reason: string
  notes?: string
}

const KEY = 'product-adjustments'

function buildListQueryParams(filters: ProductAdjustmentFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue
    params[key] = value
  }
  return params
}

export function useProductAdjustments(
  productAdjustmentFilters: ProductAdjustmentFilters = {},
): UseQueryResult<ProductAdjustmentsResponse> {
  return useQuery({
    queryKey: [KEY, productAdjustmentFilters],
    queryFn: async (): Promise<ProductAdjustmentsResponse> => {
      const params = buildListQueryParams(productAdjustmentFilters)
      const { data: response } = await apiClient.get('/customer-management/product-adjustments', {
        params,
      })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: (previousData) => previousData,
  })
}

export function useProductAdjustment(adjustmentId: string) {
  return useQuery({
    queryKey: [KEY, adjustmentId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(
        `/customer-management/product-adjustments/${adjustmentId}`,
      )
      return (response?.data || response) as ProductAdjustment
    },
    enabled: !!adjustmentId,
  })
}

export function useCreateProductAdjustment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateProductAdjustmentPayload) => {
      const { data: response } = await apiClient.post(
        '/customer-management/product-adjustments',
        payload,
      )
      return (response?.data || response) as ProductAdjustment
    },
    onSuccess: (adjustment) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      if (adjustment?.id) {
        queryClient.invalidateQueries({ queryKey: [KEY, adjustment.id] })
      }
      toast.success('Product adjustment recorded successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to record product adjustment'))
    },
  })
}
