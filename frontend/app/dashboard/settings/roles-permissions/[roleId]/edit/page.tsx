'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useRole, useUpdateRole } from '@/hooks/useRoles'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, Shield } from 'lucide-react'

interface RoleFormData {
  name: string
  description?: string
}

export default function EditRolePage() {
  const router = useRouter()
  const params = useParams()
  const roleId = params?.roleId as string
  const { data: role, isLoading: isLoadingRole } = useRole(roleId)
  const updateMutation = useUpdateRole()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormData>({
    defaultValues: { name: '', description: '' },
  })

  useEffect(() => {
    if (role) {
      reset({ name: role.name || '', description: role.description || '' })
    }
  }, [role, reset])

  const onSubmit = async (data: RoleFormData) => {
    try {
      await updateMutation.mutateAsync({
        roleId,
        data: {
          name: data.name.trim(),
          // Send explicit null to clear the description on the backend.
          description: data.description?.trim() || null,
        },
      })
      router.push('/dashboard/settings/roles-permissions')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update role'))
    }
  }

  const isLoading = updateMutation.isPending || isLoadingRole

  if (isLoadingRole) {
    return (
      <ProtectedRoute requiredPermission="roles.update">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!role) {
    return (
      <ProtectedRoute requiredPermission="roles.update">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-red-500">
          <p>Role not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/settings/roles-permissions')} className="mt-4">
            Back to Roles
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="roles.update">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/settings/roles-permissions')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-600" />
              Edit Role
            </h1>
            <p className="text-gray-600 mt-1">Update the role name and description.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Role Details</CardTitle>
              <CardDescription>Edit the role name and description. Permissions are managed on the detail page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  className="mt-1.5 border-gray-300"
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/settings/roles-permissions')}
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
                <><Save className="mr-2 h-4 w-4" />Save Changes</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
