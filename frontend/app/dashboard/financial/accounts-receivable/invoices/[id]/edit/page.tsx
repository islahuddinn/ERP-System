'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save } from 'lucide-react'

export default function EditArInvoicePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id as string

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ dueDate: '', status: 'OPEN' })

  useEffect(() => {
    const run = async () => {
      try {
        const res = await apiClient.get<any>(`/ar/invoices/${id}`)
        const p = res.data.data || res.data
        setForm({
          dueDate: p?.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : '',
          status: p?.status || 'OPEN',
        })
      } catch {
        alert('Failed to load invoice')
      }
    }
    if (id) run()
  }, [id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiClient.patch(`/ar/invoices/${id}`, {
        dueDate: form.dueDate || undefined,
        status: form.status,
      })
      router.push('/dashboard/financial/accounts-receivable/invoices')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/dashboard/financial/accounts-receivable/invoices')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Edit AR Invoice</h2>
        </div>
      </div>

      <form onSubmit={submit}>
        <Card className="bg-white border-gray-200 shadow-sm max-w-xl">
          <CardHeader><CardTitle className="text-lg font-semibold text-gray-900">Invoice Fields</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" className="bg-gray-50 border-gray-200" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Input className="bg-gray-50 border-gray-200" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="mr-2 h-4 w-4" /> {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

