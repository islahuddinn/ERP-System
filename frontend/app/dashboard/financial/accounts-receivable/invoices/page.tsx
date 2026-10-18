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
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'

type CustomerInvoice = {
  id: string
  invoiceNumber: string
  customerId: string
  customer?: { name?: string }
  invoiceDate: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  balance: number
  status: string
}

export default function ArInvoicesPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<any>('/ar/invoices')
      const payload: CustomerInvoice[] = res.data.data || res.data
      setInvoices(Array.isArray(payload) ? payload : [])
    } catch (e) {
      console.error(e)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return invoices
    return invoices.filter((i) => {
      return (
        i.invoiceNumber.toLowerCase().includes(q) ||
        (i.customer?.name || '').toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q)
      )
    })
  }, [search, invoices])

  const remove = async (id: string) => {
    if (!confirm('Delete invoice?')) return
    try {
      await apiClient.delete(`/ar/invoices/${id}`)
      setInvoices((prev) => prev.filter((x) => x.id !== id))
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete invoice')
    }
  }

  const fmt = (n: number) => formatCurrency(Number(n || 0))

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">AR Invoices</h2>
          <p className="text-gray-500">Manage customer invoices.</p>
        </div>
        <Link href="/dashboard/financial/accounts-receivable/invoices/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </Link>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Invoices</CardTitle>
          <CardDescription>All customer invoices with balances and status.</CardDescription>
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
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No invoices found.</TableCell></TableRow>
                ) : (
                  filtered.map((i) => (
                    <TableRow key={i.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{i.invoiceNumber}</TableCell>
                      <TableCell>{i.customer?.name || i.customerId}</TableCell>
                      <TableCell>{new Date(i.invoiceDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(i.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>{fmt(i.totalAmount)}</TableCell>
                      <TableCell>{fmt(i.paidAmount)}</TableCell>
                      <TableCell className="font-medium">{fmt(i.balance)}</TableCell>
                      <TableCell><Badge variant="secondary">{i.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/financial/accounts-receivable/invoices/${i.id}/edit`}>
                            <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button>
                          </Link>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => remove(i.id)}>
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

