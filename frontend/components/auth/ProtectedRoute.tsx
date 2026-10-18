'use client'

import { useRouter } from 'next/navigation'
import { Loader2, ShieldX } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import { useAuth } from '@/contexts/auth-context'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: string
  requiredPermissions?: string[]
  requireAll?: boolean // If true, requires all permissions; if false, requires any permission
  fallback?: React.ReactNode
  redirectTo?: string
}

/**
 * ProtectedRoute component that checks permissions before rendering children
 * 
 * Usage:
 * <ProtectedRoute requiredPermission="products.create">
 *   <CreateProductButton />
 * </ProtectedRoute>
 * 
 * <ProtectedRoute requiredPermissions={['products.create', 'products.update']} requireAll={false}>
 *   <ProductActions />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback,
  redirectTo = '/dashboard',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading: permissionLoading } = usePermissionCheck()

  // Wait for auth and permissions to load
  if (authLoading || permissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Checking permissions...</p>
        </div>
      </div>
    )
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    router.push('/auth/login')
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

  // If no access, show fallback or permission denied message
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="bg-gray-800/50 border-gray-700 max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldX className="h-8 w-8 text-red-400" />
              <CardTitle className="text-white">Access Denied</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              You don't have permission to access this resource.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requiredPermission && (
                <p className="text-sm text-gray-300">
                  Required permission: <code className="text-green-400">{requiredPermission}</code>
                </p>
              )}
              {requiredPermissions && requiredPermissions.length > 0 && (
                <p className="text-sm text-gray-300">
                  Required permission{requireAll ? 's (all)' : 's (any)'}:{' '}
                  <code className="text-green-400">
                    {requiredPermissions.join(', ')}
                  </code>
                </p>
              )}
              <Button
                onClick={() => router.push(redirectTo)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User has access, render children
  return <>{children}</>
}

