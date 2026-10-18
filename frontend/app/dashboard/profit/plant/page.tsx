'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Calendar, Factory, TrendingUp, DollarSign } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { usePlantProfit } from '@/hooks/useProfitability'

export default function PlantProfitPage() {
    const [period, setPeriod] = useState('this_month')

    const { data: plantData, isLoading, error } = usePlantProfit(period)

    const totalRevenue = useMemo(() => {
        return plantData?.reduce((sum, plant) => sum + (plant.revenue || 0), 0) || 0
    }, [plantData])

    const totalCost = useMemo(() => {
        return plantData?.reduce((sum, plant) => sum + (plant.cost || 0), 0) || 0
    }, [plantData])

    const totalProfit = useMemo(() => {
        return plantData?.reduce((sum, plant) => sum + (plant.profit || 0), 0) || 0
    }, [plantData])

    const totalOrders = useMemo(() => {
        return plantData?.reduce((sum, plant) => sum + (plant.orderCount || 0), 0) || 0
    }, [plantData])

    if (isLoading) {
        return (
            <ProtectedRoute>
                <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                    <div className="p-8 text-center text-gray-500">Loading plant profit data...</div>
                </div>
            </ProtectedRoute>
        )
    }

    if (error) {
        return (
            <ProtectedRoute>
                <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                    <div className="p-8 text-center text-red-500">
                        <h2 className="text-xl font-semibold mb-2">Error loading plant profit data</h2>
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
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Plant Profit</h2>
                        <p className="text-gray-500">Profitability analysis by manufacturing plant</p>
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
                            <p className="text-xs text-gray-500 mt-1">{plantData?.length || 0} plants</p>
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
                            <CardTitle className="text-sm font-medium text-gray-500">Total Orders</CardTitle>
                            <Factory className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
                            <p className="text-xs text-gray-500 mt-1">Production orders</p>
                        </CardContent>
                    </Card>
                </div>

                {plantData && plantData.length > 0 ? (
                    <>
                        <Card className="bg-white shadow-sm border-gray-200">
                            <CardHeader>
                                <CardTitle>Plant Profit Comparison</CardTitle>
                                <CardDescription>Profit by manufacturing plant</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={plantData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="plantName" tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={100} />
                                            <YAxis tickFormatter={(value) => `$${value / 1000}k`} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                formatter={(value?: number) => [value ? `$${Number(value).toLocaleString()}` : '$0', '']}
                                                cursor={{ fill: 'transparent' }}
                                            />
                                            <Legend />
                                            <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="cost" name="Cost" fill="#dc2626" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="profit" name="Profit" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white shadow-sm border-gray-200">
                            <CardHeader>
                                <CardTitle>Plant Profit Details</CardTitle>
                                <CardDescription>Detailed breakdown by plant</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="font-semibold">Plant</TableHead>
                                                <TableHead className="font-semibold">Code</TableHead>
                                                <TableHead className="text-right font-semibold">Revenue</TableHead>
                                                <TableHead className="text-right font-semibold">Cost</TableHead>
                                                <TableHead className="text-right font-semibold">Profit</TableHead>
                                                <TableHead className="text-right font-semibold">Margin</TableHead>
                                                <TableHead className="text-right font-semibold">Orders</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {plantData.map((plant, index) => (
                                                <TableRow key={plant.plantId || index}>
                                                    <TableCell className="font-medium">{plant.plantName || 'N/A'}</TableCell>
                                                    <TableCell className="text-gray-500">{plant.plantCode || 'N/A'}</TableCell>
                                                    <TableCell className="text-right">${plant.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                    <TableCell className="text-right">${plant.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                    <TableCell className={`text-right font-semibold ${plant.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        ${plant.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline" className={plant.margin >= 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                                                            {plant.margin.toFixed(1)}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">{plant.orderCount || 0}</TableCell>
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
                                <Factory className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="mt-2 text-sm font-semibold text-gray-900">No Data Available</h3>
                            <p className="mt-1 text-sm text-gray-500">No plant profit data found for the selected period.</p>
                        </CardContent>
                    </Card>
                    )}
            </div>
        </ProtectedRoute>
    )
}
