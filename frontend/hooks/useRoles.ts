import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

// A single permission attached to a role, as returned inside a Role's
// `rolePermissions` array by GET /roles and GET /roles/:roleId.
export interface RolePermissionEntry {
    id: string
    roleId: string
    permissionId: string
    permission: {
        id: string
        name: string
        module: string
        action: string
        description: string | null
    }
}

export interface Role {
    id: string
    name: string
    description: string | null
    isSystem: boolean
    isActive: boolean
    createdAt: string
    updatedAt: string
    rolePermissions: RolePermissionEntry[]
    _count?: { users: number }
}

export interface RoleDropdownItem {
    id: string
    name: string
    isSystem: boolean
}

export interface RoleFilters {
    search?: string
    isSystem?: boolean
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export interface RoleMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface RolesResponse {
    data: Role[]
    meta: RoleMeta | null
}

export interface CreateRolePayload {
    name: string
    description?: string | null
    permissionIds?: string[]
}

export interface UpdateRolePayload {
    name?: string
    description?: string | null
}

// LIST — GET /roles (paginated, searchable, filter by isSystem)
export function useRoles(filters: RoleFilters = {}) {
    return useQuery({
        queryKey: ['roles', filters],
        queryFn: async (): Promise<RolesResponse> => {
            const { data: response } = await apiClient.get('/roles', { params: filters })
            return {
                data: response?.data ?? (Array.isArray(response) ? response : []),
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
    })
}

// DETAIL — GET /roles/:roleId (includes rolePermissions + _count.users)
export function useRole(roleId: string) {
    return useQuery({
        queryKey: ['roles', roleId],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/roles/${roleId}`)
            return (response?.data || response) as Role
        },
        enabled: !!roleId,
    })
}

// DROPDOWN — GET /roles/dropdown (id, name, isSystem)
export function useRolesDropdown() {
    return useQuery({
        queryKey: ['roles', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/roles/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as RoleDropdownItem[]
        },
        // The Users list Role dropdown and User Details role name are derived from
        // this list. Without forcing a refetch, a role that was renamed, created or
        // deleted in Role Management stays stale here until a hard refresh
        // (#2/#3/#4/#10). Always treat as stale + refetch on mount.
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

export function useCreateRole() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: CreateRolePayload) => {
            const { data: response } = await apiClient.post('/roles', payload)
            return (response?.data || response) as Role
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] })
            toast.success('Role created successfully')
        },
    })
}

export function useUpdateRole() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ roleId, data }: { roleId: string; data: UpdateRolePayload }) => {
            const { data: response } = await apiClient.patch(`/roles/${roleId}`, data)
            return (response?.data || response) as Role
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['roles'] })
            queryClient.invalidateQueries({ queryKey: ['roles', variables.roleId] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Role', variables.roleId] })
            toast.success('Role updated successfully')
        },
    })
}

export function useDeleteRole() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (roleId: string) => {
            await apiClient.delete(`/roles/${roleId}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] })
            toast.success('Role deleted successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to delete role'))
        },
    })
}

// PUT /roles/:roleId/permissions — replaces ALL permissions for the role.
export function useAssignRolePermissions() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
            const { data: response } = await apiClient.put(`/roles/${roleId}/permissions`, { permissionIds })
            return (response?.data || response) as Role
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['roles'] })
            queryClient.invalidateQueries({ queryKey: ['roles', variables.roleId] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Role', variables.roleId] })
            toast.success('Permissions updated successfully')
        },
    })
}
