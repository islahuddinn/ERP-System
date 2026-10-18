'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  Edit,
  Shield,
  History,
  Key,
  Mail,
  Phone,
  Calendar,
  Loader2,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { EditUserDialog } from '@/components/hr/users/edit-user-dialog'
import {
  useUser,
  useUserPermissions,
  useUserAuditLogs,
  useResetUserPassword,
  useChangeUserRole,
  useChangeUserStatus,
  buildUserName,
  type LoginAccess,
} from '@/hooks/useUsers'
import { useRolesDropdown } from '@/hooks/useRoles'
import { getApiErrorMessage } from '@/lib/api-error'

// Turn a permission module key (e.g. "raw-materials", "purchase_orders") into a
// readable heading ("Raw Materials", "Purchase Orders") for the Permissions tab.
const formatModuleName = (moduleKey: string): string =>
  moduleKey
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

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

export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [selectedLoginAccess, setSelectedLoginAccess] = useState<LoginAccess>('ENABLED')

  const { data: user, isLoading: userLoading, refetch: refetchUser } = useUser(userId)
  const { data: permissionsData, isLoading: permissionsLoading } = useUserPermissions(userId)
  const { data: auditLogsData, isLoading: auditLogsLoading } = useUserAuditLogs(userId, 50)
  const { data: roles = [] } = useRolesDropdown()

  const resetPasswordMutation = useResetUserPassword()
  const changeRoleMutation = useChangeUserRole()
  const changeStatusMutation = useChangeUserStatus()

  useEffect(() => {
    setNewPassword('')
    setConfirmPassword('')
  }, [isPasswordDialogOpen])

  const auditLogs = auditLogsData ?? []
  // /users/:id/permissions returns permissions grouped by module
  // (`{ products: ["products.read", ...] }`), never a flat array — flatten it to
  // the "module.action" string list this page groups below. Iterating the object
  // directly crashed the page ("permissions is not iterable").
  const permissionsPayload = permissionsData?.permissions
  const permissions: string[] = Array.isArray(permissionsPayload)
    ? permissionsPayload
    : permissionsPayload && typeof permissionsPayload === 'object'
      ? Object.values(permissionsPayload as Record<string, string[]>)
          .flat()
          .filter((p): p is string => typeof p === 'string')
      : []
  const roleName = roles.find((r) => r.id === user?.roleId)?.name ?? '—'

  // Group the flat "module.action" permission strings by module so the tab shows
  // each Module Name with its operations (view, create, edit, delete) instead of
  // an ungrouped list (#14/#19).
  const permissionGroups = useMemo(() => {
    const byModule: Record<string, string[]> = {}
    for (const permission of permissions) {
      const separatorIndex = permission.indexOf('.')
      const moduleKey = separatorIndex === -1 ? permission : permission.slice(0, separatorIndex)
      const action = separatorIndex === -1 ? permission : permission.slice(separatorIndex + 1)
      if (!byModule[moduleKey]) byModule[moduleKey] = []
      byModule[moduleKey].push(action)
    }
    return Object.entries(byModule)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([moduleKey, actions]) => ({ moduleKey, actions: actions.sort() }))
  }, [permissions])

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    try {
      await resetPasswordMutation.mutateAsync({ id: userId, newPassword })
      toast.success('Password reset successfully')
      setIsPasswordDialogOpen(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to reset password'))
    }
  }

  const handleRoleChange = async () => {
    if (!selectedRoleId) {
      toast.error('Please select a role')
      return
    }
    try {
      await changeRoleMutation.mutateAsync({ id: userId, roleId: selectedRoleId })
      toast.success('User role changed successfully')
      setIsRoleDialogOpen(false)
      refetchUser()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to change role'))
    }
  }

  const handleStatusChange = async () => {
    try {
      await changeStatusMutation.mutateAsync({ id: userId, loginAccess: selectedLoginAccess })
      toast.success('Login access updated')
      setIsStatusDialogOpen(false)
      refetchUser()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update login access'))
    }
  }

  if (userLoading) {
    return (
      <ProtectedRoute requiredPermission="users.read">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!user) {
    return (
      <ProtectedRoute requiredPermission="users.read">
        <div className="text-center py-12 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>User not found</p>
          <Button onClick={() => router.push('/dashboard/users')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="users.read">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/users')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{buildUserName(user)}</h1>
              <p className="text-gray-700 mt-1">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsEditOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Edit className="mr-2 h-4 w-4" /> Edit User
            </Button>
            <ViewHistoryButton entityName="User" entityId={userId} size="default" />
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-700 text-2xl font-bold">
                  {buildUserName(user).substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{buildUserName(user)}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="gap-1 text-gray-700">
                      <Shield className="h-3 w-3" /> {roleName}
                    </Badge>
                    {loginAccessBadge(user.loginAccess)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex items-center gap-2 w-28 shrink-0 text-sm font-medium text-gray-700">
                    <Mail className="h-4 w-4 text-gray-500" /> Email
                  </span>
                  <span className="text-sm text-gray-900 break-all">{user.email}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex items-center gap-2 w-28 shrink-0 text-sm font-medium text-gray-700">
                    <Phone className="h-4 w-4 text-gray-500" /> Phone
                  </span>
                  <span className="text-sm text-gray-900">{user.phone || '—'}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex items-center gap-2 w-28 shrink-0 text-sm font-medium text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-500" /> Created
                  </span>
                  <span className="text-sm text-gray-900">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="permissions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="permissions">
              <Shield className="mr-2 h-4 w-4" /> Permissions
            </TabsTrigger>
            <TabsTrigger value="activity">
              <History className="mr-2 h-4 w-4" /> Activity Log
            </TabsTrigger>
            <TabsTrigger value="actions">
              <Key className="mr-2 h-4 w-4" /> Actions
            </TabsTrigger>
          </TabsList>

          {/* Permissions */}
          <TabsContent value="permissions">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">Effective Permissions</CardTitle>
                <CardDescription className="text-gray-600">
                  {permissionsLoading
                    ? 'Loading permissions...'
                    : `${permissions.length} permission(s) across ${permissionGroups.length} module(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {permissionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : permissions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No permissions assigned</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {permissionGroups.map((group) => (
                      <div
                        key={group.moduleKey}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-semibold text-gray-900">
                            {formatModuleName(group.moduleKey)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.actions.map((action) => (
                            <Badge
                              key={action}
                              variant="outline"
                              className="bg-white border-gray-200 text-gray-700 capitalize text-xs"
                            >
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">Activity Log</CardTitle>
                <CardDescription className="text-gray-600">
                  {auditLogsLoading ? 'Loading activity...' : `${auditLogs.length} activity record(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No activity records</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-gray-700">Action</TableHead>
                          <TableHead className="text-gray-700">Entity</TableHead>
                          <TableHead className="text-gray-700">Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log: any) => (
                          <TableRow key={log.id} className="border-gray-200">
                            <TableCell>
                              <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-700">
                              {log.entityLabel || log.entityName}
                            </TableCell>
                            <TableCell className="text-gray-700">
                              {log.createdAt ? format(new Date(log.createdAt), 'dd MMM yyyy, hh:mm a') : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions */}
          <TabsContent value="actions">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Key className="h-5 w-5 text-gray-500" /> Reset Password
                  </CardTitle>
                  <CardDescription className="text-gray-600">Set a new password for this user</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setIsPasswordDialogOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700">
                    Reset Password
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-gray-500" /> Change Role
                  </CardTitle>
                  <CardDescription className="text-gray-600">Assign a different role</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => {
                      setSelectedRoleId(user.roleId)
                      setIsRoleDialogOpen(true)
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    Change Role
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-500" /> Login Access
                  </CardTitle>
                  <CardDescription className="text-gray-600">Enable, disable or suspend login</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => {
                      setSelectedLoginAccess(user.loginAccess)
                      setIsStatusDialogOpen(true)
                    }}
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                  >
                    Change Access
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit */}
        <EditUserDialog open={isEditOpen} onOpenChange={setIsEditOpen} user={user} onSuccess={() => refetchUser()} />

        {/* Reset Password */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Reset Password</DialogTitle>
              <DialogDescription className="text-gray-600">Enter a new password for {buildUserName(user)}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword" className="text-gray-700">New Password</Label>
                <div className="relative mt-1">
                  <Input id="newPassword" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-10" minLength={8} />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-gray-700">Confirm Password</Label>
                <div className="relative mt-1">
                  <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pr-10" minLength={8} />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
              <Button onClick={handlePasswordReset} disabled={resetPasswordMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {resetPasswordMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting...</>) : 'Reset Password'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Role */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Change Role</DialogTitle>
              <DialogDescription className="text-gray-600">Select a new role for {buildUserName(user)}</DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="role" className="text-gray-700">Role</Label>
              <Select value={selectedRoleId || undefined} onValueChange={setSelectedRoleId}>
                <SelectTrigger id="role" className="mt-1">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRoleChange} disabled={changeRoleMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                {changeRoleMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Changing...</>) : 'Change Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Login Access */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Change Login Access</DialogTitle>
              <DialogDescription className="text-gray-600">Update login access for {buildUserName(user)}</DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="loginAccess" className="text-gray-700">Login Access</Label>
              <Select value={selectedLoginAccess} onValueChange={(v) => setSelectedLoginAccess(v as LoginAccess)}>
                <SelectTrigger id="loginAccess" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENABLED">Enabled</SelectItem>
                  <SelectItem value="DISABLED">Disabled</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleStatusChange} disabled={changeStatusMutation.isPending} className="bg-yellow-600 hover:bg-yellow-700">
                {changeStatusMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
