# Permission-Based Access Control

This directory contains components and hooks for implementing permission-based access control in the frontend.

## Components

### `ProtectedRoute`

A component that checks permissions before rendering children. If the user doesn't have the required permissions, it shows an access denied message.

**Usage:**

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Single permission
<ProtectedRoute requiredPermission="products.create">
  <CreateProductButton />
</ProtectedRoute>

// Multiple permissions (any)
<ProtectedRoute requiredPermissions={['products.create', 'products.update']} requireAll={false}>
  <ProductActions />
</ProtectedRoute>

// Multiple permissions (all)
<ProtectedRoute requiredPermissions={['products.create', 'products.update']} requireAll={true}>
  <AdvancedProductActions />
</ProtectedRoute>

// Custom fallback
<ProtectedRoute 
  requiredPermission="products.delete"
  fallback={<p>You don't have permission to delete products</p>}
>
  <DeleteButton />
</ProtectedRoute>
```

### `PermissionGuard`

A component for conditionally rendering UI elements based on permissions. Returns `null` or a fallback if the user doesn't have permission.

**Usage:**

```tsx
import { PermissionGuard } from '@/components/auth/PermissionGuard'

// Hide/show button
<PermissionGuard requiredPermission="products.create">
  <Button onClick={handleCreate}>Create Product</Button>
</PermissionGuard>

// Multiple permissions (any)
<PermissionGuard requiredPermissions={['products.create', 'products.update']} requireAll={false}>
  <ProductActions />
</PermissionGuard>

// Custom fallback
<PermissionGuard 
  requiredPermission="products.delete"
  fallback={<Button disabled>Delete (No Permission)</Button>}
>
  <Button onClick={handleDelete}>Delete</Button>
</PermissionGuard>
```

## Hooks

### `usePermissionCheck`

A hook that provides permission checking functions.

**Usage:**

```tsx
import { usePermissionCheck } from '@/hooks/usePermissionCheck'

function MyComponent() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading, isAdmin } = usePermissionCheck()

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      {hasPermission('products.create') && (
        <Button onClick={handleCreate}>Create Product</Button>
      )}

      {hasAnyPermission(['products.update', 'products.delete']) && (
        <ProductActions />
      )}

      {hasAllPermissions(['products.create', 'products.update', 'products.delete']) && (
        <AdvancedProductActions />
      )}

      {isAdmin && (
        <AdminPanel />
      )}
    </div>
  )
}
```

## Examples

### Example 1: Conditional Button Rendering

```tsx
import { PermissionGuard } from '@/components/auth/PermissionGuard'

function ProductsPage() {
  return (
    <div>
      <h1>Products</h1>
      <PermissionGuard requiredPermission="products.create">
        <Button onClick={handleCreate}>Create Product</Button>
      </PermissionGuard>
    </div>
  )
}
```

### Example 2: Route Protection

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function CreateProductPage() {
  return (
    <ProtectedRoute requiredPermission="products.create">
      <CreateProductForm />
    </ProtectedRoute>
  )
}
```

### Example 3: Multiple Permissions

```tsx
import { usePermissionCheck } from '@/hooks/usePermissionCheck'

function ProductActions({ productId }: { productId: string }) {
  const { hasPermission } = usePermissionCheck()

  return (
    <div className="flex gap-2">
      {hasPermission('products.update') && (
        <Button onClick={() => handleEdit(productId)}>Edit</Button>
      )}
      {hasPermission('products.delete') && (
        <Button onClick={() => handleDelete(productId)} variant="destructive">
          Delete
        </Button>
      )}
    </div>
  )
}
```

### Example 4: Admin-Only Features

```tsx
import { usePermissionCheck } from '@/hooks/usePermissionCheck'

function SettingsPage() {
  const { isAdmin } = usePermissionCheck()

  return (
    <div>
      <h1>Settings</h1>
      {isAdmin && (
        <AdminSettings />
      )}
    </div>
  )
}
```

## Notes

- **Admin users** automatically have all permissions
- Permission checks are cached and only refetch when the user changes
- The `usePermissionCheck` hook automatically handles loading states
- Both components and hooks work seamlessly with the existing authentication system

