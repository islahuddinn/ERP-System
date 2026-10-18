import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from '@/hooks/useRegions'

export interface SalesPersonAssignmentEmployee {
  id: string
  employeeCode: string
  user: {
    id: string
    firstName: string
    lastName: string
    phone: string | null
  } | null
}

export interface SalesPersonAssignmentBranch {
  id: string
  name: string
  code: string
}

export interface SalesPersonAssignment {
  id: string
  employeeId: string
  branchId: string
  createdAt: string
  updatedAt: string
  employee: SalesPersonAssignmentEmployee
  branch: SalesPersonAssignmentBranch
}

export interface SalesPersonAssignmentFilters {
  branchId?: string
  page?: number
  limit?: number
}

export interface SalesPersonAssignmentsResponse {
  data: SalesPersonAssignment[]
  meta: TerritoryMeta | null
}

export interface AssignSalesPersonPayload {
  employeeId: string
}

const KEY = 'sales-person-assignments'

export function formatSalesPersonName(assignment: Pick<SalesPersonAssignment, 'employee'>): string {
  const { employee } = assignment
  if (employee.user) {
    return `${employee.user.firstName} ${employee.user.lastName} (${employee.employeeCode})`
  }
  return employee.employeeCode
}

export function useSalesPersonAssignments(filters: SalesPersonAssignmentFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<SalesPersonAssignmentsResponse> => {
      const { data: response } = await apiClient.get('/sales-management/sales-person-assignments', {
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

export function useAssignSalesPerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AssignSalesPersonPayload) => {
      const { data: response } = await apiClient.post('/sales-management/sales-person-assignments', payload)
      return (response?.data || response) as SalesPersonAssignment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Sales person assigned successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to assign sales person'))
    },
  })
}

export function useUnassignSalesPerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (employeeId: string) => {
      await apiClient.delete(`/sales-management/sales-person-assignments/${employeeId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      toast.success('Sales person unassigned successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to unassign sales person'))
    },
  })
}
