import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'

export type CustomerLedgerEntryType =
  | 'DELIVERY'
  | 'RETURN'
  | 'RECOVERY'
  | 'ADJUSTMENT'
  | 'OPENING_BALANCE'

export interface CustomerLedgerHeader {
  id: string
  code: string
  shopName: string
  email: string | null
  phone: string | null
  address: string | null
  createdAt?: string
}

export interface CustomerLedgerEntry {
  id: string
  customerId: string
  date: string
  type: CustomerLedgerEntryType
  reference: string | null
  referenceId: string | null
  description: string
  debit: number
  credit: number
  balance: number
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CustomerLedgerSummary {
  totalDeliveries: number
  totalRecoveries: number
  totalReturns: number
  currentBalance: number
  totalEntries: number
}

export interface CustomerLedgerFilters {
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
}

export interface CustomerLedgerResponse {
  customer: CustomerLedgerHeader
  summary: CustomerLedgerSummary
  ledger: {
    data: CustomerLedgerEntry[]
    meta: TerritoryMeta
  }
}

const KEY = 'customer-ledger'

export const LEDGER_ENTRY_TYPE_LABELS: Record<CustomerLedgerEntryType, string> = {
  DELIVERY: 'Delivery',
  RETURN: 'Return',
  RECOVERY: 'Recovery',
  ADJUSTMENT: 'Adjustment',
  OPENING_BALANCE: 'Opening Balance',
}

export function useCustomerLedger(
  customerId: string,
  customerLedgerFilters: CustomerLedgerFilters = {},
) {
  return useQuery({
    queryKey: [KEY, customerId, customerLedgerFilters],
    queryFn: async (): Promise<CustomerLedgerResponse> => {
      if (!customerId) throw new Error('Customer ID is required')

      const { data: response } = await apiClient.get(`/customers/${customerId}/ledger`, {
        params: customerLedgerFilters,
      })

      const responseData = (response?.data || response) as CustomerLedgerResponse

      return {
        ...responseData,
        ledger: {
          data: responseData.ledger?.data ?? [],
          meta: responseData.ledger?.meta ?? {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        },
      }
    },
    enabled: !!customerId,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useExportCustomerLedgerCsv() {
  return useMutation({
    mutationFn: async ({
      customerId,
      customerLedgerFilters = {},
    }: {
      customerId: string
      customerLedgerFilters?: Pick<CustomerLedgerFilters, 'startDate' | 'endDate'>
    }) => {
      const { data } = await apiClient.get(`/customers/${customerId}/ledger/export/csv`, {
        params: customerLedgerFilters,
        responseType: 'blob',
      })
      return data as Blob
    },
    onSuccess: (blob, variables) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `customer-${variables.customerId}-ledger.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Ledger CSV exported successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to export customer ledger'))
    },
  })
}

/** @deprecated Use useExportCustomerLedgerCsv — distribution ledger has CSV export only. */
export const useExportCustomerLedger = useExportCustomerLedgerCsv
