'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Loader2, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApplications } from '@/hooks/useApplications'
import { candidateFullName } from '@/hooks/useCandidates'
import {
  useRecruitmentUsersDropdown,
  recruitmentUserOptionLabel,
} from '@/hooks/useRecruitmentUsers'

export const INTERVIEW_TYPES = ['PHONE', 'VIDEO', 'ONSITE', 'TECHNICAL', 'HR'] as const

export interface InterviewFormValues {
  applicationId: string
  interviewerId: string
  interviewDate: string // datetime-local value
  interviewType: string
  result: string
  feedback: string
}

export interface InterviewFormInitialValues {
  applicationId?: string
  interviewerId?: string
  interviewDate?: string // ISO
  interviewType?: string
  result?: string | null
  feedback?: string | null
}

interface InterviewFormProps {
  mode: 'create' | 'edit'
  initialValues?: InterviewFormInitialValues
  isSubmitting: boolean
  onSubmit: (values: InterviewFormValues) => void
  onCancel: () => void
}

// Converts an ISO timestamp into the value a <input type="datetime-local"> expects.
export function isoToDateTimeLocal(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

export function InterviewForm({
  mode,
  initialValues,
  isSubmitting,
  onSubmit,
  onCancel,
}: InterviewFormProps) {
  const isEdit = mode === 'edit'
  const { data: applicationList, isLoading: isLoadingApplications } = useApplications({
    page: 1,
    limit: 200,
  })
  const applications = applicationList?.data ?? []
  const { data: users = [], isLoading: isLoadingUsers } = useRecruitmentUsersDropdown()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<InterviewFormValues>({
    defaultValues: {
      applicationId: '',
      interviewerId: '',
      interviewDate: '',
      interviewType: '',
      result: '',
      feedback: '',
    },
  })

  useEffect(() => {
    if (initialValues) {
      reset({
        applicationId: initialValues.applicationId || '',
        interviewerId: initialValues.interviewerId || '',
        interviewDate: isoToDateTimeLocal(initialValues.interviewDate),
        interviewType: initialValues.interviewType || '',
        result: initialValues.result || '',
        feedback: initialValues.feedback || '',
      })
    }
  }, [initialValues, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Interview Details</CardTitle>
          <CardDescription>
            {isEdit
              ? 'Update the interview schedule, result and feedback.'
              : 'Schedule an interview. The application must be in the INTERVIEW stage.'}
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

          {!isEdit && (
            <div>
              <Label htmlFor="interviewerId" className="text-gray-700 font-medium">
                Interviewer <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="interviewerId"
                rules={{ required: !isEdit && 'Interviewer is required' }}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="interviewerId" className="mt-1.5 h-11 border-gray-300">
                      <SelectValue placeholder={isLoadingUsers ? 'Loading…' : 'Select interviewer'} />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {recruitmentUserOptionLabel(user)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.interviewerId && (
                <p className="text-sm text-red-600 mt-1">{errors.interviewerId.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="interviewDate" className="text-gray-700 font-medium">
                Interview Date &amp; Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="interviewDate"
                type="datetime-local"
                {...register('interviewDate', { required: 'Interview date is required' })}
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.interviewDate && (
                <p className="text-sm text-red-600 mt-1">{errors.interviewDate.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="interviewType" className="text-gray-700 font-medium">
                Interview Type <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="interviewType"
                rules={{ required: 'Interview type is required' }}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="interviewType" className="mt-1.5 h-11 border-gray-300">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVIEW_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.interviewType && (
                <p className="text-sm text-red-600 mt-1">{errors.interviewType.message}</p>
              )}
            </div>
          </div>

          {isEdit && (
            <>
              <div>
                <Label htmlFor="result" className="text-gray-700 font-medium">
                  Result
                </Label>
                <Input
                  id="result"
                  {...register('result')}
                  placeholder="e.g. PASS, FAIL, ON_HOLD"
                  className="mt-1.5 h-11 border-gray-300"
                />
              </div>
              <div>
                <Label htmlFor="feedback" className="text-gray-700 font-medium">
                  Feedback
                </Label>
                <Textarea
                  id="feedback"
                  {...register('feedback')}
                  rows={3}
                  placeholder="Interviewer feedback"
                  className="mt-1.5 border-gray-300"
                />
              </div>
            </>
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
            <><Save className="mr-2 h-4 w-4" />{isEdit ? 'Save Changes' : 'Schedule Interview'}</>
          )}
        </Button>
      </div>
    </form>
  )
}
