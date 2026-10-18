import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from '@/hooks/useRegions'

export type TransporterStatus = 'ACTIVE' | 'INACTIVE'

export interface Transporter {
  id: string
  code: string
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  address: string | null
  vehicleRegistration: string | null
  notes: string | null
  status: TransporterStatus
  createdAt: string
  updatedAt: string
}

export interface TransporterDropdownItem {
  id: string
  code: string
  name: string
  phone: string | null
}

export interface TransporterFilters {
  search?: string
  status?: TransporterStatus
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface TransportersResponse {
  data: Transporter[]
  meta: TerritoryMeta | null
}

export interface TransporterPayload {
  code: string
  name: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  vehicleRegistration?: string
  notes?: string
  status?: TransporterStatus
}

const KEY = 'transporters'

export function useTransporters(filters: TransporterFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<TransportersResponse> => {
      const { data: response } = await apiClient.get('/sales-management/transporters', { params: filters })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useTransporter(transporterId: string) {
  return useQuery({
    queryKey: [KEY, transporterId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/sales-management/transporters/${transporterId}`)
      return (response?.data || response) as Transporter
    },
    enabled: !!transporterId,
  })
}

export function useTransportersDropdown() {
  return useQuery({
    queryKey: [KEY, 'dropdown'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/sales-management/transporters/dropdown')
      const responseData = response?.data || response
      return (Array.isArray(responseData) ? responseData : []) as TransporterDropdownItem[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateTransporter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TransporterPayload) => {
      const { data: response } = await apiClient.post('/sales-management/transporters', payload)
      return (response?.data || response) as Transporter
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Transporter created successfully')
    },
  })
}

export function useUpdateTransporter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      transporterId,
      data,
    }: {
      transporterId: string
      data: Partial<TransporterPayload>
    }) => {
      const { data: response } = await apiClient.patch(
        `/sales-management/transporters/${transporterId}`,
        data,
      )
      return (response?.data || response) as Transporter
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: [KEY, variables.transporterId] })
      toast.success('Transporter updated successfully')
    },
  })
}

export function useDeleteTransporter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (transporterId: string) => {
      await apiClient.delete(`/sales-management/transporters/${transporterId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Transporter deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete transporter'))
    },
  })
}
