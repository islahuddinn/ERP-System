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
import { useCreateRegion, useUpdateRegion, type Region, type TerritoryStatus } from '@/hooks/useRegions'

interface RegionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass a region to edit; omit to create. */
  region?: Region | null
}

interface RegionFormData {
  name: string
  countryName: string
  status: TerritoryStatus
}

export function RegionFormDialog({ open, onOpenChange, region }: RegionFormDialogProps) {
  const isEdit = Boolean(region)
  const createMutation = useCreateRegion()
  const updateMutation = useUpdateRegion()

  // Radix Select only repaints its value on remount, so key the Select on this
  // flag once the form is reset from the region being edited (edit-prefill fix).
  const [isHydrated, setIsHydrated] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<RegionFormData>({
    defaultValues: { name: '', countryName: '', status: 'ACTIVE' },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: region?.name ?? '',
        countryName: region?.countryName ?? '',
        status: region?.status ?? 'ACTIVE',
      })
      setIsHydrated(true)
    } else {
      setIsHydrated(false)
    }
  }, [open, region, reset])

  const onSubmit = async (data: RegionFormData) => {
    try {
      if (isEdit && region) {
        // Only send changed fields.
        const payload: Partial<RegionFormData> = {}
        if (dirtyFields.name) payload.name = data.name.trim()
        if (dirtyFields.countryName) payload.countryName = data.countryName.trim()
        if (dirtyFields.status) payload.status = data.status
        await updateMutation.mutateAsync({ id: region.id, data: payload })
      } else {
        await createMutation.mutateAsync({
          name: data.name.trim(),
          countryName: data.countryName.trim(),
          status: data.status,
        })
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, isEdit ? 'Failed to update region' : 'Failed to create region'))
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Region' : 'Add Region'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this region.' : 'Create a new top-level region.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="region-name" className="text-gray-700 font-medium">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="region-name"
              {...register('name', {
                required: 'Name is required',
                validate: (v) => v.trim().length > 0 || 'Name is required',
                maxLength: { value: 128, message: 'Name must be 128 characters or fewer' },
              })}
              placeholder="e.g. Punjab"
              className="mt-1.5 h-11 border-gray-300"
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="region-country" className="text-gray-700 font-medium">
              Country <span className="text-red-500">*</span>
            </Label>
            <Input
              id="region-country"
              {...register('countryName', {
                required: 'Country is required',
                validate: (v) => v.trim().length > 0 || 'Country is required',
                maxLength: { value: 128, message: 'Country must be 128 characters or fewer' },
              })}
              placeholder="e.g. Pakistan"
              className="mt-1.5 h-11 border-gray-300"
            />
            {errors.countryName && (
              <p className="text-sm text-red-600 mt-1">{errors.countryName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="region-status" className="text-gray-700 font-medium">
              Status
            </Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select key={`status-${isHydrated ? 'ready' : 'loading'}`} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="region-status" className="mt-1.5 h-11 border-gray-300">
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
