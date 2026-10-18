'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit, Mail, Phone, MapPin, Target, PackageSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useBroker } from '@/hooks/useBrokers'
import { formatCurrency } from '@/lib/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

function getStatusBadge(status: string) {
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

export default function BrokerDetailsPage() {
    const params = useParams()
    const id = params?.id as string
    const router = useRouter()
    const { data: broker, isLoading } = useBroker(id)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        )
    }

    if (!broker) {
        return (
            <div className="p-8 text-center text-gray-500">
                Broker not found
            </div>
        )
    }

    const territories = Array.isArray(broker.brokerTerritories) ? broker.brokerTerritories : []
    const products = Array.isArray(broker.brokerProducts) ? broker.brokerProducts : []

    return (
        <ProtectedRoute>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">{broker.name}</h2>
                        <p className="text-sm text-gray-500 font-mono">{broker.brokerCode}</p>
                    </div>
                    <Button
                        onClick={() => router.push(`/dashboard/brokers/${broker.id}/edit`)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main info */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="bg-white border-gray-200">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Broker Information</span>
                                    {getStatusBadge(broker.status)}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Broker Code</p>
                                        <p className="font-mono text-gray-900">{broker.brokerCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Territory / Zone</p>
                                        <p className="text-gray-900 flex items-center gap-1">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                            {broker.zone?.name || 'No primary zone'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Commission Rate</p>
                                        <p className="font-semibold text-gray-900 flex items-center gap-1">
                                            <Target className="h-4 w-4 text-green-500" />
                                            {Number(broker.commissionRate || 0)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Monthly Sales Target</p>
                                        <p className="font-semibold text-gray-900">
                                            {formatCurrency(Number(broker.salesTarget || 0))}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-500">Contact</p>
                                        {broker.email && (
                                            <p className="flex items-center gap-2 text-gray-900 text-sm">
                                                <Mail className="h-4 w-4 text-gray-400" />
                                                {broker.email}
                                            </p>
                                        )}
                                        {broker.phone && (
                                            <p className="flex items-center gap-2 text-gray-900 text-sm">
                                                <Phone className="h-4 w-4 text-gray-400" />
                                                {broker.phone}
                                            </p>
                                        )}
                                    </div>
                                    {broker.address && (
                                        <div>
                                            <p className="text-sm text-gray-500">Address</p>
                                            <p className="text-gray-900 text-sm whitespace-pre-line">
                                                {broker.address}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Territories */}
                        <Card className="bg-white border-gray-200">
                            <CardHeader>
                                <CardTitle>Assigned Territories</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {territories.length === 0 ? (
                                    <p className="text-sm text-gray-500">No territories assigned.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Area</TableHead>
                                                <TableHead>City</TableHead>
                                                <TableHead>Region</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {territories.map((t: any) => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="font-medium text-gray-900">
                                                        {t.areaName}
                                                    </TableCell>
                                                    <TableCell className="text-gray-700">
                                                        {t.city || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-gray-700">
                                                        {t.region || '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Side panel: products & stats */}
                    <div className="space-y-6">
                        <Card className="bg-white border-gray-200">
                            <CardHeader>
                                <CardTitle>Quick Stats</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-gray-700">
                                <div className="flex items-center justify-between">
                                    <span>Total Sales</span>
                                    <span className="font-semibold">
                                        {broker._count?.sales ?? 0}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Commission Records</span>
                                    <span className="font-semibold">
                                        {broker._count?.commissions ?? 0}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-gray-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PackageSearch className="h-4 w-4 text-gray-500" />
                                    <span>Assigned Products</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {products.length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                        No products assigned. Use the broker list actions to assign products.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {products.slice(0, 5).map((bp: any) => (
                                            <div
                                                key={bp.id}
                                                className="flex items-center justify-between text-sm border-b last:border-b-0 py-1"
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {bp.product?.name || bp.category?.name || 'Unnamed'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {bp.product?.sku && `SKU: ${bp.product.sku}`}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Commission</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {bp.commissionRate != null
                                                            ? `${Number(bp.commissionRate)}%`
                                                            : `${Number(broker.commissionRate || 0)}%`}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {products.length > 5 && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                +{products.length - 5} more products
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}
