'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface CandidateFormValues {
  firstName: string
  lastName: string
  email: string
  phone: string
  resumeUrl: string
  source: string
}

export interface CandidateFormInitialValues {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string | null
  resumeUrl?: string | null
  source?: string | null
}

interface CandidateFormProps {
  mode: 'create' | 'edit'
  initialValues?: CandidateFormInitialValues
  isSubmitting: boolean
  onSubmit: (values: CandidateFormValues) => void
  onCancel: () => void
}

export function CandidateForm({
  mode,
  initialValues,
  isSubmitting,
  onSubmit,
  onCancel,
}: CandidateFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CandidateFormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      resumeUrl: '',
      source: '',
    },
  })

  useEffect(() => {
    if (initialValues) {
      reset({
        firstName: initialValues.firstName || '',
        lastName: initialValues.lastName || '',
        email: initialValues.email || '',
        phone: initialValues.phone || '',
        resumeUrl: initialValues.resumeUrl || '',
        source: initialValues.source || '',
      })
    }
  }, [initialValues, reset])

  const isEdit = mode === 'edit'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Candidate Details</CardTitle>
          <CardDescription>
            {isEdit ? 'Update the candidate profile.' : 'Add a candidate to the talent pool.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-gray-700 font-medium">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                {...register('firstName', {
                  required: 'First name is required',
                  validate: (v) => v.trim().length > 0 || 'First name is required',
                })}
                placeholder="Jane"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.firstName && (
                <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName" className="text-gray-700 font-medium">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                {...register('lastName', {
                  required: 'Last name is required',
                  validate: (v) => v.trim().length > 0 || 'Last name is required',
                })}
                placeholder="Doe"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.lastName && (
                <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                })}
                placeholder="jane.doe@example.com"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone" className="text-gray-700 font-medium">
                Phone
              </Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+1 555 123 4567"
                className="mt-1.5 h-11 border-gray-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="resumeUrl" className="text-gray-700 font-medium">
                Resume URL
              </Label>
              <Input
                id="resumeUrl"
                {...register('resumeUrl')}
                placeholder="https://…"
                className="mt-1.5 h-11 border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="source" className="text-gray-700 font-medium">
                Source
              </Label>
              <Input
                id="source"
                {...register('source')}
                placeholder="e.g. LinkedIn, Referral"
                className="mt-1.5 h-11 border-gray-300"
              />
            </div>
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
            <><Save className="mr-2 h-4 w-4" />{isEdit ? 'Save Changes' : 'Create Candidate'}</>
          )}
        </Button>
      </div>
    </form>
  )
}
