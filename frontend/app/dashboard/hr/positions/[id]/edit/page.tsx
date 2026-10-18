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
import { usePosition, useUpdatePosition } from '@/hooks/usePositions'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, Briefcase } from 'lucide-react'

interface PositionFormData {
  title: string
  description?: string
}

export default function EditPositionPage() {
  const router = useRouter()
  const params = useParams()
  const positionId = params?.id as string
  const { data: position, isLoading: isLoadingPosition } = usePosition(positionId)
  const updateMutation = useUpdatePosition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PositionFormData>({
    defaultValues: { title: '', description: '' },
  })

  useEffect(() => {
    if (position) {
      reset({
        title: position.title || '',
        description: position.description || '',
      })
    }
  }, [position, reset])

  const onSubmit = async (data: PositionFormData) => {
    try {
      // Send explicit null for a cleared description so the backend overwrites it.
      await updateMutation.mutateAsync({
        id: positionId,
        data: {
          title: data.title.trim(),
          description: data.description?.trim() || null,
        },
      })
      router.push('/dashboard/hr/positions')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update position'))
    }
  }

  const isLoading = updateMutation.isPending || isLoadingPosition

  if (isLoadingPosition) {
    return (
      <ProtectedRoute requiredPermission="hr.manage_employees">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!position) {
    return (
      <ProtectedRoute requiredPermission="hr.manage_employees">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-red-500">
          <p>Position not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/positions')} className="mt-4">
            Back to Positions
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
            onClick={() => router.push('/dashboard/hr/positions')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-green-600" />
              Edit Position
            </h1>
            <p className="text-gray-600 mt-1">Update the position title or description.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Position Details</CardTitle>
              <CardDescription>Update the position information.</CardDescription>
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
                <><Save className="mr-2 h-4 w-4" />Save Changes</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
