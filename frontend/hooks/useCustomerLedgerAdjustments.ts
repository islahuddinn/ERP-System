'use client'

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'

export type CustomerLedgerAdjustmentType = 'CREDIT_NOTE' | 'DEBIT_NOTE'

export const CUSTOMER_LEDGER_ADJUSTMENT_TYPE_LABELS: Record<CustomerLedgerAdjustmentType, string> = {
  CREDIT_NOTE: 'Credit Note',
  DEBIT_NOTE: 'Debit Note',
}

export interface CustomerLedgerAdjustmentCustomer {
  id: string
  code: string
  shopName: string
}

export interface CustomerLedgerAdjustment {
  id: string
  adjustmentNumber: string
  customerId: string
  type: CustomerLedgerAdjustmentType
  amount: number | string
  reason: string
  notes?: string | null
  adjustedAt: string
  createdAt: string
  customer?: CustomerLedgerAdjustmentCustomer
}

export interface CustomerLedgerAdjustmentFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  search?: string
  customerId?: string
  type?: CustomerLedgerAdjustmentType
}

export interface CustomerLedgerAdjustmentsResponse {
  data: CustomerLedgerAdjustment[]
  meta: TerritoryMeta | null
}

export interface CreateCustomerLedgerAdjustmentPayload {
  customerId: string
  type: CustomerLedgerAdjustmentType
  amount: number
  reason: string
  notes?: string
}

const KEY = 'customer-ledger-adjustments'

function buildListQueryParams(filters: CustomerLedgerAdjustmentFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue
    params[key] = value
  }
  return params
}

function invalidateAdjustmentRelatedQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  adjustment?: CustomerLedgerAdjustment,
) {
  queryClient.invalidateQueries({ queryKey: [KEY] })
  if (adjustment?.id) {
    queryClient.invalidateQueries({ queryKey: [KEY, adjustment.id] })
  }
  queryClient.invalidateQueries({ queryKey: ['customer-ledger'] })
  queryClient.invalidateQueries({ queryKey: ['customer-ledger-overview'] })
}

export function useCustomerLedgerAdjustments(
  customerLedgerAdjustmentFilters: CustomerLedgerAdjustmentFilters = {},
): UseQueryResult<CustomerLedgerAdjustmentsResponse> {
  return useQuery({
    queryKey: [KEY, customerLedgerAdjustmentFilters],
    queryFn: async (): Promise<CustomerLedgerAdjustmentsResponse> => {
      const params = buildListQueryParams(customerLedgerAdjustmentFilters)
      const { data: response } = await apiClient.get(
        '/customer-management/customer-ledger-adjustments',
        { params },
      )
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: (previousData) => previousData,
  })
}

export function useCustomerLedgerAdjustment(adjustmentId: string) {
  return useQuery({
    queryKey: [KEY, adjustmentId],
    enabled: !!adjustmentId,
    queryFn: async (): Promise<CustomerLedgerAdjustment> => {
      const { data: response } = await apiClient.get(
        `/customer-management/customer-ledger-adjustments/${adjustmentId}`,
      )
      return response?.data ?? response
    },
  })
}

export function useCreateCustomerLedgerAdjustment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateCustomerLedgerAdjustmentPayload) => {
      const { data: response } = await apiClient.post(
        '/customer-management/customer-ledger-adjustments',
        payload,
      )
      return response?.data ?? response
    },
    onSuccess: (adjustment: CustomerLedgerAdjustment) => {
      invalidateAdjustmentRelatedQueries(queryClient, adjustment)
      toast.success(
        adjustment.type === 'CREDIT_NOTE'
          ? 'Credit note posted to shop ledger'
          : 'Debit note posted to shop ledger',
      )
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to post adjustment'))
    },
  })
}
