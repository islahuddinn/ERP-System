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
import { useGrade, useGrades, useUpdateGrade } from '@/hooks/useGrades'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, Layers } from 'lucide-react'

interface GradeFormData {
  name: string
  level: string
  salaryBandMin: string
  salaryBandMax: string
  description: string
}

export default function EditGradePage() {
  const router = useRouter()
  const params = useParams()
  const gradeId = params?.id as string

  // Prefer by-id; fall back to the list cache while it loads so edit works instantly.
  const { data: gradeById, isLoading: isLoadingById } = useGrade(gradeId)
  const { data: gradeList, isLoading: isLoadingList } = useGrades()
  const grade = gradeById ?? gradeList?.find((g) => g.id === gradeId)
  const updateMutation = useUpdateGrade()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GradeFormData>({
    defaultValues: { name: '', level: '', salaryBandMin: '', salaryBandMax: '', description: '' },
  })

  useEffect(() => {
    if (grade) {
      reset({
        name: grade.name || '',
        level: String(grade.level ?? ''),
        salaryBandMin: String(grade.salaryBandMin ?? ''),
        salaryBandMax: String(grade.salaryBandMax ?? ''),
        description: '',
      })
    }
  }, [grade, reset])

  const onSubmit = async (data: GradeFormData) => {
    try {
      await updateMutation.mutateAsync({
        id: gradeId,
        payload: {
          name: data.name.trim(),
          level: Number(data.level),
          salaryBandMin: data.salaryBandMin.trim(),
          salaryBandMax: data.salaryBandMax.trim(),
          description: data.description.trim() || undefined,
        },
      })
      router.push('/dashboard/hr/grades')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update grade'))
    }
  }

  const isLoading = updateMutation.isPending
  const isResolving = isLoadingById && isLoadingList && !grade

  if (isResolving) {
    return (
      <ProtectedRoute requiredPermission="hr.manage_employees">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!grade) {
    return (
      <ProtectedRoute requiredPermission="hr.manage_employees">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-red-500">
          <p>Grade not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/grades')} className="mt-4">Back to Grades</Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="hr.manage_employees">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/hr/grades')} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Layers className="h-8 w-8 text-green-600" />
              Edit Grade
            </h1>
            <p className="text-gray-600 mt-1">Update grade name, level or salary band.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Grade Details</CardTitle>
              <CardDescription>Update the grade information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-gray-700 font-medium">Grade Name <span className="text-red-500">*</span></Label>
                  <Input id="name" {...register('name', { required: 'Name is required', validate: (v) => v.trim().length > 0 || 'Name is required', maxLength: { value: 64, message: 'Max 64 characters' } })} className="mt-1.5 h-11 border-gray-300" />
                  {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="level" className="text-gray-700 font-medium">Level <span className="text-red-500">*</span></Label>
                  <Input id="level" type="number" {...register('level', { required: 'Level is required', min: { value: 1, message: 'Level must be at least 1' }, max: { value: 1000, message: 'Level must be at most 1000' } })} className="mt-1.5 h-11 border-gray-300" />
                  {errors.level && <p className="text-sm text-red-600 mt-1">{errors.level.message}</p>}
                </div>
                <div>
                  <Label htmlFor="salaryBandMin" className="text-gray-700 font-medium">Salary Band Min <span className="text-red-500">*</span></Label>
                  <Input id="salaryBandMin" type="number" step="0.01" {...register('salaryBandMin', { required: 'Minimum band is required' })} className="mt-1.5 h-11 border-gray-300" />
                  {errors.salaryBandMin && <p className="text-sm text-red-600 mt-1">{errors.salaryBandMin.message}</p>}
                </div>
                <div>
                  <Label htmlFor="salaryBandMax" className="text-gray-700 font-medium">Salary Band Max <span className="text-red-500">*</span></Label>
                  <Input id="salaryBandMax" type="number" step="0.01" {...register('salaryBandMax', { required: 'Maximum band is required' })} className="mt-1.5 h-11 border-gray-300" />
                  {errors.salaryBandMax && <p className="text-sm text-red-600 mt-1">{errors.salaryBandMax.message}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-gray-700 font-medium">Description</Label>
                <Textarea id="description" {...register('description', { maxLength: { value: 256, message: 'Max 256 characters' } })} rows={3} placeholder="Optional description" className="mt-1.5 border-gray-300" />
                {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard/hr/grades')} disabled={isLoading} className="border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]">
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
