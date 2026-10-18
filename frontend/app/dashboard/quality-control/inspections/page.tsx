'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Plus,
    Search,
    MoreVertical,
    CheckCircle,
    X,
    Clock,
    AlertTriangle,
    Shield
} from 'lucide-react'
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useInspections, InspectionStatus } from '@/hooks/useQualityControl'
import { format } from 'date-fns'
import { ensureArray } from '../lib/normalize'

export default function InspectionsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // State for filters
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [currentPage, setCurrentPage] = useState(1)

    // Sync filters with URL parameters
    useEffect(() => {
        const urlStatus = searchParams.get('status')
        if (urlStatus && urlStatus !== statusFilter) {
            setStatusFilter(urlStatus)
        } else if (!urlStatus && statusFilter !== 'all') {
            setStatusFilter('all')
        }

        setCurrentPage(1)
    }, [searchParams])

    const { data: inspectionsData, isLoading } = useInspections({
        page: currentPage,
        search,
        qualityStatus: statusFilter !== 'all' ? statusFilter as InspectionStatus : undefined,
    })

    const inspections = useMemo(() => ensureArray(inspectionsData), [inspectionsData])

    const meta = useMemo(() => {
        if (!inspectionsData || Array.isArray(inspectionsData)) return null
        return (inspectionsData as any).meta || null
    }, [inspectionsData])

    const handleStatusChange = (status: string) => {
        setStatusFilter(status)
        setCurrentPage(1)
        const params = new URLSearchParams(searchParams.toString())
        if (status === 'all') params.delete('status')
        else params.set('status', status)
        router.push(`/dashboard/quality-control/inspections?${params.toString()}`)
    }

    const getStatusBadge = (status: InspectionStatus) => {
        const styles: Record<InspectionStatus, { className: string; icon: any; label: string }> = {
            PENDING: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, label: 'Pending' },
            PASSED: { className: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Passed' },
            FAILED: { className: 'bg-red-100 text-red-700 border-red-200', icon: X, label: 'Failed' },
            CONDITIONAL: { className: 'bg-blue-100 text-blue-700 border-blue-200', icon: AlertTriangle, label: 'Conditional' },
            all: { className: 'bg-gray-100 text-gray-700 border-gray-200', icon: Shield, label: 'All' },
        }
        const style = styles[status]
        const Icon = style.icon

        return (
            <Badge className={`flex items-center gap-1 w-fit font-medium ${style.className}`}>
                <Icon className="h-3 w-3" />
                {style.label}
            </Badge>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Quality Inspections</h2>
                    <p className="text-gray-500">Manage and track production quality controls.</p>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/quality-control/inspections/create')}
                    className="bg-green-600 hover:bg-green-700 text-white"
                >
                    <Plus className="mr-2 h-4 w-4" /> Create Inspection
                </Button>
            </div>

            <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <Tabs value={statusFilter} onValueChange={handleStatusChange} className="w-full md:w-auto">
                            <TabsList className="bg-gray-100">
                                <TabsTrigger value="all">All Inspections</TabsTrigger>
                                <TabsTrigger value="PENDING">Pending</TabsTrigger>
                                <TabsTrigger value="PASSED">Passed</TabsTrigger>
                                <TabsTrigger value="FAILED">Failed</TabsTrigger>
                                <TabsTrigger value="CONDITIONAL">Conditional</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex flex-1 items-center gap-2 max-w-sm">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Search inspections..."
                                    className="pl-8 bg-gray-50 border-gray-200"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-gray-200 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-gray-900">Inspection #</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Product</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Type</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Status</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Batch</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Inspector</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Date</TableHead>
                                    <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
                                                <span>Loading inspections...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : inspections.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                                            No inspections found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    Array.isArray(inspections) && inspections.map((inspection: any) => (
                                        <TableRow key={inspection.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className="font-medium text-green-700">
                                                {inspection.inspectionNumber}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate font-medium">
                                                {inspection.productName || 'N/A'}
                                                {inspection.productCode && (
                                                    <span className="text-gray-500 text-xs ml-1">({inspection.productCode})</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                    {inspection.inspectionType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(inspection.status)}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {inspection.batchNumber || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {inspection.inspectorName || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-gray-500 text-sm">
                                                {inspection.inspectedDate
                                                    ? format(new Date(inspection.inspectedDate), 'MMM dd, yyyy')
                                                    : format(new Date(inspection.createdAt), 'MMM dd, yyyy')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreVertical className="h-4 w-4 text-gray-500" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-white border-gray-200">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() => router.push(`/dashboard/quality-control/inspections/${inspection.id}`)}
                                                            className="cursor-pointer"
                                                        >
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => router.push(`/dashboard/quality-control/inspections/${inspection.id}?edit=true`)}
                                                            className="cursor-pointer"
                                                        >
                                                            Edit
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
