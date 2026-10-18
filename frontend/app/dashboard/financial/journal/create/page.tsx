'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { formatCurrency } from '@/lib/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Plus, Trash2, AlertTriangle } from 'lucide-react'

type Account = {
  id: string
  accountCode: string
  accountName: string
  accountType: string
  normalBalance: string
}

type JournalLine = {
  accountId: string
  debit: number
  credit: number
  description?: string
}

export default function CreateJournalEntryPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    description: '',
  })
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: '', debit: 0, credit: 0, description: '' },
    { accountId: '', debit: 0, credit: 0, description: '' },
  ])

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await apiClient.get<any>('/financial/coa/refresh')
        const payload: any = res.data.data || res.data
        setAccounts(Array.isArray(payload) ? payload : [])
      } catch (error) {
        console.error('Failed to load accounts', error)
        setAccounts([])
      }
    }
    fetchAccounts()
  }, [])

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0)
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01
  const hasValidLines = lines.every(line => line.accountId && (line.debit > 0 || line.credit > 0))

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLineChange = (index: number, field: keyof JournalLine, value: string | number) => {
    const newLines = [...lines]
    if (field === 'debit' || field === 'credit') {
      const numValue = Number(value) || 0
      newLines[index][field] = numValue
      // Clear the other field if this one has a value
      if (field === 'debit' && numValue > 0) {
        newLines[index].credit = 0
      } else if (field === 'credit' && numValue > 0) {
        newLines[index].debit = 0
      }
    } else {
      newLines[index][field] = value as string
    }
    setLines(newLines)
  }

  const addLine = () => {
    setLines([...lines, { accountId: '', debit: 0, credit: 0, description: '' }])
  }

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.entryDate || !formData.description) {
      alert('Please fill in all required fields')
      return
    }

    if (!isBalanced) {
      alert('Journal entry must be balanced (total debit = total credit)')
      return
    }

    if (!hasValidLines) {
      alert('Please ensure all lines have valid accounts and amounts')
      return
    }

    setLoading(true)
    try {
      const payload = {
        entryDate: formData.entryDate,
        description: formData.description,
        lines: lines.filter(line => line.accountId && (line.debit > 0 || line.credit > 0)).map(line => ({
          accountId: line.accountId,
          debit: line.debit.toString(),
          credit: line.credit.toString(),
          description: line.description || ''
        }))
      }
      await apiClient.post('/financial/journal', payload)
      router.push('/dashboard/financial/journal')
    } catch (error: any) {
      console.error('Failed to create journal entry', error)
      alert(error.response?.data?.message || 'Failed to create journal entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/financial/journal')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Create Journal Entry</h2>
            <p className="text-gray-500">Create a balanced journal entry with multiple lines.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Entry Details */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Entry Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryDate" className="text-sm font-medium text-gray-700">
                    Entry Date *
                  </Label>
                  <Input
                    id="entryDate"
                    type="date"
                    className="bg-gray-50 border-gray-200"
                    value={formData.entryDate}
                    onChange={(e) => handleInputChange('entryDate', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description *
                  </Label>
                  <Input
                    id="description"
                    placeholder="e.g., Monthly rent payment"
                    className="bg-gray-50 border-gray-200"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Journal Lines */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Journal Lines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lines.map((line, index) => (
                  <div key={`line-${index}-${line.accountId}`} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Account *</Label>
                      <Select
                        value={line.accountId}
                        onValueChange={(value) => handleLineChange(index, 'accountId', value)}
                      >
                        <SelectTrigger className="bg-white border-gray-200">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountCode} - {account.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Debit</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="bg-white border-gray-200"
                        value={line.debit.toString()}
                        onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Credit</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="bg-white border-gray-200"
                        value={line.credit.toString()}
                        onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Description</Label>
                      <Input
                        placeholder="Optional"
                        className="bg-white border-gray-200"
                        value={line.description || ''}
                        onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                      />
                    </div>

                    <div className="flex items-end">
                      {lines.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLine(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addLine}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Line
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Total Debit</div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalDebit)}</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Total Credit</div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalCredit)}</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Difference</div>
                  <div className={`text-2xl font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(totalDebit - totalCredit))}
                  </div>
                </div>
              </div>

              {!isBalanced && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    Journal entry must be balanced (total debit must equal total credit)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/financial/journal')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={loading || !isBalanced || !hasValidLines}
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Creating...' : 'Create Entry'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
