'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Calendar, TrendingUp, DollarSign } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useMonthlyProfit } from '@/hooks/useProfitability'
import { usePlants } from '@/hooks/usePlants'

export default function MonthlyProfitPage() {
    const [period, setPeriod] = useState('this_year')
    const [plantFilter, setPlantFilter] = useState<string>('all')

    const { data: plantsData } = usePlants({ limit: 100, status: 'ACTIVE' })
    const plants = useMemo(() => {
        const data = plantsData?.data || plantsData
        return Array.isArray(data) ? data : []
    }, [plantsData])

    const { data: monthlyData, isLoading, error } = useMonthlyProfit(period, {
        plantId: plantFilter !== 'all' ? plantFilter : undefined,
    })

    const totalRevenue = useMemo(() => {
        return monthlyData?.reduce((sum, month) => sum + (month.revenue || 0), 0) || 0
    }, [monthlyData])

    const totalCost = useMemo(() => {
        return monthlyData?.reduce((sum, month) => sum + (month.cost || 0), 0) || 0
    }, [monthlyData])

    const totalProfit = useMemo(() => {
        return monthlyData?.reduce((sum, month) => sum + (month.profit || 0), 0) || 0
    }, [monthlyData])

    const avgMargin = useMemo(() => {
        if (!monthlyData || monthlyData.length === 0) return 0
        const margins = monthlyData.map(m => m.margin || 0).filter(m => m > 0)
        return margins.length > 0 ? margins.reduce((sum, m) => sum + m, 0) / margins.length : 0
    }, [monthlyData])

    if (isLoading) {
        return (
            <ProtectedRoute>
                <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                    <div className="p-8 text-center text-gray-500">Loading monthly profit data...</div>
                </div>
            </ProtectedRoute>
        )
    }

    if (error) {
        return (
            <ProtectedRoute>
                <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                    <div className="p-8 text-center text-red-500">
                        <h2 className="text-xl font-semibold mb-2">Error loading monthly profit data</h2>
                        <p>There was an error connecting to the server. Please check your connection and try again.</p>
                    </div>
                </div>
            </ProtectedRoute>
        )
    }

    return (
        <ProtectedRoute>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Monthly Profit</h2>
                        <p className="text-gray-500">Month-over-month financial performance</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[180px] bg-white">
                                <Calendar className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Select Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="this_year">This Year</SelectItem>
                                <SelectItem value="last_month">Last Month</SelectItem>
                                <SelectItem value="this_quarter">This Quarter</SelectItem>
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
                        </CardContent>
                    </Card>
                    <Card className="bg-white shadow-sm border-gray-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Total Cost</CardTitle>
                            <DollarSign className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">
                                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white shadow-sm border-gray-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Total Profit</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white shadow-sm border-gray-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Avg Margin</CardTitle>
                            <TrendingUp className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${avgMargin >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                {avgMargin.toFixed(1)}%
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {monthlyData && monthlyData.length > 0 ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card className="bg-white shadow-sm border-gray-200">
                                <CardHeader>
                                    <CardTitle>Revenue vs Cost</CardTitle>
                                    <CardDescription>Monthly comparison</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={monthlyData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                                                <YAxis tickFormatter={(value) => `$${value / 1000}k`} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    formatter={(value?: number) => [value ? `$${Number(value).toLocaleString()}` : '$0', '']}
                                                    cursor={{ fill: 'transparent' }}
                                                />
                                                <Legend />
                                                <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="cost" name="Cost" fill="#dc2626" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white shadow-sm border-gray-200">
                                <CardHeader>
                                    <CardTitle>Profit Trend</CardTitle>
                                    <CardDescription>Monthly profit over time</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={monthlyData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                                                <YAxis tickFormatter={(value) => `$${value / 1000}k`} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    formatter={(value?: number) => [value ? `$${Number(value).toLocaleString()}` : '$0', '']}
                                                    cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                                                />
                                                <Legend />
                                                <Line type="monotone" dataKey="profit" name="Profit" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-white shadow-sm border-gray-200">
                            <CardHeader>
                                <CardTitle>Monthly Profit Details</CardTitle>
                                <CardDescription>Detailed breakdown by month</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="font-semibold">Month</TableHead>
                                                <TableHead className="text-right font-semibold">Revenue</TableHead>
                                                <TableHead className="text-right font-semibold">Cost</TableHead>
                                                <TableHead className="text-right font-semibold">Profit</TableHead>
                                                <TableHead className="text-right font-semibold">Margin</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {monthlyData.map((month, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{month.month}</TableCell>
                                                    <TableCell className="text-right">${month.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                    <TableCell className="text-right">${month.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                    <TableCell className={`text-right font-semibold ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        ${month.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline" className={month.margin >= 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                                                            {month.margin.toFixed(1)}%
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <Card className="bg-white border-gray-200 shadow-sm border-dashed min-h-[400px] flex items-center justify-center">
                        <CardContent className="text-center pt-6">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                <Calendar className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="mt-2 text-sm font-semibold text-gray-900">No Data Available</h3>
                            <p className="mt-1 text-sm text-gray-500">No monthly profit data found for the selected period.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </ProtectedRoute>
    )
}
