/**
 * Permission Usage Examples
 * 
 * This file demonstrates how to use the permission-based access control
 * components and hooks in your application.
 */

'use client'

import { Button } from '@/components/ui/button'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'

// ============================================
// Example 1: Using PermissionGuard Component
// ============================================
export function Example1_ButtonWithPermission() {
  return (
    <div>
      <h2>Example 1: Button with Permission Guard</h2>
      <PermissionGuard requiredPermission="products.create">
        <Button onClick={() => console.log('Create product')}>
          Create Product
        </Button>
      </PermissionGuard>
    </div>
  )
}

// ============================================
// Example 2: Using usePermissionCheck Hook
// ============================================
export function Example2_HookBasedPermission() {
  const { hasPermission, isLoading } = usePermissionCheck()

  if (isLoading) {
    return <div>Loading permissions...</div>
  }

  return (
    <div>
      <h2>Example 2: Hook-based Permission Check</h2>
      {hasPermission('products.create') && (
        <Button onClick={() => console.log('Create product')}>
          Create Product
        </Button>
      )}
      {hasPermission('products.update') && (
        <Button onClick={() => console.log('Update product')}>
          Update Product
        </Button>
      )}
      {hasPermission('products.delete') && (
        <Button variant="destructive" onClick={() => console.log('Delete product')}>
          Delete Product
        </Button>
      )}
    </div>
  )
}

// ============================================
// Example 3: Multiple Permissions (Any)
// ============================================
export function Example3_AnyPermission() {
  const { hasAnyPermission } = usePermissionCheck()

  return (
    <div>
      <h2>Example 3: Any Permission Check</h2>
      {hasAnyPermission(['products.create', 'products.update']) && (
        <div className="flex gap-2">
          <Button>Create</Button>
          <Button>Update</Button>
        </div>
      )}
    </div>
  )
}

// ============================================
// Example 4: Multiple Permissions (All)
// ============================================
export function Example4_AllPermissions() {
  const { hasAllPermissions } = usePermissionCheck()

  return (
    <div>
      <h2>Example 4: All Permissions Check</h2>
      {hasAllPermissions(['products.create', 'products.update', 'products.delete']) && (
        <Button>Advanced Actions</Button>
      )}
    </div>
  )
}

// ============================================
// Example 5: Protected Route
// ============================================
export function Example5_ProtectedRoute() {
  return (
    <ProtectedRoute requiredPermission="products.create">
      <div>
        <h2>Example 5: Protected Route</h2>
        <p>This content is only visible to users with 'products.create' permission</p>
        <Button>Create Product</Button>
      </div>
    </ProtectedRoute>
  )
}

// ============================================
// Example 6: Custom Fallback
// ============================================
export function Example6_CustomFallback() {
  return (
    <div>
      <h2>Example 6: Custom Fallback</h2>
      <PermissionGuard
        requiredPermission="products.delete"
        fallback={
          <Button disabled variant="outline">
            Delete (No Permission)
          </Button>
        }
      >
        <Button variant="destructive" onClick={() => console.log('Delete')}>
          Delete Product
        </Button>
      </PermissionGuard>
    </div>
  )
}

// ============================================
// Example 7: Admin Check
// ============================================
export function Example7_AdminCheck() {
  // There is no separate "admin" flag — a role's abilities are its granted permissions.
  // Gate admin-only UI on the specific permission(s) it needs.
  const { hasPermission } = usePermissionCheck()

  return (
    <div>
      <h2>Example 7: Admin Check</h2>
      {hasPermission('settings.view') && (
        <div>
          <Button>Admin Settings</Button>
          <Button>System Configuration</Button>
        </div>
      )}
    </div>
  )
}

// ============================================
// Example 8: Table Actions with Permissions
// ============================================
export function Example8_TableActions({ productId }: { productId: string }) {
  const { hasPermission } = usePermissionCheck()

  return (
    <div className="flex gap-2">
      {hasPermission('products.read') && (
        <Button variant="outline" size="sm">
          View
        </Button>
      )}
      {hasPermission('products.update') && (
        <Button variant="outline" size="sm">
          Edit
        </Button>
      )}
      {hasPermission('products.delete') && (
        <Button variant="destructive" size="sm">
          Delete
        </Button>
      )}
    </div>
  )
}

// ============================================
// Example 9: Complex Permission Logic
// ============================================
export function Example9_ComplexLogic() {
  const { hasPermission, hasAnyPermission } = usePermissionCheck()

  const canManageProducts = hasPermission('products.create') || 
                            hasPermission('products.update') || 
                            hasPermission('products.delete')

  const canViewReports = hasAnyPermission(['reports.view_all', 'reports.view_own'])

  return (
    <div>
      <h2>Example 9: Complex Permission Logic</h2>
      {canManageProducts && (
        <div>
          <h3>Product Management</h3>
          <Button>Manage Products</Button>
        </div>
      )}
      {canViewReports && (
        <div>
          <h3>Reports</h3>
          <Button>View Reports</Button>
        </div>
      )}
      {hasPermission('settings.view') && (
        <div>
          <h3>Admin Panel</h3>
          <Button>Admin Settings</Button>
        </div>
      )}
    </div>
  )
}

// ============================================
// Example 10: PermissionGuard with Multiple Permissions
// ============================================
export function Example10_MultiplePermissionsGuard() {
  return (
    <div>
      <h2>Example 10: Multiple Permissions Guard</h2>
      {/* Show if user has ANY of these permissions */}
      <PermissionGuard
        requiredPermissions={['products.create', 'products.update']}
        requireAll={false}
      >
        <Button>Create or Update Product</Button>
      </PermissionGuard>

      {/* Show if user has ALL of these permissions */}
      <PermissionGuard
        requiredPermissions={['products.create', 'products.update', 'products.delete']}
        requireAll={true}
      >
        <Button>Full Product Management</Button>
      </PermissionGuard>
    </div>
  )
}

