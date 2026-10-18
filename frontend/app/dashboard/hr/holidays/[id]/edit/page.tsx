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
import { useHoliday, useUpdateHoliday, type HolidayType } from '@/hooks/useHolidays'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, CalendarDays } from 'lucide-react'

interface HolidayFormData {
  name: string
  description?: string
  type: HolidayType
  startDate: string
  endDate: string
}

// Backend returns dates as ISO datetime; the <input type="date"> needs "YYYY-MM-DD".
function toDateInput(value: string): string {
  return value ? value.slice(0, 10) : ''
}

export default function EditHolidayPage() {
  const router = useRouter()
  const params = useParams()
  const holidayId = params?.id as string
  const { data: holiday, isLoading: isLoadingHoliday } = useHoliday(holidayId)
  const updateMutation = useUpdateHoliday()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<HolidayFormData>({
    defaultValues: { name: '', description: '', type: 'FULL_DAY', startDate: '', endDate: '' },
  })

  const holidayType = watch('type')
  const isHalfDay = holidayType === 'HALF_DAY'

  // Tracks whether reset() below has actually applied the fetched holiday's
  // values to the form yet. The Type Select keys off this (not off holiday.id
  // alone) so it remounts exactly once real data lands — Radix Select only
  // repaints its displayed value on a remount, not on a bare controlled-value
  // change after the trigger has already rendered once with the default
  // 'FULL_DAY' value, which is why Half Day never showed up after editing.
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    if (holiday) {
      reset({
        name: holiday.name || '',
        description: holiday.description || '',
        type: holiday.type,
        startDate: toDateInput(holiday.startDate),
        endDate: toDateInput(holiday.endDate),
      })
      setIsHydrated(true)
    }
  }, [holiday, reset])

  const onSubmit = async (data: HolidayFormData) => {
    try {
      await updateMutation.mutateAsync({
        id: holidayId,
        data: {
          name: data.name.trim(),
          description: data.description?.trim() || null,
          type: data.type,
          startDate: data.startDate,
          ...(isHalfDay ? {} : { endDate: data.endDate }),
        },
      })
      router.push('/dashboard/hr/holidays')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update holiday'))
    }
  }

  const isLoading = updateMutation.isPending || isLoadingHoliday

  if (isLoadingHoliday) {
    return (
      <ProtectedRoute requiredPermission="holidays.manage">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!holiday) {
    return (
      <ProtectedRoute requiredPermission="holidays.manage">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-red-500">
          <p>Holiday not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/holidays')} className="mt-4">
            Back to Holidays
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

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
              Edit Holiday
            </h1>
            <p className="text-gray-600 mt-1">Update the holiday details.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Holiday Details</CardTitle>
              <CardDescription>Update the holiday name, type and date range.</CardDescription>
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
                      key={`${holiday.id}-${isHydrated ? 'ready' : 'loading'}`}
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
                <><Save className="mr-2 h-4 w-4" />Save Changes</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
