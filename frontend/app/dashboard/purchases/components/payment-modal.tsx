'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreditCard, AlertCircle } from 'lucide-react'
import { formatCurrency, getActiveCurrency } from '@/lib/currency'
const PAYMENT_METHODS = ['CASH', 'CARD', 'MOBILE_PAYMENT', 'BANK_TRANSFER', 'CHEQUE', 'OTHER', 'CREDIT'] as const
type PaymentMethod = (typeof PAYMENT_METHODS)[number]

const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID']),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentReference: z.string().optional(),
  paymentNotes: z.string().optional(),
})

type PaymentForm = z.infer<typeof paymentSchema>

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  purchaseOrder: {
    id: string
    orderNumber: string
    totalAmount: any // Prisma Decimal type
    amountPaid: any // Prisma Decimal type
    paymentStatus: string
    supplier: {
      name: string
    }
  }
}

export default function PaymentModal({ isOpen, onClose, purchaseOrder }: PaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentStatus: 'PARTIAL',
      paymentMethod: 'CASH',
      paymentReference: '',
      paymentNotes: '',
    },
  })

  const totalAmount = Number(purchaseOrder.totalAmount || 0)
  const amountPaid = Number(purchaseOrder.amountPaid || 0)
  const remainingAmount = totalAmount - amountPaid
  const watchedAmount = form.watch('amount')

  const updatePaymentMutation = useMutation({
    mutationFn: async (data: PaymentForm) => {
      const response = await apiClient.patch(`/purchases/${purchaseOrder.id}/payment`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      toast.success('Payment updated successfully')
      onClose()
      form.reset()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update payment')
    },
  })

  const onSubmit = (data: PaymentForm) => {
    if (data.amount > remainingAmount) {
      toast.error('Payment amount cannot exceed remaining amount')
      return
    }
    updatePaymentMutation.mutate(data)
  }

  const handleQuickPayment = (type: 'full' | 'half') => {
    let amount = 0
    if (type === 'full') {
      amount = remainingAmount
    } else {
      amount = Math.round(remainingAmount / 2 * 100) / 100
    }
    
    form.setValue('amount', amount)
    form.setValue('paymentStatus', amount === remainingAmount ? 'PAID' : 'PARTIAL')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full mx-auto bg-gray-800 border-gray-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Update Payment
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Order #{purchaseOrder.orderNumber} - {purchaseOrder.supplier?.name ?? '—'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-1">
          {/* Payment Summary */}
          <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Amount:</span>
              <span className="text-white font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Amount Paid:</span>
              <span className="text-green-400">{formatCurrency(amountPaid)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-300">Remaining:</span>
              <span className="text-yellow-400">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>

          {/* Quick Payment Buttons */}
          <div className="space-y-2">
            <Label className="text-gray-300">Quick Payment</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickPayment('half')}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 text-xs sm:text-sm"
              >
                Pay Half ({formatCurrency(Math.round(remainingAmount / 2 * 100) / 100)})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickPayment('full')}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 text-xs sm:text-sm"
              >
                Pay Full ({formatCurrency(remainingAmount)})
              </Button>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-gray-300">
                Payment Amount *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  {getActiveCurrency().symbol}
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingAmount}
                  placeholder="0.00"
                  className="pl-12 bg-gray-700 border-gray-600 text-white"
                  {...form.register('amount', { valueAsNumber: true })}
                />
              </div>
              {form.formState.errors.amount && (
                <p className="text-red-400 text-sm">{form.formState.errors.amount.message}</p>
              )}
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <Label htmlFor="paymentStatus" className="text-gray-300">
                Payment Status *
              </Label>
              <Select
                value={form.watch('paymentStatus')}
                onValueChange={(value) => form.setValue('paymentStatus', value as any)}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white [&>span]:text-white">
                  <SelectValue placeholder="Select Payment Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="PENDING" className="text-white">Pending</SelectItem>
                  <SelectItem value="PARTIAL" className="text-white">Partial</SelectItem>
                  <SelectItem value="PAID" className="text-white">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="text-gray-300">
                Payment Method *
              </Label>
              <Select
                value={form.watch('paymentMethod')}
                onValueChange={(value) => form.setValue('paymentMethod', value as PaymentMethod)}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white [&>span]:text-white">
                  <SelectValue placeholder="Select Payment Method" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 max-h-60">
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method} className="text-white">
                      {method.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Reference */}
            <div className="space-y-2">
              <Label htmlFor="paymentReference" className="text-gray-300">
                Payment Reference
              </Label>
              <Input
                id="paymentReference"
                placeholder="e.g., Bank transfer ref, check number"
                className="bg-gray-700 border-gray-600 text-white"
                {...form.register('paymentReference')}
              />
            </div>

            {/* Payment Notes */}
            <div className="space-y-2">
              <Label htmlFor="paymentNotes" className="text-gray-300">
                Payment Notes
              </Label>
              <Textarea
                id="paymentNotes"
                placeholder="Additional payment notes..."
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
                {...form.register('paymentNotes')}
              />
            </div>

            {/* Validation Warning */}
            {watchedAmount > remainingAmount && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-400 text-sm">
                  Payment amount cannot exceed remaining amount of {formatCurrency(remainingAmount)}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || watchedAmount > remainingAmount || watchedAmount <= 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Updating...' : 'Update Payment'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
