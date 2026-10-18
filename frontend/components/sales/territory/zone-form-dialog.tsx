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
import { useRegionsDropdown, type TerritoryStatus } from '@/hooks/useRegions'
import { useCreateZone, useUpdateZone, type Zone } from '@/hooks/useZones'

interface ZoneFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  zone?: Zone | null
  /** Pre-selected region when creating from a drilled-in region context. */
  defaultRegionId?: string
}

interface ZoneFormData {
  name: string
  regionId: string
  status: TerritoryStatus
}

export function ZoneFormDialog({ open, onOpenChange, zone, defaultRegionId }: ZoneFormDialogProps) {
  const isEdit = Boolean(zone)
  const createMutation = useCreateZone()
  const updateMutation = useUpdateZone()
  const { data: regionOptions = [], isLoading: isLoadingRegions } = useRegionsDropdown()

  const [isHydrated, setIsHydrated] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<ZoneFormData>({
    defaultValues: { name: '', regionId: '', status: 'ACTIVE' },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: zone?.name ?? '',
        regionId: zone?.regionId ?? defaultRegionId ?? '',
        status: zone?.status ?? 'ACTIVE',
      })
      setIsHydrated(true)
    } else {
      setIsHydrated(false)
    }
  }, [open, zone, defaultRegionId, reset])

  const onSubmit = async (data: ZoneFormData) => {
    try {
      if (isEdit && zone) {
        const payload: Partial<ZoneFormData> = {}
        if (dirtyFields.name) payload.name = data.name.trim()
        if (dirtyFields.regionId) payload.regionId = data.regionId
        if (dirtyFields.status) payload.status = data.status
        await updateMutation.mutateAsync({ id: zone.id, data: payload })
      } else {
        await createMutation.mutateAsync({ name: data.name.trim(), regionId: data.regionId, status: data.status })
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, isEdit ? 'Failed to update zone' : 'Failed to create zone'))
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Zone' : 'Add Zone'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this zone.' : 'Create a new zone under a region.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="zone-name" className="text-gray-700 font-medium">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="zone-name"
              {...register('name', {
                required: 'Name is required',
                validate: (v) => v.trim().length > 0 || 'Name is required',
                maxLength: { value: 128, message: 'Name must be 128 characters or fewer' },
              })}
              placeholder="e.g. Lahore Zone"
              className="mt-1.5 h-11 border-gray-300"
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="zone-region" className="text-gray-700 font-medium">
              Region <span className="text-red-500">*</span>
            </Label>
            <Controller
              control={control}
              name="regionId"
              rules={{ required: 'Region is required' }}
              render={({ field }) => (
                <Select
                  key={`region-${isHydrated ? 'ready' : 'loading'}-${isLoadingRegions ? 'l' : 'r'}`}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="zone-region" className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder={isLoadingRegions ? 'Loading…' : 'Select a region'} />
                  </SelectTrigger>
                  <SelectContent>
                    {regionOptions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.regionId && <p className="text-sm text-red-600 mt-1">{errors.regionId.message}</p>}
          </div>

          <div>
            <Label htmlFor="zone-status" className="text-gray-700 font-medium">
              Status
            </Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select key={`status-${isHydrated ? 'ready' : 'loading'}`} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="zone-status" className="mt-1.5 h-11 border-gray-300">
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
