'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionSelector } from '@/components/hr/roles/permission-selector'
import { useCreateRole } from '@/hooks/useRoles'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, Shield, KeyRound } from 'lucide-react'

interface RoleFormData {
  name: string
  description?: string
}

const ROLES_LIST_PATH = '/dashboard/settings/roles-permissions'

export default function CreateRolePage() {
  const router = useRouter()
  const createMutation = useCreateRole()

  // Permissions selected while creating the role.
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleFormData>({
    defaultValues: { name: '', description: '' },
  })

  const onSubmit = async (data: RoleFormData) => {
    try {
      // Send the chosen permissions together with the create request (the
      // backend already supports permissionIds on POST /roles). Doing this in
      // a single call — instead of creating the role and then issuing a
      // separate PUT /roles/:id/permissions — avoids a second success toast
      // and a second, confusingly-labelled audit log entry for what the user
      // experiences as one action: creating the role.
      await createMutation.mutateAsync({
        name: data.name.trim(),
        description: data.description?.trim() || null,
        permissionIds: [...selectedPermissions],
      })

      router.push(ROLES_LIST_PATH)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create role'))
    }
  }

  const isLoading = createMutation.isPending

  return (
    <ProtectedRoute requiredPermission="roles.create">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(ROLES_LIST_PATH)}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-600" />
              Add Role
            </h1>
            <p className="text-gray-600 mt-1">Name the role and choose the permissions it grants.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" /> Role Details
              </CardTitle>
              <CardDescription>Give the role a clear name and an optional description.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name" className="text-gray-700 font-medium">
                  Role Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name', {
                    required: 'Name is required',
                    validate: (v) => v.trim().length > 0 || 'Name is required',
                    maxLength: { value: 100, message: 'Name must be 100 characters or fewer' },
                  })}
                  placeholder="e.g. Warehouse Manager"
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="description" className="text-gray-700 font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  {...register('description', {
                    maxLength: { value: 255, message: 'Description must be 255 characters or fewer' },
                  })}
                  rows={3}
                  placeholder="Optional description of what this role can do"
                  className="mt-1.5 border-gray-300"
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-green-600" /> Permission Access
              </CardTitle>
              <CardDescription>Select the permissions this role should grant, grouped by module.</CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionSelector selected={selectedPermissions} onChange={setSelectedPermissions} />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(ROLES_LIST_PATH)}
              disabled={isLoading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Create Role</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
