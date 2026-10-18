'use client'

import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { PermissionMatrix } from '@/components/hr/roles/permission-matrix'
import { useRole } from '@/hooks/useRoles'
import { ArrowLeft, Edit, Loader2, Shield, Users, Lock } from 'lucide-react'

export default function RoleDetailPage() {
  const router = useRouter()
  const params = useParams()
  const roleId = params?.roleId as string
  const { data: role, isLoading } = useRole(roleId)

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="roles.read">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!role) {
    return (
      <ProtectedRoute requiredPermission="roles.read">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Role not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/settings/roles-permissions')}>
            Back to Roles
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="roles.read">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="h-8 w-8 text-green-600" />
                {role.name}
                {role.isSystem && (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" /> System
                  </Badge>
                )}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-1">
                <Users className="h-4 w-4" /> {role._count?.users ?? 0} users assigned
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/settings/roles-permissions/${roleId}/edit`)}
              className="border-gray-300"
              disabled={role.name === 'Admin'}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <ViewHistoryButton entityName="Role" entityId={roleId} size="default" />
          </div>
        </div>

        <Tabs defaultValue="permissions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Role Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Name</p>
                  <p className="font-medium">{role.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <Badge variant={role.isSystem ? 'secondary' : 'default'}>
                    {role.isSystem ? 'System' : 'Custom'}
                  </Badge>
                </div>
                <div className="md:col-span-2">
                  <p className="text-muted-foreground text-xs">Description</p>
                  <p className="font-medium">{role.description || <span className="text-gray-400">—</span>}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Permissions</p>
                  <p className="font-medium">{role.rolePermissions?.length ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Users Assigned</p>
                  <p className="font-medium">{role._count?.users ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p className="font-medium">{format(new Date(role.createdAt), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Last Updated</p>
                  <p className="font-medium">{format(new Date(role.updatedAt), 'MMM d, yyyy')}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionMatrix role={role} />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
