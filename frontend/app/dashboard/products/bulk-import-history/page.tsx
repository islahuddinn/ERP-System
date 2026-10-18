'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, CheckCircle, XCircle, Clock, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { format } from 'date-fns'
import { useBulkImportHistory } from '@/hooks/useProducts'
import { ensureArray } from '../lib/normalize'

export default function ImportHistoryPage() {
  const router = useRouter()
  const { data: historyData, isLoading } = useBulkImportHistory()
  
  const history = ensureArray(historyData)

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>
      case 'PARTIAL':
      case 'PARTIAL_SUCCESS':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Partial Success</Badge>
      case 'FAILED':
      case 'ERROR':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Failed</Badge>
      case 'PROCESSING':
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Processing</Badge>
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/products')}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Import History</h2>
          <p className="text-gray-500">View logs of past bulk product imports.</p>
        </div>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Imports</CardTitle>
          <CardDescription>A list of all file uploads and their processing status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-900">Date</TableHead>
                  <TableHead className="font-semibold text-gray-900">File Name</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Total Records</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Success</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Failed</TableHead>
                  <TableHead className="font-semibold text-gray-900">Uploaded By</TableHead>
                  <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
                        <span>Loading import history...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                      No import history found.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((item: any) => {
                    const date = item.createdAt || item.date
                    const fileName = item.fileName || item.originalFileName || 'Unknown'
                    const status = item.status || 'UNKNOWN'
                    const totalRecords = item.totalRecords || item.records || 0
                    const successRecords = item.successfulRecords || item.success || 0
                    const failedRecords = item.failedRecords || item.failed || 0
                    const userName = item.user?.name || item.user?.email || item.user || 'Unknown'
                    
                    return (
                      <TableRow key={item.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="text-gray-600">
                          {date ? format(new Date(date), 'MMM dd, yyyy HH:mm') : '-'}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          {fileName}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(status)}
                        </TableCell>
                        <TableCell className="text-right text-gray-900 font-medium">
                          {totalRecords > 0 ? totalRecords : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {successRecords > 0 ? successRecords : '-'}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {failedRecords > 0 ? failedRecords : '-'}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {userName}
                        </TableCell>
                        <TableCell className="text-right">
                          {(status === 'PARTIAL' || status === 'FAILED' || status === 'ERROR') && (item.errors?.length > 0 || failedRecords > 0) ? (
                            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 h-8">
                              <Download className="mr-2 h-3 w-3" /> Error Log
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
