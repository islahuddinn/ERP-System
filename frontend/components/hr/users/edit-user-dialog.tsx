'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateUser, type User } from '@/hooks/useUsers'
import { getApiErrorMessage } from '@/lib/api-error'

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onSuccess?: () => void
}

interface ProfileFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
}

/**
 * Edit a user's profile. The backend UpdateUserDto accepts firstName, lastName,
 * email and phone only (role/status/password have dedicated endpoints).
 */
export function EditUserDialog({ open, onOpenChange, user, onSuccess }: EditUserDialogProps) {
  const updateMutation = useUpdateUser()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: { firstName: '', lastName: '', email: '', phone: '' },
  })

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      })
    }
  }, [user, open, reset])

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return
    try {
      await updateMutation.mutateAsync({
        id: user.id,
        data: {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim(),
          // Send explicit null to clear phone on the backend.
          phone: data.phone.trim() || null,
        },
      })
      toast.success('User updated successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update user'))
    }
  }

  const isLoading = updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Edit User</DialogTitle>
          <DialogDescription className="text-gray-600">Update the user&apos;s profile details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-gray-700">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                {...register('firstName', {
                  required: 'First name is required',
                  validate: (v) => v.trim().length > 0 || 'First name is required',
                })}
                className="mt-1.5"
              />
              {errors.firstName && <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="lastName" className="text-gray-700">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                {...register('lastName', {
                  required: 'Last name is required',
                  validate: (v) => v.trim().length > 0 || 'Last name is required',
                })}
                className="mt-1.5"
              />
              {errors.lastName && <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-700">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              className="mt-1.5"
            />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="phone" className="text-gray-700">
              Phone
            </Label>
            <Input id="phone" {...register('phone')} placeholder="Optional" className="mt-1.5" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
              ) : (
                'Update User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
