import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

// A department reference embedded in parent / childDepartments relations.
export interface DepartmentRef {
    id: string
    name: string
}

export interface Department {
    id: string
    name: string
    description?: string | null
    parentDepartmentId?: string | null
    parent?: DepartmentRef | null
    childDepartments?: DepartmentRef[]
    _count?: { contracts: number }
    createdAt: string
    updatedAt: string
}

// A node in the /hr/departments/tree response — a Department with nested children.
export interface DepartmentTreeNode extends Department {
    children: DepartmentTreeNode[]
}

export interface DepartmentDropdownItem {
    id: string
    name: string
    parentDepartmentId: string | null
}

export interface DepartmentFilters {
    search?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export interface DepartmentMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface DepartmentsResponse {
    data: Department[]
    meta: DepartmentMeta | null
}

export interface DepartmentPayload {
    name: string
    description?: string | null
    parentDepartmentId?: string | null
}

export function useDepartments(filters: DepartmentFilters = {}) {
    return useQuery({
        queryKey: ['departments', filters],
        queryFn: async (): Promise<DepartmentsResponse> => {
            const { data: response } = await apiClient.get('/hr/departments', { params: filters })
            return {
                data: response?.data ?? (Array.isArray(response) ? response : []),
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
    })
}

export function useDepartment(id: string) {
    return useQuery({
        queryKey: ['departments', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/departments/${id}`)
            return (response?.data || response) as Department
        },
        enabled: !!id,
        // Always pull a fresh copy when the edit/detail screen mounts, so a cleared
        // description (or changed parent) never shows a stale cached value on reopen.
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

export function useDepartmentsDropdown() {
    return useQuery({
        queryKey: ['departments', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/hr/departments/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as DepartmentDropdownItem[]
        },
        // Departments can be added, renamed or deleted elsewhere; always refetch on
        // mount so every dropdown (contract create/edit, list filter) reflects the
        // latest set rather than a stale cached list.
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

export function useDepartmentTree() {
    return useQuery({
        queryKey: ['departments', 'tree'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/hr/departments/tree')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as DepartmentTreeNode[]
        },
    })
}

export function useCreateDepartment() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: DepartmentPayload) => {
            const { data: response } = await apiClient.post('/hr/departments', data)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] })
            toast.success('Department created successfully')
        },
    })
}

export function useUpdateDepartment() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<DepartmentPayload> }) => {
            const { data: response } = await apiClient.patch(`/hr/departments/${id}`, data)
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['departments'] })
            queryClient.invalidateQueries({ queryKey: ['departments', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Department', variables.id] })
            toast.success('Department updated successfully')
        },
    })
}

export function useDeleteDepartment() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hr/departments/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] })
            toast.success('Department deleted successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to delete department'))
        },
    })
}
