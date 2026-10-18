'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { formatCurrency } from '@/lib/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, CheckCircle, XCircle } from 'lucide-react'

type JournalLine = {
  id: string
  accountId: string
  debit: number
  credit: number
  description?: string
  account: {
    id: string
    accountCode: string
    accountName: string
  }
}

type JournalEntry = {
  id: string
  entryNumber: string
  entryDate: string
  description: string
  status: 'DRAFT' | 'POSTED' | 'REVERSED'
  totalDebit: number
  totalCredit: number
  createdAt: string
  postedAt?: string
  lines: JournalLine[]
}

export default function JournalEntriesPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true)
      try {
        const res = await apiClient.get<any>('/financial/journal')
        const payload: any = res.data.data || res.data
        setEntries(Array.isArray(payload) ? payload : [])
      } catch (error) {
        console.error('Failed to load journal entries', error)
        setEntries([])
      } finally {
        setLoading(false)
      }
    }
    fetchEntries()
  }, [])

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries
    const q = search.toLowerCase()
    return entries.filter((entry) => {
      return (
        entry.entryNumber.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.entryDate.toLowerCase().includes(q)
      )
    })
  }, [entries, search])

  const renderStatusBadge = (status: JournalEntry['status']) => {
    const variants: Record<string, string> = {
      DRAFT: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      POSTED: 'bg-green-100 text-green-700 border-green-200',
      REVERSED: 'bg-red-100 text-red-700 border-red-200',
    }
    return <Badge className={variants[status]}>{status}</Badge>
  }

  const handlePost = async (id: string) => {
    if (!confirm('Are you sure you want to post this journal entry?')) return
    
    try {
      await apiClient.post(`/financial/journal/${id}/post`)
      setEntries(entries.map(entry => 
        entry.id === id 
          ? { ...entry, status: 'POSTED', postedAt: new Date().toISOString() }
          : entry
      ))
    } catch (error: any) {
      console.error('Failed to post entry', error)
      alert(error.response?.data?.message || 'Failed to post entry')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Journal Entries</h2>
          <p className="text-gray-500">Create and manage journal entries for your financial records.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/financial/journal/create')}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> New Entry
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Entries</CardTitle>
          <div className="flex items-center gap-2 max-w-sm w-full">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by number or description..."
                className="pl-8 bg-gray-50 border-gray-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-900">Entry Number</TableHead>
                  <TableHead className="font-semibold text-gray-900">Date</TableHead>
                  <TableHead className="font-semibold text-gray-900">Description</TableHead>
                  <TableHead className="font-semibold text-gray-900">Total Debit</TableHead>
                  <TableHead className="font-semibold text-gray-900">Total Credit</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                      Loading journal entries...
                    </TableCell>
                  </TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                      No journal entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">{entry.entryNumber}</TableCell>
                      <TableCell className="text-gray-700">{formatDate(entry.entryDate)}</TableCell>
                      <TableCell className="text-gray-700">
                        <div className="max-w-xs truncate" title={entry.description}>
                          {entry.description}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700">{formatCurrency(entry.totalDebit)}</TableCell>
                      <TableCell className="text-gray-700">{formatCurrency(entry.totalCredit)}</TableCell>
                      <TableCell>{renderStatusBadge(entry.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/financial/journal/${entry.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {entry.status === 'DRAFT' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePost(entry.id)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
