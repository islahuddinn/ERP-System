'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'

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

export default function ViewAccountPage() {
  const params = useParams()
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const res = await apiClient.get<any>(`/financial/coa/${params.id}`)
        const accountData = res.data.data || res.data
        setAccount(accountData)
      } catch (error) {
        console.error('Failed to load account', error)
        router.push('/dashboard/financial/coa')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchAccount()
    }
  }, [params.id, router])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this account?')) {
      return
    }

    try {
      await apiClient.delete(`/financial/coa/${params.id}`)
      router.push('/dashboard/financial/coa')
    } catch (error) {
      console.error('Failed to delete account', error)
      alert('Failed to delete account. It may have transactions or child accounts.')
    }
  }

  const renderAccountTypeBadge = (type: Account['accountType']) => {
    const variants: Record<string, string> = {
      ASSET: 'bg-blue-100 text-blue-700 border-blue-200',
      LIABILITY: 'bg-orange-100 text-orange-700 border-orange-200',
      EQUITY: 'bg-purple-100 text-purple-700 border-purple-200',
      REVENUE: 'bg-green-100 text-green-700 border-green-200',
      EXPENSE: 'bg-red-100 text-red-700 border-red-200',
    }
    return <Badge className={variants[type]}>{type}</Badge>
  }

  const renderNormalBalanceBadge = (balance: Account['normalBalance']) => {
    const variants: Record<string, string> = {
      DEBIT: 'bg-gray-100 text-gray-700 border-gray-200',
      CREDIT: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return <Badge className={variants[balance]}>{balance}</Badge>
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
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Account Details</h2>
            <p className="text-gray-500">View and manage account information</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/financial/coa/${account.id}/edit`)}
            className="flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Account Code</label>
              <p className="text-lg font-semibold">{account.accountCode}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Account Name</label>
              <p className="text-lg font-semibold">{account.accountName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Account Type</label>
              <div className="mt-1">{renderAccountTypeBadge(account.accountType)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Normal Balance</label>
              <div className="mt-1">{renderNormalBalanceBadge(account.normalBalance)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <Badge className={account.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}>
                  {account.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Parent Account</label>
              <p className="text-lg">
                {account.parent ? (
                  `${account.parent.accountCode} - ${account.parent.accountName}`
                ) : (
                  <span className="text-gray-400">None</span>
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="text-lg">{account.description || 'No description provided'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Created At</label>
              <p className="text-lg">{new Date(account.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Updated At</label>
              <p className="text-lg">{new Date(account.updatedAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {account.children && account.children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Child Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {account.children.map((child) => (
                <div key={child.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">{child.accountCode}</span>
                    <span className="ml-2 text-gray-600">{child.accountName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {renderAccountTypeBadge(child.accountType)}
                    <Badge className={child.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}>
                      {child.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
