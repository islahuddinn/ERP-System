import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { AuditLog } from './useAuditLogs'
import { isDummyDataEnabled } from '@/lib/dummy-data'

const getUseDummyData = () => isDummyDataEnabled()

// Login access is the new backend's account state (replaces the old free-form
// role/status enums). Roles are now dynamic rows in the Role table (roleId).
export type LoginAccess = 'ENABLED' | 'DISABLED' | 'SUSPENDED'

// Legacy type aliases kept so pre-existing consumers keep compiling. Roles are
// no longer a fixed enum — they are dynamic Role records referenced by roleId.
export type UserRole = string
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  roleId: string
  loginAccess: LoginAccess
  createdAt: string
  updatedAt: string
  // Derived / legacy-compatibility fields (populated by the hooks below so older
  // consumers that read `name`/`role` keep working).
  name?: string
  role?: string
  status?: UserStatus
  avatar?: string | null
  lastLoginAt?: string | null
}

export interface UserFilters {
  page?: number
  limit?: number
  roleId?: string
  loginAccess?: LoginAccess
  search?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  // Legacy filter keys tolerated (ignored by the backend's DTO whitelist).
  role?: string
  status?: UserStatus
}

export interface UpdateUserData {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string | null
  // Legacy fields tolerated for backward-compat; stripped by the backend whitelist.
  name?: string
  role?: string
  status?: UserStatus
}

export interface Permission {
  id: string
  name: string
  description: string | null
  module: string
  action: string
}

export interface UserPermissionsResponse {
  permissions: string[]
  rolePermissions: Permission[]
  userPermissions: Permission[]
}

// Compose a display name from the new firstName/lastName fields, falling back to
// email so lists/detail headers never render blank.
export const buildUserName = (u: Partial<User>): string => {
  const full = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
  return full || u.email || 'Unknown'
}

// Normalize a raw backend user into the shape consumers expect (adds `name`).
const normalizeUser = (raw: any): User => ({
  ...raw,
  name: buildUserName(raw),
  role: raw?.role ?? raw?.roleId,
})

// Get all users with filters — GET /users
export const useUsers = (filters?: UserFilters) => {
  return useQuery<{ data: User[]; meta: any }>({
    queryKey: ['users', filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (getUseDummyData()) {
        return { data: [], meta: { total: 0, page: 1, limit: 10 } }
      }
      const { data: body } = await apiClient.get('/users', { params: filters })
      const rows = Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body)
          ? body
          : (body?.data?.data ?? [])
      const meta = body?.meta ?? body?.data?.meta ?? null
      return { data: (rows as any[]).map(normalizeUser), meta }
    },
  })
}

// Lightweight dropdown list of active users — GET /users/dropdown
// Returns { id, firstName, lastName, email, roleId }; we add a `name` and keep
// `role` for older callers that render it as a label.
export const useUsersDropdown = (role?: string) => {
  return useQuery<Pick<User, 'id' | 'name' | 'email' | 'role'>[]>({
    queryKey: ['users', 'dropdown', role],
    queryFn: async () => {
      if (getUseDummyData()) return []
      const { data: body } = await apiClient.get('/users/dropdown', {
        params: role ? { roleId: role } : {},
      })
      const responseData = body?.data ?? body
      const users: any[] = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.data)
          ? responseData.data
          : []
      return users.map((u) => ({
        id: u.id,
        name: buildUserName(u),
        email: u.email,
        role: u.roleId,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Get single user — GET /users/:userId
export const useUser = (id: string) => {
  return useQuery<User>({
    queryKey: ['user', id],
    queryFn: async () => {
      const { data: body } = await apiClient.get(`/users/${id}`)
      return normalizeUser(body?.data ?? body)
    },
    enabled: !!id,
    // The details screen must reflect a role reassignment or profile edit without
    // a manual refresh (#10). Always treat as stale + refetch on mount.
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

// Get current user — GET /users/me
export const useCurrentUser = () => {
  return useQuery<User>({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: body } = await apiClient.get('/users/me')
      return normalizeUser(body?.data ?? body)
    },
  })
}

// Get user permissions — GET /users/:id/permissions.
// DO NOT change this hook's endpoint or return shape: usePermissionCheck (and
// therefore app-wide route gating) depends on `{ permissions: string[] }`.
export const useUserPermissions = (id: string) => {
  return useQuery<UserPermissionsResponse>({
    queryKey: ['user-permissions', id],
    queryFn: async () => {
      if (getUseDummyData()) {
        return { permissions: ['*'], rolePermissions: [], userPermissions: [] }
      }
      const res = await apiClient.get(`/users/${id}/permissions`)
      const body: any = res.data
      return (body?.data ?? body) as UserPermissionsResponse
    },
    enabled: !!id,
    // A role's permissions can change in Role Management; the user's Permissions
    // tab must reflect that without a hard refresh (#11/#12). Always refetch on
    // mount so re-opening the tab shows the latest effective permissions.
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

// Update user profile — PATCH /users/:userId (firstName, lastName, email, phone)
export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserData }) => {
      const res = await apiClient.patch(`/users/${id}`, data)
      return res.data
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user', variables.id] })
      qc.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'User', variables.id] })
    },
  })
}

// Deactivate user — DELETE /users/:userId (disables login access)
export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/users/${id}`)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deactivated successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to deactivate user'))
    },
  })
}

// Change login access — PUT /users/:userId/status ({ loginAccess })
export const useChangeUserStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, loginAccess }: { id: string; loginAccess: LoginAccess }) => {
      const res = await apiClient.put(`/users/${id}/status`, { loginAccess })
      return res.data
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user', variables.id] })
    },
  })
}

// Reset password (admin) — PUT /users/:userId/password ({ newPassword })
export const useResetUserPassword = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      const res = await apiClient.put(`/users/${id}/password`, { newPassword })
      return res.data
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['user', variables.id] })
    },
  })
}

// Change role — PUT /users/:userId/role ({ roleId })
export const useChangeUserRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, roleId }: { id: string; roleId: string }) => {
      const res = await apiClient.put(`/users/${id}/role`, { roleId })
      return res.data
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user', variables.id] })
      qc.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'User', variables.id] })
    },
  })
}

// Get audit logs for a user — GET /audit-logs?userId=
// The ResponseInterceptor nests the payload under `data` as
// { logs, total, page, limit, totalPages } (same envelope as useAuditLogs), so
// we unwrap and always return the `logs` array — never the raw object, which
// would break `.map`/`.length` on the consumer.
export const useUserAuditLogs = (userId: string, limit: number = 50) => {
  return useQuery<AuditLog[]>({
    queryKey: ['user-audit-logs', userId, limit],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/audit-logs?userId=${userId}&limit=${limit}`)
      const payload = response?.data ?? response
      if (Array.isArray(payload?.logs)) return payload.logs as AuditLog[]
      if (Array.isArray(payload)) return payload as AuditLog[]
      return []
    },
    enabled: !!userId,
  })
}
