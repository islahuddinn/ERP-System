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
import { Check, Loader2, Save } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api-error'
import { useRegionsDropdown, type TerritoryStatus } from '@/hooks/useRegions'
import { useZonesDropdown } from '@/hooks/useZones'
import { useCitiesDropdown } from '@/hooks/useCities'
import { employeeLabel, useEmployeesDistributorDropdown } from '@/hooks/useEmployees'
import { useProductGroupsDropdown } from '@/hooks/useProductGroups'
import { useCreateBranch, useUpdateBranch, type Branch } from '@/hooks/useBranches'
import { PRICE_LIST_TIER_LABELS, type PriceListTier } from '@/hooks/usePriceLists'

interface BranchFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch?: Branch | null
  /** Pre-selected territory when creating from a drilled-in city context. */
  defaultRegionId?: string
  defaultZoneId?: string
  defaultCityId?: string
}

interface BranchFormData {
  code: string
  name: string
  // regionId/zoneId are helpers that scope the city picker — not sent to the API.
  regionId: string
  zoneId: string
  cityId: string
  distributorId: string
  productGroupIds: string[]
  address: string
  status: TerritoryStatus
  priceTier: PriceListTier
}

export function BranchFormDialog({
  open,
  onOpenChange,
  branch,
  defaultRegionId,
  defaultZoneId,
  defaultCityId,
}: BranchFormDialogProps) {
  const isEdit = Boolean(branch)
  const createMutation = useCreateBranch()
  const updateMutation = useUpdateBranch()
  const [isHydrated, setIsHydrated] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BranchFormData>({
    defaultValues: {
      code: '',
      name: '',
      regionId: '',
      zoneId: '',
      cityId: '',
      distributorId: '',
      productGroupIds: [],
      address: '',
      status: 'ACTIVE',
      priceTier: 'DISTRIBUTOR_PRICE',
    },
  })

  const regionId = useWatch({ control, name: 'regionId' })
  const zoneId = useWatch({ control, name: 'zoneId' })

  const { data: regionOptions = [], isLoading: loadingRegions } = useRegionsDropdown()
  const { data: zoneOptions = [], isLoading: loadingZones } = useZonesDropdown(regionId || undefined)
  const { data: cityOptions = [], isLoading: loadingCities } = useCitiesDropdown(zoneId || undefined)
  const { data: employeeOptions = [], isLoading: loadingEmployees, isError: employeesError } = useEmployeesDistributorDropdown()
  const { data: productGroupOptions = [], isLoading: loadingGroups } = useProductGroupsDropdown()

  useEffect(() => {
    if (open) {
      reset({
        code: branch?.code ?? '',
        name: branch?.name ?? '',
        regionId: branch?.city?.zone?.region?.id ?? defaultRegionId ?? '',
        zoneId: branch?.city?.zone?.id ?? defaultZoneId ?? '',
        cityId: branch?.cityId ?? defaultCityId ?? '',
        distributorId: branch?.distributorId ?? '',
        productGroupIds: branch?.productGroupIds ?? [],
        address: branch?.address ?? '',
        status: branch?.status ?? 'ACTIVE',
        priceTier: (branch?.priceTier as PriceListTier) ?? 'DISTRIBUTOR_PRICE',
      })
      setIsHydrated(true)
    } else {
      setIsHydrated(false)
    }
  }, [open, branch, defaultRegionId, defaultZoneId, defaultCityId, reset])

  const onSubmit = async (data: BranchFormData) => {
    if (!data.productGroupIds.length) {
      toast.error('Select at least one product group')
      return
    }
    const payload = {
      code: data.code.trim(),
      name: data.name.trim(),
      cityId: data.cityId,
      distributorId: data.distributorId,
      address: data.address.trim(),
      productGroupIds: data.productGroupIds,
      status: data.status,
      priceTier: data.priceTier,
    }
    try {
      if (isEdit && branch) {
        await updateMutation.mutateAsync({ id: branch.id, data: payload })
      } else {
        await createMutation.mutateAsync({ ...payload, type: 'PRIMARY' })
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, isEdit ? 'Failed to update branch' : 'Failed to create branch'))
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this branch.' : 'Create a branch under a city, with a distributor and product groups.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="branch-code" className="text-gray-700 font-medium">
                Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="branch-code"
                {...register('code', {
                  required: 'Code is required',
                  validate: (v) => v.trim().length > 0 || 'Code is required',
                  maxLength: { value: 64, message: 'Max 64 characters' },
                })}
                placeholder="e.g. LHR-DHA-01"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.code && <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="branch-name" className="text-gray-700 font-medium">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="branch-name"
                {...register('name', {
                  required: 'Name is required',
                  validate: (v) => v.trim().length > 0 || 'Name is required',
                  maxLength: { value: 128, message: 'Max 128 characters' },
                })}
                placeholder="e.g. DHA Branch"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
            </div>
          </div>

          {/* Region → Zone → City cascade */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-gray-700 font-medium">Region <span className="text-red-500">*</span></Label>
              <Controller
                control={control}
                name="regionId"
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    key={`region-${isHydrated ? 'r' : 'l'}-${loadingRegions ? 'l' : 'r'}`}
                    value={field.value || undefined}
                    onValueChange={(v) => {
                      field.onChange(v)
                      setValue('zoneId', '')
                      setValue('cityId', '')
                    }}
                  >
                    <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                      <SelectValue placeholder={loadingRegions ? 'Loading…' : 'Region'} />
                    </SelectTrigger>
                    <SelectContent>
                      {regionOptions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium">Zone <span className="text-red-500">*</span></Label>
              <Controller
                control={control}
                name="zoneId"
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    key={`zone-${isHydrated ? 'r' : 'l'}-${regionId}`}
                    value={field.value || undefined}
                    onValueChange={(v) => {
                      field.onChange(v)
                      setValue('cityId', '')
                    }}
                    disabled={!regionId}
                  >
                    <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                      <SelectValue placeholder={!regionId ? 'Region first' : loadingZones ? 'Loading…' : 'Zone'} />
                    </SelectTrigger>
                    <SelectContent>
                      {zoneOptions.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium">City <span className="text-red-500">*</span></Label>
              <Controller
                control={control}
                name="cityId"
                rules={{ required: 'City is required' }}
                render={({ field }) => (
                  <Select
                    key={`city-${isHydrated ? 'r' : 'l'}-${zoneId}`}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={!zoneId}
                  >
                    <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                      <SelectValue placeholder={!zoneId ? 'Zone first' : loadingCities ? 'Loading…' : 'City'} />
                    </SelectTrigger>
                    <SelectContent>
                      {cityOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          {errors.cityId && <p className="text-sm text-red-600 -mt-2">{errors.cityId.message}</p>}

          <div>
            <Label className="text-gray-700 font-medium">Distributor (Employee) <span className="text-red-500">*</span></Label>
            <Controller
              control={control}
              name="distributorId"
              rules={{ required: 'Distributor is required' }}
              render={({ field }) => (
                <Select
                  key={`dist-${isHydrated ? 'r' : 'l'}-${loadingEmployees ? 'l' : 'r'}`}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder={loadingEmployees ? 'Loading…' : 'Select a distributor'} />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeOptions.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-gray-500">
                        No employees yet. Create one in HR → Employees, or run tenant bootstrap for
                        the admin account.
                      </div>
                    ) : (
                      employeeOptions.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {employeeLabel(e)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {!loadingEmployees && employeeOptions.length === 0 && (
              <p className="text-sm text-amber-800 mt-1">
                {employeesError
                  ? 'Could not load employees — refresh the page or restart the backend, then try again.'
                  : 'Add an ACTIVE employee in HR → Employees first — the branch distributor must be an employee record.'}{' '}
                {!employeesError && (
                  <a href="/dashboard/hr/employees" className="underline font-medium">
                    Open HR → Employees
                  </a>
                )}
              </p>
            )}
            {errors.distributorId && <p className="text-sm text-red-600 mt-1">{errors.distributorId.message}</p>}
          </div>

          <div>
            <Label className="text-gray-700 font-medium">
              Buying Price Tier <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-gray-500 mt-0.5">
              Which company price list this branch buys stock at. Primary branches usually use
              Distributor Price; set matching prices under Sales → Trade Price Lists.
            </p>
            <Controller
              control={control}
              name="priceTier"
              rules={{ required: 'Price tier is required' }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder="Select price tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRICE_LIST_TIER_LABELS) as PriceListTier[]).map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {PRICE_LIST_TIER_LABELS[tier]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.priceTier && <p className="text-sm text-red-600 mt-1">{errors.priceTier.message}</p>}
          </div>

          <div>
            <Label className="text-gray-700 font-medium">
              Product Groups <span className="text-red-500">*</span>
              <span className="ml-1 text-xs font-normal text-gray-500">(at least one)</span>
            </Label>
            <Controller
              control={control}
              name="productGroupIds"
              render={({ field }) => (
                <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-md border border-gray-300 p-2">
                  {loadingGroups ? (
                    <p className="px-1 py-2 text-sm text-gray-400">Loading…</p>
                  ) : productGroupOptions.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-gray-400">No product groups — create one first.</p>
                  ) : (
                    productGroupOptions.map((pg) => {
                      const checked = field.value.includes(pg.id)
                      return (
                        <button
                          key={pg.id}
                          type="button"
                          onClick={() =>
                            field.onChange(
                              checked ? field.value.filter((id) => id !== pg.id) : [...field.value, pg.id],
                            )
                          }
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                              checked ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white'
                            }`}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </span>
                          <span className="text-gray-800">{pg.name}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            />
          </div>

          <div>
            <Label htmlFor="branch-address" className="text-gray-700 font-medium">
              Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="branch-address"
              {...register('address', {
                required: 'Address is required',
                validate: (v) => v.trim().length > 0 || 'Address is required',
              })}
              placeholder="e.g. 123 Main Blvd, DHA Phase 5"
              className="mt-1.5 h-11 border-gray-300"
            />
            {errors.address && <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>}
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
