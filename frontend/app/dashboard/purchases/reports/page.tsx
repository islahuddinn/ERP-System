'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/currency'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  BarChart3, 
  Download, 
  FileText, 
  ArrowLeft,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  Users
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { usePurchaseReports, useMonthlyComparison, useExportReports } from '@/hooks/usePurchaseReports'

interface PurchaseReport {
  summary: {
    totalOrders: number
    totalValue: number
    totalItems: number
    averageOrderValue: number
  }
  topProducts: Array<{
    product: {
      id: string
      name: string
      sku: string
    }
    totalQuantity: number
    totalValue: number
    orderCount: number
  }>
  topSuppliers: Array<{
    supplier: {
      id: string
      name: string
    }
    totalValue: number
    orderCount: number
  }>
  purchaseOrders: Array<{
    id: string
    orderNumber: string
    supplier: {
      name: string
    }
    orderDate: string
    totalAmount: number
    status: string
  }>
}

interface MonthlyComparison {
  monthlyPurchases: Array<{
    month: string
    purchase_orders: number
    purchase_value: number
  }>
  monthlyReturns: Array<{
    month: string
    return_orders: number
    return_value: number
  }>
}

export default function PurchaseReportsPage() {
  const router = useRouter()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [productId, setProductId] = useState('')
  const [status, setStatus] = useState('')

  // Fetch suppliers for filter
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async (): Promise<{ data: Array<{ id: string; name: string }> }> => {
      const response = await apiClient.get('/suppliers')
      return response.data
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch products for filter
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<{ data: Array<{ id: string; name: string; sku: string }> }> => {
      const response = await apiClient.get('/product-management/products')
      return response.data
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch purchase reports
  const { data: reports, isLoading: reportsLoading } = usePurchaseReports({ 
    startDate, 
    endDate, 
    supplierId: supplierId === 'all' ? undefined : supplierId, 
    productId: productId === 'all' ? undefined : productId, 
    status: status === 'all' ? undefined : status 
  })

  // Fetch monthly comparison
  const { data: monthlyComparison, isLoading: comparisonLoading } = useMonthlyComparison({ 
    startDate, 
    endDate 
  })

  // Export mutation
  const exportMutation = useExportReports()

  const handleExport = (format: 'csv' | 'pdf') => {
    exportMutation.mutate({
      format,
      params: { 
        startDate, 
        endDate, 
        supplierId: supplierId === 'all' ? undefined : supplierId, 
        productId: productId === 'all' ? undefined : productId, 
        status: status === 'all' ? undefined : status 
      }
    })
  }

  if (reportsLoading || comparisonLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">Purchase Reports</h1>
          <p className="text-gray-400">Comprehensive analytics and insights for your purchases</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <Input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers?.data?.map((supplier: any) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products?.data?.map((product: any) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => handleExport('csv')}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() => handleExport('pdf')}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-white" />
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Total Orders</p>
                <p className="text-2xl font-semibold text-white">
                  {reports?.summary?.totalOrders || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-600 to-green-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-white" />
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Total Value</p>
                <p className="text-2xl font-semibold text-white">
                  {formatCurrency(reports?.summary?.totalValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-600 to-purple-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-white" />
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-100">Total Items</p>
                <p className="text-2xl font-semibold text-white">
                  {reports?.summary?.totalItems || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-600 to-orange-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-white" />
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-100">Avg Order Value</p>
                <p className="text-2xl font-semibold text-white">
                  {formatCurrency(reports?.summary?.averageOrderValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Top Purchased Products</CardTitle>
            <CardDescription className="text-gray-400">
              Products by purchase value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports?.topProducts?.slice(0, 10).map((product: any, index: number) => (
                <div key={product.product.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-400 font-semibold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{product.product.name}</p>
                      <p className="text-gray-400 text-sm">{product.product.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                  <p className="text-white font-semibold">{formatCurrency(product.totalValue)}</p>
                    <p className="text-gray-400 text-sm">{product.totalQuantity} units</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Top Suppliers</CardTitle>
            <CardDescription className="text-gray-400">
              Suppliers by purchase value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports?.topSuppliers?.slice(0, 10).map((supplier: any, index: number) => (
                <div key={supplier.supplier.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mr-3">
                      <span className="text-green-400 font-semibold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{supplier.supplier.name}</p>
                      <p className="text-gray-400 text-sm">{supplier.orderCount} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                  <p className="text-white font-semibold">{formatCurrency(supplier.totalValue)}</p>
                    <p className="text-gray-400 text-sm">Total Value</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparison Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Monthly Purchase vs Return Comparison</CardTitle>
          <CardDescription className="text-gray-400">
            Purchase and return trends over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-700/30 rounded-lg">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Chart visualization would go here</p>
              <p className="text-gray-500 text-sm">Integration with Chart.js or similar library</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Purchase Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Recent Purchase Orders</CardTitle>
          <CardDescription className="text-gray-400">
            Latest purchase orders in the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Order #</TableHead>
                  <TableHead className="text-gray-300">Supplier</TableHead>
                  <TableHead className="text-gray-300">Date</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports?.purchaseOrders?.slice(0, 10).map((order: any) => (
                  <TableRow key={order.id} className="border-gray-700 hover:bg-gray-700/50">
                    <TableCell className="text-white font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell className="text-gray-300">
                    {order.supplier?.name || 'Unknown Supplier'}
                    </TableCell>
                    <TableCell className="text-gray-300">
                    {order.orderDate ? format(new Date(order.orderDate), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-300">
                    {order.status || 'N/A'}
                    </TableCell>
                    <TableCell className="text-white font-medium">
                    {formatCurrency(order.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
