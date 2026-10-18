'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
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
  useCreateCustomerLedgerAdjustment,
  CUSTOMER_LEDGER_ADJUSTMENT_TYPE_LABELS,
  type CustomerLedgerAdjustmentType,
} from '@/hooks/useCustomerLedgerAdjustments'
import { formatCurrency } from '@/lib/currency'

const ADJUSTMENT_TYPES = Object.keys(
  CUSTOMER_LEDGER_ADJUSTMENT_TYPE_LABELS,
) as CustomerLedgerAdjustmentType[]

export default function CreateCustomerAdjustmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetCustomerId = searchParams.get('customerId') ?? ''
  const presetType = searchParams.get('type') as CustomerLedgerAdjustmentType | null

  const createMutation = useCreateCustomerLedgerAdjustment()
  const { data: customers = [] } = useCustomersDropdown()

  const [customerId, setCustomerId] = useState(presetCustomerId)
  const [type, setType] = useState<CustomerLedgerAdjustmentType>(
    presetType === 'DEBIT_NOTE' ? 'DEBIT_NOTE' : 'CREDIT_NOTE',
  )
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setValidationError(null)

    if (!customerId) {
      setValidationError('Select a shop.')
      return
    }

    if (!reason.trim()) {
      setValidationError('Reason is required.')
      return
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Enter a valid amount greater than zero.')
      return
    }

    const adjustment = await createMutation.mutateAsync({
      customerId,
      type,
      amount: parsedAmount,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
    })
    router.push(`/dashboard/sales/customer-adjustments/${adjustment.id}`)
  }

  return (
    <ProtectedRoute requiredPermission="customer-ledger-adjustment.create">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/customer-adjustments')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Post Credit / Debit Note</h1>
            <p className="text-gray-600 mt-1">
              Credit notes reduce what the shop owes; debit notes increase it. Posts immediately to
              the shop ledger.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Adjustment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {validationError && (
                <Alert variant="destructive">
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label>Shop *</Label>
                <Select value={customerId || undefined} onValueChange={setCustomerId}>
                  <SelectTrigger className="mt-1.5">
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
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {ledgerLoading
                    ? 'Loading current balance…'
                    : `Current ledger balance: ${formatCurrency(currentBalance ?? 0)}`}
                </div>
              )}

              <div>
                <Label>Note type *</Label>
                <Select value={type} onValueChange={(value) => setType(value as CustomerLedgerAdjustmentType)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_TYPES.map((adjustmentType) => (
                      <SelectItem key={adjustmentType} value={adjustmentType}>
                        {CUSTOMER_LEDGER_ADJUSTMENT_TYPE_LABELS[adjustmentType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="any"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-1.5"
                  placeholder="e.g. 500"
                />
              </div>

              <div>
                <Label htmlFor="reason">Reason *</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-1.5"
                  placeholder="Brief reason shown on the ledger entry"
                  maxLength={256}
                />
              </div>

              <div>
                <Label htmlFor="notes">Internal notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-1.5"
                  rows={3}
                  placeholder="Optional additional notes…"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/sales/customer-adjustments')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Post to Ledger
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </ProtectedRoute>
  )
}
