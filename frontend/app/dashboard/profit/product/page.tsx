'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Calendar, Package, TrendingUp, DollarSign } from 'lucide-react'
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
import { useProductProfit } from '@/hooks/useProfitability'
import { usePlants } from '@/hooks/usePlants'

export default function ProductProfitPage() {
    const [period, setPeriod] = useState('this_month')
    const [plantFilter, setPlantFilter] = useState<string>('all')

    const { data: plantsData } = usePlants({ limit: 100, status: 'ACTIVE' })
    const plants = useMemo(() => {
        const data = plantsData?.data || plantsData
        return Array.isArray(data) ? data : []
    }, [plantsData])

    const { data: productData, isLoading, error } = useProductProfit(period, {
        plantId: plantFilter !== 'all' ? plantFilter : undefined,
    })

    const totalRevenue = useMemo(() => {
        return productData?.reduce((sum, product) => sum + (product.revenue || 0), 0) || 0
    }, [productData])

    const totalCost = useMemo(() => {
        return productData?.reduce((sum, product) => sum + (product.cost || 0), 0) || 0
    }, [productData])

    const totalProfit = useMemo(() => {
        return productData?.reduce((sum, product) => sum + (product.profit || 0), 0) || 0
    }, [productData])

    const topProducts = useMemo(() => {
        return productData?.slice(0, 10) || []
    }, [productData])

    if (isLoading) {
        return (
            <ProtectedRoute>
                <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                    <div className="p-8 text-center text-gray-500">Loading product profit data...</div>
                </div>
            </ProtectedRoute>
        )
    }

    if (error) {
        return (
            <ProtectedRoute>
                <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                    <div className="p-8 text-center text-red-500">
                        <h2 className="text-xl font-semibold mb-2">Error loading product profit data</h2>
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
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Product Profit</h2>
                        <p className="text-gray-500">Profitability analysis by product line</p>
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
                            <p className="text-xs text-gray-500 mt-1">{productData?.length || 0} products</p>
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
                            <CardTitle className="text-sm font-medium text-gray-500">Top Products</CardTitle>
                            <Package className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">{topProducts.length}</div>
                            <p className="text-xs text-gray-500 mt-1">Highest profit</p>
                        </CardContent>
                    </Card>
                </div>

                {productData && productData.length > 0 ? (
                    <>
                        <Card className="bg-white shadow-sm border-gray-200">
                            <CardHeader>
                                <CardTitle>Top Products by Profit</CardTitle>
                                <CardDescription>Top 10 products ranked by profit</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topProducts} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" tickFormatter={(value) => `$${value / 1000}k`} />
                                            <YAxis dataKey="productName" type="category" width={150} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                formatter={(value?: number) => [value ? `$${Number(value).toLocaleString()}` : '$0', 'Profit']}
                                                cursor={{ fill: 'transparent' }}
                                            />
                                            <Bar dataKey="profit" name="Profit" fill="#2563eb" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white shadow-sm border-gray-200">
                            <CardHeader>
                                <CardTitle>Product Profit Details</CardTitle>
                                <CardDescription>Detailed breakdown by product</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="font-semibold">Product</TableHead>
                                                <TableHead className="font-semibold">SKU</TableHead>
                                                <TableHead className="text-right font-semibold">Revenue</TableHead>
                                                <TableHead className="text-right font-semibold">Cost</TableHead>
                                                <TableHead className="text-right font-semibold">Profit</TableHead>
                                                <TableHead className="text-right font-semibold">Margin</TableHead>
                                                <TableHead className="text-right font-semibold">Quantity</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {productData.map((product, index) => (
                                                <TableRow key={product.productId || index}>
                                                    <TableCell className="font-medium">{product.productName || 'N/A'}</TableCell>
                                                    <TableCell className="text-gray-500">{product.productSku || 'N/A'}</TableCell>
                                                    <TableCell className="text-right">${product.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                    <TableCell className="text-right">${product.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                    <TableCell className={`text-right font-semibold ${product.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        ${product.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline" className={product.margin >= 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                                                            {product.margin.toFixed(1)}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">{product.quantity || 0}</TableCell>
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
                                <Package className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="mt-2 text-sm font-semibold text-gray-900">No Data Available</h3>
                            <p className="mt-1 text-sm text-gray-500">No product profit data found for the selected period.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </ProtectedRoute>
    )
}
