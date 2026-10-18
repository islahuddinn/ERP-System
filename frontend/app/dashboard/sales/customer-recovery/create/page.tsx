'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useCustomersDropdown } from '@/hooks/useCustomers'
import { useCustomerLedger } from '@/hooks/useCustomerLedger'
import {
  useCreateCustomerRecovery,
  validateRecoveryAmount,
  RECOVERY_PAYMENT_MODE_LABELS,
  type CreateCustomerRecoveryPayload,
} from '@/hooks/useCustomerRecovery'
import type { PaymentMethod } from '@/hooks/useCustomers'
import { formatCurrency } from '@/lib/currency'

const PAYMENT_MODES = Object.keys(RECOVERY_PAYMENT_MODE_LABELS) as PaymentMethod[]

export default function CreateCustomerRecoveryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetCustomerId = searchParams.get('customerId') ?? ''

  const createMutation = useCreateCustomerRecovery()
  const { data: customers = [] } = useCustomersDropdown()

  const [customerId, setCustomerId] = useState(presetCustomerId)
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('CASH')
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const { data: ledgerPreview, isLoading: ledgerLoading } = useCustomerLedger(customerId, {
    page: 1,
    limit: 1,
  })

  useEffect(() => {
    if (presetCustomerId && customers.some((customer) => customer.id === presetCustomerId)) {
      setCustomerId(presetCustomerId)
    }
  }, [presetCustomerId, customers])

  const currentBalance = ledgerPreview?.summary.currentBalance
  const selectedCustomer = customers.find((customer) => customer.id === customerId)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setValidationError(null)

    if (!customerId) {
      setValidationError('Select a shop.')
      return
    }

    const parsedAmount = Number(amount)
    const amountError = validateRecoveryAmount(parsedAmount)
    if (amountError) {
      setValidationError(amountError)
      return
    }

    const payload: CreateCustomerRecoveryPayload = {
      customerId,
      amount: parsedAmount,
      paymentMode,
      notes: notes.trim() || undefined,
    }

    const recovery = await createMutation.mutateAsync(payload)
    router.push(`/dashboard/sales/customer-recovery/${recovery.id}`)
  }

  return (
    <ProtectedRoute requiredPermission="customer-recovery.create">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/customer-recovery')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Wallet className="h-8 w-8 text-green-600" />
              Record Shop Recovery
            </h1>
            <p className="text-gray-600 mt-1">
              Log a payment collected from a shop visit. The shop ledger and collector cash-in-hand
              update immediately.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">Shop *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger id="customerId">
                    <SelectValue placeholder="Select shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.shopName} ({customer.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {customerId && (
                <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  {ledgerLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading current balance…
                    </span>
                  ) : (
                    <>
                      Current ledger balance for{' '}
                      <span className="font-medium text-gray-900">
                        {selectedCustomer?.shopName ?? ledgerPreview?.customer.shopName}
                      </span>
                      :{' '}
                      <span className="font-semibold text-amber-700">
                        {formatCurrency(Number(currentBalance ?? 0))}
                      </span>
                    </>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(event) => {
                      setValidationError(null)
                      setAmount(event.target.value)
                    }}
                    placeholder="0.00"
                    disabled={createMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMode">Payment Mode *</Label>
                  <Select
                    value={paymentMode}
                    onValueChange={(value) => setPaymentMode(value as PaymentMethod)}
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger id="paymentMode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {RECOVERY_PAYMENT_MODE_LABELS[mode]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  maxLength={256}
                  disabled={createMutation.isPending}
                />
              </div>

              {validationError && (
                <Alert variant="destructive">
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={createMutation.isPending || !customerId || !amount}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Record Recovery
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </ProtectedRoute>
  )
}
