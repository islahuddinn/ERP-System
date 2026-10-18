'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Loader2, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApplications } from '@/hooks/useApplications'
import { candidateFullName } from '@/hooks/useCandidates'
import { OFFER_STATUSES, type OfferStatus } from '@/hooks/useOffers'

export interface OfferFormValues {
  applicationId: string
  offeredSalary: string
  joiningDate: string // date value (YYYY-MM-DD)
  status: OfferStatus
}

export interface OfferFormInitialValues {
  applicationId?: string
  offeredSalary?: number | string
  joiningDate?: string | null // ISO
  status?: OfferStatus
}

interface OfferFormProps {
  mode: 'create' | 'edit'
  initialValues?: OfferFormInitialValues
  isSubmitting: boolean
  onSubmit: (values: OfferFormValues) => void
  onCancel: () => void
}

export function isoToDateInput(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10)
}

export function OfferForm({
  mode,
  initialValues,
  isSubmitting,
  onSubmit,
  onCancel,
}: OfferFormProps) {
  const isEdit = mode === 'edit'
  const { data: applicationList, isLoading: isLoadingApplications } = useApplications({
    page: 1,
    limit: 200,
  })
  const applications = applicationList?.data ?? []

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<OfferFormValues>({
    defaultValues: {
      applicationId: '',
      offeredSalary: '',
      joiningDate: '',
      status: 'PENDING',
    },
  })

  useEffect(() => {
    if (initialValues) {
      reset({
        applicationId: initialValues.applicationId || '',
        offeredSalary:
          initialValues.offeredSalary != null ? String(initialValues.offeredSalary) : '',
        joiningDate: isoToDateInput(initialValues.joiningDate),
        status: initialValues.status || 'PENDING',
      })
    }
  }, [initialValues, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Offer Details</CardTitle>
          <CardDescription>
            {isEdit
              ? 'Update the offer. Accepting an offer marks the applicant as HIRED.'
              : 'Extend an offer. The application must be in the INTERVIEW stage.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="applicationId" className="text-gray-700 font-medium">
              Application <span className="text-red-500">*</span>
            </Label>
            <Controller
              control={control}
              name="applicationId"
              rules={{ required: !isEdit && 'Application is required' }}
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={isEdit}
                >
                  <SelectTrigger id="applicationId" className="mt-1.5 h-11 border-gray-300">
                    <SelectValue
                      placeholder={isLoadingApplications ? 'Loading…' : 'Select application'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {applications.map((application) => (
                      <SelectItem key={application.id} value={application.id}>
                        {application.candidate
                          ? candidateFullName(application.candidate)
                          : 'Candidate'}
                        {application.requisition ? ` — ${application.requisition.title}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {isEdit && (
              <p className="text-xs text-gray-500 mt-1">The application cannot be changed.</p>
            )}
            {errors.applicationId && (
              <p className="text-sm text-red-600 mt-1">{errors.applicationId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="offeredSalary" className="text-gray-700 font-medium">
                Offered Salary <span className="text-red-500">*</span>
              </Label>
              <Input
                id="offeredSalary"
                type="number"
                step="0.01"
                min="0"
                {...register('offeredSalary', {
                  required: 'Offered salary is required',
                  validate: (v) => Number(v) > 0 || 'Salary must be greater than zero',
                })}
                placeholder="e.g. 90000"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.offeredSalary && (
                <p className="text-sm text-red-600 mt-1">{errors.offeredSalary.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="joiningDate" className="text-gray-700 font-medium">
                Joining Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="joiningDate"
                type="date"
                {...register('joiningDate', { required: 'Joining date is required' })}
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.joiningDate && (
                <p className="text-sm text-red-600 mt-1">{errors.joiningDate.message}</p>
              )}
            </div>
          </div>

          {isEdit && (
            <div>
              <Label htmlFor="status" className="text-gray-700 font-medium">
                Status
              </Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="status" className="mt-1.5 h-11 border-gray-300">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {OFFER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
        >
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" />{isEdit ? 'Save Changes' : 'Create Offer'}</>
          )}
        </Button>
      </div>
    </form>
  )
}
