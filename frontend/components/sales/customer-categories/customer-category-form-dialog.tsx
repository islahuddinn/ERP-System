'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Loader2, Save } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  useCreateCustomerCategory,
  useUpdateCustomerCategory,
  type CustomerCategory,
  type CustomerCategoryStatus,
} from '@/hooks/useCustomerCategories'

interface CustomerCategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerCategory?: CustomerCategory | null
}

interface CustomerCategoryFormData {
  name: string
  status: CustomerCategoryStatus
}

export function CustomerCategoryFormDialog({
  open,
  onOpenChange,
  customerCategory,
}: CustomerCategoryFormDialogProps) {
  const isEdit = Boolean(customerCategory)
  const createMutation = useCreateCustomerCategory()
  const updateMutation = useUpdateCustomerCategory()
  const [isHydrated, setIsHydrated] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<CustomerCategoryFormData>({
    defaultValues: { name: '', status: 'ACTIVE' },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: customerCategory?.name ?? '',
        status: customerCategory?.status ?? 'ACTIVE',
      })
      setIsHydrated(true)
    } else {
      setIsHydrated(false)
    }
  }, [open, customerCategory, reset])

  const onSubmit = async (data: CustomerCategoryFormData) => {
    try {
      if (isEdit && customerCategory) {
        const payload: Partial<CustomerCategoryFormData> = {}
        if (dirtyFields.name) payload.name = data.name.trim()
        if (dirtyFields.status) payload.status = data.status
        await updateMutation.mutateAsync({
          customerCategoryId: customerCategory.id,
          data: payload,
        })
      } else {
        await createMutation.mutateAsync({
          name: data.name.trim(),
          status: data.status,
        })
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, isEdit ? 'Failed to update category' : 'Failed to create category'),
      )
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Customer Category' : 'Add Customer Category'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this shop category.'
              : 'Create a category used when registering customers (shops).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="category-name" className="text-gray-700 font-medium">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="category-name"
              {...register('name', {
                required: 'Name is required',
                validate: (value) => value.trim().length > 0 || 'Name is required',
                maxLength: { value: 128, message: 'Name must be 128 characters or fewer' },
              })}
              placeholder="e.g. General Trade"
              className="mt-1.5 h-11 border-gray-300"
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="category-status" className="text-gray-700 font-medium">
              Status
            </Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  key={`status-${isHydrated ? 'ready' : 'loading'}`}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="category-status" className="mt-1.5 h-11 border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[110px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
