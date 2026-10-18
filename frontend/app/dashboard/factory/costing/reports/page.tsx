'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useCostReports } from '@/hooks/useCosting'
import { format } from 'date-fns'

export default function CostReportsPage() {
    const router = useRouter()
    const [currentPage, setCurrentPage] = useState(1)
    const { data: reportsData, isLoading } = useCostReports({ page: currentPage, limit: 20 })
    
    const reports = reportsData?.data || []
    const meta = reportsData?.meta

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard/factory/costing')}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Costing
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Cost Reports</h2>
                    <p className="text-gray-500">Detailed production cost analysis reports.</p>
                </div>
            </div>

            <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Generated Reports</CardTitle>
                    <CardDescription>Historical cost reports by batch and production run.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-gray-200 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-gray-900">Date</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Batch Number</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Product</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Plant</TableHead>
                                    <TableHead className="font-semibold text-gray-900 text-right">Qty Produced</TableHead>
                                    <TableHead className="font-semibold text-gray-900 text-right">Total Cost</TableHead>
                                    <TableHead className="font-semibold text-gray-900 text-right">Unit Cost</TableHead>
                                    <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
                                                <span>Loading reports...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : reports.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                                            No reports found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reports.map((report: any) => (
                                        <TableRow key={report.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className="text-gray-600">
                                                {report.reportDate ? format(new Date(report.reportDate), 'MMM dd, yyyy') : '-'}
                                            </TableCell>
                                            <TableCell className="font-medium text-gray-900">
                                                {report.batchNumber || report.orderNumber || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-gray-900">
                                                {report.productName || 'N/A'}
                                                {report.productSku && (
                                                    <span className="text-gray-500 text-xs ml-1">({report.productSku})</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {report.plantName || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right text-gray-900">
                                                {report.producedQty ? report.producedQty.toLocaleString() : '0'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-gray-900">
                                                ${report.totalCost ? report.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                            </TableCell>
                                            <TableCell className="text-right text-gray-600">
                                                ${report.unitCost ? report.unitCost.toFixed(2) : '0.00'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                                                    <Download className="mr-2 h-3 w-3" /> PDF
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    
                    {meta && meta.totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="border-gray-200"
                            >
                                Previous
                            </Button>
                            <div className="text-sm font-medium text-gray-500">
                                Page {currentPage} of {meta.totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(meta.totalPages, prev + 1))}
                                disabled={currentPage === meta.totalPages}
                                className="border-gray-200"
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
