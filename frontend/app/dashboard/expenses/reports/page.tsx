'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  DollarSign,
  Receipt,
  Download,
  RefreshCw,
  Calendar,
  FileText,
  FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  useExpenseSummary,
  useExpenseCategoryBreakdown,
  useExpensePaymentMethodBreakdown,
  useExpenseLocationBreakdown,
  useExpenseStatusBreakdown,
  useExpenseTrends,
  useExpenseMonthlyComparison,
  type CategoryBreakdown,
  type PaymentMethodBreakdown,
  type LocationBreakdown,
  type StatusBreakdown,
  type TrendData,
  type MonthlyComparison,
} from '@/hooks/useExpenseReports';
import { formatCurrency } from '@/lib/currency';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  MOBILE_PAYMENT: 'Mobile Payment',
  OTHER: 'Other',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PAID: 'Paid',
};

const statusColors: Record<string, string> = {
  PENDING: '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
  PAID: '#3B82F6',
};

function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export default function ExpenseReportsPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month');
  const [isExporting, setIsExporting] = useState(false);

  // Set default date range (last 30 days)
  useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  }, []);

  const reportParams = useMemo(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      groupBy,
    }),
    [startDate, endDate, groupBy]
  );

  // Fetch all report data
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useExpenseSummary(reportParams);
  const { data: categoryBreakdown, isLoading: categoryLoading } = useExpenseCategoryBreakdown(reportParams);
  const { data: paymentMethodBreakdown, isLoading: paymentLoading } = useExpensePaymentMethodBreakdown(reportParams);
  const { data: locationBreakdown, isLoading: locationLoading } = useExpenseLocationBreakdown(reportParams);
  const { data: statusBreakdown, isLoading: statusLoading } = useExpenseStatusBreakdown(reportParams);
  const { data: trends, isLoading: trendsLoading } = useExpenseTrends(reportParams);
  const { data: monthlyComparison, isLoading: monthlyLoading } = useExpenseMonthlyComparison(reportParams);

  const isLoading = summaryLoading || categoryLoading || paymentLoading || locationLoading || statusLoading || trendsLoading || monthlyLoading;

  // Prepare chart data
  const trendsList = asList<TrendData>(trends);
  const categoryList = asList<CategoryBreakdown>(categoryBreakdown);
  const paymentMethodList = asList<PaymentMethodBreakdown>(paymentMethodBreakdown);
  const locationList = asList<LocationBreakdown>(locationBreakdown);
  const statusList = asList<StatusBreakdown>(statusBreakdown);
  const monthlyList = asList<MonthlyComparison>(monthlyComparison);

  const trendsChartData = useMemo(() => {
    if (trendsList.length === 0) return null;

    return {
      labels: trendsList.map((t) => {
        const date = new Date(t.period);
        if (groupBy === 'day') return format(date, 'MMM dd');
        if (groupBy === 'week') return format(date, 'MMM dd');
        return format(date, 'MMM yyyy');
      }),
      datasets: [
        {
          label: 'Total Amount',
          data: trendsList.map((t) => t.totalAmount),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
      ],
    };
  }, [trendsList, groupBy]);

  const categoryChartData = useMemo(() => {
    if (categoryList.length === 0) return null;

    const topCategories = categoryList.slice(0, 10);
    return {
      labels: topCategories.map((c) => c.category?.name || 'Unknown'),
      datasets: [
        {
          label: 'Amount',
          data: topCategories.map((c) => c.totalAmount),
          backgroundColor: topCategories.map((c) => c.category?.color || '#64748B'),
        },
      ],
    };
  }, [categoryList]);

  const paymentMethodChartData = useMemo(() => {
    if (paymentMethodList.length === 0) return null;

    return {
      labels: paymentMethodList.map((p) => paymentMethodLabels[p.paymentMethod] || p.paymentMethod),
      datasets: [
        {
          label: 'Amount',
          data: paymentMethodList.map((p) => p.totalAmount),
          backgroundColor: [
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#8B5CF6',
            '#EC4899',
          ],
        },
      ],
    };
  }, [paymentMethodList]);

  const monthlyChartData = useMemo(() => {
    if (monthlyList.length === 0) return null;

    return {
      labels: monthlyList.map((m) => format(new Date(m.month), 'MMM yyyy')),
      datasets: [
        {
          label: 'Total Amount',
          data: monthlyList.map((m) => m.totalAmount),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: '#3B82F6',
          borderWidth: 2,
        },
      ],
    };
  }, [monthlyList]);

  const handleExport = async (exportFormat: 'csv' | 'pdf') => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      // For now, we'll export the expenses list as CSV/PDF
      // In a real implementation, you'd have a dedicated export endpoint
      const response = await apiClient.get(`/expenses?${params.toString()}&limit=10000`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expense-report-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Report exported as ${exportFormat.toUpperCase()}`);
    } catch (error: any) {
      toast.error('Failed to export report');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    refetchSummary();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Expense Reports</h1>
            <p className="text-gray-400">Comprehensive analytics and insights for your expenses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Group By</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'day' | 'week' | 'month')}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - 30);
                  setStartDate(format(start, 'yyyy-MM-dd'));
                  setEndDate(format(end, 'yyyy-MM-dd'));
                }}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Last 30 Days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-white" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-100">Total Amount</p>
                  <p className="text-2xl font-semibold text-white">
                    {formatCurrency(summary.summary.totalAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-green-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Receipt className="h-8 w-8 text-white" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-100">Total Expenses</p>
                  <p className="text-2xl font-semibold text-white">{summary.summary.totalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-white" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-100">Average Amount</p>
                  <p className="text-2xl font-semibold text-white">
                    {formatCurrency(summary.summary.averageAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-white" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-orange-100">Categories</p>
                  <p className="text-2xl font-semibold text-white">{asList(summary.byCategory).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {statusList.length > 0 ? (
                  <div className="space-y-4">
                    {statusList.map((status) => (
                      <div key={status.status} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              className="text-xs"
                              style={{
                                backgroundColor: statusColors[status.status] || '#64748B',
                                color: 'white',
                              }}
                            >
                              {statusLabels[status.status] || status.status}
                            </Badge>
                            <span className="text-sm text-gray-300">
                              {status.count} expense{status.count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-white">
                            {formatCurrency(status.totalAmount)}
                          </span>
                        </div>
                        <Progress value={status.percentage} className="h-2" />
                        <p className="text-xs text-gray-400">{status.percentage.toFixed(1)}% of total</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No status data available</p>
                )}
              </CardContent>
            </Card>

            {/* Payment Method Breakdown */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Payment Method Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethodList.length > 0 ? (
                  <div className="space-y-4">
                    {paymentMethodList.map((method) => (
                      <div key={method.paymentMethod} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">
                            {paymentMethodLabels[method.paymentMethod] || method.paymentMethod}
                          </span>
                          <span className="text-sm font-medium text-white">
                            {formatCurrency(method.totalAmount)}
                          </span>
                        </div>
                        <Progress value={method.percentage} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{method.count} transactions</span>
                          <span>{method.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No payment method data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Comparison Chart */}
          {monthlyChartData && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Monthly Comparison</CardTitle>
                <CardDescription className="text-gray-400">
                  Expense trends over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Bar data={monthlyChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Pie Chart */}
            {categoryChartData && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Category Distribution</CardTitle>
                  <CardDescription className="text-gray-400">
                    Top expense categories by amount
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Pie data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </CardContent>
              </Card>
            )}

            {/* Category Breakdown Table */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Category Breakdown</CardTitle>
                <CardDescription className="text-gray-400">
                  Detailed category analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoryList.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead className="text-gray-300">Category</TableHead>
                          <TableHead className="text-gray-300">Amount</TableHead>
                          <TableHead className="text-gray-300">Count</TableHead>
                          <TableHead className="text-gray-300">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryList.map((category) => (
                          <TableRow key={category.categoryId} className="border-gray-700">
                            <TableCell className="text-white">
                              <div className="flex items-center gap-2">
                                {category.category?.color && (
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: category.category.color }}
                                  />
                                )}
                                {category.category?.name || 'Unknown'}
                              </div>
                            </TableCell>
                            <TableCell className="text-white font-medium">
                              {formatCurrency(category.totalAmount)}
                            </TableCell>
                            <TableCell className="text-gray-300">{category.count}</TableCell>
                            <TableCell className="text-gray-300">
                              {category.percentage.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No category data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {trendsChartData && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Expense Trends</CardTitle>
                <CardDescription className="text-gray-400">
                  Expense trends over time (grouped by {groupBy})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Line
                  data={trendsChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: '#E5E7EB',
                        },
                      },
                    },
                    scales: {
                      x: {
                        ticks: {
                          color: '#9CA3AF',
                        },
                        grid: {
                          color: '#374151',
                        },
                      },
                      y: {
                        ticks: {
                          color: '#9CA3AF',
                        },
                        grid: {
                          color: '#374151',
                        },
                      },
                    },
                  }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payment Method Tab */}
        <TabsContent value="payment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Method Chart */}
            {paymentMethodChartData && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Payment Method Distribution</CardTitle>
                  <CardDescription className="text-gray-400">
                    Expenses by payment method
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Pie
                    data={paymentMethodChartData}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Payment Method Table */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Payment Method Details</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethodList.length > 0 ? (
                  <div className="space-y-4">
                    {paymentMethodList.map((method) => (
                      <div key={method.paymentMethod} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">
                            {paymentMethodLabels[method.paymentMethod] || method.paymentMethod}
                          </span>
                          <span className="text-sm font-medium text-white">
                            {formatCurrency(method.totalAmount)}
                          </span>
                        </div>
                        <Progress value={method.percentage} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>
                            {method.count} transactions • Avg:{' '}
                            {formatCurrency(method.averageAmount)}
                          </span>
                          <span>{method.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No payment method data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Location Tab */}
        <TabsContent value="location" className="space-y-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Location Breakdown</CardTitle>
              <CardDescription className="text-gray-400">
                Expenses by location
              </CardDescription>
            </CardHeader>
            <CardContent>
              {locationList.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">Location</TableHead>
                        <TableHead className="text-gray-300">Amount</TableHead>
                        <TableHead className="text-gray-300">Count</TableHead>
                        <TableHead className="text-gray-300">Average</TableHead>
                        <TableHead className="text-gray-300">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locationList.map((location) => (
                        <TableRow key={location.locationId} className="border-gray-700">
                          <TableCell className="text-white">
                            {location.location?.name || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            {formatCurrency(location.totalAmount)}
                          </TableCell>
                          <TableCell className="text-gray-300">{location.count}</TableCell>
                          <TableCell className="text-gray-300">
                            {formatCurrency(location.averageAmount)}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {location.percentage.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No location data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}

