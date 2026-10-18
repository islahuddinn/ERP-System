'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Loader2, Save } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProductsDropdown } from '@/hooks/useProducts'
import {
  useSetFactoryBranchProductPrice,
  useSetMyBranchProductPrice,
  type BranchProductPriceEntry,
} from '@/hooks/useBranchProductPrices'

export type BranchProductPriceScope = 'factory' | 'mine'

interface SetBranchProductPriceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scope: BranchProductPriceScope
  entry?: BranchProductPriceEntry | null
}

interface FormData {
  productId: string
  price: string
}

export function SetBranchProductPriceDialog({
  open,
  onOpenChange,
  scope,
  entry,
}: SetBranchProductPriceDialogProps) {
  const { data: products = [] } = useProductsDropdown()
  const setMyPriceMutation = useSetMyBranchProductPrice()
  const setFactoryPriceMutation = useSetFactoryBranchProductPrice()
  const isPending = setMyPriceMutation.isPending || setFactoryPriceMutation.isPending

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { productId: '', price: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        productId: entry?.productId ?? '',
        price: entry?.price != null ? String(entry.price) : '',
      })
    }
  }, [open, entry, reset])

  const onSubmit = async (data: FormData) => {
    const price = parseFloat(data.price)
    if (!data.productId || !Number.isFinite(price) || price <= 0) return

    const payload = { productId: data.productId, price }
    if (scope === 'factory') {
      await setFactoryPriceMutation.mutateAsync(payload)
    } else {
      await setMyPriceMutation.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {scope === 'factory' ? 'Set Factory Product Price' : 'Set My Branch Product Price'}
          </DialogTitle>
          <DialogDescription>
            {scope === 'factory'
              ? 'Used in FREE_PRICE mode when primary branches request stock from the Factory.'
              : 'Your branch’s standard selling price to child branches or sales staff in FREE_PRICE mode.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Controller
              name="productId"
              control={control}
              rules={{ required: 'Select a product' }}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={Boolean(entry)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {(entry
                      ? [
                          {
                            id: entry.productId,
                            name: entry.product.name,
                            code: entry.product.code,
                          },
                        ]
                      : products
                    ).map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.productId && (
              <p className="text-sm text-red-600">{errors.productId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch-product-price">Price</Label>
            <Input
              id="branch-product-price"
              type="number"
              min="0.01"
              step="any"
              placeholder="e.g. 150"
              {...register('price', { required: 'Enter a price' })}
            />
            {errors.price && <p className="text-sm text-red-600">{errors.price.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Price
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
