'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useTenants, useSubscriptions, usePayments, usePaymentStats } from '@/hooks/useSuperAdmin'
import { formatCurrency } from '@/lib/currency'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { TrendingUp, DollarSign, Users, CreditCard } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export default function AnalyticsPage() {
  const toArray = (value: any) => {
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.data)) return value.data
    if (Array.isArray(value?.data?.data)) return value.data.data
    return []
  }

  const { data: tenantsData } = useTenants({ limit: 1000 })
  const { data: subscriptionsData } = useSubscriptions({ limit: 1000 })
  const { data: paymentsData } = usePayments({ limit: 1000 })
  const { data: paymentStats } = usePaymentStats()

  const tenants = toArray(tenantsData)
  const subscriptions = toArray(subscriptionsData)
  const payments = toArray(paymentsData)

  // Revenue over time (last 12 months)
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), 11 - i)
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    
    return payments.reduce((sum: number, p: any) => {
      const paymentDate = new Date(p.paymentDate)
      if (paymentDate >= monthStart && paymentDate <= monthEnd && p.status === 'COMPLETED') {
        return sum + Number(p.amount || 0)
      }
      return sum
    }, 0)
  })

  const revenueChartData = {
    labels: Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(new Date(), 11 - i)
      return format(date, 'MMM yyyy')
    }),
    datasets: [
      {
        label: 'Revenue',
        data: monthlyRevenue,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
    ],
  }

  // Subscription types distribution
  const subscriptionTypes = subscriptions.reduce((acc: any, s: any) => {
    acc[s.type] = (acc[s.type] || 0) + 1
    return acc
  }, {})

  const subscriptionTypeChartData = {
    labels: Object.keys(subscriptionTypes),
    datasets: [
      {
        data: Object.values(subscriptionTypes),
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(251, 146, 60, 0.8)',
        ],
      },
    ],
  }

  // Payment methods distribution
  const paymentMethods = payments.reduce((acc: any, p: any) => {
    if (p.status === 'COMPLETED') {
      acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + Number(p.amount || 0)
    }
    return acc
  }, {})

  const paymentMethodChartData = {
    labels: Object.keys(paymentMethods),
    datasets: [
      {
        label: 'Revenue',
        data: Object.values(paymentMethods),
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(107, 114, 128, 0.8)',
        ],
      },
    ],
  }

  // Tenant growth
  const tenantGrowth = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), 11 - i)
    const monthEnd = endOfMonth(date)
    
    return tenants.filter((t: any) => {
      const createdAt = new Date(t.createdAt)
      return createdAt <= monthEnd
    }).length
  })

  const tenantGrowthChartData = {
    labels: Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(new Date(), 11 - i)
      return format(date, 'MMM yyyy')
    }),
    datasets: [
      {
        label: 'Total Tenants',
        data: tenantGrowth,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  }

  const totalRevenue = payments.reduce((sum: number, p: any) => {
    if (p.status === 'COMPLETED') {
      return sum + Number(p.amount || 0)
    }
    return sum
  }, 0)

  const activeTenants = tenants.filter((t: any) => t.isActive && !t.isSuspended).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">Comprehensive insights and reports</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="factory-light-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card className="factory-light-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeTenants}</div>
          </CardContent>
        </Card>
        <Card className="factory-light-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{subscriptions.length}</div>
          </CardContent>
        </Card>
        <Card className="factory-light-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Revenue/Tenant</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(activeTenants > 0 ? totalRevenue / activeTenants : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="factory-light-card">
          <CardHeader>
            <CardTitle className="text-gray-900">Revenue Trend (12 Months)</CardTitle>
            <CardDescription className="text-gray-600">Monthly revenue over the past year</CardDescription>
          </CardHeader>
          <CardContent>
            <Line
              data={revenueChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { color: '#6B7280' },
                    grid: { color: '#E5E7EB' },
                  },
                  x: {
                    ticks: { color: '#6B7280' },
                    grid: { color: '#E5E7EB' },
                  },
                },
              }}
              height={300}
            />
          </CardContent>
        </Card>

        <Card className="factory-light-card">
          <CardHeader>
            <CardTitle className="text-gray-900">Subscription Types</CardTitle>
            <CardDescription className="text-gray-600">Distribution of subscription types</CardDescription>
          </CardHeader>
          <CardContent>
            <Doughnut
              data={subscriptionTypeChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#6B7280' },
                  },
                },
              }}
              height={300}
            />
          </CardContent>
        </Card>

        <Card className="factory-light-card">
          <CardHeader>
            <CardTitle className="text-gray-900">Revenue by Payment Method</CardTitle>
            <CardDescription className="text-gray-600">Total revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar
              data={paymentMethodChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { color: '#6B7280' },
                    grid: { color: '#E5E7EB' },
                  },
                  x: {
                    ticks: { color: '#6B7280' },
                    grid: { color: '#E5E7EB' },
                  },
                },
              }}
              height={300}
            />
          </CardContent>
        </Card>

        <Card className="factory-light-card">
          <CardHeader>
            <CardTitle className="text-gray-900">Tenant Growth</CardTitle>
            <CardDescription className="text-gray-600">Total tenants over time</CardDescription>
          </CardHeader>
          <CardContent>
            <Line
              data={tenantGrowthChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { color: '#6B7280' },
                    grid: { color: '#E5E7EB' },
                  },
                  x: {
                    ticks: { color: '#6B7280' },
                    grid: { color: '#E5E7EB' },
                  },
                },
              }}
              height={300}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

