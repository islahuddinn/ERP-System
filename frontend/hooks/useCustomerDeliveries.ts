import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'
import { formatSalesPersonName, type CustomerOrderSalesPerson } from './useCustomerOrders'

export type CustomerDeliveryStatus = 'PENDING' | 'DELIVERED' | 'CANCELLED'

export interface CustomerDeliveryCustomer {
  id: string
  code: string
  shopName: string
}

export interface CustomerDeliveryOrder {
  id: string
  orderNumber: string
  status: string
}

export interface CustomerDeliveryProduct {
  id: string
  name: string
  code: string
}

export interface CustomerDeliveryItem {
  id: string
  deliveryId: string
  productId: string
  orderItemId: string | null
  quantity: number
  unitPrice: number | string
  totalAmount: number | string
  product?: CustomerDeliveryProduct
}

export interface CustomerDelivery {
  id: string
  deliveryNumber: string
  customerId: string
  salesPersonId: string
  orderId: string | null
  status: CustomerDeliveryStatus
  deliveredById: string | null
  deliveredAt: string | null
  deliveryDate: string
  subtotal: number | string
  discountAmount: number | string
  totalAmount: number | string
  notes?: string | null
  createdAt: string
  customer?: CustomerDeliveryCustomer
  salesPerson?: CustomerOrderSalesPerson
  deliveredBy?: CustomerOrderSalesPerson | null
  order?: CustomerDeliveryOrder | null
  items?: CustomerDeliveryItem[]
  _count?: { items: number }
}

export interface CustomerDeliveryFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  status?: CustomerDeliveryStatus
  customerId?: string
  salesPersonId?: string
  productId?: string
  orderId?: string
}

export interface CustomerDeliveriesResponse {
  data: CustomerDelivery[]
  meta: TerritoryMeta | null
}

export interface MarkCustomerDeliveryDeliveredItemPayload {
  deliveryItemId: string
  quantity: number
}

export interface MarkCustomerDeliveryDeliveredPayload {
  items?: MarkCustomerDeliveryDeliveredItemPayload[]
}

const KEY = 'customer-deliveries'

export function formatDeliverySalesPersonName(
  salesPerson?: CustomerOrderSalesPerson | null,
): string {
  return formatSalesPersonName(salesPerson ?? undefined)
}

export function useCustomerDeliveries(filters: CustomerDeliveryFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<CustomerDeliveriesResponse> => {
      const { data: response } = await apiClient.get('/customer-management/customer-deliveries', {
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

export function useCustomerDelivery(deliveryId: string) {
  return useQuery({
    queryKey: [KEY, deliveryId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(
        `/customer-management/customer-deliveries/${deliveryId}`,
      )
      return (response?.data || response) as CustomerDelivery
    },
    enabled: !!deliveryId,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useMarkCustomerDeliveryDelivered() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      deliveryId,
      markCustomerDeliveryDeliveredPayload,
    }: {
      deliveryId: string
      markCustomerDeliveryDeliveredPayload?: MarkCustomerDeliveryDeliveredPayload
    }) => {
      const { data: response } = await apiClient.patch(
        `/customer-management/customer-deliveries/${deliveryId}/deliver`,
        markCustomerDeliveryDeliveredPayload ?? {},
      )
      return (response?.data || response) as CustomerDelivery
    },
    onSuccess: (delivery) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: [KEY, delivery.id] })
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
      if (delivery.orderId) {
        queryClient.invalidateQueries({ queryKey: ['customer-orders', delivery.orderId] })
      }
      queryClient.invalidateQueries({ queryKey: ['customer-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['customer-ledger-overview'] })
      toast.success('Delivery marked as delivered successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to mark delivery as delivered'))
    },
  })
}

/** Build PATCH body — only send item overrides when quantities are reduced (short stock). */
export function buildMarkDeliveredPayload(
  items: CustomerDeliveryItem[],
  deliveredQuantities: Record<string, number>,
): MarkCustomerDeliveryDeliveredPayload {
  const overrides = items
    .filter((item) => {
      const deliveredQuantity = deliveredQuantities[item.id]
      return deliveredQuantity !== undefined && deliveredQuantity < item.quantity
    })
    .map((item) => ({
      deliveryItemId: item.id,
      quantity: deliveredQuantities[item.id],
    }))

  return overrides.length > 0 ? { items: overrides } : {}
}

export function validateDeliveredQuantities(
  items: CustomerDeliveryItem[],
  deliveredQuantities: Record<string, number>,
): string | null {
  if (items.length === 0) {
    return 'This delivery has no line items.'
  }

  for (const item of items) {
    const quantity = deliveredQuantities[item.id]

    if (quantity === undefined || Number.isNaN(quantity)) {
      return `Enter a delivered quantity for ${item.product?.name ?? 'each product'}.`
    }

    if (quantity <= 0) {
      return `Delivered quantity must be greater than zero for ${item.product?.name ?? 'each product'}.`
    }

    if (quantity > item.quantity) {
      return `Delivered quantity cannot exceed pending quantity (${item.quantity}) for ${item.product?.name ?? 'this product'}.`
    }
  }

  const totalDelivered = items.reduce((sum, item) => sum + (deliveredQuantities[item.id] ?? 0), 0)
  if (totalDelivered <= 0) {
    return 'At least one item must be delivered.'
  }

  return null
}
