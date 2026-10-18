'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useCreatePosition } from '@/hooks/usePositions'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, Briefcase } from 'lucide-react'

interface PositionFormData {
  title: string
  description?: string
}

export default function CreatePositionPage() {
  const router = useRouter()
  const createMutation = useCreatePosition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PositionFormData>({
    defaultValues: { title: '', description: '' },
  })

  const onSubmit = async (data: PositionFormData) => {
    try {
      await createMutation.mutateAsync({
        title: data.title.trim(),
        description: data.description?.trim() || null,
      })
      router.push('/dashboard/hr/positions')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create position'))
    }
  }

  const isLoading = createMutation.isPending

  return (
    <ProtectedRoute requiredPermission="hr.manage_employees">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/hr/positions')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-green-600" />
              Add Position
            </h1>
            <p className="text-gray-600 mt-1">Create a new job position.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Position Details</CardTitle>
              <CardDescription>Enter the position title and optional description.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-gray-700 font-medium">
                  Position Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  {...register('title', {
                    required: 'Title is required',
                    validate: (v) => v.trim().length > 0 || 'Title is required',
                    maxLength: { value: 128, message: 'Title must be 128 characters or fewer' },
                  })}
                  placeholder="e.g. Senior Engineer"
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
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
                  placeholder="Optional description of this position"
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
              onClick={() => router.push('/dashboard/hr/positions')}
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
                <><Save className="mr-2 h-4 w-4" />Save Position</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
