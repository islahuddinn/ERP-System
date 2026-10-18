'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { formatCurrency } from '@/lib/currency'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'

type BankAccount = {
  id: string
  accountName: string
  balance: number
  currency: string
}

export default function CashAccountsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true)
      setErrorMsg(null)
      try {
        const res = await apiClient.get<any>('/financial/cash/accounts')
        const payload: BankAccount[] = res.data.data || res.data
        setAccounts(Array.isArray(payload) ? payload : [])
      } catch (e: any) {
        console.error(e)
        setErrorMsg(e?.response?.data?.message || 'Failed to load accounts')
      } finally {
        setLoading(false)
      }
    }
    fetchAccounts()
  }, [])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Bank Accounts</h2>
          <p className="text-gray-500">Create and manage cash/bank accounts.</p>
        </div>
        <Button onClick={() => router.push('/dashboard/financial/cash-management/accounts/new')} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Create Account
        </Button>
      </div>

      {errorMsg && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 text-red-800">{errorMsg}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading...</div>
      ) : (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Accounts</CardTitle>
            <CardDescription>Current balances from your cash management module.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        No bank accounts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((a) => (
                      <TableRow key={a.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{a.accountName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{a.currency}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(a.balance))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

