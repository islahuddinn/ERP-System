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
import { Search, TrendingUp } from 'lucide-react'

type ReportAccountLine = {
  accountCode: string
  accountName: string
  accountType: string
  normalBalance: string
  debit: number
  credit: number
  balance: number
}

type IncomeStatementResponse = {
  period: { startDate?: string; endDate?: string }
  revenue: { accounts: ReportAccountLine[]; total: number }
  expenses: { accounts: ReportAccountLine[]; total: number }
  netIncome: number
}

export default function ProfitLossPage() {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<IncomeStatementResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchReport = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      const res = await apiClient.get<any>(`/financial/reports/income-statement?${params}`)
      const payload: IncomeStatementResponse = res.data.data || res.data
      setData(payload)
    } catch (e: any) {
      console.error(e)
      setErrorMsg(e?.response?.data?.message || 'Failed to load Profit & Loss report')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Profit & Loss</h2>
        <p className="text-gray-500">Revenue minus expenses for the selected period.</p>
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
                {loading ? 'Loading...' : 'Generate Report'}
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
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  <div>
                    <div className="text-sm text-gray-600">Total Revenue</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(Number(data.revenue.total || 0))}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-700 border-red-200">EXPENSE</Badge>
                  <div>
                    <div className="text-sm text-gray-600">Total Expenses</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(Number(data.expenses.total || 0))}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Badge className={data.netIncome >= 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                    {data.netIncome >= 0 ? 'PROFIT' : 'LOSS'}
                  </Badge>
                  <div>
                    <div className="text-sm text-gray-600">Net Income</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(Number(data.netIncome || 0))}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Revenue Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.revenue.accounts.map((a) => (
                      <TableRow key={a.accountCode} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{a.accountCode}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(a.balance || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Expense Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expenses.accounts.map((a) => (
                      <TableRow key={a.accountCode} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{a.accountCode}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(a.balance || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

