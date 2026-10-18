import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'
import {
  formatSalesPersonName,
  type CustomerOrderSalesPerson,
} from './useCustomerOrders'
import type { CustomerDeliveryItem } from './useCustomerDeliveries'

export type CustomerReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type CustomerReturnReason = 'DAMAGED' | 'UNSOLD' | 'EXPIRED' | 'OTHER'

export interface CustomerReturnCustomer {
  id: string
  code: string
  shopName: string
}

export interface CustomerReturnProduct {
  id: string
  name: string
  code: string
}

export interface CustomerReturnDeliveryItem {
  id: string
  quantity: number
  unitPrice: number | string
  delivery: {
    id: string
    deliveryNumber: string
    salesPersonId: string
  }
}

export interface CustomerReturn {
  id: string
  returnNumber: string
  customerId: string
  salesPersonId: string
  deliveryItemId: string
  productId: string
  quantity: number
  unitPrice: number | string
  totalAmount: number | string
  reason: CustomerReturnReason
  status: CustomerReturnStatus
  approvedById: string | null
  approvedAt: string | null
  returnDate: string
  notes?: string | null
  createdAt: string
  updatedAt: string
  customer?: CustomerReturnCustomer
  salesPerson?: CustomerOrderSalesPerson
  approvedBy?: CustomerOrderSalesPerson | null
  product?: CustomerReturnProduct
  deliveryItem?: CustomerReturnDeliveryItem
}

export interface CustomerReturnFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  customerId?: string
  salesPersonId?: string
  productId?: string
  deliveryItemId?: string
  status?: CustomerReturnStatus
}

export interface CustomerReturnsResponse {
  data: CustomerReturn[]
  meta: TerritoryMeta | null
}

export interface CreateCustomerReturnPayload {
  deliveryItemId: string
  quantity: number
  reason: CustomerReturnReason
  notes?: string
}

export interface ReturnableQuantitySummary {
  deliveredQuantity: number
  returnedQuantity: number
  remainingQuantity: number
}

const KEY = 'customer-returns'

export const CUSTOMER_RETURN_REASON_LABELS: Record<CustomerReturnReason, string> = {
  DAMAGED: 'Damaged',
  UNSOLD: 'Unsold',
  EXPIRED: 'Expired',
  OTHER: 'Other',
}

export const CUSTOMER_RETURN_STATUS_LABELS: Record<CustomerReturnStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export function formatReturnSalesPersonName(
  salesPerson?: CustomerOrderSalesPerson | null,
): string {
  return formatSalesPersonName(salesPerson ?? undefined)
}

/** Sum non-rejected return quantities per delivery line — mirrors backend guard. */
export function buildReturnedQuantityByDeliveryItemId(
  returns: CustomerReturn[],
): Record<string, number> {
  const totals: Record<string, number> = {}

  for (const customerReturn of returns) {
    if (customerReturn.status === 'REJECTED') continue

    totals[customerReturn.deliveryItemId] =
      (totals[customerReturn.deliveryItemId] ?? 0) + Number(customerReturn.quantity)
  }

  return totals
}

export function computeReturnableQuantityForItem(
  deliveryItem: Pick<CustomerDeliveryItem, 'id' | 'quantity'>,
  returnedByItemId: Record<string, number>,
): ReturnableQuantitySummary {
  const deliveredQuantity = Number(deliveryItem.quantity)
  const returnedQuantity = returnedByItemId[deliveryItem.id] ?? 0
  const remainingQuantity = Math.max(deliveredQuantity - returnedQuantity, 0)

  return { deliveredQuantity, returnedQuantity, remainingQuantity }
}

export function computeReturnableQuantitiesForDeliveryItems(
  deliveryItems: CustomerDeliveryItem[],
  existingReturns: CustomerReturn[],
): Record<string, ReturnableQuantitySummary> {
  const returnedByItemId = buildReturnedQuantityByDeliveryItemId(existingReturns)

  return Object.fromEntries(
    deliveryItems.map((item) => [item.id, computeReturnableQuantityForItem(item, returnedByItemId)]),
  )
}

function invalidateReturnRelatedQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  customerReturn?: CustomerReturn,
) {
  queryClient.invalidateQueries({ queryKey: [KEY] })

  if (customerReturn?.id) {
    queryClient.invalidateQueries({ queryKey: [KEY, customerReturn.id] })
  }

  if (customerReturn?.customerId) {
    queryClient.invalidateQueries({
      queryKey: [KEY, 'by-customer', customerReturn.customerId],
    })
  }

  queryClient.invalidateQueries({ queryKey: ['customer-ledger'] })
  queryClient.invalidateQueries({ queryKey: ['customer-ledger-overview'] })
  queryClient.invalidateQueries({ queryKey: ['customer-deliveries'] })
}

export function useCustomerReturns(customerReturnFilters: CustomerReturnFilters = {}) {
  return useQuery({
    queryKey: [KEY, customerReturnFilters],
    queryFn: async (): Promise<CustomerReturnsResponse> => {
      const { data: response } = await apiClient.get('/customer-management/customer-returns', {
        params: customerReturnFilters,
      })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

/** Fetch returns for one shop — used on create screen to compute remaining returnable qty per line. */
export function useCustomerReturnsForCustomer(
  customerId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [KEY, 'by-customer', customerId],
    queryFn: async (): Promise<CustomerReturn[]> => {
      const { data: response } = await apiClient.get('/customer-management/customer-returns', {
        params: { customerId, limit: 200, sortBy: 'returnDate', sortOrder: 'DESC' },
      })
      return response?.data ?? (Array.isArray(response) ? response : [])
    },
    enabled: !!customerId && (options?.enabled ?? true),
    staleTime: 0,
  })
}

export function useCustomerReturn(returnId: string) {
  return useQuery({
    queryKey: [KEY, returnId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(
        `/customer-management/customer-returns/${returnId}`,
      )
      return (response?.data || response) as CustomerReturn
    },
    enabled: !!returnId,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateCustomerReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (createCustomerReturnPayload: CreateCustomerReturnPayload) => {
      const { data: response } = await apiClient.post(
        '/customer-management/customer-returns',
        createCustomerReturnPayload,
      )
      return (response?.data || response) as CustomerReturn
    },
    onSuccess: (customerReturn) => {
      invalidateReturnRelatedQueries(queryClient, customerReturn)
      toast.success(`Return ${customerReturn.returnNumber} recorded — pending approval`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to record shop return'))
    },
  })
}

export function useApproveCustomerReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (returnId: string) => {
      const { data: response } = await apiClient.patch(
        `/customer-management/customer-returns/${returnId}/approve`,
      )
      return (response?.data || response) as CustomerReturn
    },
    onSuccess: (customerReturn) => {
      invalidateReturnRelatedQueries(queryClient, customerReturn)
      toast.success(`Return ${customerReturn.returnNumber} approved — stock and ledger updated`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to approve shop return'))
    },
  })
}

export function useRejectCustomerReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (returnId: string) => {
      const { data: response } = await apiClient.patch(
        `/customer-management/customer-returns/${returnId}/reject`,
      )
      return (response?.data || response) as CustomerReturn
    },
    onSuccess: (customerReturn) => {
      invalidateReturnRelatedQueries(queryClient, customerReturn)
      toast.success(`Return ${customerReturn.returnNumber} rejected`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to reject shop return'))
    },
  })
}

export function validateReturnQuantity(
  quantity: number,
  remainingQuantity: number,
  productName?: string,
): string | null {
  const label = productName ?? 'this product'

  if (Number.isNaN(quantity)) {
    return `Enter a return quantity for ${label}.`
  }

  if (quantity <= 0) {
    return `Return quantity must be greater than zero for ${label}.`
  }

  if (quantity > remainingQuantity) {
    return `Cannot return ${quantity} — only ${remainingQuantity} remains returnable for ${label}.`
  }

  return null
}
