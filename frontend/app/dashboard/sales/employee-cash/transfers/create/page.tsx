'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useEmployeesDropdown, employeeLabel } from '@/hooks/useEmployees'
import { useCreateEmployeeCashTransfer } from '@/hooks/useEmployeeCashTransfers'

export default function CreateEmployeeCashTransferPage() {
  const router = useRouter()
  const createMutation = useCreateEmployeeCashTransfer()
  const { data: employees = [] } = useEmployeesDropdown()

  const [toEmployeeId, setToEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setValidationError(null)

    if (!toEmployeeId) {
      setValidationError('Select the employee receiving the cash.')
      return
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Enter a valid amount greater than zero.')
      return
    }

    const transfer = await createMutation.mutateAsync({
      toEmployeeId,
      amount: parsedAmount,
      notes: notes.trim() || undefined,
    })
    router.push(`/dashboard/sales/employee-cash/transfers/${transfer.id}`)
  }

  return (
    <ProtectedRoute requiredPermission="employee-cash-transfer.create">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/employee-cash/transfers')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Record Cash Transfer</h1>
            <p className="text-gray-600 mt-1">
              Hand cash to another employee — they must confirm before it posts to the ledger.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {validationError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {validationError}
                </p>
              )}

              <div>
                <Label>To Employee *</Label>
                <Select value={toEmployeeId || undefined} onValueChange={setToEmployeeId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employeeLabel(employee)}
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
                  placeholder="e.g. 5000"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-1.5"
                  placeholder="Optional note for the recipient…"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/sales/employee-cash/transfers')}
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
                  Submit Transfer
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </ProtectedRoute>
  )
}
