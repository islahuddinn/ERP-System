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

type ArPayment = {
  id: string
  paymentNumber: string
  customerId: string
  customer?: { name?: string }
  paymentDate: string
  amount: number
  method: string
  allocations: Array<{ invoiceId: string; amount: number; invoice?: { invoiceNumber?: string } }>
}

export default function ArPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<ArPayment[]>([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<any>('/ar/payments')
      const payload: ArPayment[] = res.data.data || res.data
      setItems(Array.isArray(payload) ? payload : [])
    } catch (e) {
      console.error(e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return items
    return items.filter((i) => {
      return (
        i.paymentNumber.toLowerCase().includes(q) ||
        (i.customer?.name || '').toLowerCase().includes(q) ||
        i.method.toLowerCase().includes(q)
      )
    })
  }, [search, items])

  const remove = async (id: string) => {
    if (!confirm('Delete payment?')) return
    try {
      await apiClient.delete(`/ar/payments/${id}`)
      setItems((prev) => prev.filter((x) => x.id !== id))
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete payment')
    }
  }

  const fmt = (n: number) => formatCurrency(Number(n || 0))

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">AR Payments</h2>
          <p className="text-gray-500">Manage customer payment receipts.</p>
        </div>
        <Link href="/dashboard/financial/accounts-receivable/payments/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </Link>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Payments</CardTitle>
          <CardDescription>All customer payments and allocations.</CardDescription>
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
                  <TableHead>Payment #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Allocated Invoices</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payments found.</TableCell></TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{p.paymentNumber}</TableCell>
                      <TableCell>{p.customer?.name || p.customerId}</TableCell>
                      <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="secondary">{p.method}</Badge></TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {p.allocations.map((a, i) => (
                            <div key={i} className="text-xs">
                              {(a.invoice?.invoiceNumber || a.invoiceId)}: {fmt(a.amount)}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmt(p.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => remove(p.id)}>
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

