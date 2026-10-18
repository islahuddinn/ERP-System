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
import { useCandidatesDropdown, candidateFullName } from '@/hooks/useCandidates'
import { useJobRequisitions } from '@/hooks/useJobRequisitions'

export interface ApplicationFormValues {
  candidateId: string
  requisitionId: string
  status: string
  notes: string
}

export interface ApplicationFormInitialValues {
  candidateId?: string
  requisitionId?: string
  status?: string
  notes?: string | null
}

interface ApplicationFormProps {
  mode: 'create' | 'edit'
  initialValues?: ApplicationFormInitialValues
  isSubmitting: boolean
  onSubmit: (values: ApplicationFormValues) => void
  onCancel: () => void
}

export function ApplicationForm({
  mode,
  initialValues,
  isSubmitting,
  onSubmit,
  onCancel,
}: ApplicationFormProps) {
  const isEdit = mode === 'edit'
  const { data: candidates = [], isLoading: isLoadingCandidates } = useCandidatesDropdown()
  const { data: requisitionList, isLoading: isLoadingRequisitions } = useJobRequisitions({
    page: 1,
    limit: 200,
  })
  const requisitions = requisitionList?.data ?? []

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    defaultValues: {
      candidateId: '',
      requisitionId: '',
      status: 'PENDING',
      notes: '',
    },
  })

  useEffect(() => {
    if (initialValues) {
      reset({
        candidateId: initialValues.candidateId || '',
        requisitionId: initialValues.requisitionId || '',
        status: initialValues.status || 'PENDING',
        notes: initialValues.notes || '',
      })
    }
  }, [initialValues, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Application Details</CardTitle>
          <CardDescription>
            {isEdit
              ? 'Update the application. Use the Move Stage action to advance the pipeline.'
              : 'Link a candidate to a job requisition.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="candidateId" className="text-gray-700 font-medium">
              Candidate <span className="text-red-500">*</span>
            </Label>
            <Controller
              control={control}
              name="candidateId"
              rules={{ required: !isEdit && 'Candidate is required' }}
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={isEdit}
                >
                  <SelectTrigger id="candidateId" className="mt-1.5 h-11 border-gray-300">
                    <SelectValue
                      placeholder={isLoadingCandidates ? 'Loading…' : 'Select candidate'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidateFullName(candidate)} ({candidate.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {isEdit && (
              <p className="text-xs text-gray-500 mt-1">The candidate cannot be reassigned.</p>
            )}
            {errors.candidateId && (
              <p className="text-sm text-red-600 mt-1">{errors.candidateId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="requisitionId" className="text-gray-700 font-medium">
              Job Requisition <span className="text-red-500">*</span>
            </Label>
            <Controller
              control={control}
              name="requisitionId"
              rules={{ required: !isEdit && 'Job requisition is required' }}
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={isEdit}
                >
                  <SelectTrigger id="requisitionId" className="mt-1.5 h-11 border-gray-300">
                    <SelectValue
                      placeholder={isLoadingRequisitions ? 'Loading…' : 'Select requisition'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {requisitions.map((req) => (
                      <SelectItem key={req.id} value={req.id}>
                        {req.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {isEdit && (
              <p className="text-xs text-gray-500 mt-1">The requisition cannot be reassigned.</p>
            )}
            {errors.requisitionId && (
              <p className="text-sm text-red-600 mt-1">{errors.requisitionId.message}</p>
            )}
          </div>

          {isEdit && (
            <div>
              <Label htmlFor="status" className="text-gray-700 font-medium">
                Status
              </Label>
              <Input
                id="status"
                {...register('status')}
                placeholder="e.g. PENDING"
                className="mt-1.5 h-11 border-gray-300"
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes" className="text-gray-700 font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              {...register('notes')}
              rows={3}
              placeholder="Optional notes about this application"
              className="mt-1.5 border-gray-300"
            />
          </div>
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
            <><Save className="mr-2 h-4 w-4" />{isEdit ? 'Save Changes' : 'Create Application'}</>
          )}
        </Button>
      </div>
    </form>
  )
}
