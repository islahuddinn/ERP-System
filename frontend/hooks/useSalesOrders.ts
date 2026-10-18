import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'

export interface SalesOrder {
  id: string
  orderNumber: string
  customer: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  broker?: {
    id: string
    name: string
    brokerCode: string
  }
  orderDate: string
  expectedDate?: string
  status: 'DRAFT' | 'CONFIRMED' | 'SHIPPED' | 'INVOICED' | 'PAID' | 'CANCELLED'
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID'
  totalAmount: number
  amountPaid: number
  remarks?: string
  items: Array<{
    id: string
    product: {
      id: string
      name: string
      sku: string
      uom: {
        symbol: string
      }
    }
    quantity: number
    sellingPrice: number
    totalPrice: number
  }>
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface CreateSalesOrderDto {
  customerId: string
  referenceNo?: string
  orderDate: string
  expectedDate?: string
  salesType?: string
  paymentTerms?: string
  remarks?: string
  items: Array<{
    productId: string
    quantity: number
    sellingPrice: number
    totalPrice: number
  }>
}

export interface UpdateSalesOrderDto {
  referenceNo?: string
  expectedDate?: string
  remarks?: string
  status?: 'DRAFT' | 'CONFIRMED' | 'SHIPPED' | 'INVOICED' | 'PAID' | 'CANCELLED'
  amountPaid?: number
  paymentStatus?: 'PENDING' | 'PARTIAL' | 'PAID'
}

export interface SalesOrderQueryParams {
  search?: string
  customerId?: string
  status?: 'DRAFT' | 'CONFIRMED' | 'SHIPPED' | 'INVOICED' | 'PAID' | 'CANCELLED'
  paymentStatus?: 'PENDING' | 'PARTIAL' | 'PAID'
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

// Get all sales orders
export const useSalesOrders = (params: SalesOrderQueryParams = {}) => {
  return useQuery({
    queryKey: ['sales-orders', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, value.toString())
        }
      })

      const { data: response } = await apiClient.get(`/pos/sales?${searchParams.toString()}`)
      // Backend ResponseInterceptor wraps: { success: true, data: { data: [...], meta: {...} }, message: "..." }
      // Extract the actual data from the wrapped response
      const responseData = response?.data || response
      return responseData
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get single sales order
export const useSalesOrder = (id: string) => {
  return useQuery({
    queryKey: ['sales-order', id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/pos/sales/${id}`)
      // Extract data from wrapped response: { success: true, data: {...}, message: "..." }
      return response?.data || response
    },
    enabled: !!id,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// Create sales order
export const useCreateSalesOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      // Data is already transformed in the component
      const { data: response } = await apiClient.post('/pos/sales', data)
      // Extract data from wrapped response: { success: true, data: {...}, message: "..." }
      return response?.data || response
    },
    onSuccess: async (newOrder) => {
      // Optimistically update all sales order queries with the new order
      queryClient.setQueriesData({ queryKey: ['sales-orders'] }, (oldData: any) => {
        if (!oldData) return oldData

        // Handle different response structures
        const dataArray = Array.isArray(oldData)
          ? oldData
          : (oldData?.data || [])

        // Check if order already exists (avoid duplicates)
        if (dataArray.some((o: any) => o.id === newOrder?.id)) {
          return oldData
        }

        // Add new order to the beginning of the array
        if (Array.isArray(oldData)) {
          return [newOrder, ...oldData]
        } else if (oldData?.data) {
          return {
            ...oldData,
            data: [newOrder, ...dataArray],
            meta: oldData.meta ? {
              ...oldData.meta,
              total: (oldData.meta.total || 0) + 1
            } : undefined
          }
        }
        return oldData
      })

      // Invalidate and refetch all sales order queries
      await queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      // Explicitly refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: ['sales-orders'] })
      toast.success('Sales order created successfully')
    },
    onError: (error: any) => {
      console.error('Sales order creation error:', error)
      toast.error(error.response?.data?.message || 'Failed to create sales order')
    },
  })
}

// Update sales order
export const useUpdateSalesOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSalesOrderDto }) => {
      const { data: response } = await apiClient.patch(`/pos/sales/${id}`, data)
      // Extract data from wrapped response: { success: true, data: {...}, message: "..." }
      return response?.data || response
    },
    onSuccess: async (_, { id }) => {
      await queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      await queryClient.invalidateQueries({ queryKey: ['sales-order', id] })
      await queryClient.refetchQueries({ queryKey: ['sales-orders'] })
      toast.success('Sales order updated successfully')
    },
  })
}

// Add payment to sale
export const useAddSalePayment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ saleId, data }: { saleId: string; data: any }) => {
      const { data: response } = await apiClient.post(`/pos/sales/${saleId}/payments`, data)
      return response?.data || response
    },
    onSuccess: async (_, { saleId }) => {
      await queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      await queryClient.invalidateQueries({ queryKey: ['sales-order', saleId] })
      await queryClient.refetchQueries({ queryKey: ['sales-orders'] })
      await queryClient.refetchQueries({ queryKey: ['sales-order', saleId] })
      toast.success('Payment added successfully')
    },
    onError: (error: any) => {
      console.error('Add payment error:', error)
      toast.error(error.response?.data?.message || 'Failed to add payment')
    },
  })
}

// Delete sales order
export const useDeleteSalesOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/pos/sales/${id}`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      await queryClient.refetchQueries({ queryKey: ['sales-orders'] })
      toast.success('Sales order deleted successfully')
    },
  })
}

