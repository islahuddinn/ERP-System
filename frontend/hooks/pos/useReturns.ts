'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'

export type SaleReturnStatus = 'PENDING' | 'APPROVED' | 'PROCESSED' | 'REJECTED' | 'CANCELLED'
export type RefundStatus = 'PENDING' | 'PROCESSED' | 'FAILED'
export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'MOBILE_PAYMENT'
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'OTHER'
  | 'CREDIT'

export interface SaleReturnItem {
  id: string
  originalSaleItemId: string
  productId?: string
  itemType: 'PRODUCT' | 'SERVICE'
  itemName: string
  sku?: string
  quantityReturned: number
  originalQuantity: number
  unitPrice: number
  lineSubtotal: number
  itemTaxAmount: number
  itemDiscountAmount: number
  lineTotal: number
}

export interface SaleReturn {
  id: string
  returnNumber: string
  originalSaleId: string
  returnDate: string
  locationId: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  refundMethod: PaymentMethod
  refundStatus: RefundStatus
  refundedAt?: string
  reason: string
  notes?: string
  processedBy: string
  approvedBy?: string
  status: SaleReturnStatus
  location?: {
    id: string
    name: string
  }
  processorId?: string
  approvedById?: string
  originalSale?: {
    id: string
    saleNumber: string
    totalAmount: number
    customer?: {
      id: string
      name: string
    }
  }
  returnItems?: SaleReturnItem[]
}

export interface SaleReturnResponse {
  data: SaleReturn[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface SaleReturnQueryParams {
  status?: SaleReturnStatus
  search?: string
  locationId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface CreateSaleReturnPayload {
  items: Array<{
    originalSaleItemId: string
    quantityReturned: number
  }>
  reason: string
  notes?: string
  refundMethod: PaymentMethod
}

export interface ProcessSaleReturnPayload {
  refundMethod?: PaymentMethod
  notes?: string
}

export interface CancelSaleReturnPayload {
  reason?: string
}

export interface ReturnableItem {
  saleItemId: string
  itemName: string
  itemType: 'PRODUCT' | 'SERVICE'
  productId?: string
  sku?: string
  originalQuantity: number
  returnableQuantity: number
  returnedQuantity: number
}

const buildSearchParams = (params: Record<string, any>) => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      searchParams.append(key, value.toString())
    }
  })
  return searchParams
}

export const useSaleReturns = (params: SaleReturnQueryParams = {}) => {
  return useQuery({
    queryKey: ['sale-returns', params],
    queryFn: async (): Promise<SaleReturnResponse> => {
      const searchParams = buildSearchParams(params)
      const response = await apiClient.get(`/pos/returns?${searchParams.toString()}`)
      return response.data
    },
    refetchOnWindowFocus: false,
  })
}

export const useSaleReturn = (id: string | null) => {
  return useQuery({
    queryKey: ['sale-return', id],
    queryFn: async (): Promise<SaleReturn> => {
      const response = await apiClient.get(`/pos/returns/${id}`)
      return response.data
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export const useReturnableItems = (saleId?: string) => {
  return useQuery({
    queryKey: ['sale-returnable-items', saleId],
    queryFn: async (): Promise<ReturnableItem[]> => {
      const response = await apiClient.get(`/pos/sales/${saleId}/returnable-items`)
      return response.data
    },
    enabled: !!saleId,
    refetchOnWindowFocus: false,
  })
}

export const useCreateSaleReturn = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ saleId, data }: { saleId: string; data: CreateSaleReturnPayload }) => {
      const response = await apiClient.post(`/pos/sales/${saleId}/returns`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-returns'] })
      toast.success('Sale return created successfully')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create sale return'
      toast.error(message)
    },
  })
}

export const useApproveSaleReturn = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.put(`/pos/returns/${id}/approve`, {})
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['sale-returns'] })
      queryClient.invalidateQueries({ queryKey: ['sale-return', id] })
      toast.success('Sale return approved')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to approve sale return'
      toast.error(message)
    },
  })
}

export const useProcessSaleReturn = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProcessSaleReturnPayload }) => {
      const response = await apiClient.put(`/pos/returns/${id}/process`, data)
      return response.data
    },
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['sale-returns'] })
      queryClient.invalidateQueries({ queryKey: ['sale-return', id] })
      // Invalidate credit sales to refresh outstanding balances (Issue 1 Fix)
      queryClient.invalidateQueries({ queryKey: ['pos', 'credit-sales'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales'] })
      // Invalidate the specific sale if originalSaleId is available
      if (response?.originalSaleId) {
        queryClient.invalidateQueries({ queryKey: ['pos', 'sales', response.originalSaleId] })
      }
      
      // Show warnings if any products were skipped (Issue 2 Fix)
      if (response?.warnings && Array.isArray(response.warnings) && response.warnings.length > 0) {
        response.warnings.forEach((warning: string) => {
          toast(warning, { 
            icon: '⚠️', 
            duration: 6000,
            style: { background: '#fef3c7', color: '#92400e' }
          })
        })
      }
      
      toast.success('Sale return processed successfully')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to process sale return'
      toast.error(message)
    },
  })
}

export const useCancelSaleReturn = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CancelSaleReturnPayload }) => {
      const response = await apiClient.delete(`/pos/returns/${id}`, { data })
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['sale-returns'] })
      queryClient.invalidateQueries({ queryKey: ['sale-return', id] })
      toast.success('Sale return cancelled')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to cancel sale return'
      toast.error(message)
    },
  })
}

