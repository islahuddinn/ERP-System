'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useBrokerPerformance, useBrokers } from '@/hooks/useBrokers'
import { formatCurrency } from '@/lib/currency'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

export default function BrokerPerformancePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryBrokerId = searchParams.get('brokerId')

    const [selectedBrokerId, setSelectedBrokerId] = useState<string>(queryBrokerId || '')
    const { data: brokers, isLoading: brokersLoading } = useBrokers({ status: 'ACTIVE', limit: 100 })
    const { data: performance, isLoading: performanceLoading } = useBrokerPerformance(selectedBrokerId)

    const selectedBroker = useMemo(
        () => brokers?.find((broker: { id: string }) => broker.id === selectedBrokerId),
        [brokers, selectedBrokerId],
    )

    const commissionRate = Number(performance?.broker?.commissionRate ?? selectedBroker?.commissionRate ?? 0)
    const salesTarget = Number(performance?.salesTarget ?? selectedBroker?.salesTarget ?? 0)
    const achievement = Number(performance?.achievement ?? 0)
    const totalSales = Number(performance?.totalSales ?? 0)
    const salesCount = Number(performance?.salesCount ?? 0)
    const totalCommission = Number(performance?.totalCommission ?? 0)
    const paidCommission = Number(performance?.paidCommission ?? 0)
    const pendingCommission = Number(performance?.pendingCommission ?? 0)

    const stats = [
        {
            title: 'Attributed sales',
            value: formatCurrency(totalSales),
            description: `${salesCount} orders linked to this broker`,
            icon: BarChart3,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            title: 'Commission earned',
            value: formatCurrency(totalCommission),
            description: `${formatCurrency(paidCommission)} paid`,
            icon: DollarSign,
            color: 'text-green-600',
            bg: 'bg-green-50',
        },
        {
            title: 'Target achievement',
            value: `${achievement.toFixed(1)}%`,
            description: `Target: ${formatCurrency(salesTarget)} · rate ${commissionRate}%`,
            icon: Target,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
        },
        {
            title: 'Pending payout',
            value: formatCurrency(pendingCommission),
            description: 'No commission ledger until sales store a broker',
            icon: TrendingUp,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
        },
    ]

    return (
        <ProtectedRoute>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/brokers')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Broker Performance</h2>
                            <p className="text-gray-500">Rate and target from the broker record. Sales are not attributed yet.</p>
                        </div>
                    </div>
                    <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Select a broker" />
                        </SelectTrigger>
                        <SelectContent>
                            {brokers?.map((broker: { id: string; name: string }) => (
                                <SelectItem key={broker.id} value={broker.id}>{broker.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                        <CardTitle className="text-amber-900">Sales are not linked to brokers</CardTitle>
                        <CardDescription className="text-amber-800">
                            POS can send a broker on checkout, but the sale table does not store it.
                            Figures below stay at zero until attribution is added. Commission rate and
                            sales target are the live values from the broker master record.
                        </CardDescription>
                    </CardHeader>
                </Card>

                {brokersLoading || performanceLoading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                ) : !selectedBrokerId ? (
                    <Card className="p-12 text-center text-gray-500">
                        Select a broker to view their configured rate and target.
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {stats.map((stat) => (
                            <Card key={stat.title}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                                    <div className={`p-2 rounded-full ${stat.bg}`}>
                                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stat.value}</div>
                                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    )
}
