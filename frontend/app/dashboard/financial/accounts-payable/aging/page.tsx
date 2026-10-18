'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, Search } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'

type AgingBill = {
  billId: string
  billNumber: string
  vendorId: string
  vendorName: string
  dueDate: string
  daysPastDue: number
  amountOutstanding: number
  bucket: '0-30' | '31-60' | '61-90' | '91-180' | '181+'
  status: string
}

type VendorBillAgingResponse = {
  asOfDate: string
  totalsByBucket: Record<string, number>
  bills: AgingBill[]
}

export default function ApAgingPage() {
  const [asOfDate, setAsOfDate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<VendorBillAgingResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchAging = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const params = new URLSearchParams()
      if (asOfDate) params.append('asOfDate', asOfDate)
      const res = await apiClient.get<any>(`/financial/ap/aging?${params}`)
      const payload: VendorBillAgingResponse = res.data.data || res.data
      setData(payload)
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Failed to load AP aging')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAging()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bucketCards = useMemo(() => {
    const totals = data?.totalsByBucket || {}
    const buckets: Array<{ label: string; value: number; tone: string }> = [
      { label: '0-30', value: Number(totals['0-30'] || 0), tone: 'bg-blue-100 text-blue-800 border-blue-200' },
      { label: '31-60', value: Number(totals['31-60'] || 0), tone: 'bg-orange-100 text-orange-800 border-orange-200' },
      { label: '61-90', value: Number(totals['61-90'] || 0), tone: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      { label: '91-180', value: Number(totals['91-180'] || 0), tone: 'bg-purple-100 text-purple-800 border-purple-200' },
      { label: '181+', value: Number(totals['181+'] || 0), tone: 'bg-red-100 text-red-800 border-red-200' },
    ]
    return buckets
  }, [data])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">AP Aging</h2>
          <p className="text-gray-500">Vendor outstanding amounts grouped by due date aging buckets.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              className="pl-8 bg-gray-50 border-gray-200"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              aria-label="As of date"
            />
          </div>
          <Button onClick={fetchAging} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Clock className="mr-2 h-4 w-4" />
            {loading ? 'Loading...' : 'Generate'}
          </Button>
        </div>
      </div>

      {errorMsg && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 text-red-800">{errorMsg}</CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {bucketCards.map((c) => (
              <Card key={c.label} className="bg-white border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">{c.label} Days</div>
                    <Badge className={c.tone}>{formatCurrency(c.value)}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Outstanding Bills</CardTitle>
              <CardDescription>
                As of {new Date(data.asOfDate).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Bill</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Days Past Due</TableHead>
                      <TableHead>Bucket</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.bills.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          No outstanding bills found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.bills.map((b) => (
                        <TableRow key={b.billId} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{b.billNumber}</TableCell>
                          <TableCell>{b.vendorName}</TableCell>
                          <TableCell>{new Date(b.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell>{b.daysPastDue}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{b.bucket}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(b.amountOutstanding)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

