import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryStatus, TerritoryMeta } from './useRegions'

// Resolved on list/detail (users-map pattern), but NOT inside the tree endpoint.
export interface BranchDistributor {
  id: string
  employeeCode: string
  user?: { id: string; firstName: string; lastName: string; phone: string | null }
}
export interface BranchProductGroup {
  id: string
  name: string
  status: TerritoryStatus
}
export interface BranchCityBreadcrumb {
  id: string
  name: string
  zone?: { id: string; name: string; region?: { id: string; name: string } }
}

export interface Branch {
  id: string
  code: string
  name: string
  cityId: string
  distributorId: string
  address: string
  productGroupIds: string[]
  status: TerritoryStatus
  priceTier?: string | null
  type?: 'PRIMARY' | 'SECONDARY'
  parentBranchId?: string | null
  createdAt: string
  updatedAt: string
  city?: BranchCityBreadcrumb
  distributor?: BranchDistributor
  productGroups?: BranchProductGroup[]
  _count?: { areas: number }
}

export interface BranchDropdownItem {
  id: string
  name: string
  cityId: string
}

export interface BranchTreeCustomerNode {
  id: string
  shopName: string
  code: string
  phone: string
  status: TerritoryStatus
  address: string
}

export interface BranchTreeAreaNode {
  id: string
  name: string
  status: TerritoryStatus
  customers?: BranchTreeCustomerNode[]
}

export interface BranchTree {
  id: string
  name: string
  status: TerritoryStatus
  areas: BranchTreeAreaNode[]
}

export interface BranchFilters {
  search?: string
  status?: TerritoryStatus
  cityId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface BranchesResponse {
  data: Branch[]
  meta: TerritoryMeta | null
}

export type BranchType = 'PRIMARY' | 'SECONDARY'

export interface BranchPayload {
  type?: BranchType
  code: string
  name: string
  cityId: string
  distributorId: string
  address: string
  productGroupIds: string[]
  parentBranchId?: string
  status?: TerritoryStatus
  priceTier?: string
}

const KEY = 'sales-branches'

/** Invalidate cached branch tree responses (e.g. after area/customer mutations). */
export function invalidateBranchTreeQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  branchId?: string,
) {
  if (branchId) {
    queryClient.invalidateQueries({ queryKey: [KEY, branchId, 'tree'] })
    return
  }
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === KEY && query.queryKey[2] === 'tree',
  })
}

export function useBranches(filters: BranchFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<BranchesResponse> => {
      const { data: response } = await apiClient.get('/sales-management/branches', { params: filters })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useBranch(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/sales-management/branches/${id}`)
      return (response?.data || response) as Branch
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

// Pass a cityId to scope the dropdown to one city (cascading Area create form).
export function useBranchesDropdown(cityId?: string) {
  return useQuery({
    queryKey: [KEY, 'dropdown', cityId ?? null],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/sales-management/branches/dropdown', {
        params: cityId ? { cityId } : {},
      })
      const responseData = response?.data || response
      return (Array.isArray(responseData) ? responseData : []) as BranchDropdownItem[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useBranchTree(id: string) {
  return useQuery({
    queryKey: [KEY, id, 'tree'],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/sales-management/branches/${id}/tree`)
      return (response?.data || response) as BranchTree
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: BranchPayload) => {
      const { data: response } = await apiClient.post('/sales-management/branches', data)
      return response?.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Branch created successfully')
    },
  })
}

export function useUpdateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BranchPayload> }) => {
      const { data: response } = await apiClient.patch(`/sales-management/branches/${id}`, data)
      return response?.data || response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: [KEY, variables.id] })
      toast.success('Branch updated successfully')
    },
  })
}

export function useDeleteBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/sales-management/branches/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Branch deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete branch'))
    },
  })
}
