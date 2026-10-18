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
import { useDepartmentsDropdown } from '@/hooks/useDepartments'
import { usePositionsDropdown } from '@/hooks/usePositions'
import {
  EMPLOYMENT_TYPES,
  JOB_REQUISITION_STATUSES,
  employmentTypeLabel,
  type EmploymentType,
  type JobRequisitionStatus,
} from '@/hooks/useJobRequisitions'

export interface JobRequisitionFormValues {
  title: string
  departmentId: string
  positionId: string
  employmentType: EmploymentType | ''
  openings: string
  status: JobRequisitionStatus
  description: string
}

export interface JobRequisitionFormInitialValues {
  title?: string
  departmentId?: string
  positionId?: string
  employmentType?: EmploymentType
  openings?: number
  status?: JobRequisitionStatus
  description?: string | null
}

interface JobRequisitionFormProps {
  mode: 'create' | 'edit'
  initialValues?: JobRequisitionFormInitialValues
  isSubmitting: boolean
  onSubmit: (values: JobRequisitionFormValues) => void
  onCancel: () => void
}

export function JobRequisitionForm({
  mode,
  initialValues,
  isSubmitting,
  onSubmit,
  onCancel,
}: JobRequisitionFormProps) {
  const { data: departments = [], isLoading: isLoadingDepartments } = useDepartmentsDropdown()
  const { data: positions = [], isLoading: isLoadingPositions } = usePositionsDropdown()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<JobRequisitionFormValues>({
    defaultValues: {
      title: '',
      departmentId: '',
      positionId: '',
      employmentType: '',
      openings: '1',
      status: 'OPEN',
      description: '',
    },
  })

  useEffect(() => {
    if (initialValues) {
      reset({
        title: initialValues.title || '',
        departmentId: initialValues.departmentId || '',
        positionId: initialValues.positionId || '',
        employmentType: initialValues.employmentType || '',
        openings: initialValues.openings != null ? String(initialValues.openings) : '1',
        status: initialValues.status || 'OPEN',
        description: initialValues.description || '',
      })
    }
  }, [initialValues, reset])

  const isEdit = mode === 'edit'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Requisition Details</CardTitle>
          <CardDescription>
            {isEdit ? 'Update the job requisition.' : 'Open a new job requisition to start hiring.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-gray-700 font-medium">
              Job Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              {...register('title', {
                required: 'Job title is required',
                validate: (v) => v.trim().length > 0 || 'Job title is required',
              })}
              placeholder="e.g. Senior Backend Engineer"
              className="mt-1.5 h-11 border-gray-300"
            />
            {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="departmentId" className="text-gray-700 font-medium">
                Department <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="departmentId"
                rules={{ required: 'Department is required' }}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="departmentId" className="mt-1.5 h-11 border-gray-300">
                      <SelectValue
                        placeholder={isLoadingDepartments ? 'Loading…' : 'Select department'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.departmentId && (
                <p className="text-sm text-red-600 mt-1">{errors.departmentId.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="positionId" className="text-gray-700 font-medium">
                Position <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="positionId"
                rules={{ required: 'Position is required' }}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="positionId" className="mt-1.5 h-11 border-gray-300">
                      <SelectValue
                        placeholder={isLoadingPositions ? 'Loading…' : 'Select position'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((pos) => (
                        <SelectItem key={pos.id} value={pos.id}>
                          {pos.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.positionId && (
                <p className="text-sm text-red-600 mt-1">{errors.positionId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="employmentType" className="text-gray-700 font-medium">
                Employment Type <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="employmentType"
                rules={{ required: 'Employment type is required' }}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="employmentType" className="mt-1.5 h-11 border-gray-300">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {employmentTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.employmentType && (
                <p className="text-sm text-red-600 mt-1">{errors.employmentType.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="openings" className="text-gray-700 font-medium">
                Openings <span className="text-red-500">*</span>
              </Label>
              <Input
                id="openings"
                type="number"
                min="1"
                step="1"
                {...register('openings', {
                  required: 'Openings is required',
                  validate: (v) => {
                    const n = Number(v)
                    if (!Number.isInteger(n)) return 'Must be a whole number'
                    if (n < 1) return 'Must be at least 1'
                    return true
                  },
                })}
                placeholder="e.g. 2"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.openings && (
                <p className="text-sm text-red-600 mt-1">{errors.openings.message}</p>
              )}
            </div>
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
                      {JOB_REQUISITION_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-700 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              rows={4}
              placeholder="Role responsibilities, requirements, etc."
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
            <><Save className="mr-2 h-4 w-4" />{isEdit ? 'Save Changes' : 'Create Requisition'}</>
          )}
        </Button>
      </div>
    </form>
  )
}
