'use client'

import { useState } from 'react'
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
  Package, 
  TrendingUp, 
  Users, 
  DollarSign,
  Calendar,
  BarChart3,
  Plus,
  Eye,
  RotateCcw,
  FileText,
  Download
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { usePurchaseSummary, useMonthlyTrends, useTopSuppliers } from '@/hooks/usePurchaseReports'
import { formatCurrency } from '@/lib/currency'

interface PurchaseSummary {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  totalValue: number
  totalValueMonth: number
  totalValueYear: number
  topSuppliers: Array<{
    id: string
    name: string
    totalValue: number
    orderCount: number
  }>
}

interface MonthlyTrend {
  month: string
  total_orders: number
  total_value: number
}

export default function PurchaseDashboardPage() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState('thisMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const getDateRange = () => {
    const now = new Date()
    switch (dateRange) {
      case 'thisMonth':
        return {
          startDate: format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd')
        }
      case 'thisYear':
        return {
          startDate: format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd')
        }
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return {
          startDate: format(lastMonth, 'yyyy-MM-dd'),
          endDate: format(new Date(now.getFullYear(), now.getMonth(), 0), 'yyyy-MM-dd')
        }
      case 'custom':
        return {
          startDate: customStartDate,
          endDate: customEndDate
        }
      default:
        return {}
    }
  }

  const dateParams = getDateRange()

  // Fetch purchase summary
  const { data: summary, isLoading: summaryLoading } = usePurchaseSummary(dateParams)

  // Fetch monthly trends
  const { data: monthlyTrends, isLoading: trendsLoading } = useMonthlyTrends(dateParams)

  if (summaryLoading || trendsLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  const stats = [
    {
      name: 'Total Orders',
      value: summary?.totalOrders || 0,
      icon: Package,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-400/30',
      gradient: 'from-blue-500/20 to-blue-600/20',
    },
    {
      name: 'Pending Orders',
      value: summary?.pendingOrders || 0,
      icon: Calendar,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-400/30',
      gradient: 'from-yellow-500/20 to-yellow-600/20',
    },
    {
      name: 'Completed Orders',
      value: summary?.completedOrders || 0,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-400/30',
      gradient: 'from-green-500/20 to-green-600/20',
    },
    {
      name: 'Total Value',
      value: formatCurrency(summary?.totalValue || 0),
      icon: DollarSign,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-400/30',
      gradient: 'from-purple-500/20 to-purple-600/20',
    },
    {
      name: 'This Month',
      value: formatCurrency(summary?.totalValueMonth || 0),
      icon: Calendar,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-400/30',
      gradient: 'from-emerald-500/20 to-emerald-600/20',
    },
    {
      name: 'This Year',
      value: formatCurrency(summary?.totalValueYear || 0),
      icon: BarChart3,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-400/30',
      gradient: 'from-orange-500/20 to-orange-600/20',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Purchase Dashboard</h1>
          <p className="text-gray-400">Overview of your purchase operations and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/dashboard/purchases/create')}>
            <Plus className="h-4 w-4 mr-2" />
            New Purchase
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateRange === 'custom' && (
              <>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Start Date"
                />
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="End Date"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-sm font-medium text-gray-300">{stat.name}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              {summary?.topSuppliers?.map((supplier: any, index: number) => (
                <div key={supplier.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-400 font-semibold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{supplier.name}</p>
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

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-gray-400">
              Common purchase operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => router.push('/dashboard/purchases/create')}
                className="bg-blue-600 hover:bg-blue-700 text-white h-12"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Purchase
              </Button>
              <Button 
                onClick={() => router.push('/dashboard/purchases')}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700 h-12"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Orders
              </Button>
              <Button 
                onClick={() => router.push('/dashboard/purchases/returns')}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700 h-12"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Returns
              </Button>
              <Button 
                onClick={() => router.push('/dashboard/purchases/reports')}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700 h-12"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Monthly Purchase Trends</CardTitle>
          <CardDescription className="text-gray-400">
            Purchase value over time
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
    </div>
  )
}
