'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save } from 'lucide-react'

export default function CreateCashAccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    accountName: '',
    currency: 'USD',
    balance: 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.accountName.trim()) return alert('accountName is required')
    if (!formData.currency.trim()) return alert('currency is required')

    setLoading(true)
    try {
      const payload = {
        accountName: formData.accountName.trim(),
        currency: formData.currency.trim(),
        balance: Number(formData.balance),
      }
      await apiClient.post('/financial/cash/accounts', payload)
      alert('Bank account created')
      router.push('/dashboard/financial/cash-management/accounts')
    } catch (err: any) {
      console.error(err)
      alert(err?.response?.data?.message || 'Failed to create account')
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
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Create Bank Account</h2>
            <p className="text-gray-500">Registers a cash/bank account for cash management.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Account Details</CardTitle>
              <CardDescription>All fields are required except opening balance.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountName" className="text-sm font-medium text-gray-700">
                    Account Name *
                  </Label>
                  <Input
                    id="accountName"
                    className="bg-gray-50 border-gray-200"
                    placeholder="e.g. Main Bank"
                    value={formData.accountName}
                    onChange={(e) => setFormData((p) => ({ ...p, accountName: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-sm font-medium text-gray-700">
                    Currency *
                  </Label>
                  <Input
                    id="currency"
                    className="bg-gray-50 border-gray-200"
                    placeholder="USD"
                    value={formData.currency}
                    onChange={(e) => setFormData((p) => ({ ...p, currency: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="balance" className="text-sm font-medium text-gray-700">
                    Opening Balance
                  </Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    className="bg-gray-50 border-gray-200"
                    placeholder="0.00"
                    value={formData.balance}
                    onChange={(e) => setFormData((p) => ({ ...p, balance: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/dashboard/financial/cash-management/accounts')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

