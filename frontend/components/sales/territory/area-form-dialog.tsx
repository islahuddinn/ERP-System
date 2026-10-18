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
import type { TerritoryStatus } from '@/hooks/useRegions'
import { useCitiesDropdown } from '@/hooks/useCities'
import { useBranchesDropdown } from '@/hooks/useBranches'
import { useCreateArea, useUpdateArea, type Area } from '@/hooks/useAreas'

interface AreaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  area?: Area | null
  /** Pre-selected branch when creating from a drilled-in branch context. */
  defaultCityId?: string
  defaultBranchId?: string
}

interface AreaFormData {
  name: string
  cityId: string // helper — scopes the branch picker, not sent to the API
  branchId: string
  status: TerritoryStatus
}

export function AreaFormDialog({
  open,
  onOpenChange,
  area,
  defaultCityId,
  defaultBranchId,
}: AreaFormDialogProps) {
  const isEdit = Boolean(area)
  const createMutation = useCreateArea()
  const updateMutation = useUpdateArea()
  const [isHydrated, setIsHydrated] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<AreaFormData>({ defaultValues: { name: '', cityId: '', branchId: '', status: 'ACTIVE' } })

  const cityId = useWatch({ control, name: 'cityId' })
  const { data: cityOptions = [], isLoading: loadingCities } = useCitiesDropdown()
  const { data: branchOptions = [], isLoading: loadingBranches } = useBranchesDropdown(cityId || undefined)

  useEffect(() => {
    if (open) {
      reset({
        name: area?.name ?? '',
        cityId: area?.branch?.city?.id ?? defaultCityId ?? '',
        branchId: area?.branchId ?? defaultBranchId ?? '',
        status: area?.status ?? 'ACTIVE',
      })
      setIsHydrated(true)
    } else {
      setIsHydrated(false)
    }
  }, [open, area, defaultCityId, defaultBranchId, reset])

  const onSubmit = async (data: AreaFormData) => {
    try {
      if (isEdit && area) {
        const payload: Partial<Pick<AreaFormData, 'name' | 'branchId' | 'status'>> = {}
        if (dirtyFields.name) payload.name = data.name.trim()
        if (dirtyFields.branchId) payload.branchId = data.branchId
        if (dirtyFields.status) payload.status = data.status
        await updateMutation.mutateAsync({ id: area.id, data: payload })
      } else {
        await createMutation.mutateAsync({ name: data.name.trim(), branchId: data.branchId, status: data.status })
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, isEdit ? 'Failed to update area' : 'Failed to create area'))
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Area' : 'Add Area'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update this area.' : 'Create an area under a branch.'}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="area-name" className="text-gray-700 font-medium">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="area-name"
              {...register('name', {
                required: 'Name is required',
                validate: (v) => v.trim().length > 0 || 'Name is required',
                maxLength: { value: 128, message: 'Name must be 128 characters or fewer' },
              })}
              placeholder="e.g. DHA Phase 5"
              className="mt-1.5 h-11 border-gray-300"
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label className="text-gray-700 font-medium">City <span className="text-red-500">*</span></Label>
            <Controller
              control={control}
              name="cityId"
              rules={{ required: 'City is required' }}
              render={({ field }) => (
                <Select
                  key={`city-${isHydrated ? 'r' : 'l'}-${loadingCities ? 'l' : 'r'}`}
                  value={field.value || undefined}
                  onValueChange={(v) => {
                    field.onChange(v)
                    setValue('branchId', '', { shouldDirty: true })
                  }}
                >
                  <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder={loadingCities ? 'Loading…' : 'Select a city'} />
                  </SelectTrigger>
                  <SelectContent>
                    {cityOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.cityId && <p className="text-sm text-red-600 mt-1">{errors.cityId.message}</p>}
          </div>

          <div>
            <Label className="text-gray-700 font-medium">Branch <span className="text-red-500">*</span></Label>
            <Controller
              control={control}
              name="branchId"
              rules={{ required: 'Branch is required' }}
              render={({ field }) => (
                <Select
                  key={`branch-${isHydrated ? 'r' : 'l'}-${cityId}`}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={!cityId}
                >
                  <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder={!cityId ? 'Select a city first' : loadingBranches ? 'Loading…' : 'Select a branch'} />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.branchId && <p className="text-sm text-red-600 mt-1">{errors.branchId.message}</p>}
          </div>

          <div>
            <Label className="text-gray-700 font-medium">Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select key={`status-${isHydrated ? 'r' : 'l'}`} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1.5 h-11 border-gray-300">
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
