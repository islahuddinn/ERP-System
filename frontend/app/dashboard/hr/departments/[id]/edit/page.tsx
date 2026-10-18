'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useDepartment, useUpdateDepartment, useDepartmentsDropdown } from '@/hooks/useDepartments'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, Building2 } from 'lucide-react'

interface DepartmentFormData {
  name: string
  description?: string
  parentDepartmentId?: string
}

export default function EditDepartmentPage() {
  const router = useRouter()
  const params = useParams()
  const departmentId = params?.id as string
  const { data: department, isLoading: isLoadingDepartment } = useDepartment(departmentId)
  const { data: parentOptions = [], isLoading: isLoadingParents } = useDepartmentsDropdown()
  const updateMutation = useUpdateDepartment()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    defaultValues: { name: '', description: '', parentDepartmentId: '' },
  })

  // Tracks whether reset() below has actually applied the fetched department's
  // values yet. The Parent Department Select keys off this (not off
  // isLoadingParents, which is unrelated — the dropdown *options* list can finish
  // loading before the department *detail* fetch does) so it remounts exactly
  // once the real saved value lands — Radix Select only repaints its displayed
  // value on a remount, not on a bare controlled-value change after the trigger
  // has already rendered once with the blank default (#2, #6).
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    if (department) {
      reset({
        name: department.name || '',
        description: department.description || '',
        parentDepartmentId: department.parentDepartmentId || '',
      })
      setIsHydrated(true)
    }
  }, [department, reset])

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      // Send explicit null for a cleared parent/description so the backend overwrites
      // (undefined would leave the previous value untouched).
      await updateMutation.mutateAsync({
        id: departmentId,
        data: {
          name: data.name.trim(),
          description: data.description?.trim() || null,
          parentDepartmentId: data.parentDepartmentId || null,
        },
      })
      router.push('/dashboard/hr/departments')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update department'))
    }
  }

  const isLoading = updateMutation.isPending || isLoadingDepartment

  // A department cannot be its own parent (backend guard) — exclude it from the list.
  const selectableParents = parentOptions.filter((d) => d.id !== departmentId)

  if (isLoadingDepartment) {
    return (
      <ProtectedRoute requiredPermission="hr.manage_employees">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!department) {
    return (
      <ProtectedRoute requiredPermission="hr.manage_employees">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-red-500">
          <p>Department not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/departments')} className="mt-4">
            Back to Departments
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="hr.manage_employees">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/hr/departments')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-green-600" />
              Edit Department
            </h1>
            <p className="text-gray-600 mt-1">Update department name, description, or parent.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Department Details</CardTitle>
              <CardDescription>Update the department information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-gray-700 font-medium">
                  Department Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name', {
                    required: 'Name is required',
                    validate: (v) => v.trim().length > 0 || 'Name is required',
                    maxLength: { value: 128, message: 'Name must be 128 characters or fewer' },
                  })}
                  placeholder="e.g. Engineering"
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="parentDepartmentId" className="text-gray-700 font-medium">
                  Parent Department
                </Label>
                <Controller
                  control={control}
                  name="parentDepartmentId"
                  render={({ field }) => (
                    // Remount once the fetched department's value has actually been
                    // applied via reset() (isHydrated) AND the parent options have
                    // loaded — otherwise Radix can't resolve the saved value's label
                    // (the value is set before the options exist, or the Select
                    // already locked onto the blank default) and shows the
                    // placeholder instead of the saved parent (#2, #6).
                    <Select key={`${department.id}-${isHydrated ? 'ready' : 'loading'}-${isLoadingParents ? 'l' : 'r'}`} value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger id="parentDepartmentId" className="mt-1.5 h-11 border-gray-300">
                        <SelectValue placeholder={isLoadingParents ? 'Loading…' : 'Select parent department (optional)'} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableParents.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to make this a top-level department.</p>
              </div>

              <div>
                <Label htmlFor="description" className="text-gray-700 font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  {...register('description', {
                    maxLength: { value: 256, message: 'Description must be 256 characters or fewer' },
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
              onClick={() => router.push('/dashboard/hr/departments')}
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
