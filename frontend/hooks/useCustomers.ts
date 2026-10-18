import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import { invalidateBranchTreeQueries } from '@/hooks/useBranches'

export type CustomerStatus = 'ACTIVE' | 'INACTIVE'
export type CustomerType = 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR'
export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'MOBILE_PAYMENT'
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'OTHER'
  | 'CREDIT'

export interface CustomerRecentSale {
  id: string
  saleNumber: string
  saleDate: string
  totalAmount: number
  status: string
  paymentStatus: string
}

export interface CustomerCategoryLookup {
  id: string
  name: string
  status: string
}

export interface CustomerAreaLookup {
  id: string
  name: string
  branch?: {
    id: string
    name: string
    city?: { id: string; name: string }
  }
}

export interface Customer {
  id: string
  code: string
  shopName: string
  shopkeeperName?: string | null
  phone: string
  email?: string | null
  cnic: string
  customerType: CustomerType
  categoryId: string
  paymentMode: PaymentMethod
  address: string
  areaId: string
  remarks?: string | null
  status: CustomerStatus
  balance: number
  creditLimit?: number | null
  priceTier?: string
  createdAt: string
  updatedAt: string
  category?: CustomerCategoryLookup
  area?: CustomerAreaLookup
  sales?: CustomerRecentSale[]
}

export interface CustomerDropdownItem {
  id: string
  code: string
  shopName: string
  phone?: string | null
}

export interface CustomerStats {
  totalSales: number
  totalAmount: number
  totalPaid: number
  outstandingBalance: number
  averageSaleValue: number
  lastSaleDate: string | null
  salesThisMonth: number
  amountThisMonth: number
}

export interface CustomerFilters {
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  status?: CustomerStatus
  customerType?: CustomerType
  categoryId?: string
  areaId?: string
}

export interface CustomerMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext?: boolean
  hasPrev?: boolean
}

export interface CustomersResponse {
  data: Customer[]
  meta: CustomerMeta | null
}

export interface CustomerPayload {
  shopName: string
  shopkeeperName?: string
  phone: string
  email?: string
  cnic: string
  customerType: CustomerType
  categoryId: string
  paymentMode: PaymentMethod
  address: string
  areaId: string
  remarks?: string
  status?: CustomerStatus
  creditLimit: number
}

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: async (): Promise<CustomersResponse> => {
      const { data: response } = await apiClient.get('/customers', { params: filters })
      return {
        data: response?.data ?? response ?? [],
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/customers/${id}`)
      return (response?.data || response) as Customer
    },
    enabled: !!id,
  })
}

export function useCustomersDropdown() {
  return useQuery({
    queryKey: ['customers', 'dropdown'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/customers/dropdown')
      const responseData = response?.data || response
      return (Array.isArray(responseData) ? responseData : []) as CustomerDropdownItem[]
    },
  })
}

export function useCustomerStats(id: string) {
  return useQuery({
    queryKey: ['customers', id, 'stats'],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/customers/${id}/stats`)
      return (response?.data || response) as CustomerStats
    },
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CustomerPayload) => {
      const { data: response } = await apiClient.post('/customers', data)
      return (response?.data || response) as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-ledger-overview'] })
      invalidateBranchTreeQueries(queryClient)
      toast.success('Customer created successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to create customer'))
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomerPayload> }) => {
      const { data: response } = await apiClient.patch(`/customers/${id}`, data)
      return (response?.data || response) as Customer
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['customer-ledger-overview'] })
      invalidateBranchTreeQueries(queryClient)
      toast.success('Customer updated successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to update customer'))
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/customers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-ledger-overview'] })
      invalidateBranchTreeQueries(queryClient)
      toast.success('Customer deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete customer'))
    },
  })
}
