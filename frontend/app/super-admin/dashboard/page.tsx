'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/currency'
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3
} from 'lucide-react'
import { useTenants, useSubscriptions, usePayments, usePaymentStats } from '@/hooks/useSuperAdmin'
import { format } from 'date-fns'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
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

export default function SuperAdminDashboardPage() {
  const { data: tenantsData, isLoading: tenantsLoading } = useTenants({ limit: 1000 })
  const { data: subscriptionsData, isLoading: subscriptionsLoading } = useSubscriptions({ limit: 1000 })
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments({ limit: 1000 })
  const { data: paymentStats, isLoading: statsLoading } = usePaymentStats()

  const toArray = (value: any) => {
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.data)) return value.data
    if (Array.isArray(value?.data?.data)) return value.data.data
    return []
  }

  const tenants = toArray(tenantsData)
  const subscriptions = toArray(subscriptionsData)
  const payments = toArray(paymentsData)

  // Calculate statistics
  const totalTenants = tenants.length
  const activeTenants = tenants.filter((t: any) => t.isActive && !t.isSuspended).length
  const suspendedTenants = tenants.filter((t: any) => t.isSuspended).length
  const totalSubscriptions = subscriptions.length
  const activeSubscriptions = subscriptions.filter((s: any) => s.status === 'ACTIVE').length
  const totalRevenue = payments.reduce((sum: number, p: any) => {
    if (p.status === 'COMPLETED') {
      return sum + Number(p.amount || 0)
    }
    return sum
  }, 0)
  const pendingRevenue = payments.reduce((sum: number, p: any) => {
    if (p.status === 'PENDING') {
      return sum + Number(p.amount || 0)
    }
    return sum
  }, 0)

  // Monthly revenue chart data (last 6 months)
  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - i))
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    
    return payments.reduce((sum: number, p: any) => {
      const paymentDate = new Date(p.paymentDate)
      if (paymentDate >= monthStart && paymentDate <= monthEnd && p.status === 'COMPLETED') {
        return sum + Number(p.amount || 0)
      }
      return sum
    }, 0)
  })

  const revenueChartData = {
    labels: Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
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
        label: 'Amount',
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

  const stats = [
    {
      name: 'Total Tenants',
      value: totalTenants,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-400/30',
      gradient: 'from-blue-500/20 to-blue-600/20',
    },
    {
      name: 'Active Tenants',
      value: activeTenants,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-400/30',
      gradient: 'from-green-500/20 to-green-600/20',
    },
    {
      name: 'Total Subscriptions',
      value: totalSubscriptions,
      icon: CreditCard,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-400/30',
      gradient: 'from-purple-500/20 to-purple-600/20',
    },
    {
      name: 'Active Subscriptions',
      value: activeSubscriptions,
      icon: Activity,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-400/30',
      gradient: 'from-green-500/20 to-green-600/20',
    },
    {
      name: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-400/30',
      gradient: 'from-green-500/20 to-green-600/20',
    },
    {
      name: 'Pending Revenue',
      value: formatCurrency(pendingRevenue),
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-400/30',
      gradient: 'from-orange-500/20 to-orange-600/20',
    },
  ]

  const isLoading = tenantsLoading || subscriptionsLoading || paymentsLoading || statsLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your multi-tenant system</p>
      </div>

      {/* Stats Grid */}
      <div className="factory-dashboard-grid">
        {stats.map((stat) => (
          <Card key={stat.name} className="factory-stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.name}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {isLoading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  stat.value
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card className="factory-light-card">
          <CardHeader>
            <CardTitle className="text-gray-900">Monthly Revenue</CardTitle>
            <CardDescription className="text-gray-600">Revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <span className="animate-pulse text-gray-600">Loading chart...</span>
              </div>
            ) : (
              <Line
                data={revenueChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        color: '#6B7280',
                      },
                      grid: {
                        color: '#E5E7EB',
                      },
                    },
                    x: {
                      ticks: {
                        color: '#6B7280',
                      },
                      grid: {
                        color: '#E5E7EB',
                      },
                    },
                  },
                }}
                height={250}
              />
            )}
          </CardContent>
        </Card>

        {/* Subscription Types Chart */}
        <Card className="factory-light-card">
          <CardHeader>
            <CardTitle className="text-gray-900">Subscription Types</CardTitle>
            <CardDescription className="text-gray-600">Distribution of subscription types</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <span className="animate-pulse text-gray-600">Loading chart...</span>
              </div>
            ) : (
              <Doughnut
                data={subscriptionTypeChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: '#6B7280',
                      },
                    },
                  },
                }}
                height={250}
              />
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Chart */}
        <Card className="factory-light-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-gray-900">Revenue by Payment Method</CardTitle>
            <CardDescription className="text-gray-600">Total revenue breakdown by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <span className="animate-pulse text-gray-600">Loading chart...</span>
              </div>
            ) : (
              <Bar
                data={paymentMethodChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        color: '#6B7280',
                      },
                      grid: {
                        color: '#E5E7EB',
                      },
                    },
                    x: {
                      ticks: {
                        color: '#6B7280',
                      },
                      grid: {
                        color: '#E5E7EB',
                      },
                    },
                  },
                }}
                height={250}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <Card className="factory-light-card">
          <CardHeader>
            <CardTitle className="text-gray-900">Recent Tenants</CardTitle>
            <CardDescription className="text-gray-600">Latest tenant registrations</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-600">Loading...</div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No tenants yet</div>
            ) : (
              <div className="space-y-4">
                {tenants.slice(0, 5).map((tenant: any) => (
                  <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">{tenant.name}</p>
                      <p className="text-sm text-gray-600">{tenant.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {format(new Date(tenant.createdAt), 'MMM dd, yyyy')}
                      </p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                          tenant.isActive && !tenant.isSuspended
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : tenant.isSuspended
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {tenant.isSuspended ? 'Suspended' : tenant.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="factory-light-card">
          <CardHeader>
            <CardTitle className="text-gray-900">Recent Payments</CardTitle>
            <CardDescription className="text-gray-600">Latest payment transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-600">Loading...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No payments yet</div>
            ) : (
              <div className="space-y-4">
                {payments
                  .filter((p: any) => p.status === 'COMPLETED')
                  .slice(0, 5)
                  .map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(Number(payment.amount))}
                        </p>
                        <p className="text-sm text-gray-600">{payment.paymentMethod}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 border border-green-200">
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

