import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from '@/hooks/useRegions'

export type CustomerCategoryStatus = 'ACTIVE' | 'INACTIVE'

export interface CustomerCategory {
  id: string
  name: string
  status: CustomerCategoryStatus
  createdAt: string
  updatedAt: string
}

export interface CustomerCategoryDropdownItem {
  id: string
  name: string
}

export interface CustomerCategoryFilters {
  search?: string
  status?: CustomerCategoryStatus
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface CustomerCategoriesResponse {
  data: CustomerCategory[]
  meta: TerritoryMeta | null
}

export interface CustomerCategoryPayload {
  name: string
  status?: CustomerCategoryStatus
}

const KEY = 'customer-categories'

export function useCustomerCategories(filters: CustomerCategoryFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<CustomerCategoriesResponse> => {
      const { data: response } = await apiClient.get('/customer-categories', { params: filters })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useCustomerCategory(customerCategoryId: string) {
  return useQuery({
    queryKey: [KEY, customerCategoryId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/customer-categories/${customerCategoryId}`)
      return (response?.data || response) as CustomerCategory
    },
    enabled: !!customerCategoryId,
  })
}

export function useCustomerCategoriesDropdown() {
  return useQuery({
    queryKey: [KEY, 'dropdown'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/customer-categories/dropdown')
      const responseData = response?.data || response
      return (Array.isArray(responseData) ? responseData : []) as CustomerCategoryDropdownItem[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateCustomerCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CustomerCategoryPayload) => {
      const { data: response } = await apiClient.post('/customer-categories', payload)
      return (response?.data || response) as CustomerCategory
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Customer category created successfully')
    },
  })
}

export function useUpdateCustomerCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      customerCategoryId,
      data,
    }: {
      customerCategoryId: string
      data: Partial<CustomerCategoryPayload>
    }) => {
      const { data: response } = await apiClient.patch(
        `/customer-categories/${customerCategoryId}`,
        data,
      )
      return (response?.data || response) as CustomerCategory
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: [KEY, variables.customerCategoryId] })
      toast.success('Customer category updated successfully')
    },
  })
}

export function useDeleteCustomerCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (customerCategoryId: string) => {
      await apiClient.delete(`/customer-categories/${customerCategoryId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Customer category deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete customer category'))
    },
  })
}
