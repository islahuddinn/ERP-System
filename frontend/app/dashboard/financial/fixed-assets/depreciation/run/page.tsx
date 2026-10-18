'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, RotateCcw } from 'lucide-react'

export default function RunDepreciationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [result, setResult] = useState<any | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleRun = async () => {
    setLoading(true)
    setErrorMsg(null)
    setResult(null)
    try {
      const payload = { date: date ? new Date(date).toISOString() : undefined }
      const res = await apiClient.post('/financial/assets/depreciation/run', payload)
      const payloadRes = res.data.data || res.data
      setResult(payloadRes)
    } catch (e: any) {
      console.error(e)
      setErrorMsg(e?.response?.data?.message || 'Failed to run depreciation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/financial/fixed-assets/new')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Depreciation Run</h2>
            <p className="text-gray-500">Posts monthly depreciation journal entries.</p>
          </div>
        </div>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Run Depreciation</CardTitle>
          <CardDescription>Select the depreciation date (defaults to today).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="depDate" className="text-sm font-medium text-gray-700">
                Date
              </Label>
              <Input
                id="depDate"
                type="date"
                className="bg-gray-50 border-gray-200"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={handleRun} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                <RotateCcw className="mr-2 h-4 w-4" />
                {loading ? 'Running...' : 'Run'}
              </Button>
            </div>
          </div>

          {errorMsg && (
            <div className="pt-4 text-red-800 text-sm">{errorMsg}</div>
          )}

          {result && (
            <div className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gray-50 border-gray-200 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-600">Depreciation Month</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {result?.date ? new Date(result.date).toLocaleDateString() : '-'}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-50 border-gray-200 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-600">Assets Processed</div>
                    <div className="text-2xl font-bold text-gray-900">{result?.processedAssetCount ?? 0}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

