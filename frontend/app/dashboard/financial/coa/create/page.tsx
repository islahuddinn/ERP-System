'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ArrowLeft, Save } from 'lucide-react'

type Account = {
  id: string
  accountCode: string
  accountName: string
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  normalBalance: 'DEBIT' | 'CREDIT'
  parentId?: string | null
  isActive: boolean
}

export default function CreateAccountPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    accountCode: '',
    accountName: '',
    accountType: '',
    normalBalance: '',
    parentId: '',
  })

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await apiClient.get<any>('/financial/coa/refresh')
        const payload: any = res.data.data || res.data
        setAccounts(Array.isArray(payload) ? payload : [])
      } catch (error) {
        console.error('Failed to load accounts', error)
        setAccounts([])
      }
    }
    fetchAccounts()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.accountCode || !formData.accountName || !formData.accountType || !formData.normalBalance) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...formData,
        parentId: formData.parentId === 'none' ? null : formData.parentId,
      }
      await apiClient.post('/financial/coa', payload)
      router.push('/dashboard/financial/coa')
    } catch (error: any) {
      console.error('Failed to create account', error)
      alert(error.response?.data?.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/financial/coa')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Create Account</h2>
            <p className="text-gray-500">Add a new account to your chart of accounts.</p>
          </div>
        </div>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountCode" className="text-sm font-medium text-gray-700">
                  Account Code *
                </Label>
                <Input
                  id="accountCode"
                  placeholder="e.g., 1000"
                  className="bg-gray-50 border-gray-200"
                  value={formData.accountCode}
                  onChange={(e) => handleInputChange('accountCode', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accountName" className="text-sm font-medium text-gray-700">
                  Account Name *
                </Label>
                <Input
                  id="accountName"
                  placeholder="e.g., Cash"
                  className="bg-gray-50 border-gray-200"
                  value={formData.accountName}
                  onChange={(e) => handleInputChange('accountName', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountType" className="text-sm font-medium text-gray-700">
                  Account Type *
                </Label>
                <Select value={formData.accountType} onValueChange={(value) => handleInputChange('accountType', value)}>
                  <SelectTrigger className="bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSET">Asset</SelectItem>
                    <SelectItem value="LIABILITY">Liability</SelectItem>
                    <SelectItem value="EQUITY">Equity</SelectItem>
                    <SelectItem value="REVENUE">Revenue</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="normalBalance" className="text-sm font-medium text-gray-700">
                  Normal Balance *
                </Label>
                <Select value={formData.normalBalance} onValueChange={(value) => handleInputChange('normalBalance', value)}>
                  <SelectTrigger className="bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select normal balance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBIT">Debit</SelectItem>
                    <SelectItem value="CREDIT">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentId" className="text-sm font-medium text-gray-700">
                Parent Account
              </Label>
              <Select value={formData.parentId} onValueChange={(value) => handleInputChange('parentId', value)}>
                <SelectTrigger className="bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Select parent account (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root Account)</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.accountCode} - {account.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/financial/coa')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={loading}
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
