'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
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
import { useZonesDropdown } from '@/hooks/useZones'
import { useCreateCity, useUpdateCity, type City } from '@/hooks/useCities'

interface CityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  city?: City | null
  /** Pre-selected zone when creating from a drilled-in zone context. */
  defaultRegionId?: string
  defaultZoneId?: string
}

interface CityFormData {
  name: string
  // regionId is a helper only (scopes the zone picker) — not sent to the API.
  regionId: string
  zoneId: string
  status: TerritoryStatus
}

export function CityFormDialog({
  open,
  onOpenChange,
  city,
  defaultRegionId,
  defaultZoneId,
}: CityFormDialogProps) {
  const isEdit = Boolean(city)
  const createMutation = useCreateCity()
  const updateMutation = useUpdateCity()

  const [isHydrated, setIsHydrated] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<CityFormData>({
    defaultValues: { name: '', regionId: '', zoneId: '', status: 'ACTIVE' },
  })

  const regionId = useWatch({ control, name: 'regionId' })
  const { data: regionOptions = [], isLoading: isLoadingRegions } = useRegionsDropdown()
  const { data: zoneOptions = [], isLoading: isLoadingZones } = useZonesDropdown(regionId || undefined)

  useEffect(() => {
    if (open) {
      reset({
        name: city?.name ?? '',
        regionId: city?.zone?.region?.id ?? defaultRegionId ?? '',
        zoneId: city?.zoneId ?? defaultZoneId ?? '',
        status: city?.status ?? 'ACTIVE',
      })
      setIsHydrated(true)
    } else {
      setIsHydrated(false)
    }
  }, [open, city, defaultRegionId, defaultZoneId, reset])

  const onSubmit = async (data: CityFormData) => {
    try {
      if (isEdit && city) {
        const payload: Partial<Pick<CityFormData, 'name' | 'zoneId' | 'status'>> = {}
        if (dirtyFields.name) payload.name = data.name.trim()
        if (dirtyFields.zoneId) payload.zoneId = data.zoneId
        if (dirtyFields.status) payload.status = data.status
        await updateMutation.mutateAsync({ id: city.id, data: payload })
      } else {
        await createMutation.mutateAsync({ name: data.name.trim(), zoneId: data.zoneId, status: data.status })
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, isEdit ? 'Failed to update city' : 'Failed to create city'))
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit City' : 'Add City'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this city.' : 'Create a new city under a zone.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="city-name" className="text-gray-700 font-medium">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="city-name"
              {...register('name', {
                required: 'Name is required',
                validate: (v) => v.trim().length > 0 || 'Name is required',
                maxLength: { value: 128, message: 'Name must be 128 characters or fewer' },
              })}
              placeholder="e.g. Lahore"
              className="mt-1.5 h-11 border-gray-300"
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="city-region" className="text-gray-700 font-medium">
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
                  onValueChange={(v) => {
                    field.onChange(v)
                    // Reset the dependent zone whenever the region changes.
                    setValue('zoneId', '', { shouldDirty: true })
                  }}
                >
                  <SelectTrigger id="city-region" className="mt-1.5 h-11 border-gray-300">
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
            <Label htmlFor="city-zone" className="text-gray-700 font-medium">
              Zone <span className="text-red-500">*</span>
            </Label>
            <Controller
              control={control}
              name="zoneId"
              rules={{ required: 'Zone is required' }}
              render={({ field }) => (
                <Select
                  key={`zone-${isHydrated ? 'ready' : 'loading'}-${regionId}-${isLoadingZones ? 'l' : 'r'}`}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={!regionId}
                >
                  <SelectTrigger id="city-zone" className="mt-1.5 h-11 border-gray-300">
                    <SelectValue
                      placeholder={
                        !regionId ? 'Select a region first' : isLoadingZones ? 'Loading…' : 'Select a zone'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneOptions.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.zoneId && <p className="text-sm text-red-600 mt-1">{errors.zoneId.message}</p>}
          </div>

          <div>
            <Label htmlFor="city-status" className="text-gray-700 font-medium">
              Status
            </Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select key={`status-${isHydrated ? 'ready' : 'loading'}`} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="city-status" className="mt-1.5 h-11 border-gray-300">
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
