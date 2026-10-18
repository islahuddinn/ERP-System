'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import { useAdjustFactoryStock, type FactoryStockBalance } from '@/hooks/useFactoryStock'

interface FactoryStockAdjustDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balance: FactoryStockBalance | null
}

interface FormData {
  delta: string
  reason: string
}

export function FactoryStockAdjustDialog({
  open,
  onOpenChange,
  balance,
}: FactoryStockAdjustDialogProps) {
  const adjustMutation = useAdjustFactoryStock()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { delta: '', reason: '' },
  })

  useEffect(() => {
    if (!open) reset({ delta: '', reason: '' })
  }, [open, reset])

  const onSubmit = async (data: FormData) => {
    if (!balance) return

    const delta = parseFloat(data.delta)
    if (!Number.isFinite(delta) || delta === 0 || !data.reason.trim()) return

    await adjustMutation.mutateAsync({
      productId: balance.productId,
      delta,
      reason: data.reason.trim(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Factory Stock</DialogTitle>
          <DialogDescription>
            {balance
              ? `${balance.product.name} — current qty: ${balance.quantity}`
              : 'Apply a signed correction (positive to add, negative to remove).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delta">Quantity change</Label>
            <Input
              id="delta"
              type="number"
              step="any"
              placeholder="e.g. -5 for wastage, +10 for recount"
              {...register('delta', { required: 'Enter a non-zero change' })}
            />
            {errors.delta && <p className="text-sm text-red-600">{errors.delta.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              rows={3}
              placeholder="e.g. stock count correction, damaged goods"
              {...register('reason', { required: 'Reason is required' })}
            />
            {errors.reason && <p className="text-sm text-red-600">{errors.reason.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={adjustMutation.isPending || !balance}>
              {adjustMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
