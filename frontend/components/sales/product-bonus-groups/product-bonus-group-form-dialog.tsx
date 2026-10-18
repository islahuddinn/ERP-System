'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Check, Loader2, Save, Search } from 'lucide-react'
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
import { useProductsDropdown } from '@/hooks/useProducts'
import {
  useCreateProductBonusGroup,
  useProductBonusGroup,
  useUpdateProductBonusGroup,
  type ProductBonusGroup,
  type ProductBonusGroupStatus,
} from '@/hooks/useProductBonusGroups'

interface ProductBonusGroupFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productBonusGroup?: ProductBonusGroup | null
}

interface ProductBonusGroupFormData {
  code: string
  name: string
  description: string
  status: ProductBonusGroupStatus
  productIds: string[]
}

export function ProductBonusGroupFormDialog({
  open,
  onOpenChange,
  productBonusGroup,
}: ProductBonusGroupFormDialogProps) {
  const isEdit = Boolean(productBonusGroup)
  const createMutation = useCreateProductBonusGroup()
  const updateMutation = useUpdateProductBonusGroup()
  const { data: productOptions = [], isLoading: loadingProducts } = useProductsDropdown()
  const { data: fullGroup, isLoading: loadingGroup } = useProductBonusGroup(productBonusGroup?.id ?? '')
  const [productSearch, setProductSearch] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<ProductBonusGroupFormData>({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      status: 'ACTIVE',
      productIds: [],
    },
  })

  useEffect(() => {
    if (!open) {
      setIsHydrated(false)
      setProductSearch('')
      return
    }

    if (isEdit && loadingGroup) {
      return
    }

    const source = isEdit ? fullGroup ?? productBonusGroup : null

    reset({
      code: source?.code ?? '',
      name: source?.name ?? '',
      description: source?.description ?? '',
      status: source?.status ?? 'ACTIVE',
      productIds: source?.products?.map((product) => product.id) ?? [],
    })
    setIsHydrated(true)
  }, [open, isEdit, loadingGroup, fullGroup, productBonusGroup, reset])

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase()
    if (!query) return productOptions
    return productOptions.filter(
      (product) =>
        product.name.toLowerCase().includes(query) || product.code.toLowerCase().includes(query),
    )
  }, [productOptions, productSearch])

  const onSubmit = async (data: ProductBonusGroupFormData) => {
    try {
      const payload = {
        code: data.code.trim(),
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        status: data.status,
        productIds: data.productIds,
      }

      if (isEdit && productBonusGroup) {
        const updatePayload: Partial<ProductBonusGroupFormData> = {}
        if (dirtyFields.code) updatePayload.code = payload.code
        if (dirtyFields.name) updatePayload.name = payload.name
        if (dirtyFields.description) updatePayload.description = payload.description
        if (dirtyFields.status) updatePayload.status = payload.status
        if (dirtyFields.productIds) updatePayload.productIds = payload.productIds

        await updateMutation.mutateAsync({
          productBonusGroupId: productBonusGroup.id,
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
          isEdit ? 'Failed to update product bonus group' : 'Failed to create product bonus group',
        ),
      )
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending
  const isFormLoading = isEdit && loadingGroup

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product Bonus Group' : 'Add Product Bonus Group'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this group of products used for bonus schemes.'
              : 'Create a product group for future bonus/scheme rules. Does not change pricing or orders yet.'}
          </DialogDescription>
        </DialogHeader>

        {isFormLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading group details…
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="bonus-group-code" className="text-gray-700 font-medium">
                  Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bonus-group-code"
                  {...register('code', {
                    required: 'Code is required',
                    validate: (value) => value.trim().length > 0 || 'Code is required',
                    maxLength: { value: 32, message: 'Code must be 32 characters or fewer' },
                  })}
                  placeholder="e.g. BONUS-TEA"
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.code && <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>}
              </div>

              <div>
                <Label htmlFor="bonus-group-name" className="text-gray-700 font-medium">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bonus-group-name"
                  {...register('name', {
                    required: 'Name is required',
                    validate: (value) => value.trim().length > 0 || 'Name is required',
                    maxLength: { value: 128, message: 'Name must be 128 characters or fewer' },
                  })}
                  placeholder="e.g. Tea Bonus Group"
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="bonus-group-description" className="text-gray-700 font-medium">
                Description
              </Label>
              <Textarea
                id="bonus-group-description"
                {...register('description', {
                  maxLength: { value: 512, message: 'Description must be 512 characters or fewer' },
                })}
                placeholder="Optional notes about this bonus group"
                className="mt-1.5 min-h-[72px] border-gray-300"
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="bonus-group-status" className="text-gray-700 font-medium">
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
                    <SelectTrigger id="bonus-group-status" className="mt-1.5 h-11 border-gray-300">
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

            <div>
              <Label className="text-gray-700 font-medium">
                Products <span className="text-red-500">*</span>
                <span className="ml-1 text-xs font-normal text-gray-500">(at least one)</span>
              </Label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search products by name or code"
                  className="h-10 border-gray-300 pl-9"
                />
              </div>
              <Controller
                control={control}
                name="productIds"
                rules={{
                  validate: (value) => value.length > 0 || 'Select at least one product',
                }}
                render={({ field }) => (
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-300 p-2">
                    {loadingProducts ? (
                      <p className="px-1 py-2 text-sm text-gray-400">Loading products…</p>
                    ) : filteredProducts.length === 0 ? (
                      <p className="px-1 py-2 text-sm text-gray-400">No products match your search.</p>
                    ) : (
                      filteredProducts.map((product) => {
                        const checked = field.value.includes(product.id)
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() =>
                              field.onChange(
                                checked
                                  ? field.value.filter((id) => id !== product.id)
                                  : [...field.value, product.id],
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
                            <span className="text-gray-800">
                              {product.name}
                              <span className="ml-1 text-xs text-gray-500">({product.code})</span>
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              />
              {errors.productIds && (
                <p className="text-sm text-red-600 mt-1">{errors.productIds.message}</p>
              )}
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
