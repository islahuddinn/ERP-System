import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface CustomerLedgerOverviewItem {
  id: string
  code: string
  shopName: string
  email: string | null
  phone: string | null
  address: string | null
  balance: number
  lastTransactionDate: string | null
}

const KEY = 'customer-ledger-overview'

export function useCustomerLedgerOverview(search?: string) {
  return useQuery({
    queryKey: [KEY, search],
    queryFn: async (): Promise<CustomerLedgerOverviewItem[]> => {
      const { data: response } = await apiClient.get('/customers/ledger-overview', {
        params: search?.trim() ? { search: search.trim() } : undefined,
      })
      const responseData = response?.data || response
      return (Array.isArray(responseData) ? responseData : responseData?.data ?? []) as CustomerLedgerOverviewItem[]
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

/** @deprecated Legacy alias — prefer CustomerLedgerOverviewItem */
export type CustomerLedgerSummary = CustomerLedgerOverviewItem
