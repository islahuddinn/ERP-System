'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api-error'
import { useRegionsDropdown } from '@/hooks/useRegions'
import { useZonesDropdown } from '@/hooks/useZones'
import { useCitiesDropdown } from '@/hooks/useCities'
import { useBranchesDropdown } from '@/hooks/useBranches'
import { useAreasDropdown, useArea } from '@/hooks/useAreas'
import { useCustomerCategoriesDropdown } from '@/hooks/useCustomerCategories'
import {
  useCreateCustomer,
  useUpdateCustomer,
  type Customer,
  type CustomerPayload,
  type CustomerStatus,
  type CustomerType,
  type PaymentMethod,
} from '@/hooks/useCustomers'

export interface CustomerFormData {
  shopName: string
  shopkeeperName: string
  phone: string
  email: string
  cnic: string
  customerType: CustomerType
  categoryId: string
  paymentMode: PaymentMethod
  address: string
  regionId: string
  zoneId: string
  cityId: string
  branchId: string
  areaId: string
  creditLimit: string
  remarks: string
  status: CustomerStatus
}

export interface CustomerFormProps {
  customer?: Customer | null
  /** Pre-selected area when creating from a drilled-in territory context. */
  defaultAreaId?: string
  /** When false, form hydration is cleared (e.g. dialog closed). Defaults to true for pages. */
  active?: boolean
  onSuccess?: () => void
  onCancel?: () => void
  /** Page layout shows a wider footer bar; embedded fits inside a dialog. */
  layout?: 'page' | 'embedded'
}

export function CustomerForm({
  customer,
  defaultAreaId,
  active = true,
  onSuccess,
  onCancel,
  layout = 'page',
}: CustomerFormProps) {
  const isEdit = Boolean(customer)
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const areaIdForLookup = (defaultAreaId && !customer ? defaultAreaId : customer?.areaId) ?? ''
  const { data: defaultArea } = useArea(areaIdForLookup)
  const [isHydrated, setIsHydrated] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<CustomerFormData>({
    defaultValues: {
      shopName: '',
      shopkeeperName: '',
      phone: '',
      email: '',
      cnic: '',
      customerType: 'RETAILER',
      categoryId: '',
      paymentMode: 'CASH',
      address: '',
      regionId: '',
      zoneId: '',
      cityId: '',
      branchId: '',
      areaId: '',
      creditLimit: '1',
      remarks: '',
      status: 'ACTIVE',
    },
  })

  const regionId = useWatch({ control, name: 'regionId' })
  const zoneId = useWatch({ control, name: 'zoneId' })
  const cityId = useWatch({ control, name: 'cityId' })
  const branchId = useWatch({ control, name: 'branchId' })

  const { data: regionOptions = [], isLoading: loadingRegions } = useRegionsDropdown()
  const { data: zoneOptions = [], isLoading: loadingZones } = useZonesDropdown(regionId || undefined)
  const { data: cityOptions = [], isLoading: loadingCities } = useCitiesDropdown(zoneId || undefined)
  const { data: branchOptions = [], isLoading: loadingBranches } = useBranchesDropdown(cityId || undefined)
  const { data: areaOptions = [], isLoading: loadingAreas } = useAreasDropdown(branchId || undefined)
  const { data: categoryOptions = [], isLoading: loadingCategories } = useCustomerCategoriesDropdown()

  useEffect(() => {
    if (!active) {
      setIsHydrated(false)
      return
    }

    const territoryDefaults = defaultArea
      ? {
          regionId: defaultArea.branch?.city?.zone?.region?.id ?? '',
          zoneId: defaultArea.branch?.city?.zone?.id ?? '',
          cityId: defaultArea.branch?.city?.id ?? '',
          branchId: defaultArea.branchId,
          areaId: defaultArea.id,
        }
      : {
          regionId: '',
          zoneId: '',
          cityId: '',
          branchId: '',
          areaId: customer?.areaId ?? defaultAreaId ?? '',
        }

    reset({
      shopName: customer?.shopName ?? '',
      shopkeeperName: customer?.shopkeeperName ?? '',
      phone: customer?.phone ?? '',
      email: customer?.email ?? '',
      cnic: customer?.cnic ?? '',
      customerType: customer?.customerType ?? 'RETAILER',
      categoryId: customer?.categoryId ?? '',
      paymentMode: customer?.paymentMode ?? 'CASH',
      address: customer?.address ?? '',
      regionId: territoryDefaults.regionId,
      zoneId: territoryDefaults.zoneId,
      cityId: territoryDefaults.cityId,
      branchId: territoryDefaults.branchId,
      areaId: customer?.areaId ?? territoryDefaults.areaId,
      creditLimit: String(customer?.creditLimit ?? 1),
      remarks: customer?.remarks ?? '',
      status: customer?.status ?? 'ACTIVE',
    })
    setIsHydrated(true)
  }, [active, customer, defaultArea, defaultAreaId, reset])

  const onSubmit = async (data: CustomerFormData) => {
    const creditLimit = Number(data.creditLimit)
    if (!Number.isFinite(creditLimit) || creditLimit < 0) {
      toast.error('Credit limit must be zero or a positive number')
      return
    }

    try {
      if (isEdit && customer) {
        const payload: Partial<CustomerPayload> = {}
        if (dirtyFields.shopName) payload.shopName = data.shopName.trim()
        if (dirtyFields.shopkeeperName) payload.shopkeeperName = data.shopkeeperName.trim() || undefined
        if (dirtyFields.phone) payload.phone = data.phone.trim()
        if (dirtyFields.email) payload.email = data.email.trim() || undefined
        if (dirtyFields.cnic) payload.cnic = data.cnic.trim()
        if (dirtyFields.customerType) payload.customerType = data.customerType
        if (dirtyFields.categoryId) payload.categoryId = data.categoryId
        if (dirtyFields.paymentMode) payload.paymentMode = data.paymentMode
        if (dirtyFields.address) payload.address = data.address.trim()
        if (dirtyFields.areaId) payload.areaId = data.areaId
        if (dirtyFields.creditLimit) payload.creditLimit = creditLimit > 0 ? creditLimit : 1
        if (dirtyFields.remarks) payload.remarks = data.remarks.trim() || undefined
        if (dirtyFields.status) payload.status = data.status
        await updateMutation.mutateAsync({ id: customer.id, data: payload })
      } else {
        await createMutation.mutateAsync({
          shopName: data.shopName.trim(),
          shopkeeperName: data.shopkeeperName.trim() || undefined,
          phone: data.phone.trim(),
          email: data.email.trim() || undefined,
          cnic: data.cnic.trim(),
          customerType: data.customerType,
          categoryId: data.categoryId,
          paymentMode: data.paymentMode,
          address: data.address.trim(),
          areaId: data.areaId,
          creditLimit: creditLimit > 0 ? creditLimit : 1,
          remarks: data.remarks.trim() || undefined,
          status: data.status,
        })
      }
      onSuccess?.()
    } catch (error) {
      toast.error(getApiErrorMessage(error, isEdit ? 'Failed to update customer' : 'Failed to create customer'))
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="shop-name" className="text-gray-700 font-medium">
            Shop Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="shop-name"
            {...register('shopName', {
              required: 'Shop name is required',
              validate: (value) => value.trim().length > 0 || 'Shop name is required',
            })}
            placeholder="e.g. Ahmed Traders"
            className="mt-1.5 h-11 border-gray-300"
          />
          {errors.shopName && <p className="text-sm text-red-600 mt-1">{errors.shopName.message}</p>}
        </div>

        <div>
          <Label htmlFor="shopkeeper-name" className="text-gray-700 font-medium">
            Shopkeeper Name
          </Label>
          <Input
            id="shopkeeper-name"
            {...register('shopkeeperName')}
            placeholder="e.g. Ahmed Khan"
            className="mt-1.5 h-11 border-gray-300"
          />
        </div>

        <div>
          <Label htmlFor="customer-type" className="text-gray-700 font-medium">
            Customer Type <span className="text-red-500">*</span>
          </Label>
          <Controller
            control={control}
            name="customerType"
            rules={{ required: 'Customer type is required' }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RETAILER">Retailer</SelectItem>
                  <SelectItem value="WHOLESALER">Wholesaler</SelectItem>
                  <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-gray-700 font-medium">
            Phone <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            {...register('phone', { required: 'Phone is required' })}
            placeholder="+923001234567"
            className="mt-1.5 h-11 border-gray-300"
          />
          {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
        </div>

        <div>
          <Label htmlFor="email" className="text-gray-700 font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="shop@example.com"
            className="mt-1.5 h-11 border-gray-300"
          />
        </div>

        <div>
          <Label htmlFor="cnic" className="text-gray-700 font-medium">
            CNIC <span className="text-red-500">*</span>
          </Label>
          <Input
            id="cnic"
            {...register('cnic', { required: 'CNIC is required' })}
            placeholder="35202-1234567-1"
            className="mt-1.5 h-11 border-gray-300"
          />
          {errors.cnic && <p className="text-sm text-red-600 mt-1">{errors.cnic.message}</p>}
        </div>

        <div>
          <Label className="text-gray-700 font-medium">
            Category <span className="text-red-500">*</span>
          </Label>
          <Controller
            control={control}
            name="categoryId"
            rules={{ required: 'Category is required' }}
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                  <SelectValue placeholder={loadingCategories ? 'Loading…' : 'Select category'} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoryId && <p className="text-sm text-red-600 mt-1">{errors.categoryId.message}</p>}
        </div>

        <div>
          <Label className="text-gray-700 font-medium">
            Payment Mode <span className="text-red-500">*</span>
          </Label>
          <Controller
            control={control}
            name="paymentMode"
            rules={{ required: 'Payment mode is required' }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="MOBILE_PAYMENT">Mobile Payment</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label htmlFor="credit-limit" className="text-gray-700 font-medium">
            Credit Limit <span className="text-red-500">*</span>
          </Label>
          <Input
            id="credit-limit"
            type="number"
            min="0"
            step="1"
            {...register('creditLimit', { required: 'Credit limit is required' })}
            className="mt-1.5 h-11 border-gray-300"
          />
          {errors.creditLimit && <p className="text-sm text-red-600 mt-1">{errors.creditLimit.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="address" className="text-gray-700 font-medium">
          Address <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="address"
          {...register('address', {
            required: 'Address is required',
            validate: (value) => value.trim().length > 0 || 'Address is required',
          })}
          rows={2}
          className="mt-1.5 border-gray-300"
        />
        {errors.address && <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>}
      </div>

      <div className="rounded-lg border border-gray-200 p-4 space-y-4">
        <p className="text-sm font-medium text-gray-900">Territory</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-gray-700 font-medium">Region <span className="text-red-500">*</span></Label>
            <Controller
              control={control}
              name="regionId"
              rules={{ required: 'Region is required' }}
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(value) => {
                    field.onChange(value)
                    setValue('zoneId', '', { shouldDirty: true })
                    setValue('cityId', '', { shouldDirty: true })
                    setValue('branchId', '', { shouldDirty: true })
                    setValue('areaId', '', { shouldDirty: true })
                  }}
                >
                  <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder={loadingRegions ? 'Loading…' : 'Select region'} />
                  </SelectTrigger>
                  <SelectContent>
                    {regionOptions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
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
              rules={{ required: 'Zone is required' }}
              render={({ field }) => (
                <Select
                  key={`zone-${isHydrated ? 'r' : 'l'}-${regionId}`}
                  value={field.value || undefined}
                  onValueChange={(value) => {
                    field.onChange(value)
                    setValue('cityId', '', { shouldDirty: true })
                    setValue('branchId', '', { shouldDirty: true })
                    setValue('areaId', '', { shouldDirty: true })
                  }}
                  disabled={!regionId}
                >
                  <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder={!regionId ? 'Select region first' : loadingZones ? 'Loading…' : 'Select zone'} />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneOptions.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
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
                  onValueChange={(value) => {
                    field.onChange(value)
                    setValue('branchId', '', { shouldDirty: true })
                    setValue('areaId', '', { shouldDirty: true })
                  }}
                  disabled={!zoneId}
                >
                  <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder={!zoneId ? 'Select zone first' : loadingCities ? 'Loading…' : 'Select city'} />
                  </SelectTrigger>
                  <SelectContent>
                    {cityOptions.map((city) => (
                      <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
                  onValueChange={(value) => {
                    field.onChange(value)
                    setValue('areaId', '', { shouldDirty: true })
                  }}
                  disabled={!cityId}
                >
                  <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder={!cityId ? 'Select city first' : loadingBranches ? 'Loading…' : 'Select branch'} />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="sm:col-span-2">
            <Label className="text-gray-700 font-medium">Area <span className="text-red-500">*</span></Label>
            <Controller
              control={control}
              name="areaId"
              rules={{ required: 'Area is required' }}
              render={({ field }) => (
                <Select
                  key={`area-${isHydrated ? 'r' : 'l'}-${branchId}`}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={!branchId}
                >
                  <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder={!branchId ? 'Select branch first' : loadingAreas ? 'Loading…' : 'Select area'} />
                  </SelectTrigger>
                  <SelectContent>
                    {areaOptions.map((area) => (
                      <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.areaId && <p className="text-sm text-red-600 mt-1">{errors.areaId.message}</p>}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="remarks" className="text-gray-700 font-medium">
          Remarks
        </Label>
        <Textarea id="remarks" {...register('remarks')} rows={2} className="mt-1.5 border-gray-300" />
      </div>

      <div>
        <Label className="text-gray-700 font-medium">Status</Label>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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

      {(onCancel || onSuccess) && (
        <div
          className={
            layout === 'page'
              ? 'flex items-center justify-end gap-4 pt-2'
              : 'flex gap-2 sm:justify-end pt-2'
          }
        >
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white min-w-[110px]">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  )
}
