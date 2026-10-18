'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save } from 'lucide-react'

export default function EditFixedAssetPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id as string

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    assetName: '',
    usefulLife: 12,
    depreciationMethod: 'STRAIGHT_LINE',
  })

  useEffect(() => {
    const run = async () => {
      try {
        const res = await apiClient.get<any>(`/assets/${id}`)
        const p = res.data.data || res.data
        setForm({
          assetName: p.assetName || '',
          usefulLife: Number(p.usefulLife || 12),
          depreciationMethod: p.depreciationMethod || 'STRAIGHT_LINE',
        })
      } catch {
        alert('Failed to load asset')
      }
    }
    if (id) run()
  }, [id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiClient.patch(`/assets/${id}`, {
        assetName: form.assetName,
        usefulLife: Number(form.usefulLife),
        depreciationMethod: form.depreciationMethod,
      })
      router.push('/dashboard/financial/fixed-assets')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update asset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/dashboard/financial/fixed-assets')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Edit Asset</h2>
      </div>

      <form onSubmit={submit}>
        <Card className="bg-white border-gray-200 shadow-sm max-w-xl">
          <CardHeader><CardTitle className="text-lg font-semibold text-gray-900">Asset Fields</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Asset Name</Label>
              <Input className="bg-gray-50 border-gray-200" value={form.assetName} onChange={(e) => setForm((p) => ({ ...p, assetName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Useful Life (months)</Label>
              <Input type="number" className="bg-gray-50 border-gray-200" value={form.usefulLife} onChange={(e) => setForm((p) => ({ ...p, usefulLife: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Depreciation Method</Label>
              <Input className="bg-gray-50 border-gray-200" value={form.depreciationMethod} onChange={(e) => setForm((p) => ({ ...p, depreciationMethod: e.target.value }))} />
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

