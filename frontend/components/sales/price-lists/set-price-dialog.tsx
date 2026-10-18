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
  useUpsertPriceListEntry,
  PRICE_LIST_TIER_LABELS,
  type PriceListTier,
  type ProductPriceListEntry,
} from '@/hooks/usePriceLists'
import { formatCurrency } from '@/lib/currency'

interface SetPriceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: ProductPriceListEntry | null
  defaultTier?: PriceListTier
}

interface FormData {
  productId: string
  tier: PriceListTier
  price: string
}

export function SetPriceDialog({
  open,
  onOpenChange,
  entry,
  defaultTier = 'TRADE_PRICE',
}: SetPriceDialogProps) {
  const { data: products = [] } = useProductsDropdown()
  const upsertMutation = useUpsertPriceListEntry()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { productId: '', tier: defaultTier, price: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        productId: entry?.productId ?? '',
        tier: defaultTier,
        price: '',
      })
    }
  }, [open, entry, defaultTier, reset])

  const onSubmit = async (data: FormData) => {
    const price = parseFloat(data.price)
    if (!data.productId || !Number.isFinite(price) || price <= 0) return

    await upsertMutation.mutateAsync({
      productId: data.productId,
      tier: data.tier,
      price,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Trade Price</DialogTitle>
          <DialogDescription>
            Company-wide price tiers used when branches are in FIXED_PRICE mode. Shops are priced
            at Trade Price tier by default.
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
                      ? [{ id: entry.productId, name: entry.productName, code: entry.productCode }]
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
            <Label>Price tier</Label>
            <Controller
              name="tier"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
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
              disabled={upsertMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {upsertMutation.isPending ? (
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

function PriceCell({ value }: { value: { price: number } | null }) {
  if (!value) return <span className="text-gray-400">—</span>
  return <span className="tabular-nums text-gray-900">{formatCurrency(value.price)}</span>
}

export { PriceCell }
