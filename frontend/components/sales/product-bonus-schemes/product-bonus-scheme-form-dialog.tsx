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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getApiErrorMessage } from '@/lib/api-error'
import { useProductBonusGroupsDropdown } from '@/hooks/useProductBonusGroups'
import {
  useCreateProductBonusScheme,
  useProductBonusScheme,
  useUpdateProductBonusScheme,
  type ProductBonusScheme,
  type ProductBonusSchemeStatus,
} from '@/hooks/useProductBonusSchemes'

interface ProductBonusSchemeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productBonusScheme?: ProductBonusScheme | null
}

interface ProductBonusSchemeFormData {
  code: string
  name: string
  description: string
  productBonusGroupId: string
  minPurchaseQty: number
  bonusQty: number
  validFrom: string
  validTo: string
  status: ProductBonusSchemeStatus
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
}

export function ProductBonusSchemeFormDialog({
  open,
  onOpenChange,
  productBonusScheme,
}: ProductBonusSchemeFormDialogProps) {
  const isEdit = Boolean(productBonusScheme)
  const createMutation = useCreateProductBonusScheme()
  const updateMutation = useUpdateProductBonusScheme()
  const { data: groupOptions = [], isLoading: loadingGroups } = useProductBonusGroupsDropdown()
  const { data: fullScheme, isLoading: loadingScheme } = useProductBonusScheme(
    productBonusScheme?.id ?? '',
  )
  const [isHydrated, setIsHydrated] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<ProductBonusSchemeFormData>({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      productBonusGroupId: '',
      minPurchaseQty: 10,
      bonusQty: 1,
      validFrom: new Date().toISOString().slice(0, 10),
      validTo: '',
      status: 'ACTIVE',
    },
  })

  useEffect(() => {
    if (!open) {
      setIsHydrated(false)
      return
    }

    if (isEdit && loadingScheme) {
      return
    }

    const source = isEdit ? fullScheme ?? productBonusScheme : null

    reset({
      code: source?.code ?? '',
      name: source?.name ?? '',
      description: source?.description ?? '',
      productBonusGroupId: source?.productBonusGroupId ?? '',
      minPurchaseQty: source?.minPurchaseQty ?? 10,
      bonusQty: source?.bonusQty ?? 1,
      validFrom: toDateInputValue(source?.validFrom) || new Date().toISOString().slice(0, 10),
      validTo: toDateInputValue(source?.validTo),
      status: source?.status ?? 'ACTIVE',
    })
    setIsHydrated(true)
  }, [open, isEdit, loadingScheme, fullScheme, productBonusScheme, reset])

  const onSubmit = async (data: ProductBonusSchemeFormData) => {
    try {
      const payload = {
        code: data.code.trim(),
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        productBonusGroupId: data.productBonusGroupId,
        type: 'QTY_BONUS' as const,
        minPurchaseQty: Number(data.minPurchaseQty),
        bonusQty: Number(data.bonusQty),
        validFrom: data.validFrom,
        validTo: data.validTo.trim() || undefined,
        status: data.status,
      }

      if (isEdit && productBonusScheme) {
        const updatePayload: Partial<ProductBonusSchemeFormData & { type: 'QTY_BONUS' }> = {}
        if (dirtyFields.code) updatePayload.code = payload.code
        if (dirtyFields.name) updatePayload.name = payload.name
        if (dirtyFields.description) updatePayload.description = payload.description
        if (dirtyFields.productBonusGroupId) updatePayload.productBonusGroupId = payload.productBonusGroupId
        if (dirtyFields.minPurchaseQty) updatePayload.minPurchaseQty = payload.minPurchaseQty
        if (dirtyFields.bonusQty) updatePayload.bonusQty = payload.bonusQty
        if (dirtyFields.validFrom) updatePayload.validFrom = payload.validFrom
        if (dirtyFields.validTo) updatePayload.validTo = payload.validTo
        if (dirtyFields.status) updatePayload.status = payload.status

        await updateMutation.mutateAsync({
          productBonusSchemeId: productBonusScheme.id,
          data: updatePayload,
        })
      } else {
        await createMutation.mutateAsync(payload)
      }

      onOpenChange(false)
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          isEdit ? 'Failed to update product bonus scheme' : 'Failed to create product bonus scheme',
        ),
      )
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending
  const isFormLoading = isEdit && loadingScheme

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product Bonus Scheme' : 'Add Product Bonus Scheme'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update quantity-based bonus rules for a product bonus group.'
              : 'Define a quantity bonus rule on a product bonus group. Master data only — does not affect orders or pricing yet.'}
          </DialogDescription>
        </DialogHeader>

        {isFormLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading scheme details…
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="bonus-scheme-code" className="text-gray-700 font-medium">
                  Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bonus-scheme-code"
                  {...register('code', {
                    required: 'Code is required',
                    validate: (value) => value.trim().length > 0 || 'Code is required',
                    maxLength: { value: 32, message: 'Code must be 32 characters or fewer' },
                  })}
                  placeholder="e.g. TEA-Q10-B1"
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.code && <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>}
              </div>

              <div>
                <Label htmlFor="bonus-scheme-name" className="text-gray-700 font-medium">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bonus-scheme-name"
                  {...register('name', {
                    required: 'Name is required',
                    validate: (value) => value.trim().length > 0 || 'Name is required',
                    maxLength: { value: 128, message: 'Name must be 128 characters or fewer' },
                  })}
                  placeholder="e.g. Buy 10 Get 1 Free"
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="bonus-scheme-description" className="text-gray-700 font-medium">
                Description
              </Label>
              <Textarea
                id="bonus-scheme-description"
                {...register('description', {
                  maxLength: { value: 512, message: 'Description must be 512 characters or fewer' },
                })}
                placeholder="Optional notes about this scheme"
                className="mt-1.5 min-h-[72px] border-gray-300"
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="bonus-scheme-group" className="text-gray-700 font-medium">
                Product Bonus Group <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="productBonusGroupId"
                rules={{ required: 'Select a product bonus group' }}
                render={({ field }) => (
                  <Select
                    key={`group-${isHydrated ? 'ready' : 'loading'}`}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loadingGroups}
                  >
                    <SelectTrigger id="bonus-scheme-group" className="mt-1.5 h-11 border-gray-300">
                      <SelectValue placeholder={loadingGroups ? 'Loading groups…' : 'Select bonus group'} />
                    </SelectTrigger>
                    <SelectContent>
                      {groupOptions.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} ({group.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.productBonusGroupId && (
                <p className="text-sm text-red-600 mt-1">{errors.productBonusGroupId.message}</p>
              )}
            </div>

            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              Type: <span className="font-medium text-gray-800">Quantity bonus</span> — buy minimum quantity from
              the group, receive bonus quantity free.
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="bonus-scheme-min-qty" className="text-gray-700 font-medium">
                  Min purchase qty <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bonus-scheme-min-qty"
                  type="number"
                  min={1}
                  step={1}
                  {...register('minPurchaseQty', {
                    required: 'Minimum purchase quantity is required',
                    valueAsNumber: true,
                    min: { value: 1, message: 'Must be at least 1' },
                  })}
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.minPurchaseQty && (
                  <p className="text-sm text-red-600 mt-1">{errors.minPurchaseQty.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bonus-scheme-bonus-qty" className="text-gray-700 font-medium">
                  Bonus qty <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bonus-scheme-bonus-qty"
                  type="number"
                  min={1}
                  step={1}
                  {...register('bonusQty', {
                    required: 'Bonus quantity is required',
                    valueAsNumber: true,
                    min: { value: 1, message: 'Must be at least 1' },
                  })}
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.bonusQty && (
                  <p className="text-sm text-red-600 mt-1">{errors.bonusQty.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="bonus-scheme-valid-from" className="text-gray-700 font-medium">
                  Valid from <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bonus-scheme-valid-from"
                  type="date"
                  {...register('validFrom', { required: 'Valid from date is required' })}
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.validFrom && (
                  <p className="text-sm text-red-600 mt-1">{errors.validFrom.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bonus-scheme-valid-to" className="text-gray-700 font-medium">
                  Valid to
                </Label>
                <Input
                  id="bonus-scheme-valid-to"
                  type="date"
                  {...register('validTo')}
                  className="mt-1.5 h-11 border-gray-300"
                />
                <p className="mt-1 text-xs text-gray-500">Leave empty for open-ended schemes.</p>
              </div>
            </div>

            <div>
              <Label htmlFor="bonus-scheme-status" className="text-gray-700 font-medium">
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
                    <SelectTrigger id="bonus-scheme-status" className="mt-1.5 h-11 border-gray-300">
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
        )}
      </DialogContent>
    </Dialog>
  )
}
