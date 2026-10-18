'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Search } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { formatCurrency } from '@/lib/currency'

type VarianceLine = {
  budgetLineId: string
  accountId: string
  period: number
  budgetedAmount: number
  actualAmount: number
  variance: number
}

type VarianceResponse = {
  fiscalYear: number
  period: number | null
  lines: VarianceLine[]
}

type CoaAccount = { id: string; accountCode: string; accountName: string }

export default function BudgetVariancePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounced = useDebounce(searchParams.toString(), 250) // trigger refetch when query changes

  const defaultYear = new Date().getFullYear()

  const [fiscalYear, setFiscalYear] = useState<number>(Number(searchParams.get('fiscalYear') || defaultYear))
  const [period, setPeriod] = useState<string>(searchParams.get('period') || '')
  const [coaMap, setCoaMap] = useState<Record<string, CoaAccount>>({})

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<VarianceResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchCoa = async () => {
      try {
        const res = await apiClient.get<any>('/financial/coa/refresh')
        const payload: CoaAccount[] = res.data.data || res.data
        const map: Record<string, CoaAccount> = {}
        if (Array.isArray(payload)) {
          for (const a of payload) map[a.id] = { id: a.id, accountCode: a.accountCode, accountName: a.accountName }
        }
        setCoaMap(map)
      } catch (e) {
        console.error(e)
      }
    }
    fetchCoa()
  }, [])

  const renderVarianceBadge = (variance: number) => {
    const positive = variance >= 0
    if (positive) return <Badge className="bg-green-100 text-green-800 border-green-200">{formatCurrency(variance)}</Badge>
    return <Badge className="bg-red-100 text-red-800 border-red-200">{formatCurrency(variance)}</Badge>
  }

  const fetchVariance = async () => {
    if (!fiscalYear) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const params = new URLSearchParams()
      params.append('fiscalYear', String(fiscalYear))
      if (period) params.append('period', period)
      const res = await apiClient.get<any>(`/financial/budgets/variance?${params}`)
      const payload: VarianceResponse = res.data.data || res.data
      setData(payload)
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Failed to fetch variance')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Keep fiscalYear/period synced with query changes if user navigates from create page.
    const y = searchParams.get('fiscalYear')
    const p = searchParams.get('period')
    if (y) setFiscalYear(Number(y))
    if (p !== null) setPeriod(p || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Budget Variance</h2>
          <p className="text-gray-500">variance = budgeted - actual (from posted journal lines).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/financial/budgeting')}>
            <ArrowRight className="mr-2 h-4 w-4" /> Back to Budgets
          </Button>
        </div>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Select Parameters</CardTitle>
          <CardDescription>Choose fiscal year and optional month period.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="fiscalYear">Fiscal Year</Label>
              <Input
                id="fiscalYear"
                type="number"
                className="bg-gray-50 border-gray-200"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Period (1-12, optional)</Label>
              <Input
                id="period"
                type="number"
                className="bg-gray-50 border-gray-200"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="e.g. 3"
              />
            </div>

            <div className="flex justify-end md:col-span-2">
              <Button onClick={fetchVariance} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto">
                <Search className="mr-2 h-4 w-4" />
                {loading ? 'Generating...' : 'Generate Variance'}
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
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Results ({data.fiscalYear}
              {data.period ? ` / P${data.period}` : ''})
            </CardTitle>
            <CardDescription>
              Lines: {data.lines.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Budgeted</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No budget variance lines found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.lines.map((l) => {
                      const account = coaMap[l.accountId]
                      return (
                        <TableRow key={l.budgetLineId} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="font-medium">{account ? `${account.accountCode} - ${account.accountName}` : l.accountId}</div>
                          </TableCell>
                          <TableCell>{l.period}</TableCell>
                          <TableCell className="text-right">{formatCurrency(l.budgetedAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(l.actualAmount)}</TableCell>
                          <TableCell className="text-right">{renderVarianceBadge(l.variance)}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

