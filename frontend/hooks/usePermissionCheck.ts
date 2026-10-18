import { useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'

/**
 * Hook to check user permissions.
 *
 * Permissions come straight from the LOGIN RESPONSE (the backend returns the user's
 * module→permissions map on login, persisted via auth-service and exposed as a flat
 * list on the auth context). This means gating is available immediately — no separate
 * fetch, no loading flash — and reflects exactly what the logged-in user is allowed.
 *
 * Usage:
 *   const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissionCheck()
 *   if (hasPermission('products.create')) { ... }
 */
export function usePermissionCheck() {
  const { user, permissions, isLoading: authLoading } = useAuth()
  const userId = user?.id

  const userPermissions = useMemo(
    () => (Array.isArray(permissions) ? permissions : []),
    [permissions],
  )

  const isLoading = authLoading
  const hasAdminRole = user?.role === 'Admin' || user?.role === 'Super Admin'

  const hasPermission = (permission: string): boolean => {
    if (!userId || isLoading) return false
    if (hasAdminRole) return true
    return userPermissions.includes(permission)
  }

  const hasAnyPermission = (perms: string[]): boolean => {
    if (!userId || isLoading) return false
    if (hasAdminRole) return true
    return perms.some((permission) => userPermissions.includes(permission))
  }

  const hasAllPermissions = (perms: string[]): boolean => {
    if (!userId || isLoading) return false
    if (hasAdminRole) return true
    return perms.every((permission) => userPermissions.includes(permission))
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    userPermissions,
  }
}
