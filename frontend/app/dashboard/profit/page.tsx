'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { TrendingUp, DollarSign, Activity, PieChart, Calendar } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProfitability } from '@/hooks/useProfitability'
import { usePlants } from '@/hooks/usePlants'
import { useMemo } from 'react'

export default function ProfitOverviewPage() {
    const [period, setPeriod] = useState('this_month')
    const [plantFilter, setPlantFilter] = useState<string>('all')

    const { data: plantsData } = usePlants({ limit: 100, status: 'ACTIVE' })
    const plants = useMemo(() => {
        const data = plantsData?.data || plantsData
        return Array.isArray(data) ? data : []
    }, [plantsData])

    const { data, isLoading, error } = useProfitability(period, {
        plantId: plantFilter !== 'all' ? plantFilter : undefined,
    })

    if (isLoading) {
        return (
            <ProtectedRoute>
                <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                    <div className="p-8 text-center text-gray-500">Loading profit data...</div>
                </div>
            </ProtectedRoute>
        )
    }

    if (error || !data) {
        return (
            <ProtectedRoute>
                <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                    <div className="p-8 text-center text-red-500">
                        <h2 className="text-xl font-semibold mb-2">Error loading profit data</h2>
                        <p>There was an error connecting to the server. Please check your connection and try again.</p>
                    </div>
                </div>
            </ProtectedRoute>
        )
    }

    const totalRevenue = Number(data.totalRevenue || 0)
    const totalCost = Number(data.grossProfit || 0) ? totalRevenue - Number(data.grossProfit || 0) : 0
    const netProfit = Number(data.netProfit || 0)
    const profitMargin = Number(data.margin || 0)

    return (
        <ProtectedRoute>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Profit Overview</h2>
                        <p className="text-gray-500">Business intelligence and profitability measurement</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[180px] bg-white">
                                <Calendar className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Select Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="this_month">This Month</SelectItem>
                                <SelectItem value="last_month">Last Month</SelectItem>
                                <SelectItem value="this_quarter">This Quarter</SelectItem>
                                <SelectItem value="this_year">This Year</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={plantFilter} onValueChange={setPlantFilter}>
                            <SelectTrigger className="w-[180px] bg-white">
                                <SelectValue placeholder="All Plants" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Plants</SelectItem>
                                {plants.map((plant: any) => (
                                    <SelectItem key={plant.id} value={plant.id}>
                                        {plant.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-white shadow-sm border-gray-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">
                                ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-green-600 flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Revenue from sales
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white shadow-sm border-gray-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Total Cost</CardTitle>
                            <Activity className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">
                                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Includes COGS & OpEx</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white shadow-sm border-gray-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Net Profit</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Revenue - Total Cost</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white shadow-sm border-gray-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Profit Margin</CardTitle>
                            <PieChart className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                {profitMargin.toFixed(1)}%
                            </div>
                            <p className="text-xs text-green-600 mt-1">Target: 20%</p>
                        </CardContent>
                    </Card>
                </div>

                {data.monthlyComparison && data.monthlyComparison.length > 0 && (
                    <Card className="bg-white shadow-sm border-gray-200">
                        <CardHeader>
                            <CardTitle>Monthly Comparison</CardTitle>
                            <CardDescription>Revenue vs Costs over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {data.monthlyComparison.map((month, index) => {
                                    const monthProfit = month.sales - month.cost
                                    const monthMargin = month.sales > 0 ? (monthProfit / month.sales) * 100 : 0
                                    return (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">{month.month}</div>
                                                <div className="text-sm text-gray-500">
                                                    Revenue: ${month.sales.toLocaleString()} | Cost: ${month.cost.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-semibold ${monthProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    ${monthProfit.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-gray-500">{monthMargin.toFixed(1)}% margin</div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {data.productMargins && data.productMargins.length > 0 && (
                    <Card className="bg-white shadow-sm border-gray-200">
                        <CardHeader>
                            <CardTitle>Top Product Margins</CardTitle>
                            <CardDescription>Highest profitability products</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data.productMargins.slice(0, 5).map((product, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{product.name}</div>
                                            <div className="text-sm text-gray-500">
                                                Cost: ${product.cost.toFixed(2)} | Price: ${product.price.toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-semibold ${product.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {product.margin.toFixed(1)}%
                                            </div>
                                            <div className="text-xs text-gray-500">${product.profit.toFixed(2)} profit</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </ProtectedRoute>
    )
}
