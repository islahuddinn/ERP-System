'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { formatCurrency } from '@/lib/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, Calendar, DollarSign } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type JournalLine = {
  id: string
  accountId: string
  debitAmount: number
  creditAmount: number
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
  totalDebit: number
  totalCredit: number
  status: string
  postedAt?: string
  lines: JournalLine[]
}

export default function ViewJournalEntryPage() {
  const params = useParams()
  const router = useRouter()
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEntry = async () => {
      try {
        const res = await apiClient.get<any>(`/financial/journal/${params.id}`)
        console.log('Journal Entry Response:', res)
        const entryData = res.data.data || res.data
        console.log('Entry Data:', entryData)
        console.log('Entry Lines:', entryData?.lines)
        setEntry(entryData)
      } catch (error) {
        console.error('Failed to load journal entry', error)
        router.push('/dashboard/financial/journal')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchEntry()
    }
  }, [params.id, router])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const renderStatusBadge = (status: string) => {
    const variants: { [key: string]: string } = {
      DRAFT: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      POSTED: 'bg-green-100 text-green-700 border-green-200',
      REVERSED: 'bg-red-100 text-red-700 border-red-200',
    }
    return <Badge className={variants[status] || 'bg-gray-100 text-gray-700 border-gray-200'}>{status}</Badge>
  }

  const handlePost = async (entryId: string) => {
    if (!confirm('Are you sure you want to post this journal entry?')) {
      return
    }

    try {
      await apiClient.patch(`/financial/journal/${entryId}/post`)
      router.push('/dashboard/financial/journal')
    } catch (error) {
      console.error('Failed to post entry', error)
      alert('Failed to post entry')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading journal entry...</div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Journal entry not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/financial/journal')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Journal Entries
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Journal Entry {entry.entryNumber}
            </h1>
            <p className="text-gray-500">View journal entry details and lines</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {entry.status === 'DRAFT' && (
            <Button
              onClick={() => handlePost(entry.id)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Post Entry
            </Button>
          )}
        </div>
      </div>

      {/* Entry Details */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Entry Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                Entry Date
              </div>
              <div className="font-medium text-gray-900">
                {formatDate(entry.entryDate)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Status</div>
              <div>{renderStatusBadge(entry.status)}</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                Total Debit
              </div>
              <div className="font-medium text-gray-900">
                {formatCurrency(entry.totalDebit)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                Total Credit
              </div>
              <div className="font-medium text-gray-900">
                {formatCurrency(entry.totalCredit)}
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="text-sm text-gray-600">Description</div>
            <div className="text-gray-900 bg-gray-50 p-3 rounded-lg">
              {entry.description}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journal Lines */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Journal Lines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-900">Account Code</TableHead>
                  <TableHead className="font-semibold text-gray-900">Account Name</TableHead>
                  <TableHead className="font-semibold text-gray-900">Description</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Debit</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entry.lines || []).map((line) => (
                  <TableRow key={line.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900">
                      {line.account?.accountCode || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {line.account?.accountName || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {line.description || '-'}
                    </TableCell>
                    <TableCell className="text-right text-gray-700">
                      {line.debitAmount > 0 ? formatCurrency(line.debitAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-gray-700">
                      {line.creditAmount > 0 ? formatCurrency(line.creditAmount) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell colSpan={3} className="text-gray-900">Totals</TableCell>
                  <TableCell className="text-right text-gray-900">
                    {formatCurrency(entry.totalDebit)}
                  </TableCell>
                  <TableCell className="text-right text-gray-900">
                    {formatCurrency(entry.totalCredit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
