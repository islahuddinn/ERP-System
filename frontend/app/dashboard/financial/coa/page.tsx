'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react'

type Account = {
  id: string
  accountCode: string
  accountName: string
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  normalBalance: 'DEBIT' | 'CREDIT'
  parentId?: string | null
  isActive: boolean
  parent?: Account | null
  children?: Account[]
}

export default function ChartOfAccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true)
      try {
        const res = await apiClient.get<any>('/financial/coa/refresh')
        console.log('API Response:', res)
        console.log('Payload:', res.data)
        const payload: any = res.data.data // Extract data from response wrapper
        console.log('Extracted data:', payload)
        console.log('Is Array?', Array.isArray(payload))
        console.log('Payload length:', Array.isArray(payload) ? payload.length : 0)
        setAccounts(Array.isArray(payload) ? payload : [])
      } catch (error) {
        console.error('Failed to load accounts', error)
        setAccounts([])
      } finally {
        setLoading(false)
      }
    }
    fetchAccounts()
  }, [])

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) {
      return
    }
    
    try {
      await apiClient.delete(`/financial/coa/${accountId}`)
      setAccounts(accounts.filter(acc => acc.id !== accountId))
      alert('Account deleted successfully')
    } catch (error) {
      console.error('Failed to delete account', error)
      alert('Failed to delete account')
    }
  }

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts
    const q = search.toLowerCase()
    return accounts.filter((account) => {
      return (
        account.accountCode.toLowerCase().includes(q) ||
        account.accountName.toLowerCase().includes(q) ||
        account.accountType.toLowerCase().includes(q)
      )
    })
  }, [accounts, search])

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

  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Chart of Accounts</h2>
          <p className="text-gray-500">Manage your financial accounts and chart of accounts structure.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/financial/coa/create')}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Account
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Accounts</CardTitle>
          <div className="flex items-center gap-2 max-w-sm w-full">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by code or name..."
                className="pl-8 bg-gray-50 border-gray-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-900">Account Code</TableHead>
                  <TableHead className="font-semibold text-gray-900">Account Name</TableHead>
                  <TableHead className="font-semibold text-gray-900">Type</TableHead>
                  <TableHead className="font-semibold text-gray-900">Normal Balance</TableHead>
                  <TableHead className="font-semibold text-gray-900">Parent</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                      Loading accounts...
                    </TableCell>
                  </TableRow>
                ) : filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                      No accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => (
                    <TableRow key={account.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">{account.accountCode}</TableCell>
                      <TableCell className="text-gray-700">{account.accountName}</TableCell>
                      <TableCell>{renderAccountTypeBadge(account.accountType)}</TableCell>
                      <TableCell>{renderNormalBalanceBadge(account.normalBalance)}</TableCell>
                      <TableCell className="text-gray-700">
                        {account.parent ? (
                          `${account.parent.accountCode} - ${account.parent.accountName}`
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={account.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/financial/coa/${account.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/financial/coa/${account.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(account.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
