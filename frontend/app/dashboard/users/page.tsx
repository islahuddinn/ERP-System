'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Mail, Shield, Trash2, Edit, Eye } from 'lucide-react'
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
import { useUsers, useDeleteUser, buildUserName, type User } from '@/hooks/useUsers'
import { useRolesDropdown } from '@/hooks/useRoles'
import { EditUserDialog } from '@/components/hr/users/edit-user-dialog'

const loginAccessBadge = (access?: string) => {
  switch (access) {
    case 'ENABLED':
      return <Badge className="bg-green-100 text-green-700 border-green-200">Enabled</Badge>
    case 'SUSPENDED':
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Suspended</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Disabled</Badge>
  }
}

export default function UsersPage() {
  const router = useRouter()
  const controller = useDataTable({ initialSortBy: 'createdAt', initialSortOrder: 'DESC' })
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<User | null>(null)

  const { data, isLoading, isError } = useUsers({ ...(controller.queryParams as any) })
  const { data: roles = [] } = useRolesDropdown()
  const deleteMutation = useDeleteUser()

  const users = data?.data ?? []
  const meta = data?.meta

  // Users only carry roleId — map it to a readable role name for display.
  const roleNameById = useMemo(
    () => Object.fromEntries(roles.map((r) => [r.id, r.name])),
    [roles],
  )

  const roleFilterOptions = useMemo(
    () => roles.map((r) => ({ value: r.id, label: r.name })),
    [roles],
  )

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const filters: DataTableFilter<User>[] = [
    {
      key: 'roleId',
      label: 'Role',
      searchable: true,
      options: roleFilterOptions,
    },
    {
      key: 'loginAccess',
      label: 'Login Access',
      options: [
        { value: 'ENABLED', label: 'Enabled' },
        { value: 'DISABLED', label: 'Disabled' },
        { value: 'SUSPENDED', label: 'Suspended' },
      ],
    },
  ]

  const columns: DataTableColumn<User>[] = [
    {
      key: 'firstName',
      header: 'User',
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
            {buildUserName(u).substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900">{buildUserName(u)}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Mail className="h-3 w-3" /> {u.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'roleId',
      header: 'Role',
      sortable: true,
      // Backend sorts on the related Role's name (dot-notation relation sort).
      sortKey: 'role.name',
      render: (u) => (
        <Badge variant="outline" className="gap-1 text-gray-700">
          <Shield className="h-3 w-3" /> {roleNameById[u.roleId] ?? '—'}
        </Badge>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      sortKey: 'phone',
      render: (u) => <span className="text-sm text-gray-600">{u.phone || '—'}</span>,
    },
    {
      key: 'loginAccess',
      header: 'Login Access',
      sortable: true,
      align: 'center',
      render: (u) => <div className="flex justify-center">{loginAccessBadge(u.loginAccess)}</div>,
    },
  ]

  return (
    <ProtectedRoute requiredPermission="users.read">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Users</h2>
            <p className="text-gray-500">Manage user accounts, roles and login access.</p>
          </div>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <DataTable<User>
              columns={columns}
              data={users}
              meta={meta}
              controller={controller}
              rowKey={(u) => u.id}
              isLoading={isLoading}
              isError={isError}
              errorMessage="Failed to load users."
              searchable
              searchPlaceholder="Search users..."
              filters={filters}
              pageSizeOptions
              emptyMessage="No users found."
              onRowClick={(u) => router.push(`/dashboard/users/${u.id}`)}
              actions={(u) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border-gray-200">
                    <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => router.push(`/dashboard/users/${u.id}`)}
                      className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                    >
                      <Eye className="mr-2 h-4 w-4" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setEditUser(u)}
                      className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                    >
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    {u.loginAccess !== 'DISABLED' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTargetId(u.id)}
                          className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Deactivate
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </CardContent>
        </Card>

        <EditUserDialog
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
          user={editUser}
        />

        <ConfirmDialog
          open={!!deleteTargetId}
          title="Deactivate User"
          description="This disables the user's login access. They will no longer be able to sign in. Continue?"
          confirmLabel="Deactivate"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTargetId(null)}
        />
      </div>
    </ProtectedRoute>
  )
}
