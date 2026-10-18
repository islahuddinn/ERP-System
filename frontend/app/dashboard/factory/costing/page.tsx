'use client'

import { useState } from 'react'
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart,
    Calendar
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCostDashboard } from '@/hooks/useCosting'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart as RePieChart,
    Pie,
    Cell,
    Legend
} from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function CostingDashboardPage() {
    const [period, setPeriod] = useState('this_month')
    const { data, isLoading, error } = useCostDashboard(period)

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading costing data...</div>
    }

    if (error || !data) {
        return (
            <div className="p-8 text-center text-red-500">
                <h2 className="text-xl font-semibold mb-2">Error loading costing data</h2>
                <p>There was an error connecting to the server. Please check your connection and try again.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg"
                >
                    Retry
                </button>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Costing Dashboard</h2>
                    <p className="text-gray-500">Real-time analysis of production costs and overheads.</p>
                </div>
                <div className="flex items-center gap-2">
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
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white shadow-sm border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Production Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">${data.totalProductionCost.toLocaleString()}</div>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +2.5% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-sm border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Material Cost</CardTitle>
                        <BarChart3 className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">${data.totalMaterialCost.toLocaleString()}</div>
                        <p className="text-xs text-gray-500 mt-1">58% of total cost</p>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-sm border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Overhead</CardTitle>
                        <PieChart className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">${data.overheadCost.toLocaleString()}</div>
                        <p className="text-xs text-red-600 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +1.2% variance
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-sm border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Avg Cost / Unit</CardTitle>
                        <TrendingDown className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">${data.costPerUnit.toFixed(2)}</div>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            -0.50 from standard
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-white shadow-sm border-gray-200">
                    <CardHeader>
                        <CardTitle>Cost Trends</CardTitle>
                        <CardDescription>Monthly production cost analysis over time</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.monthlyTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                                    <YAxis tickFormatter={(value) => `$${value / 1000}k`} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Cost']}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="cost" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 bg-white shadow-sm border-gray-200">
                    <CardHeader>
                        <CardTitle>Cost Breakdown</CardTitle>
                        <CardDescription>Distribution by expense category</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={data.categoryBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.categoryBreakdown.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
