import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import { invalidateBranchTreeQueries } from '@/hooks/useBranches'
import type { TerritoryMeta } from './useRegions'

export type CustomerOrderStatus = 'PENDING' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'CANCELLED'

export interface CustomerOrderCustomer {
  id: string
  code: string
  shopName: string
}

export interface CustomerOrderSalesPerson {
  id: string
  employeeCode: string
  user?: { id: string; firstName: string; lastName: string; phone: string | null }
}

export interface CustomerOrderProduct {
  id: string
  name: string
  code: string
}

export interface CustomerOrderItem {
  id: string
  orderId: string
  productId: string
  quantity: number
  unitPrice: number | string
  totalAmount: number | string
  product?: CustomerOrderProduct
}

export interface CustomerOrderDeliverySummary {
  id: string
  deliveryNumber: string
  status: string
  deliveredAt: string | null
}

export interface CustomerOrder {
  id: string
  orderNumber: string
  customerId: string
  salesPersonId: string
  orderDate: string
  status: CustomerOrderStatus
  totalAmount: number | string
  notes?: string | null
  createdAt: string
  updatedAt: string
  customer?: CustomerOrderCustomer
  salesPerson?: CustomerOrderSalesPerson
  items?: CustomerOrderItem[]
  deliveries?: CustomerOrderDeliverySummary[]
  _count?: { items: number; deliveries: number }
}

export interface CustomerOrderFilters {
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  customerId?: string
  salesPersonId?: string
  status?: CustomerOrderStatus
}

export interface CustomerOrdersResponse {
  data: CustomerOrder[]
  meta: TerritoryMeta | null
}

export interface CustomerOrderItemPayload {
  productId: string
  quantity: number
  unitPrice?: number
}

export interface CreateCustomerOrderPayload {
  customerId: string
  items: CustomerOrderItemPayload[]
  notes?: string
}

const KEY = 'customer-orders'

export function formatSalesPersonName(salesPerson?: CustomerOrderSalesPerson): string {
  if (!salesPerson) return '—'
  if (salesPerson.user) {
    return `${salesPerson.user.firstName} ${salesPerson.user.lastName}`.trim()
  }
  return salesPerson.employeeCode
}

export function useCustomerOrders(filters: CustomerOrderFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<CustomerOrdersResponse> => {
      const { data: response } = await apiClient.get('/customer-management/customer-orders', {
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

export function useCustomerOrder(orderId: string) {
  return useQuery({
    queryKey: [KEY, orderId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/customer-management/customer-orders/${orderId}`)
      return (response?.data || response) as CustomerOrder
    },
    enabled: !!orderId,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateCustomerOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (createCustomerOrderPayload: CreateCustomerOrderPayload) => {
      const { data: response } = await apiClient.post(
        '/customer-management/customer-orders',
        createCustomerOrderPayload,
      )
      return (response?.data || response) as CustomerOrder
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: ['customer-deliveries'] })
      invalidateBranchTreeQueries(queryClient)
      toast.success('Shop order booked successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to book shop order'))
    },
  })
}
