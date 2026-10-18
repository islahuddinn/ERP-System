'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/ui/confirm-provider'
import { formatCurrency } from '@/lib/currency'
import {
    Plus,
    Search,
    MoreVertical,
    Users,
    Edit,
    Trash2,
    Target,
    DollarSign,
    MapPin,
    Phone,
    Mail,
    TrendingUp
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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useBrokers, useDeleteBroker } from '@/hooks/useBrokers'
import { toast } from 'react-hot-toast'

export default function BrokersPage() {
    const router = useRouter()
    const confirm = useConfirm()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const { data: brokers, isLoading, refetch } = useBrokers({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
    })

    const deleteBrokerMutation = useDeleteBroker()

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
            case 'INACTIVE':
                return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Inactive</Badge>
            case 'SUSPENDED':
                return <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>
            default:
                return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{status}</Badge>
        }
    }

    const handleDelete = async (broker: any) => {
        if (!broker?.id) return

        if (!(await confirm({ title: 'Delete Broker', description: `Are you sure you want to delete broker "${broker.name}"?`, confirmLabel: 'Delete' }))) {
            return
        }

        try {
            await deleteBrokerMutation.mutateAsync(broker.id)
            toast.success('Broker deleted successfully')
            await refetch()
        } catch (error: any) {
            console.error('Error deleting broker:', error)
            const message = error?.response?.data?.message || 'Failed to delete broker'
            toast.error(Array.isArray(message) ? message[0] : message)
        }
    }

    return (
        <ProtectedRoute>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Brokers</h2>
                        <p className="text-gray-500">Manage broker accounts, territories, and commissions.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => router.push('/dashboard/brokers/commissions')}
                            variant="outline"
                            className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                            <DollarSign className="mr-2 h-4 w-4" /> Commissions
                        </Button>
                        <Button
                            onClick={() => router.push('/dashboard/brokers/performance')}
                            variant="outline"
                            className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                            <TrendingUp className="mr-2 h-4 w-4" /> Performance
                        </Button>
                        <Button
                            onClick={() => router.push('/dashboard/brokers/create')}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Broker
                        </Button>
                    </div>
                </div>

                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex flex-1 items-center gap-2 max-w-sm">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder="Search brokers..."
                                        className="pl-8 bg-gray-50 border-gray-200"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-500">Status:</span>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[150px] bg-white border-gray-200">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border border-gray-200 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="font-semibold text-gray-900">Code</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Name</TableHead>
                                        <TableHead className="font-semibold text-gray-900 text-center">Status</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Territory</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Contact</TableHead>
                                        <TableHead className="font-semibold text-gray-900 text-right">Commission</TableHead>
                                        <TableHead className="font-semibold text-gray-900 text-right">Sales Target</TableHead>
                                        <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
                                                    <span className="text-gray-500">Loading brokers...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : !Array.isArray(brokers) || brokers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                                                No brokers found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        brokers.map((broker: any) => (
                                            <TableRow key={broker.id} className="hover:bg-gray-50 transition-colors">
                                                <TableCell className="font-medium text-gray-700">
                                                    {broker.brokerCode}
                                                </TableCell>
                                                <TableCell className="font-medium text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-gray-400" />
                                                        {broker.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {getStatusBadge(broker.status)}
                                                </TableCell>
                                                <TableCell className="text-gray-600">
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <MapPin className="h-3 w-3" />
                                                        {broker.areaId || (broker.brokerTerritories?.length > 0
                                                            ? broker.brokerTerritories[0].areaName
                                                            : 'No territory')}
                                                        {broker.brokerTerritories?.length > 1 && (
                                                            <span className="text-gray-400">+{broker.brokerTerritories.length - 1}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-600">
                                                    <div className="flex flex-col text-sm">
                                                        {broker.email && (
                                                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {broker.email}</span>
                                                        )}
                                                        {broker.phone && (
                                                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {broker.phone}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-green-600">
                                                    {broker.commissionRate}%
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-gray-700">
                                                    {formatCurrency(Number(broker.salesTarget || 0))}
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
                                                                className="cursor-pointer"
                                                                onClick={() => router.push(`/dashboard/brokers/${broker.id}`)}
                                                            >
                                                                <Target className="mr-2 h-4 w-4" /> View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="cursor-pointer"
                                                                onClick={() => router.push(`/dashboard/brokers/performance?brokerId=${broker.id}`)}
                                                            >
                                                                <TrendingUp className="mr-2 h-4 w-4" /> Performance
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="cursor-pointer"
                                                                onClick={() => router.push(`/dashboard/brokers/commissions?brokerId=${broker.id}`)}
                                                            >
                                                                <DollarSign className="mr-2 h-4 w-4" /> Commissions
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="cursor-pointer"
                                                                onClick={() => router.push(`/dashboard/brokers/${broker.id}/edit`)}
                                                            >
                                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                                                                onClick={() => handleDelete(broker)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
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
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    )
}
