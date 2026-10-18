'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save } from 'lucide-react'

type Account = {
  id: string
  accountCode: string
  accountName: string
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  normalBalance: 'DEBIT' | 'CREDIT'
  parentId?: string | null
  isActive: boolean
  description?: string
  createdAt: string
  updatedAt: string
  parent?: Account | null
  children?: Account[]
}

type FormData = {
  accountCode: string
  accountName: string
  accountType: string
  normalBalance: string
  parentId: string
  isActive: boolean
  description: string
}

export default function EditAccountPage() {
  const params = useParams()
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [availableParents, setAvailableParents] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    accountCode: '',
    accountName: '',
    accountType: 'ASSET',
    normalBalance: 'DEBIT',
    parentId: 'none',
    isActive: true,
    description: ''
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current account
        const accountRes = await apiClient.get<any>(`/financial/coa/${params.id}`)
        const accountData = accountRes.data
        setAccount(accountData)

        // Fetch all accounts for parent selection
        const parentsRes = await apiClient.get<any>('/financial/coa/refresh')
        const allAccounts = parentsRes.data.data || parentsRes.data
        // Filter out current account and its children to prevent circular references
        const filteredParents = Array.isArray(allAccounts) 
          ? allAccounts.filter(acc => acc.id !== params.id && acc.parentId !== params.id)
          : []
        setAvailableParents(filteredParents)

        // Set form data
        setFormData({
          accountCode: accountData.accountCode,
          accountName: accountData.accountName,
          accountType: accountData.accountType,
          normalBalance: accountData.normalBalance,
          parentId: accountData.parentId || 'none',
          isActive: accountData.isActive,
          description: accountData.description || ''
        })
      } catch (error) {
        console.error('Failed to load account', error)
        router.push('/dashboard/financial/coa')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchData()
    }
  }, [params.id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const updateData = {
        ...formData,
        parentId: formData.parentId === 'none' ? null : formData.parentId
      }

      await apiClient.patch(`/financial/coa/${params.id}`, updateData)
      router.push('/dashboard/financial/coa')
    } catch (error) {
      console.error('Failed to update account', error)
      alert('Failed to update account. Please check your input and try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Loading...</h2>
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Account not found</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/financial/coa')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Accounts</span>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Edit Account</h2>
            <p className="text-gray-500">Update account information</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="accountCode">Account Code</Label>
                <Input
                  id="accountCode"
                  value={formData.accountCode}
                  onChange={(e) => handleInputChange('accountCode', e.target.value)}
                  required
                  placeholder="e.g., 1001"
                />
              </div>

              <div>
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  value={formData.accountName}
                  onChange={(e) => handleInputChange('accountName', e.target.value)}
                  required
                  placeholder="e.g., Cash Account"
                />
              </div>

              <div>
                <Label htmlFor="accountType">Account Type</Label>
                <Select value={formData.accountType} onValueChange={(value) => handleInputChange('accountType', value)}>
                  <SelectTrigger>
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

              <div>
                <Label htmlFor="normalBalance">Normal Balance</Label>
                <Select value={formData.normalBalance} onValueChange={(value) => handleInputChange('normalBalance', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select normal balance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBIT">Debit</SelectItem>
                    <SelectItem value="CREDIT">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="parentId">Parent Account</Label>
                <Select value={formData.parentId} onValueChange={(value) => handleInputChange('parentId', value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent</SelectItem>
                    {availableParents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.accountCode} - {parent.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter account description (optional)"
                />
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Account ID</Label>
                  <p className="text-sm text-gray-600">{account.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created At</Label>
                  <p className="text-sm text-gray-600">{new Date(account.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                  <p className="text-sm text-gray-600">{new Date(account.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/financial/coa/${params.id}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </form>
    </div>
  )
}
