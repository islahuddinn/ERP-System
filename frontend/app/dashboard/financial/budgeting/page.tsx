'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/currency'

type CoaAccount = { id: string; accountCode: string; accountName: string; accountType: string; normalBalance: string; isActive: boolean }
type BudgetLineForm = { accountId: string; period: number; budgetedAmount: number }
type BudgetRow = { id: string; fiscalYear: number; totalBudget: number; lines: Array<{ id: string }> }

export default function CreateBudgetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [coaAccounts, setCoaAccounts] = useState<CoaAccount[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [budgets, setBudgets] = useState<BudgetRow[]>([])

  const [formData, setFormData] = useState({
    fiscalYear: new Date().getFullYear(),
    totalBudget: 0,
    lines: [{ accountId: '', period: new Date().getMonth() + 1, budgetedAmount: 0 }] as BudgetLineForm[],
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
    const fetchBudgets = async () => {
      try {
        const res = await apiClient.get<any>('/budgets')
        const payload: BudgetRow[] = res.data.data || res.data
        setBudgets(Array.isArray(payload) ? payload : [])
      } catch (e) {
        console.error(e)
      }
    }
    fetchBudgets()
  }, [])

  const linesTotal = useMemo(
    () => formData.lines.reduce((s, l) => s + Number(l.budgetedAmount || 0), 0),
    [formData.lines],
  )

  const setLine = (idx: number, patch: Partial<BudgetLineForm>) => {
    setFormData((p) => {
      const next = [...p.lines]
      next[idx] = { ...next[idx], ...patch }
      return { ...p, lines: next }
    })
  }

  const addLine = () =>
    setFormData((p) => ({
      ...p,
      lines: [...p.lines, { accountId: '', period: 1, budgetedAmount: 0 }],
    }))

  const removeLine = (idx: number) =>
    setFormData((p) => ({
      ...p,
      lines: p.lines.length <= 1 ? p.lines : p.lines.filter((_, i) => i !== idx),
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fiscalYear) return alert('fiscalYear is required')
    if (formData.totalBudget <= 0) return alert('totalBudget must be > 0')

    const lines = formData.lines
      .filter((l) => l.accountId && l.period >= 1 && l.period <= 12)
      .map((l) => ({
        accountId: l.accountId,
        period: Number(l.period),
        budgetedAmount: Number(l.budgetedAmount),
      }))

    if (!lines.length) return alert('Budget lines are required')

    if (Math.abs(linesTotal - Number(formData.totalBudget)) > 0.01) {
      return alert('totalBudget must equal sum of budgetedAmount in lines')
    }

    setLoading(true)
    setErrorMsg(null)
    try {
      const payload = {
        fiscalYear: Number(formData.fiscalYear),
        totalBudget: Number(formData.totalBudget),
        lines,
      }
      await apiClient.post('/financial/budgets', payload)
      alert('Budget created')
      const refreshed = await apiClient.get<any>('/budgets')
      const list: BudgetRow[] = refreshed.data.data || refreshed.data
      setBudgets(Array.isArray(list) ? list : [])
      router.push(`/dashboard/financial/budgeting/variance?fiscalYear=${formData.fiscalYear}`)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err?.response?.data?.message || 'Failed to create budget')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/financial/reports')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Budgets</h2>
            <p className="text-gray-500">Create annual budgets per COA account and period.</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/financial/budgeting/variance')} className="gap-2">
          View Variance
        </Button>
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
              <CardTitle className="text-lg font-semibold text-gray-900">Budget Summary</CardTitle>
              <CardDescription>Total budget must match sum of all line budgeted amounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fiscalYear" className="text-sm font-medium text-gray-700">
                    Fiscal Year *
                  </Label>
                  <Input
                    id="fiscalYear"
                    type="number"
                    className="bg-gray-50 border-gray-200"
                    value={formData.fiscalYear}
                    onChange={(e) => setFormData((p) => ({ ...p, fiscalYear: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalBudget" className="text-sm font-medium text-gray-700">
                    Total Budget *
                  </Label>
                  <Input
                    id="totalBudget"
                    type="number"
                    step="0.01"
                    className="bg-gray-50 border-gray-200"
                    value={formData.totalBudget}
                    onChange={(e) => setFormData((p) => ({ ...p, totalBudget: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Lines Total</Label>
                  <div className="p-3 rounded-md border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900">
                    {formatCurrency(linesTotal)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Budget Lines</CardTitle>
              <CardDescription>Add monthly budget per account (period 1..12).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Account *</Label>
                      <Select value={l.accountId} onValueChange={(v) => setLine(idx, { accountId: v })}>
                        <SelectTrigger className="bg-white border-gray-200">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {coaAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.accountCode} - {a.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Period *</Label>
                      <Input
                        type="number"
                        className="bg-white border-gray-200"
                        value={l.period}
                        onChange={(e) => setLine(idx, { period: Number(e.target.value) })}
                        min={1}
                        max={12}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Budgeted *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="bg-white border-gray-200"
                        value={l.budgetedAmount}
                        onChange={(e) => setLine(idx, { budgetedAmount: Number(e.target.value) })}
                        required
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="button" variant="outline" onClick={() => removeLine(idx)} disabled={formData.lines.length <= 1} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={addLine} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Line
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/dashboard/financial/budgeting/variance')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Creating...' : 'Create Budget'}
            </Button>
          </div>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Existing Budgets</CardTitle>
              <CardDescription>Quick manage existing budget headers.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {budgets.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No budgets found.</div>
                ) : (
                  budgets.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">FY {b.fiscalYear}</div>
                        <div className="text-gray-600">Total: {formatCurrency(Number(b.totalBudget))} | Lines: {b.lines?.length || 0}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => router.push(`/dashboard/financial/budgeting/${b.id}/edit`)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={async () => {
                            if (!confirm('Delete budget?')) return
                            try {
                              await apiClient.delete(`/budgets/${b.id}`)
                              setBudgets((prev) => prev.filter((x) => x.id !== b.id))
                            } catch (e: any) {
                              alert(e?.response?.data?.message || 'Failed to delete budget')
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}

