'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type BankAccount = { id: string; accountName: string; balance: number; currency: string }
type CoaAccount = { id: string; accountCode: string; accountName: string; accountType: string; normalBalance: string; isActive: boolean }

type BankTransactionType = 'DEPOSIT' | 'WITHDRAW'

export default function CreateBankTransactionPage() {
  const AUTO_ACCOUNT = '__AUTO__'
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [coaAccounts, setCoaAccounts] = useState<CoaAccount[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    bankAccountId: '',
    type: 'DEPOSIT' as BankTransactionType,
    amount: 0,
    counterpartyAccountId: '',
    cashAccountId: '',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    const fetchData = async () => {
      setErrorMsg(null)
      try {
        const [accountsRes, coaRes] = await Promise.all([
          apiClient.get<any>('/financial/cash/accounts'),
          apiClient.get<any>('/financial/coa/refresh'),
        ])
        const accountsPayload: BankAccount[] = accountsRes.data.data || accountsRes.data
        const coaPayload: CoaAccount[] = coaRes.data.data || coaRes.data
        setBankAccounts(Array.isArray(accountsPayload) ? accountsPayload : [])
        setCoaAccounts(Array.isArray(coaPayload) ? coaPayload : [])
      } catch (e: any) {
        console.error(e)
        setErrorMsg(e?.response?.data?.message || 'Failed to load required dropdowns')
      }
    }
    fetchData()
  }, [])

  const canSubmit = useMemo(() => {
    return (
      !!formData.bankAccountId &&
      !!formData.counterpartyAccountId &&
      formData.amount > 0
    )
  }, [formData.bankAccountId, formData.counterpartyAccountId, formData.amount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return alert('Fill required fields')

    setLoading(true)
    try {
      const payload = {
        bankAccountId: formData.bankAccountId,
        type: formData.type,
        amount: Number(formData.amount),
        counterpartyAccountId: formData.counterpartyAccountId,
        cashAccountId: formData.cashAccountId || undefined,
        description: formData.description || undefined,
        transactionDate: formData.transactionDate || undefined,
      }

      await apiClient.post('/financial/cash/transactions', payload)
      alert('Bank transaction created')
      router.push('/dashboard/financial/cash-management/accounts')
    } catch (err: any) {
      console.error(err)
      alert(err?.response?.data?.message || 'Failed to create transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/financial/cash-management/accounts')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Cash Transaction</h2>
            <p className="text-gray-500">Creates a bank transaction and posts it to GL.</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 text-red-800">{errorMsg}</CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Transaction Details</CardTitle>
              <CardDescription>Deposit credits bank side, withdraw debits.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Account *</Label>
                  <Select
                    value={formData.bankAccountId}
                    onValueChange={(v) => setFormData((p) => ({ ...p, bankAccountId: v }))}
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData((p) => ({ ...p, type: v as BankTransactionType }))}
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEPOSIT">DEPOSIT</SelectItem>
                      <SelectItem value="WITHDRAW">WITHDRAW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                    Amount *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    className="bg-gray-50 border-gray-200"
                    value={formData.amount}
                    onChange={(e) => setFormData((p) => ({ ...p, amount: Number(e.target.value) }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Counterparty Account *</Label>
                  <Select
                    value={formData.counterpartyAccountId}
                    onValueChange={(v) => setFormData((p) => ({ ...p, counterpartyAccountId: v }))}
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Select COA account" />
                    </SelectTrigger>
                    <SelectContent>
                      {coaAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.accountCode} - {a.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cash Account (optional)</Label>
                  <Select
                    value={formData.cashAccountId || AUTO_ACCOUNT}
                    onValueChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        cashAccountId: v === AUTO_ACCOUNT ? '' : v,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Leave empty to auto-pick cash/bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_ACCOUNT}>
                        Auto (cash/bank)
                      </SelectItem>
                      {coaAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.accountCode} - {a.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionDate" className="text-sm font-medium text-gray-700">
                    Transaction Date
                  </Label>
                  <Input
                    id="transactionDate"
                    type="date"
                    className="bg-gray-50 border-gray-200"
                    value={formData.transactionDate}
                    onChange={(e) => setFormData((p) => ({ ...p, transactionDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description
                  </Label>
                  <Input
                    id="description"
                    className="bg-gray-50 border-gray-200"
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/dashboard/financial/cash-management/accounts')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !canSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Create Transaction'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

