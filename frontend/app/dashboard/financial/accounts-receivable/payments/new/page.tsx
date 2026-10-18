'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'

type Allocation = { invoiceId: string; amount: number }
type Customer = { id: string; name?: string; customerName?: string }
type Invoice = {
  id: string
  invoiceNumber: string
  customerId: string
  totalAmount: number
  paidAmount: number
  balance: number
  status: string
}

export default function CreateArPaymentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [openInvoices, setOpenInvoices] = useState<Invoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [formData, setFormData] = useState({
    customerId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'BANK',
    allocations: [{ invoiceId: '', amount: 0 }] as Allocation[],
  })

  const allocationTotal = useMemo(
    () => formData.allocations.reduce((s, a) => s + Number(a.amount || 0), 0),
    [formData.allocations],
  )

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await apiClient.get<any>('/customers')
        const payload = Array.isArray(res.data?.data?.data)
          ? res.data.data.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data)
              ? res.data
              : []
        setCustomers(payload)
      } catch (error) {
        console.error('Failed to load customers', error)
        setCustomers([])
      } finally {
        setLoadingCustomers(false)
      }
    }
    fetchCustomers()
  }, [])

  useEffect(() => {
    const fetchOpenInvoices = async () => {
      if (!formData.customerId) {
        setOpenInvoices([])
        return
      }
      setLoadingInvoices(true)
      try {
        const res = await apiClient.get<any>('/financial/ar/invoices')
        const allInvoices = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : []
        const filtered = (allInvoices as any[])
          .filter((inv) => inv.customerId === formData.customerId && Number(inv.balance) > 0)
          .map((inv) => ({
            ...inv,
            totalAmount: Number(inv.totalAmount ?? 0),
            paidAmount: Number(inv.paidAmount ?? 0),
            balance: Number(inv.balance ?? 0),
          }))
        setOpenInvoices(filtered)
      } catch (error) {
        console.error('Failed to load invoices', error)
        setOpenInvoices([])
      } finally {
        setLoadingInvoices(false)
      }
    }
    fetchOpenInvoices()
  }, [formData.customerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.customerId) return alert('customerId is required')
    if (formData.amount <= 0) return alert('amount must be > 0')
    if (!formData.method?.trim()) return alert('method is required')

    const allocations = formData.allocations
      .filter((a) => a.invoiceId.trim())
      .map((a) => ({ invoiceId: a.invoiceId.trim(), amount: Number(a.amount) }))

    if (!allocations.length) return alert('At least one allocation is required')
    if (Math.abs(allocationTotal - Number(formData.amount)) > 0.01) {
      return alert('Payment amount must equal sum of allocation amounts')
    }

    setLoading(true)
    try {
      const payload = {
        customerId: formData.customerId,
        paymentDate: formData.paymentDate || undefined,
        amount: Number(formData.amount),
        method: formData.method,
        allocations,
      }
      const res = await apiClient.post<any>('/financial/ar/payments', payload)
      alert(res?.data?.message || 'Payment created successfully')
      router.push('/dashboard/financial/accounts-receivable/aging')
    } catch (err: any) {
      console.error('Create AR payment failed', err)
      alert(err?.response?.data?.message || 'Failed to create payment')
    } finally {
      setLoading(false)
    }
  }

  const setAllocation = (idx: number, patch: Partial<Allocation>) => {
    setFormData((p) => {
      const next = [...p.allocations]
      next[idx] = { ...next[idx], ...patch }
      return { ...p, allocations: next }
    })
  }

  const addAllocation = () => setFormData((p) => ({ ...p, allocations: [...p.allocations, { invoiceId: '', amount: 0 }] }))
  const removeAllocation = (idx: number) =>
    setFormData((p) => ({ ...p, allocations: p.allocations.length <= 1 ? p.allocations : p.allocations.filter((_, i) => i !== idx) }))

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/financial/accounts-receivable/aging')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Record Customer Payment</h2>
            <p className="text-gray-500">Supports partial payments via allocations.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Payment Details</CardTitle>
              <CardDescription>Double-entry posting is created automatically.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerId" className="text-sm font-medium text-gray-700">
                    Customer *
                  </Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) =>
                      setFormData((p) => ({
                        ...p,
                        customerId: value,
                        allocations: [{ invoiceId: '', amount: 0 }],
                      }))
                    }
                    disabled={loadingCustomers || customers.length === 0}
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-200">
                      <SelectValue
                        placeholder={
                          loadingCustomers
                            ? 'Loading customers...'
                            : customers.length === 0
                              ? 'No customers available'
                              : 'Select customer'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name || customer.customerName || customer.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!loadingCustomers && customers.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-700">
                        No customer found. Create one from Customer module first.
                      </p>
                      <Link href="/dashboard/customers/create">
                        <Button type="button" variant="outline" size="sm">
                          Go to Create Customer
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method" className="text-sm font-medium text-gray-700">
                    Method *
                  </Label>
                  <Select
                    value={formData.method}
                    onValueChange={(value) => setFormData((p) => ({ ...p, method: value }))}
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK">Bank</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHECK">Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentDate" className="text-sm font-medium text-gray-700">
                    Payment Date
                  </Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    className="bg-gray-50 border-gray-200"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData((p) => ({ ...p, paymentDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                    Total Payment Amount *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="bg-gray-50 border-gray-200"
                    value={formData.amount}
                    onChange={(e) => setFormData((p) => ({ ...p, amount: Number(e.target.value) }))}
                    required
                  />
                  <div className="pt-2">
                    <Badge variant="secondary">
                      Allocations total: {allocationTotal.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Allocations</CardTitle>
              <CardDescription>Map the payment amount across open invoices.</CardDescription>
            </CardHeader>
            <CardContent>
              {formData.customerId && (
                <div className="mb-4 text-sm text-gray-600">
                  {loadingInvoices
                    ? 'Loading open invoices...'
                    : `Open invoices for selected customer: ${openInvoices.length}`}
                </div>
              )}
              <div className="space-y-4">
                {formData.allocations.map((a, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-medium text-gray-700">Invoice *</Label>
                      <Select
                        value={a.invoiceId}
                        onValueChange={(value) => setAllocation(idx, { invoiceId: value })}
                        disabled={!formData.customerId || loadingInvoices || openInvoices.length === 0}
                      >
                        <SelectTrigger className="bg-white border-gray-200">
                          <SelectValue
                            placeholder={
                              !formData.customerId
                                ? 'Select customer first'
                                : loadingInvoices
                                  ? 'Loading invoices...'
                                  : openInvoices.length === 0
                                    ? 'No open invoices'
                                    : 'Select invoice'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {openInvoices.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.invoiceNumber} - Bal: {inv.balance.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Amount *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="bg-white border-gray-200"
                        value={a.amount}
                        onChange={(e) => setAllocation(idx, { amount: Number(e.target.value) })}
                        required
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="button" variant="outline" onClick={() => removeAllocation(idx)} disabled={formData.allocations.length <= 1} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={addAllocation} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Allocation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/dashboard/financial/accounts-receivable/aging')}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingCustomers || customers.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Create Payment'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

