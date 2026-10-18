'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { formatCurrency } from '@/lib/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, Search, FileText, TrendingUp, Scale } from 'lucide-react'

type TrialBalanceAccount = {
  accountCode: string
  accountName: string
  accountType: string
  normalBalance: string
  debit: number
  credit: number
  balance: number
}

type TrialBalance = {
  period: {
    startDate?: string
    endDate?: string
  }
  accounts: TrialBalanceAccount[]
  totals: {
    totalDebit: number
    totalCredit: number
  }
  isBalanced: boolean
}

export default function FinancialReportsPage() {
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchTrialBalance = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const res = await apiClient.get<any>(`/financial/reports/trial-balance?${params}`)
      console.log('Reports Response:', res)
      const trialBalanceData = res.data.data || res.data
      console.log('Trial Balance Data:', trialBalanceData)
      setTrialBalance(trialBalanceData)
    } catch (error) {
      console.error('Failed to load trial balance', error)
      setTrialBalance(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrialBalance()
  }, [startDate, endDate])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const renderAccountTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      ASSET: 'bg-blue-100 text-blue-700 border-blue-200',
      LIABILITY: 'bg-orange-100 text-orange-700 border-orange-200',
      EQUITY: 'bg-purple-100 text-purple-700 border-purple-200',
      REVENUE: 'bg-green-100 text-green-700 border-green-200',
      EXPENSE: 'bg-red-100 text-red-700 border-red-200',
    }
    return <Badge className={variants[type]}>{type}</Badge>
  }

  const handleExport = () => {
    if (!trialBalance) return
    
    const csvContent = [
      'Account Code,Account Name,Type,Normal Balance,Debit,Credit,Balance',
      ...(trialBalance.accounts || []).map(account => 
        `${account.accountCode},"${account.accountName}",${account.accountType},${account.normalBalance},${account.debit},${account.credit},${account.balance}`
      ),
      `Totals,,,,${trialBalance.totals?.totalDebit || 0},${trialBalance.totals?.totalCredit || 0},`
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trial-balance-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Financial Reports</h2>
          <p className="text-gray-500">Generate and view financial reports for your business.</p>
        </div>
      </div>

      {/* Date Filters */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Report Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                className="bg-gray-50 border-gray-200"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                className="bg-gray-50 border-gray-200"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={fetchTrialBalance}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Search className="mr-2 h-4 w-4" />
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!trialBalance}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trial Balance Summary */}
      {trialBalance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Scale className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-sm text-gray-600">Total Debit</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(trialBalance.totals?.totalDebit || 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-sm text-gray-600">Total Credit</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(trialBalance.totals?.totalCredit || 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="text-2xl font-bold">
                    <Badge className={trialBalance.isBalanced ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}>
                      {trialBalance.isBalanced ? 'Balanced' : 'Not Balanced'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trial Balance Table */}
      {trialBalance && (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Trial Balance
              {trialBalance.period?.startDate && trialBalance.period?.endDate && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({formatDate(trialBalance.period?.startDate)} - {formatDate(trialBalance.period?.endDate)})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-900">Account Code</TableHead>
                    <TableHead className="font-semibold text-gray-900">Account Name</TableHead>
                    <TableHead className="font-semibold text-gray-900">Type</TableHead>
                    <TableHead className="font-semibold text-gray-900">Normal Balance</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-right">Debit</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-right">Credit</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(trialBalance.accounts || []).map((account) => (
                    <TableRow key={account.accountCode} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">{account.accountCode}</TableCell>
                      <TableCell className="text-gray-700">{account.accountName}</TableCell>
                      <TableCell>{renderAccountTypeBadge(account.accountType)}</TableCell>
                      <TableCell>
                        <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                          {account.normalBalance}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-gray-700">
                        {account.debit > 0 ? formatCurrency(account.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-gray-700">
                        {account.credit > 0 ? formatCurrency(account.credit) : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${account.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {formatCurrency(account.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell colSpan={4} className="text-gray-900">Totals</TableCell>
                    <TableCell className="text-right text-gray-900">
                      {formatCurrency(trialBalance.totals?.totalDebit || 0)}
                    </TableCell>
                    <TableCell className="text-right text-gray-900">
                      {formatCurrency(trialBalance.totals?.totalCredit || 0)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!trialBalance && !loading && (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
            <p className="text-gray-500 mb-4">
              Select a date range and click "Generate Report" to view the trial balance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
