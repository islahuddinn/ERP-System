'use client'

import { Trash2, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWasteManagement, WasteType, WasteRecord } from '@/hooks/useWasteManagement'
import { formatCurrency } from '@/lib/currency'

export default function WasteByTypePage() {
    const { data: wasteData } = useWasteManagement({ limit: 1000 })
    const wasteRecords: WasteRecord[] = (wasteData as any)?.data ?? []

    const wasteByType = wasteRecords.reduce((acc: any, record: WasteRecord) => {
        const type = record.wasteType || 'OTHER'
        if (!acc[type]) {
            acc[type] = {
                count: 0,
                totalQuantity: 0,
                totalCost: 0,
                records: []
            }
        }
        acc[type].count++
        acc[type].totalQuantity += record.quantity || 0
        acc[type].totalCost += record.cost != null ? Number(record.cost) : 0
        acc[type].records.push(record)
        return acc
    }, {})

    const getWasteTypeBadge = (type: WasteType) => {
        const styles: Record<WasteType, { className: string; label: string }> = {
            PRODUCTION: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Production' },
            QUALITY_REJECT: { className: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Quality Reject' },
            EXPIRY: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Expiry' },
            DAMAGE: { className: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Damage' },
            SPOILAGE: { className: 'bg-pink-100 text-pink-700 border-pink-200', label: 'Spoilage' },
            OTHER: { className: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Other' },
        }
        const style = styles[type] || styles.OTHER
        return <Badge className={`${style.className}`}>{style.label}</Badge>
    }

    const wasteTypes: WasteType[] = ['PRODUCTION', 'QUALITY_REJECT', 'EXPIRY', 'DAMAGE', 'SPOILAGE', 'OTHER']

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Waste by Type</h2>
                    <p className="text-gray-500">Analyze waste records grouped by type.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wasteTypes.map((type) => {
                    const stats = (wasteByType as any)[type] || { count: 0, totalQuantity: 0, totalCost: 0, records: [] }
                    return (
                        <Card key={type} className="bg-white border-gray-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    {getWasteTypeBadge(type)}
                                    <TrendingUp className="h-5 w-5 text-gray-400" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-sm text-gray-500">Total Records</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Quantity</p>
                                    <p className="text-xl font-semibold text-gray-900">{stats.totalQuantity.toFixed(2)}</p>
                                </div>
                                {stats.totalCost > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-500">Total Cost</p>
                                        <p className="text-xl font-semibold text-red-600">{formatCurrency(stats.totalCost)}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                        <Trash2 className="h-5 w-5 text-red-600" />
                        Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Total Records</p>
                            <p className="text-2xl font-bold text-gray-900">{wasteRecords.length}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Quantity</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {wasteRecords.reduce((sum: number, r: WasteRecord) => sum + (r.quantity || 0), 0).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Cost</p>
                            <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(wasteRecords.reduce((sum: number, r: WasteRecord) => sum + (r.cost != null ? Number(r.cost) : 0), 0))}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

