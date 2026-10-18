'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import { ArrowLeft, Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFactoryReports } from '@/hooks/useFactoryReports'
import { usePlants } from '@/hooks/usePlants'
import { apiClient } from '@/lib/api-client'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

export default function QualityReportsPage() {
    const router = useRouter()
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [plantId, setPlantId] = useState<string>('')
    const [showFilters, setShowFilters] = useState(false)

    const { useQualityReports } = useFactoryReports()
    const { data: reports, isLoading, error } = useQualityReports(
        startDate || undefined,
        endDate || undefined,
        plantId || undefined
    )

    const { data: plantsResponse } = usePlants({ limit: 100 })
    const plants = useMemo(() => {
        const data = plantsResponse?.data || plantsResponse
        return Array.isArray(data) ? data : []
    }, [plantsResponse])

    const handleDownloadPDF = async () => {
        if (!reports || reports.length === 0) {
            toast.error('No data to export')
            return
        }

        try {
            toast.loading('Generating PDF...', { id: 'pdf-gen' })

            const params: any = {}
            if (startDate) params.startDate = startDate
            if (endDate) params.endDate = endDate
            if (plantId) params.plantId = plantId

            const response = await apiClient.get('/factory/reports/quality/pdf', {
                params,
                responseType: 'blob',
            })

            const blob = new Blob([response.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `quality-report-${Date.now()}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)

            toast.success('PDF Downloaded!', { id: 'pdf-gen' })
        } catch (error: any) {
            console.error('PDF download error:', error)
            toast.error('Failed to download PDF', { id: 'pdf-gen' })
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PASSED': return <Badge className="bg-green-100 text-green-700">Passed</Badge>
            case 'FAILED': return <Badge className="bg-red-100 text-red-700">Failed</Badge>
            case 'CONDITIONAL': return <Badge className="bg-yellow-100 text-yellow-700">Conditional</Badge>
            case 'PENDING': return <Badge className="bg-gray-100 text-gray-700">Pending</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/dashboard/factory/reports')}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Quality Reports</h2>
                        <p className="text-gray-500">Inspection compliance and defect tracking.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className="text-gray-700"
                    >
                        <Filter className="mr-2 h-4 w-4" /> Filters
                    </Button>
                    <Button onClick={handleDownloadPDF} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                </div>
            </div>

            {showFilters && (
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="startDate" className="text-gray-700 font-medium">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="endDate" className="text-gray-700 font-medium">End Date</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="plant" className="text-gray-700 font-medium">Plant</Label>
                                <Select value={plantId || 'all'} onValueChange={(v) => setPlantId(v === 'all' ? '' : v)}>
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="All Plants" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Plants</SelectItem>
                                        {plants.map((plant: any) => (
                                            <SelectItem key={plant.id} value={plant.id}>
                                                {plant.name} ({plant.code || 'N/A'})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Report Data</CardTitle>
                    <CardDescription>
                        {reports && reports.length > 0
                            ? `Showing ${reports.length} inspection${reports.length !== 1 ? 's' : ''}`
                            : 'No inspections found'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <div className="text-center py-8 text-red-600">
                            <p>Error loading reports. Please try again.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border border-gray-200 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="font-semibold text-gray-900">Date</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Inspection #</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Product</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Batch</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Type</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Status</TableHead>
                                        <TableHead className="font-semibold text-gray-900 text-right">Pass Rate</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
                                        </TableRow>
                                    ) : reports && reports.length > 0 ? (
                                        reports.map((report) => (
                                            <TableRow key={report.id} className="hover:bg-gray-50">
                                                <TableCell>
                                                    {report.date ? format(new Date(report.date), 'MMM dd, yyyy') : 'N/A'}
                                                </TableCell>
                                                <TableCell className="font-medium">{report.inspectionNumber || 'N/A'}</TableCell>
                                                <TableCell>{report.productName}</TableCell>
                                                <TableCell>{report.batchNumber || 'N/A'}</TableCell>
                                                <TableCell>{report.inspectionType || 'N/A'}</TableCell>
                                                <TableCell>{getStatusBadge(report.qualityStatus)}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {(report.passRate || 0).toFixed(1)}%
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                                                No inspections found for the selected filters
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
