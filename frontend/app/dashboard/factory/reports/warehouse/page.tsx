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
import { Progress } from '@/components/ui/progress'
import { useFactoryReports } from '@/hooks/useFactoryReports'
import { useWarehouses } from '@/hooks/useWarehouses'
import { apiClient } from '@/lib/api-client'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

export default function WarehouseReportsPage() {
    const router = useRouter()
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [warehouseId, setWarehouseId] = useState<string>('')
    const [showFilters, setShowFilters] = useState(false)

    const { useWarehouseReports } = useFactoryReports()
    const { data: reports, isLoading, error } = useWarehouseReports(
        startDate || undefined,
        endDate || undefined,
        warehouseId || undefined
    )

    const { data: warehousesResponse } = useWarehouses({ isActive: true, limit: 1000 })
    const warehouses = useMemo(() => {
        const data = warehousesResponse?.data?.data || warehousesResponse?.data || warehousesResponse
        return Array.isArray(data) ? data : []
    }, [warehousesResponse])

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
            if (warehouseId) params.warehouseId = warehouseId

            const response = await apiClient.get('/factory/reports/warehouse/pdf', {
                params,
                responseType: 'blob',
            })

            const blob = new Blob([response.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `warehouse-report-${Date.now()}.pdf`
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
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Warehouse Reports</h2>
                        <p className="text-gray-500">Inventory movement and capacity analysis.</p>
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
                                <Label htmlFor="warehouse" className="text-gray-700 font-medium">Warehouse</Label>
                                <Select value={warehouseId || 'all'} onValueChange={(v) => setWarehouseId(v === 'all' ? '' : v)}>
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="All Warehouses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Warehouses</SelectItem>
                                        {warehouses.map((warehouse: any) => (
                                            <SelectItem key={warehouse.id} value={warehouse.id}>
                                                {warehouse.name} ({warehouse.code || 'N/A'})
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
                            ? `Showing ${reports.length} warehouse record${reports.length !== 1 ? 's' : ''}`
                            : 'No warehouse records found'}
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
                                        <TableHead className="font-semibold text-gray-900">Location</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Item</TableHead>
                                        <TableHead className="font-semibold text-gray-900 text-right text-green-600">Incoming</TableHead>
                                        <TableHead className="font-semibold text-gray-900 text-right text-red-600">Outgoing</TableHead>
                                        <TableHead className="font-semibold text-gray-900 text-right">Current Stock</TableHead>
                                        <TableHead className="font-semibold text-gray-900 w-[150px]">Utilization</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                                        </TableRow>
                                    ) : reports && reports.length > 0 ? (
                                        reports.map((report, index) => (
                                            <TableRow key={report.id || index} className="hover:bg-gray-50">
                                                <TableCell className="font-medium">{report.location}</TableCell>
                                                <TableCell>{report.item}</TableCell>
                                                <TableCell className="text-right text-green-600">+{report.incoming || 0}</TableCell>
                                                <TableCell className="text-right text-red-600">-{report.outgoing || 0}</TableCell>
                                                <TableCell className="text-right font-medium">{report.stockLevel || 0}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={report.capacityUtilization || 0} className="h-2 bg-gray-100" />
                                                        <span className="text-xs text-gray-500 w-[35px]">
                                                            {(report.capacityUtilization || 0).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                                No warehouse records found for the selected filters
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
