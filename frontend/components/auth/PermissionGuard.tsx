'use client'

import { usePermissionCheck } from '@/hooks/usePermissionCheck'

interface PermissionGuardProps {
  children: React.ReactNode
  requiredPermission?: string
  requiredPermissions?: string[]
  requireAll?: boolean // If true, requires all permissions; if false, requires any permission
  fallback?: React.ReactNode
  showLoading?: boolean
}

/**
 * PermissionGuard component for conditional rendering based on permissions
 * 
 * Usage:
 * <PermissionGuard requiredPermission="products.create">
 *   <Button>Create Product</Button>
 * </PermissionGuard>
 * 
 * <PermissionGuard requiredPermissions={['products.create', 'products.update']} requireAll={false}>
 *   <ProductActions />
 * </PermissionGuard>
 * 
 * <PermissionGuard requiredPermission="products.delete" fallback={<p>No access</p>}>
 *   <DeleteButton />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback = null,
  showLoading = false,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissionCheck()

  // Show loading state if requested
  if (isLoading && showLoading) {
    return <>{fallback}</>
  }

  // If still loading and not showing loading state, don't render anything
  if (isLoading) {
    return null
  }

  // Check permissions
  let hasAccess = false

  if (requiredPermission) {
    hasAccess = hasPermission(requiredPermission)
  } else if (requiredPermissions && requiredPermissions.length > 0) {
    if (requireAll) {
      hasAccess = hasAllPermissions(requiredPermissions)
    } else {
      hasAccess = hasAnyPermission(requiredPermissions)
    }
  } else {
    // No permission requirement, allow access
    hasAccess = true
  }

  // Render children if user has access, otherwise render fallback
  return hasAccess ? <>{children}</> : <>{fallback}</>
}

