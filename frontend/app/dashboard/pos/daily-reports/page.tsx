'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Calendar, Download, RefreshCw, TrendingUp, Users, ShoppingCart, DollarSign, CreditCard, BarChart3, Clock, FileDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';

interface ReturnSummary {
  totalReturns: number;
  processedReturns: number;
  pendingReturns: number;
  cancelledReturns: number;
  processedAmount: number;
  pendingAmount: number;
  netSales: number;
  netTransactions: number;
  refundsByMethod: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
}

interface PaymentMethodBreakdown {
  method: string;
  totalAmount: number;
  count: number;
  refundAmount?: number;
  discountAdjustment?: number;
  discountCount?: number;
  netAmount?: number;
}

interface DailySummary {
  date: string;
  totalSales: number;
  grossSales?: number;
  transactionCount: number;
  grossTransactionCount?: number;
  averageTransactionValue: number;
  uniqueCustomers?: number;
  grossProfit?: number;
  grossProfitMargin?: number;
  netProfit?: number;
  paymentMethods: PaymentMethodBreakdown[];
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
    salesCount: number;
  }>;
  salesByUser: Array<{
    userId: string;
    totalSales: number;
    transactionCount: number;
    averageValue: number;
  }>;
  returnSummary?: ReturnSummary;
}

interface HourlySalesReport {
  hour: number;
  label: string;
  totalSales: number;
  transactionCount: number;
  averageTransactionValue: number;
}

export default function DailyReportsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Report data
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [hourlySales, setHourlySales] = useState<HourlySalesReport[]>([]);

  useEffect(() => {
    loadLocations();
    loadReports();
  }, [selectedDate, selectedLocation]);

  const loadLocations = async () => {
    try {
      const response = await apiClient.get('/locations');
      const data = response.data;
      setLocations(data.data || data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        date: selectedDate,
        ...(selectedLocation && selectedLocation !== 'all' && { locationId: selectedLocation }),
      });

      const [summaryResponse, hourlyResponse] = await Promise.all([
        apiClient.get(`/pos/sales/daily-summary?${params}`),
        apiClient.get(`/pos/reports/hourly-sales?${params}`),
      ]);

      const summaryPayload = summaryResponse.data?.data || summaryResponse.data;
      if (summaryPayload) {
        setDailySummary({
          ...summaryPayload,
          totalSales: Number(summaryPayload.totalSales || 0),
          grossSales: Number(summaryPayload.grossSales ?? summaryPayload.totalSales ?? 0),
          transactionCount: Number(summaryPayload.transactionCount || 0),
          grossTransactionCount: Number(summaryPayload.grossTransactionCount ?? summaryPayload.transactionCount ?? 0),
          averageTransactionValue: Number(summaryPayload.averageTransactionValue || 0),
          uniqueCustomers: Number(summaryPayload.uniqueCustomers || 0),
          grossProfit: Number(summaryPayload.grossProfit || 0),
          grossProfitMargin: Number(summaryPayload.grossProfitMargin || 0),
          netProfit: Number(summaryPayload.netProfit || 0),
          paymentMethods: (summaryPayload.paymentMethods || []).map((method: any) => ({
            method: method.method,
            totalAmount: Number(method.totalAmount || 0),
            count: Number(method.count || 0),
            refundAmount: Number(method.refundAmount || 0),
            discountAdjustment: Number(method.discountAdjustment || 0),
            discountCount: Number(method.discountCount || 0),
            netAmount:
              method.netAmount !== undefined
                ? Number(method.netAmount || 0)
                : Number(method.totalAmount || 0) - Number(method.refundAmount || 0) - Number(method.discountAdjustment || 0),
          })),
          topProducts: summaryPayload.topProducts || [],
          salesByUser: summaryPayload.salesByUser || [],
          returnSummary: summaryPayload.returnSummary,
        });
      } else {
        setDailySummary(null);
      }
      setHourlySales(hourlyResponse.data);
    } catch (error: any) {
      toast.error('Error loading reports');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        ...(selectedLocation && selectedLocation !== 'all' && { locationId: selectedLocation }),
      });

      const response = await apiClient.get(`/pos/sales/daily-summary/export/csv?${params}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-sales-report-${selectedDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Error exporting CSV');
      console.error(error);
    }
  };

  const handleExportPdf = async () => {
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        ...(selectedLocation && selectedLocation !== 'all' && { locationId: selectedLocation }),
      });

      const response = await apiClient.get(`/pos/sales/daily-summary/export/pdf?${params}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-sales-report-${selectedDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Error exporting PDF');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Daily Sales Report</h1>
          <p className="text-gray-300">View and analyze daily sales performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadReports} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCsv}>
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPdf}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-md border border-gray-600 bg-gray-800/50 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Location</label>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : dailySummary ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-100">Net Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {formatCurrency(dailySummary.totalSales)}
                </div>
                <p className="text-xs text-blue-100 mt-1">
                  Gross: {formatCurrency(dailySummary.grossSales ?? dailySummary.totalSales)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-600 to-rose-700 border-pink-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-pink-100">Sale Returns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {formatCurrency(Number(dailySummary.returnSummary?.processedAmount || 0))}
                </div>
                <p className="text-xs text-pink-100 mt-1">
                  {dailySummary.returnSummary?.processedReturns ?? 0} processed •{' '}
                  {dailySummary.returnSummary?.pendingReturns ?? 0} pending
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-600 to-green-700 border-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-100">Gross Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {formatCurrency(dailySummary.grossProfit || 0)}
                </div>
                <p className="text-xs text-green-100 mt-1">
                  {dailySummary.grossProfitMargin?.toFixed(2) || '0.00'}% margin
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-100">Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {formatCurrency(dailySummary.netProfit || 0)}
                </div>
                <p className="text-xs text-purple-100 mt-1">
                  After taxes
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-orange-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-orange-100">Avg Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {formatCurrency(dailySummary.averageTransactionValue)}
                </div>
                <p className="text-xs text-orange-100 mt-1">
                  {dailySummary.transactionCount} net transactions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Payment Methods</CardTitle>
              <CardDescription>Breakdown by payment type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {dailySummary.paymentMethods.map((method) => (
                  <div key={method.method} className="text-center p-4 bg-gray-900/50 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(method.netAmount ?? method.totalAmount)}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {method.method}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {method.count} transactions
                      {method.discountCount && method.discountCount > 0 && (
                        <span className="ml-1">· {method.discountCount} discounts</span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
                      <div>Gross {formatCurrency(method.totalAmount)}</div>
                      {method.refundAmount && method.refundAmount > 0 && (
                        <div className="text-red-400">Refunds {formatCurrency(method.refundAmount)}</div>
                      )}
                      {method.discountAdjustment && method.discountAdjustment > 0 && (
                        <div className="text-yellow-400">Discounts {formatCurrency(method.discountAdjustment)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {dailySummary.returnSummary && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Return Overview</CardTitle>
                <CardDescription>Impact of sale returns on today&apos;s performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-gray-900/40 rounded-lg">
                    <p className="text-sm text-gray-400">Processed Returns</p>
                    <p className="text-2xl font-semibold text-white">
                      {dailySummary.returnSummary.processedReturns}
                    </p>
                    <p className="text-xs text-emerald-400">
                      {formatCurrency(dailySummary.returnSummary.processedAmount)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-900/40 rounded-lg">
                    <p className="text-sm text-gray-400">Pending Returns</p>
                    <p className="text-2xl font-semibold text-white">
                      {dailySummary.returnSummary.pendingReturns}
                    </p>
                    <p className="text-xs text-yellow-400">
                      {formatCurrency(dailySummary.returnSummary.pendingAmount)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-900/40 rounded-lg">
                    <p className="text-sm text-gray-400">Net Sales Impact</p>
                    <p className="text-2xl font-semibold text-white">
                      {formatCurrency(dailySummary.totalSales)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Gross {formatCurrency(dailySummary.grossSales ?? dailySummary.totalSales)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-900/40 rounded-lg">
                    <p className="text-sm text-gray-400">Net Transactions</p>
                    <p className="text-2xl font-semibold text-white">
                      {dailySummary.transactionCount}
                    </p>
                    <p className="text-xs text-gray-400">
                      Gross {dailySummary.grossTransactionCount ?? dailySummary.transactionCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hourly Sales */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Hourly Sales Breakdown
              </CardTitle>
              <CardDescription>24-hour performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {hourlySales.filter(hour => hour.transactionCount > 0).map((hour) => (
                  <div key={hour.hour} className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg">
                    <div className="w-20 text-sm font-medium text-white">
                      {hour.label}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">
                        {formatCurrency(hour.totalSales)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {hour.transactionCount} transactions • Avg: {formatCurrency(hour.averageTransactionValue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Top Products</CardTitle>
              <CardDescription>Best performing products of the day</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Product</TableHead>
                    <TableHead className="text-gray-300 text-right">Quantity</TableHead>
                    <TableHead className="text-gray-300 text-right">Revenue</TableHead>
                    <TableHead className="text-gray-300 text-right">Avg Price</TableHead>
                    <TableHead className="text-gray-300 text-right">Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySummary.topProducts.length > 0 ? (
                    dailySummary.topProducts.map((product, index) => (
                      <TableRow key={index} className="border-gray-700">
                        <TableCell className="font-medium text-white">{product.name}</TableCell>
                        <TableCell className="text-right text-gray-300">{product.quantity.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-400">
                          {formatCurrency(product.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-gray-300">
                          {formatCurrency(product.revenue / product.quantity)}
                        </TableCell>
                        <TableCell className="text-right text-gray-300">{product.salesCount}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                        No products sold
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Sales by User */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Sales by User
              </CardTitle>
              <CardDescription>Staff performance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">User</TableHead>
                    <TableHead className="text-gray-300 text-right">Total Sales</TableHead>
                    <TableHead className="text-gray-300 text-right">Transactions</TableHead>
                    <TableHead className="text-gray-300 text-right">Avg Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySummary.salesByUser.length > 0 ? (
                    dailySummary.salesByUser.map((user) => (
                      <TableRow key={user.userId} className="border-gray-700">
                        <TableCell className="font-medium text-white">User ID: {user.userId}</TableCell>
                        <TableCell className="text-right font-semibold text-green-400">
                          {formatCurrency(user.totalSales)}
                        </TableCell>
                        <TableCell className="text-right text-gray-300">{user.transactionCount}</TableCell>
                        <TableCell className="text-right text-gray-300">
                          {formatCurrency(user.averageValue)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                        No sales data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="py-16">
            <div className="text-center text-gray-400">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No data available for selected date</p>
              <p className="text-sm mt-2">Try selecting a different date</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

