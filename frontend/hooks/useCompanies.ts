import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { isDummyDataEnabled } from '@/lib/dummy-data'

const getUseDummyData = () => isDummyDataEnabled()

export interface Company {
  id: string
  name: string
  code?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  productCount?: number
}

export const useCompanies = (params?: { search?: string; page?: number; limit?: number; isActive?: boolean }) => {
  return useQuery<{ data: Company[]; meta: any }>({
    queryKey: ['companies', params],
    queryFn: async () => {
      if (getUseDummyData()) {
        return { data: [], meta: { total: 0 } }
      }
      const searchParams = new URLSearchParams()
      if (params?.search) searchParams.set('search', params.search)
      if (params?.page) searchParams.set('page', String(params.page))
      if (params?.limit) searchParams.set('limit', String(params.limit))
      if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive))
      const res = await apiClient.get(`/companies?${searchParams.toString()}`)
      return res.data
    },
  })
}

export const useCreateCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; code?: string }) => {
      const res = await apiClient.post('/companies', data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
    }
  })
}

export const useUpdateCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Company> }) => {
      const res = await apiClient.patch(`/companies/${id}`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] })
  })
}

export const useDeleteCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/companies/${id}`)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
    },
    onError: (error: any) => {
      // Error will be handled by the component
      throw error
    }
  })
}


