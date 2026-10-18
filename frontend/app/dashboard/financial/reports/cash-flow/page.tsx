'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { formatCurrency } from '@/lib/currency'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, ArrowLeftRight } from 'lucide-react'

type BankTransaction = {
  id: string
  type: 'DEPOSIT' | 'WITHDRAW'
  amount: number
  transactionDate: string
  description?: string
}

type CashFlowResponse = {
  period: { startDate?: string; endDate?: string }
  inflows: number
  outflows: number
  netCashFlow: number
  transactions: BankTransaction[]
}

export default function CashFlowPage() {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CashFlowResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchReport = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      const res = await apiClient.get<any>(`/financial/reports/cash-flow?${params}`)
      const payload: CashFlowResponse = res.data.data || res.data
      setData(payload)
    } catch (e: any) {
      console.error(e)
      setErrorMsg(e?.response?.data?.message || 'Failed to load cash flow')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderTypeBadge = (t: 'DEPOSIT' | 'WITHDRAW') => {
    if (t === 'DEPOSIT') return <Badge className="bg-green-100 text-green-700 border-green-200">DEPOSIT</Badge>
    return <Badge className="bg-red-100 text-red-700 border-red-200">WITHDRAW</Badge>
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Cash Flow</h2>
        <p className="text-gray-500">Inflows, outflows, and net cash movement from bank transactions.</p>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Report Period</CardTitle>
          <CardDescription>Filter by start and end date.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" className="bg-gray-50 border-gray-200" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" className="bg-gray-50 border-gray-200" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex justify-end md:col-span-2">
              <Button onClick={fetchReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Search className="mr-2 h-4 w-4" />
                {loading ? 'Loading...' : 'Generate'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {errorMsg && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 text-red-800">{errorMsg}</CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ArrowLeftRight className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Inflows</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(Number(data.inflows || 0))}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ArrowLeftRight className="h-5 w-5 text-red-700" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Outflows</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(Number(data.outflows || 0))}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ArrowLeftRight className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Net Cash Flow</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(Number(data.netCashFlow || 0))}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Transactions</CardTitle>
              <CardDescription>Underlying bank transactions used in cash flow aggregation.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                          No transactions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.transactions.map((t) => (
                        <TableRow key={t.id} className="hover:bg-gray-50">
                          <TableCell>{new Date(t.transactionDate).toLocaleDateString()}</TableCell>
                          <TableCell>{renderTypeBadge(t.type)}</TableCell>
                          <TableCell className="text-gray-700">{t.description || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(Number(t.amount || 0))}
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

