'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'

export default function CreateInvoicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Array<{ id: string; name?: string; customerName?: string }>>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [formData, setFormData] = useState({
    customerId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    totalAmount: 0,
  })

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await apiClient.get<any>('/customers')
        const payload = Array.isArray(res.data?.data?.data)
          ? res.data.data.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data?.data?.items)
              ? res.data.data.items
              : Array.isArray(res.data?.items)
                ? res.data.items
                : Array.isArray(res.data)
                  ? res.data
                  : []
        setCustomers(payload)
      } catch (error: any) {
        console.error('Failed to load customers', error)
        const message = error?.response?.data?.message
        if (message) {
          alert(Array.isArray(message) ? message.join(', ') : message)
        }
        setCustomers([])
      } finally {
        setLoadingCustomers(false)
      }
    }
    fetchCustomers()
  }, [])
  
  useEffect(() => {
    const fetchFallbackLedgerCustomers = async () => {
      if (customers.length > 0 || loadingCustomers) return
      try {
        const res = await apiClient.get<any>('/customers/ledger-overview')
        const payload = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : []
        if (payload.length > 0) {
          setCustomers(payload)
        }
      } catch (error) {
        console.error('Failed to load fallback customers list', error)
      }
    }
    fetchFallbackLedgerCustomers()
  }, [customers.length, loadingCustomers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.customerId) return alert('customerId is required')
    if (!formData.invoiceDate) return alert('invoiceDate is required')
    if (!formData.dueDate) return alert('dueDate is required')
    if (formData.totalAmount <= 0) return alert('totalAmount must be > 0')

    setLoading(true)
    try {
      const payload = {
        customerId: formData.customerId,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        totalAmount: Number(formData.totalAmount),
      }
      const res = await apiClient.post<any>('/financial/ar/invoices', payload)
      alert(res?.data?.message || 'Invoice created successfully')
      router.push('/dashboard/financial/accounts-receivable/aging')
    } catch (err: any) {
      console.error('Create invoice failed', err)
      alert(err?.response?.data?.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/financial/accounts-receivable/aging')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Create Customer Invoice</h2>
            <p className="text-gray-500">Creates AR with double-entry journal posting.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Invoice Details</CardTitle>
              <CardDescription>All fields are required.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerId" className="text-sm font-medium text-gray-700">
                    Customer *
                  </Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) => setFormData((p) => ({ ...p, customerId: value }))}
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
                  <Label htmlFor="totalAmount" className="text-sm font-medium text-gray-700">
                    Total Amount *
                  </Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="bg-gray-50 border-gray-200"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData((p) => ({ ...p, totalAmount: Number(e.target.value) }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceDate" className="text-sm font-medium text-gray-700">
                    Invoice Date *
                  </Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    className="bg-gray-50 border-gray-200"
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData((p) => ({ ...p, invoiceDate: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700">
                    Due Date *
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    className="bg-gray-50 border-gray-200"
                    value={formData.dueDate}
                    onChange={(e) => setFormData((p) => ({ ...p, dueDate: e.target.value }))}
                    required
                  />
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
              {loading ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

