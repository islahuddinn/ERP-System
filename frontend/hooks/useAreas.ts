import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import { invalidateBranchTreeQueries } from '@/hooks/useBranches'
import type { TerritoryStatus, TerritoryMeta } from './useRegions'

export interface Area {
  id: string
  name: string
  branchId: string
  status: TerritoryStatus
  createdAt: string
  updatedAt: string
  // Full breadcrumb up to Region, each level narrowed to { id, name }.
  branch?: {
    id: string
    name: string
    city?: {
      id: string
      name: string
      zone?: { id: string; name: string; region?: { id: string; name: string } }
    }
  }
  // Note: Area has no _count and no /tree endpoint — it is the leaf of the hierarchy.
}

export interface AreaDropdownItem {
  id: string
  name: string
  branchId: string
}

export interface AreaFilters {
  search?: string
  status?: TerritoryStatus
  branchId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface AreasResponse {
  data: Area[]
  meta: TerritoryMeta | null
}

export interface AreaPayload {
  name: string
  branchId: string
  status?: TerritoryStatus
}

const KEY = 'sales-areas'

export function useAreas(
  filters: AreaFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<AreasResponse> => {
      const { data: response } = await apiClient.get('/sales-management/areas', { params: filters })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

export function useArea(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/sales-management/areas/${id}`)
      return (response?.data || response) as Area
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

// Pass a branchId to scope the dropdown to one branch (used by the Customer form).
export function useAreasDropdown(branchId?: string) {
  return useQuery({
    queryKey: [KEY, 'dropdown', branchId ?? null],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/sales-management/areas/dropdown', {
        params: branchId ? { branchId } : {},
      })
      const responseData = response?.data || response
      return (Array.isArray(responseData) ? responseData : []) as AreaDropdownItem[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateArea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: AreaPayload) => {
      const { data: response } = await apiClient.post('/sales-management/areas', data)
      return response?.data || response
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      invalidateBranchTreeQueries(queryClient, variables.branchId)
      toast.success('Area created successfully')
    },
  })
}

export function useUpdateArea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AreaPayload> }) => {
      const { data: response } = await apiClient.patch(`/sales-management/areas/${id}`, data)
      return response?.data || response
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: [KEY, variables.id] })
      const branchId = variables.data.branchId ?? result?.branchId
      invalidateBranchTreeQueries(queryClient, branchId)
      toast.success('Area updated successfully')
    },
  })
}

export function useDeleteArea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/sales-management/areas/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      invalidateBranchTreeQueries(queryClient)
      toast.success('Area deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete area'))
    },
  })
}
