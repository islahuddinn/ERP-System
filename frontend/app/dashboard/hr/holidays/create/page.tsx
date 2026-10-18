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
import { useCreateHoliday, type HolidayType } from '@/hooks/useHolidays'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, CalendarDays } from 'lucide-react'

interface HolidayFormData {
  name: string
  description?: string
  type: HolidayType
  startDate: string
  endDate: string
}

export default function CreateHolidayPage() {
  const router = useRouter()
  const createMutation = useCreateHoliday()

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<HolidayFormData>({
    defaultValues: { name: '', description: '', type: 'FULL_DAY', startDate: '', endDate: '' },
  })

  const holidayType = watch('type')
  const isHalfDay = holidayType === 'HALF_DAY'

  const onSubmit = async (data: HolidayFormData) => {
    try {
      await createMutation.mutateAsync({
        name: data.name.trim(),
        description: data.description?.trim() || null,
        type: data.type,
        startDate: data.startDate,
        // HALF_DAY applies to a single date — backend ignores endDate and sets it to startDate.
        ...(isHalfDay ? {} : { endDate: data.endDate }),
      })
      router.push('/dashboard/hr/holidays')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create holiday'))
    }
  }

  const isLoading = createMutation.isPending

  return (
    <ProtectedRoute requiredPermission="holidays.manage">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/hr/holidays')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-green-600" />
              Add Holiday
            </h1>
            <p className="text-gray-600 mt-1">Add a new date to the holiday calendar.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Holiday Details</CardTitle>
              <CardDescription>Enter the holiday name, type and date range.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-gray-700 font-medium">
                  Holiday Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name', {
                    required: 'Name is required',
                    validate: (v) => v.trim().length > 0 || 'Name is required',
                    maxLength: { value: 128, message: 'Name must be 128 characters or fewer' },
                  })}
                  placeholder="e.g. Independence Day"
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="type" className="text-gray-700 font-medium">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="type"
                  rules={{ required: 'Type is required' }}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(value) => field.onChange(value as HolidayType)}
                    >
                      <SelectTrigger id="type" className="mt-1.5 h-11 border-gray-300">
                        <SelectValue placeholder="Select holiday type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL_DAY">Full day — spans one or more dates</SelectItem>
                        <SelectItem value="HALF_DAY">Half day — a single date</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-gray-700 font-medium">
                    {isHalfDay ? 'Date' : 'Start Date'} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate', { required: 'Start date is required' })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.startDate.message}</p>
                  )}
                </div>
                {!isHalfDay && (
                  <div>
                    <Label htmlFor="endDate" className="text-gray-700 font-medium">
                      End Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      {...register('endDate', {
                        required: isHalfDay ? false : 'End date is required for a full-day holiday',
                      })}
                      className="mt-1.5 h-11 border-gray-300"
                    />
                    {errors.endDate && (
                      <p className="text-sm text-red-600 mt-1">{errors.endDate.message}</p>
                    )}
                  </div>
                )}
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
                  rows={2}
                  placeholder="Optional description"
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
              onClick={() => router.push('/dashboard/hr/holidays')}
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
                <><Save className="mr-2 h-4 w-4" />Save Holiday</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
