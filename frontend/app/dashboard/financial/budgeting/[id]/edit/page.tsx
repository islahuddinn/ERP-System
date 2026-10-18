'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save } from 'lucide-react'

export default function EditBudgetPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id as string

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    fiscalYear: new Date().getFullYear(),
    totalBudget: 0,
  })

  useEffect(() => {
    const run = async () => {
      try {
        const res = await apiClient.get<any>(`/budgets/${id}`)
        const p = res.data.data || res.data
        setForm({
          fiscalYear: Number(p?.fiscalYear || new Date().getFullYear()),
          totalBudget: Number(p?.totalBudget || 0),
        })
      } catch {
        alert('Failed to load budget')
      }
    }
    if (id) run()
  }, [id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiClient.patch(`/budgets/${id}`, {
        fiscalYear: Number(form.fiscalYear),
        totalBudget: Number(form.totalBudget),
      })
      router.push('/dashboard/financial/budgeting')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update budget')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/dashboard/financial/budgeting')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Edit Budget</h2>
      </div>

      <form onSubmit={submit}>
        <Card className="bg-white border-gray-200 shadow-sm max-w-xl">
          <CardHeader><CardTitle className="text-lg font-semibold text-gray-900">Budget Header</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fiscal Year</Label>
              <Input type="number" className="bg-gray-50 border-gray-200" value={form.fiscalYear} onChange={(e) => setForm((p) => ({ ...p, fiscalYear: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Total Budget</Label>
              <Input type="number" step="0.01" className="bg-gray-50 border-gray-200" value={form.totalBudget} onChange={(e) => setForm((p) => ({ ...p, totalBudget: Number(e.target.value) }))} />
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

