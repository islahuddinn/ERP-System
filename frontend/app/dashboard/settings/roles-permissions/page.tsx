'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreVertical, Shield, Edit, Trash2, FileText, Users, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useRoles, useDeleteRole, type Role } from '@/hooks/useRoles'

export default function RolesPage() {
  const router = useRouter()
  const controller = useDataTable({ initialSortBy: 'name', initialSortOrder: 'ASC' })
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data, isLoading, isError } = useRoles({ ...(controller.queryParams as any) })
  const deleteMutation = useDeleteRole()

  const roles = data?.data ?? []
  const meta = data?.meta

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  // Backend supports ?isSystem=true|false (RoleFiltersDto).
  const filters: DataTableFilter<Role>[] = [
    {
      key: 'isSystem',
      label: 'Is System',
      options: [
        { value: 'true', label: 'True' },
        { value: 'false', label: 'False' },
      ],
    },
  ]

  const columns: DataTableColumn<Role>[] = [
    {
      key: 'name',
      header: 'Role',
      sortable: true,
      render: (r) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Shield className="h-4 w-4 text-gray-400" />
          {r.name}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      render: (r) => (
        <span className="text-gray-600 text-sm">{r.description || <span className="text-gray-400">—</span>}</span>
      ),
    },
    {
      key: 'isSystem',
      header: 'Is System',
      align: 'center',
      sortable: true,
      render: (r) =>
        r.isSystem ? (
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" /> Yes
          </Badge>
        ) : (
          <Badge variant="outline" className="text-gray-600">
            No
          </Badge>
        ),
    },
    {
      key: 'permissions',
      header: 'Permissions',
      align: 'center',
      sortable: true,
      sortKey: 'rolePermissions._count',
      render: (r) => (
        <Badge variant="outline" className="text-gray-700">
          {r.rolePermissions?.length ?? 0}
        </Badge>
      ),
    },
    {
      key: 'users',
      header: 'Users',
      align: 'center',
      sortable: true,
      sortKey: 'users._count',
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-gray-600 text-sm">
          <Users className="h-3 w-3" /> {r._count?.users ?? 0}
        </span>
      ),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="roles.read">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Roles &amp; Permissions</h2>
            <p className="text-gray-500">Manage roles and the permissions assigned to each.</p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/settings/roles-permissions/create')}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Role
          </Button>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <DataTable<Role>
              columns={columns}
              data={roles}
              meta={meta}
              controller={controller}
              rowKey={(r) => r.id}
              isLoading={isLoading}
              isError={isError}
              errorMessage="Failed to load roles."
              searchable
              searchPlaceholder="Search roles..."
              filters={filters}
              pageSizeOptions
              emptyMessage="No roles found."
              onRowClick={(r) => router.push(`/dashboard/settings/roles-permissions/${r.id}`)}
              actions={(r) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border-gray-200">
                    <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => router.push(`/dashboard/settings/roles-permissions/${r.id}`)}
                      className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                    >
                      <FileText className="mr-2 h-4 w-4" /> View &amp; Permissions
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push(`/dashboard/settings/roles-permissions/${r.id}/edit`)}
                      className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                      disabled={r.name === 'Admin'}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteTargetId(r.id)}
                      className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                      disabled={r.isSystem}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </CardContent>
        </Card>

        <ConfirmDialog
          open={!!deleteTargetId}
          title="Delete Role"
          description="Are you sure you want to delete this role? Roles assigned to users or system roles cannot be deleted."
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTargetId(null)}
        />
      </div>
    </ProtectedRoute>
  )
}
