'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
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
import { Loader2, Save } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryStatus } from '@/hooks/useRegions'
import { useCreateProductGroup, useUpdateProductGroup, type ProductGroup } from '@/hooks/useProductGroups'

interface ProductGroupFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productGroup?: ProductGroup | null
}

interface ProductGroupFormData {
  name: string
  status: TerritoryStatus
}

export function ProductGroupFormDialog({ open, onOpenChange, productGroup }: ProductGroupFormDialogProps) {
  const isEdit = Boolean(productGroup)
  const createMutation = useCreateProductGroup()
  const updateMutation = useUpdateProductGroup()
  const [isHydrated, setIsHydrated] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<ProductGroupFormData>({ defaultValues: { name: '', status: 'ACTIVE' } })

  useEffect(() => {
    if (open) {
      reset({ name: productGroup?.name ?? '', status: productGroup?.status ?? 'ACTIVE' })
      setIsHydrated(true)
    } else {
      setIsHydrated(false)
    }
  }, [open, productGroup, reset])

  const onSubmit = async (data: ProductGroupFormData) => {
    try {
      if (isEdit && productGroup) {
        const payload: Partial<ProductGroupFormData> = {}
        if (dirtyFields.name) payload.name = data.name.trim()
        if (dirtyFields.status) payload.status = data.status
        await updateMutation.mutateAsync({ id: productGroup.id, data: payload })
      } else {
        await createMutation.mutateAsync({ name: data.name.trim(), status: data.status })
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, isEdit ? 'Failed to update product group' : 'Failed to create product group'))
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product Group' : 'Add Product Group'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this product group.' : 'Create a product group (used by branches and products).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="pg-name" className="text-gray-700 font-medium">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pg-name"
              {...register('name', {
                required: 'Name is required',
                validate: (v) => v.trim().length > 0 || 'Name is required',
                maxLength: { value: 128, message: 'Name must be 128 characters or fewer' },
              })}
              placeholder="e.g. Beverages"
              className="mt-1.5 h-11 border-gray-300"
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="pg-status" className="text-gray-700 font-medium">
              Status
            </Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select key={`status-${isHydrated ? 'ready' : 'loading'}`} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="pg-status" className="mt-1.5 h-11 border-gray-300">
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
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white min-w-[110px]">
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Save</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
