'use client'

import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useCreateDepartment, useDepartmentsDropdown } from '@/hooks/useDepartments'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, Building2 } from 'lucide-react'

interface DepartmentFormData {
  name: string
  description?: string
  parentDepartmentId?: string
}

export default function CreateDepartmentPage() {
  const router = useRouter()
  const createMutation = useCreateDepartment()
  const { data: parentOptions = [], isLoading: isLoadingParents } = useDepartmentsDropdown()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    defaultValues: { name: '', description: '', parentDepartmentId: '' },
  })

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      await createMutation.mutateAsync({
        name: data.name.trim(),
        description: data.description?.trim() || null,
        parentDepartmentId: data.parentDepartmentId || null,
      })
      router.push('/dashboard/hr/departments')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create department'))
    }
  }

  const isLoading = createMutation.isPending

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
              Add Department
            </h1>
            <p className="text-gray-600 mt-1">Create a new department in the org structure.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Department Details</CardTitle>
              <CardDescription>Enter the department name and optional hierarchy.</CardDescription>
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
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger id="parentDepartmentId" className="mt-1.5 h-11 border-gray-300">
                        <SelectValue placeholder={isLoadingParents ? 'Loading…' : 'Select parent department (optional)'} />
                      </SelectTrigger>
                      <SelectContent>
                        {parentOptions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to create a top-level department.</p>
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
                  placeholder="Optional description of this department"
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
                <><Save className="mr-2 h-4 w-4" />Save Department</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
