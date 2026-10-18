import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'
import {
  formatSalesPersonName,
  type CustomerOrderSalesPerson,
} from './useCustomerOrders'
import type { PaymentMethod } from './useCustomers'

export interface CustomerRecoveryCustomer {
  id: string
  code: string
  shopName: string
}

export interface CustomerRecovery {
  id: string
  recoveryNumber: string
  customerId: string
  salesPersonId: string
  amount: number | string
  paymentMode: PaymentMethod
  collectedAt: string
  notes?: string | null
  createdAt: string
  customer?: CustomerRecoveryCustomer
  salesPerson?: CustomerOrderSalesPerson
}

export interface CustomerRecoveryFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  customerId?: string
  salesPersonId?: string
}

export interface CustomerRecoveriesResponse {
  data: CustomerRecovery[]
  meta: TerritoryMeta | null
}

export interface CreateCustomerRecoveryPayload {
  customerId: string
  amount: number
  paymentMode: PaymentMethod
  notes?: string
}

const KEY = 'customer-recovery'

export const RECOVERY_PAYMENT_MODE_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  MOBILE_PAYMENT: 'Mobile Payment',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
  CREDIT: 'Credit',
}

export function formatRecoverySalesPersonName(
  salesPerson?: CustomerOrderSalesPerson | null,
): string {
  return formatSalesPersonName(salesPerson ?? undefined)
}

function invalidateRecoveryRelatedQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  customerRecovery?: CustomerRecovery,
) {
  queryClient.invalidateQueries({ queryKey: [KEY] })

  if (customerRecovery?.id) {
    queryClient.invalidateQueries({ queryKey: [KEY, customerRecovery.id] })
  }

  queryClient.invalidateQueries({ queryKey: ['customer-ledger'] })
  queryClient.invalidateQueries({ queryKey: ['customer-ledger-overview'] })
}

export function useCustomerRecoveries(customerRecoveryFilters: CustomerRecoveryFilters = {}) {
  return useQuery({
    queryKey: [KEY, customerRecoveryFilters],
    queryFn: async (): Promise<CustomerRecoveriesResponse> => {
      const { data: response } = await apiClient.get('/customer-management/customer-recovery', {
        params: customerRecoveryFilters,
      })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useCustomerRecovery(recoveryId: string) {
  return useQuery({
    queryKey: [KEY, recoveryId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(
        `/customer-management/customer-recovery/${recoveryId}`,
      )
      return (response?.data || response) as CustomerRecovery
    },
    enabled: !!recoveryId,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateCustomerRecovery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (createCustomerRecoveryPayload: CreateCustomerRecoveryPayload) => {
      const { data: response } = await apiClient.post(
        '/customer-management/customer-recovery',
        createCustomerRecoveryPayload,
      )
      return (response?.data || response) as CustomerRecovery
    },
    onSuccess: (customerRecovery) => {
      invalidateRecoveryRelatedQueries(queryClient, customerRecovery)
      toast.success(`Recovery ${customerRecovery.recoveryNumber} recorded successfully`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to record shop recovery'))
    },
  })
}

export function validateRecoveryAmount(amount: number): string | null {
  if (Number.isNaN(amount)) {
    return 'Enter a valid amount.'
  }

  if (amount <= 0) {
    return 'Amount must be greater than zero.'
  }

  return null
}
