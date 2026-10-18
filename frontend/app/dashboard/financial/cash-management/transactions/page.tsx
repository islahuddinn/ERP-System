'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { formatCurrency } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Trash2 } from 'lucide-react'

type Txn = {
  id: string
  type: 'DEPOSIT' | 'WITHDRAW'
  amount: number
  transactionDate: string
  description?: string
  bankAccount?: { accountName?: string; currency?: string }
}

export default function CashTransactionsPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Txn[]>([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<any>('/cash/transactions')
      const payload: Txn[] = res.data.data || res.data
      setRows(Array.isArray(payload) ? payload : [])
    } catch (e) {
      console.error(e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      return (
        r.type.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.bankAccount?.accountName || '').toLowerCase().includes(q)
      )
    })
  }, [search, rows])

  const remove = async (id: string) => {
    if (!confirm('Delete transaction?')) return
    try {
      await apiClient.delete(`/cash/transactions/${id}`)
      setRows((prev) => prev.filter((r) => r.id !== id))
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete transaction')
    }
  }

  const fmt = (n: number) => formatCurrency(Number(n || 0))

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Cash Transactions</h2>
          <p className="text-gray-500">All bank deposit/withdraw records.</p>
        </div>
        <Link href="/dashboard/financial/cash-management/transactions/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        </Link>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Transactions</CardTitle>
          <CardDescription>Cash movement with GL journal linkage.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 bg-gray-50 border-gray-200" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="rounded-md border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions found.</TableCell></TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id} className="hover:bg-gray-50">
                      <TableCell>{new Date(r.transactionDate).toLocaleDateString()}</TableCell>
                      <TableCell>{r.bankAccount?.accountName || '-'}</TableCell>
                      <TableCell>
                        <Badge className={r.type === 'DEPOSIT' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                          {r.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.description || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(r.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => remove(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

