'use client'

import { useRouter } from 'next/navigation'
import { DollarSign, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useBrokers } from '@/hooks/useBrokers'
import { formatCurrency } from '@/lib/currency'

export default function BrokerCommissionsPage() {
    const router = useRouter()
    const { data: brokers, isLoading } = useBrokers({ status: 'ACTIVE', limit: 100 })

    return (
        <ProtectedRoute>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/brokers')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Broker Commissions</h2>
                        <p className="text-gray-500">Configured commission rates. Sales are not attributed to brokers yet.</p>
                    </div>
                </div>

                <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                        <CardTitle className="text-amber-900">Commission posting is not live</CardTitle>
                        <CardDescription className="text-amber-800">
                            POS and shop sales do not store a broker on the sale, so there are no commission
                            records to approve or pay. Rates below come from each broker&apos;s master record.
                        </CardDescription>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Configured rates</CardTitle>
                        <CardDescription>Active brokers and the commission rate / sales target on their profile.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Broker</TableHead>
                                            <TableHead>Code</TableHead>
                                            <TableHead>Commission rate</TableHead>
                                            <TableHead>Sales target</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {!brokers || brokers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                                    No active brokers. Add a broker first.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            brokers.map((broker: { id: string; name: string; brokerCode?: string; commissionRate?: number; salesTarget?: number }) => (
                                                <TableRow key={broker.id}>
                                                    <TableCell className="font-medium">{broker.name}</TableCell>
                                                    <TableCell>{broker.brokerCode || '—'}</TableCell>
                                                    <TableCell>{Number(broker.commissionRate ?? 0)}%</TableCell>
                                                    <TableCell>{formatCurrency(Number(broker.salesTarget ?? 0))}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => router.push(`/dashboard/brokers/${broker.id}`)}
                                                        >
                                                            <DollarSign className="mr-1 h-3 w-3" /> View broker
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    )
}
