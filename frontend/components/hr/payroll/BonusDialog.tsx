'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
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
import { useAddBonus, type Payroll } from '@/hooks/usePayroll'

interface BonusFormData {
  bonusAmount: string
  bonusReason: string
}

/**
 * Bonus can only be added to a DRAFT payroll (backend guard). The amount is an
 * absolute value — it replaces any previous bonus, it does not compound.
 */
export function BonusDialog({
  payroll,
  open,
  onClose,
}: {
  payroll: Payroll
  open: boolean
  onClose: () => void
}) {
  const addBonus = useAddBonus()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BonusFormData>({
    defaultValues: { bonusAmount: '', bonusReason: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        bonusAmount: Number(payroll.bonusAmount) > 0 ? String(Number(payroll.bonusAmount)) : '',
        bonusReason: payroll.bonusReason || '',
      })
    }
  }, [open, payroll, reset])

  const onSubmit = async (data: BonusFormData) => {
    try {
      await addBonus.mutateAsync({
        id: payroll.id,
        data: {
          bonusAmount: Number(data.bonusAmount),
          bonusReason: data.bonusReason.trim() || undefined,
        },
      })
      onClose()
    } catch {
      // toast is surfaced by the mutation's onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add / Update Bonus</DialogTitle>
            <DialogDescription>
              Set the ad-hoc bonus for this DRAFT payroll. Gross and net pay recalculate automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="bonusAmount" className="text-gray-700 font-medium">
                Bonus Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bonusAmount"
                type="number"
                step="0.01"
                min="0"
                {...register('bonusAmount', {
                  required: 'Bonus amount is required',
                  validate: (v) => Number(v) > 0 || 'Bonus must be greater than zero',
                })}
                placeholder="e.g. 500"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.bonusAmount && (
                <p className="text-sm text-red-600 mt-1">{errors.bonusAmount.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="bonusReason" className="text-gray-700 font-medium">
                Reason
              </Label>
              <Textarea
                id="bonusReason"
                {...register('bonusReason', {
                  maxLength: { value: 255, message: 'Reason must be 255 characters or fewer' },
                })}
                rows={2}
                placeholder="Optional — e.g. Q2 performance bonus"
                className="mt-1.5 border-gray-300"
              />
              {errors.bonusReason && (
                <p className="text-sm text-red-600 mt-1">{errors.bonusReason.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={addBonus.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addBonus.isPending}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[110px]"
            >
              {addBonus.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                'Save Bonus'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
