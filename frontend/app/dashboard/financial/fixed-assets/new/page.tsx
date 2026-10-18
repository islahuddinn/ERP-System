'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CoaAccount = { id: string; accountCode: string; accountName: string; accountType: string; normalBalance: string; isActive: boolean }

export default function CreateFixedAssetPage() {
  const AUTO_ACCOUNT = '__AUTO__'
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [coaAccounts, setCoaAccounts] = useState<CoaAccount[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    assetName: '',
    cost: 0,
    usefulLife: 12,
    depreciationMethod: 'STRAIGHT_LINE',
    purchaseDate: new Date().toISOString().split('T')[0],
    assetAccountId: '',
    cashAccountId: '',
  })

  useEffect(() => {
    const fetchCoa = async () => {
      setErrorMsg(null)
      try {
        const res = await apiClient.get<any>('/financial/coa/refresh')
        const payload: CoaAccount[] = res.data.data || res.data
        setCoaAccounts(Array.isArray(payload) ? payload : [])
      } catch (e: any) {
        console.error(e)
        setErrorMsg(e?.response?.data?.message || 'Failed to load COA accounts')
      }
    }
    fetchCoa()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.assetName.trim()) return alert('assetName is required')
    if (formData.cost <= 0) return alert('cost must be > 0')
    if (formData.usefulLife <= 0) return alert('usefulLife must be >= 1')

    setLoading(true)
    try {
      const payload = {
        assetName: formData.assetName.trim(),
        cost: Number(formData.cost),
        usefulLife: Number(formData.usefulLife),
        depreciationMethod: formData.depreciationMethod,
        purchaseDate: formData.purchaseDate || undefined,
        assetAccountId: formData.assetAccountId || undefined,
        cashAccountId: formData.cashAccountId || undefined,
      }
      await apiClient.post('/financial/assets', payload)
      alert('Asset purchased')
      router.push('/dashboard/financial/fixed-assets/depreciation/run')
    } catch (err: any) {
      console.error(err)
      alert(err?.response?.data?.message || 'Failed to create asset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/financial/fixed-assets/depreciation/run')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Purchase Fixed Asset</h2>
            <p className="text-gray-500">Creates a GL journal entry (Asset Dr / Cash Cr).</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 text-red-800">{errorMsg}</CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Asset Details</CardTitle>
              <CardDescription>Useful life is stored as months.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="assetName" className="text-sm font-medium text-gray-700">
                    Asset Name *
                  </Label>
                  <Input
                    id="assetName"
                    className="bg-gray-50 border-gray-200"
                    value={formData.assetName}
                    onChange={(e) => setFormData((p) => ({ ...p, assetName: e.target.value }))}
                    placeholder="e.g. Machine A"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost" className="text-sm font-medium text-gray-700">
                    Cost *
                  </Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    className="bg-gray-50 border-gray-200"
                    value={formData.cost}
                    onChange={(e) => setFormData((p) => ({ ...p, cost: Number(e.target.value) }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usefulLife" className="text-sm font-medium text-gray-700">
                    Useful Life (months) *
                  </Label>
                  <Input
                    id="usefulLife"
                    type="number"
                    className="bg-gray-50 border-gray-200"
                    value={formData.usefulLife}
                    onChange={(e) => setFormData((p) => ({ ...p, usefulLife: Number(e.target.value) }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depreciationMethod" className="text-sm font-medium text-gray-700">
                    Depreciation Method *
                  </Label>
                  <Input
                    id="depreciationMethod"
                    className="bg-gray-50 border-gray-200"
                    value={formData.depreciationMethod}
                    onChange={(e) => setFormData((p) => ({ ...p, depreciationMethod: e.target.value }))}
                    placeholder="STRAIGHT_LINE"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchaseDate" className="text-sm font-medium text-gray-700">
                    Purchase Date
                  </Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    className="bg-gray-50 border-gray-200"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData((p) => ({ ...p, purchaseDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Asset Account (optional)</Label>
                  <Select
                    value={formData.assetAccountId || AUTO_ACCOUNT}
                    onValueChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        assetAccountId: v === AUTO_ACCOUNT ? '' : v,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Auto-pick asset account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_ACCOUNT}>Auto (first ASSET account)</SelectItem>
                      {coaAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.accountCode} - {a.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cash Account (optional)</Label>
                  <Select
                    value={formData.cashAccountId || AUTO_ACCOUNT}
                    onValueChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        cashAccountId: v === AUTO_ACCOUNT ? '' : v,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Auto-pick cash/bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_ACCOUNT}>Auto (cash/bank)</SelectItem>
                      {coaAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.accountCode} - {a.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/dashboard/financial/fixed-assets/depreciation/run')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Creating...' : 'Purchase Asset'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

