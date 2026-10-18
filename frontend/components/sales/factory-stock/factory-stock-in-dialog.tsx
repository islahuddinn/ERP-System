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
import { useStockInFactoryStock } from '@/hooks/useFactoryStock'

interface FactoryStockInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  productId: string
  quantity: string
}

export function FactoryStockInDialog({ open, onOpenChange }: FactoryStockInDialogProps) {
  const { data: products = [] } = useProductsDropdown()
  const stockInMutation = useStockInFactoryStock()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { productId: '', quantity: '' },
  })

  useEffect(() => {
    if (!open) reset({ productId: '', quantity: '' })
  }, [open, reset])

  const onSubmit = async (data: FormData) => {
    const quantity = parseFloat(data.quantity)
    if (!data.productId || !Number.isFinite(quantity) || quantity <= 0) return

    await stockInMutation.mutateAsync({ productId: data.productId, quantity })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stock In — Factory Pool</DialogTitle>
          <DialogDescription>
            Add finished goods to the factory distribution pool. This stock can be shipped to
            primary distributor branches via branch stock requests.
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
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
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
            <Label htmlFor="quantity">Quantity to add</Label>
            <Input
              id="quantity"
              type="number"
              min="0.01"
              step="any"
              placeholder="e.g. 100"
              {...register('quantity', { required: 'Enter a quantity' })}
            />
            {errors.quantity && (
              <p className="text-sm text-red-600">{errors.quantity.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={stockInMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {stockInMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Add Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
