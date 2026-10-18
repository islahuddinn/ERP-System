'use client';

import { useState, useEffect, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import { toast } from 'react-hot-toast';
import { Calendar, Download, RefreshCw, TrendingUp, Users, ShoppingCart, DollarSign, CreditCard, BarChart3, PieChart, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { downloadCsv } from '@/lib/download-csv';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function paymentMethodLabel(method: string): string {
  switch (method) {
    case 'CASH': return 'Cash';
    case 'CARD': return 'Card';
    case 'MOBILE_PAYMENT': return 'Mobile Payment';
    case 'BANK_TRANSFER': return 'Bank Transfer';
    case 'CHEQUE': return 'Cheque';
    case 'OTHER': return 'Other';
    default: return method;
  }
}

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
  netAmount?: number;
}

interface DailySummary {
  date: string;
  totalSales: number;
  grossSales?: number;
  transactionCount: number;
  grossTransactionCount?: number;
  averageTransactionValue: number;
  uniqueCustomers: number;
  grossProfit: number;
  grossProfitMargin: number;
  netProfit: number;
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

interface SalesByUserReport {
  userId: string;
  userName: string;
  totalSales: number;
  transactionCount: number;
  averageValue: number;
  totalAmount: number;
}

interface TopProductsReport {
  name: string;
  quantity: number;
  revenue: number;
  salesCount: number;
  averagePrice: number;
}

interface HourlySalesReport {
  hour: number;
  label: string;
  totalSales: number;
  transactionCount: number;
  averageTransactionValue: number;
}

interface PaymentMethodReport {
  method: string;
  totalAmount: number;
  count: number;
  percentage: number;
  refundAmount?: number;
  netAmount?: number;
  grossAmount?: number;
}

export default function POSReportsPage() {
  // Default to today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Report data
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [salesByUser, setSalesByUser] = useState<SalesByUserReport[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductsReport[]>([]);
  const [hourlySales, setHourlySales] = useState<HourlySalesReport[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodReport[]>([]);

  const loadLocations = useCallback(async () => {
    try {
      const response = await apiClient.get('/locations');
      const payload = response?.data ?? response
      const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : [])
      setLocations(list.filter((location: { id?: string; name?: string }) => location?.id && location?.name))
    } catch {
      setLocations([]);
    }
  }, []);

  const loadDailySummary = useCallback(async () => {
    try {
      setIsLoading(true);
      const dateStr = formatLocalDate(selectedDate);
      
      const params = new URLSearchParams({
        date: dateStr,
        ...(selectedLocation && selectedLocation !== 'all' && { locationId: selectedLocation }),
      });
      
      const response = await apiClient.get(`/pos/sales/daily-summary?${params}`);
      const data = response.data;
      // Handle both direct data and wrapped data
      const summaryData = data.data || data;
      
      if (summaryData) {
        setDailySummary({
          ...summaryData,
          totalSales: Number(summaryData.totalSales || 0),
          grossSales: Number(summaryData.grossSales ?? summaryData.totalSales ?? 0),
          transactionCount: Number(summaryData.transactionCount || 0),
          grossTransactionCount: Number(summaryData.grossTransactionCount ?? summaryData.transactionCount ?? 0),
          averageTransactionValue: Number(summaryData.averageTransactionValue || 0),
          uniqueCustomers: Number(summaryData.uniqueCustomers || 0),
          grossProfit: Number(summaryData.grossProfit || 0),
          grossProfitMargin: Number(summaryData.grossProfitMargin || 0),
          netProfit: Number(summaryData.netProfit || 0),
          paymentMethods: (summaryData.paymentMethods || []).map((method: any) => ({
            method: method.method,
            totalAmount: Number(method.totalAmount || 0),
            count: Number(method.count || 0),
            refundAmount: Number(method.refundAmount || 0),
            netAmount:
              method.netAmount !== undefined
                ? Number(method.netAmount || 0)
                : Number(method.totalAmount || 0) - Number(method.refundAmount || 0),
          })),
          topProducts: summaryData.topProducts || [],
          salesByUser: summaryData.salesByUser || [],
          returnSummary: summaryData.returnSummary,
        });
      } else {
        setDailySummary(null);
      }
    } catch (error: any) {
      toast.error('Error loading daily summary');
      setDailySummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedLocation]);

  const loadSalesByUserReport = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (dateRange?.from && dateRange?.to) {
        params.append('startDate', formatLocalDate(dateRange.from));
        params.append('endDate', formatLocalDate(dateRange.to));
      } else {
        const dateStr = formatLocalDate(selectedDate);
        params.append('startDate', dateStr);
        params.append('endDate', dateStr);
      }
      
      if (selectedLocation && selectedLocation !== 'all') {
        params.append('locationId', selectedLocation);
      }

      const response = await apiClient.get(`/pos/reports/sales-by-user?${params}`);
      const data = response.data;
      const userData = Array.isArray(data) ? data : (data.data || []);
      
      // Backend already includes userName, so we can use it directly
      const mappedData = userData.map((user: any) => ({
        userId: user.userId,
        userName: user.userName || `User ${user.userId}`,
        totalSales: Number(user.totalSales || 0),
        transactionCount: Number(user.transactionCount || 0),
        averageValue: Number(user.averageTransactionValue || user.averageValue || 0),
        totalAmount: Number(user.totalSales || 0),
      }));
      
      setSalesByUser(mappedData);
    } catch {
      toast.error('Error loading sales by user report');
      setSalesByUser([]);
    }
  }, [dateRange, selectedDate, selectedLocation]);

  const loadTopProductsReport = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (dateRange?.from && dateRange?.to) {
        params.append('startDate', formatLocalDate(dateRange.from));
        params.append('endDate', formatLocalDate(dateRange.to));
      } else {
        const dateStr = formatLocalDate(selectedDate);
        params.append('startDate', dateStr);
        params.append('endDate', dateStr);
      }
      
      params.append('limit', '20');

      const response = await apiClient.get(`/pos/reports/top-products?${params}`); 
      const data = response.data;
      const products = Array.isArray(data) ? data : (data.data || []);
      
      // Map products to include proper structure
      const mappedProducts = products.map((product: any) => {
        const quantity = Number(product._sum?.quantity || product.quantity || 0);
        const revenue = Number(product._sum?.lineTotal || product.revenue || 0);
        const salesCount = Number(product._count?.id || product._count || product.salesCount || 0);
        const averagePrice = quantity > 0 ? revenue / quantity : 0;
        
        return {
          name: product.itemName || product.name || 'Unknown Product',
          quantity,
          revenue,
          salesCount,
          averagePrice,
        };
      });
      
      setTopProducts(mappedProducts);
    } catch {
      toast.error('Error loading top products report');
      setTopProducts([]);
    }
  }, [dateRange, selectedDate]);

  const loadHourlySalesReport = useCallback(async () => {
    try {
      const dateStr = dateRange?.from
        ? formatLocalDate(dateRange.from)
        : formatLocalDate(selectedDate);
      
      const params = new URLSearchParams({
        date: dateStr,
        ...(selectedLocation && selectedLocation !== 'all' && { locationId: selectedLocation }),
      });

      const response = await apiClient.get(`/pos/reports/hourly-sales?${params}`); 
      const data = response.data;
      const hourly = Array.isArray(data) ? data : (data.data || []);
      
      // Map hourly data - backend returns array with hour, label, totalSales, transactionCount, averageTransactionValue
      const mappedHourly = hourly.map((hour: any) => ({
        hour: hour.hour ?? 0,
        label: hour.label || `${String(hour.hour ?? 0).padStart(2, '0')}:00 - ${String((hour.hour ?? 0) + 1).padStart(2, '0')}:00`,
        totalSales: Number(hour.totalSales || 0),
        transactionCount: Number(hour.transactionCount || 0),
        averageTransactionValue: Number(hour.averageTransactionValue || 0),
      }));
      
      setHourlySales(mappedHourly);
    } catch {
      toast.error('Error loading hourly sales report');
      setHourlySales([]);
    }
  }, [dateRange, selectedDate, selectedLocation]);

  const loadPaymentMethodsReport = useCallback(async () => {
    try {
      // Payment methods are included in daily summary, but we can also calculate from date range
      if (dateRange && dailySummary) {
        // Use payment methods from daily summary if available
        const totalNet = dailySummary.paymentMethods.reduce(
          (sum, pm) => sum + Number((pm.netAmount ?? pm.totalAmount) ?? 0),
          0,
        );
        const methods: PaymentMethodReport[] = dailySummary.paymentMethods.map((pm) => {
          const netAmount = Number((pm.netAmount ?? pm.totalAmount) ?? 0);
          const grossAmount = Number(pm.totalAmount || 0);
          const refundAmount = Number(pm.refundAmount || 0);
          return {
            method: pm.method,
            totalAmount: netAmount,
            netAmount,
            grossAmount,
            refundAmount,
            count: Number(pm.count || 0),
            percentage: totalNet > 0 ? (netAmount / totalNet) * 100 : 0,
          };
        });
        setPaymentMethods(methods);
      } else if (dailySummary?.paymentMethods) {
        const totalNet = dailySummary.paymentMethods.reduce(
          (sum, pm) => sum + Number((pm.netAmount ?? pm.totalAmount) ?? 0),
          0,
        );
        const methods: PaymentMethodReport[] = dailySummary.paymentMethods.map((pm) => {
          const netAmount = Number((pm.netAmount ?? pm.totalAmount) ?? 0);
          const grossAmount = Number(pm.totalAmount || 0);
          const refundAmount = Number(pm.refundAmount || 0);
          return {
            method: pm.method,
            totalAmount: netAmount,
            netAmount,
            grossAmount,
            refundAmount,
            count: Number(pm.count || 0),
            percentage: totalNet > 0 ? (netAmount / totalNet) * 100 : 0,
          };
        });
        setPaymentMethods(methods);
      } else {
        setPaymentMethods([]);
      }
    } catch {
      setPaymentMethods([]);
    }
  }, [dateRange, dailySummary]);

  const loadTabReports = useCallback(async () => {
    await Promise.all([
      loadSalesByUserReport(),
      loadTopProductsReport(),
      loadHourlySalesReport(),
    ]);
  }, [loadSalesByUserReport, loadTopProductsReport, loadHourlySalesReport]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    void loadDailySummary();
  }, [loadDailySummary]);

  useEffect(() => {
    void loadTabReports();
  }, [loadTabReports]);

  useEffect(() => {
    if (dailySummary?.paymentMethods) {
      loadPaymentMethodsReport();
    }
  }, [dailySummary, loadPaymentMethodsReport]);

  const handleRefresh = async () => {
    await loadDailySummary();
    await loadTabReports();
  };

  const handleExportAll = async () => {
    try {
      const dateStr = formatLocalDate(selectedDate);
      const params = new URLSearchParams({
        date: dateStr,
        ...(selectedLocation && selectedLocation !== 'all' && { locationId: selectedLocation }),
      });

      const response = await apiClient.get(`/pos/sales/daily-summary/export/csv?${params}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pos-daily-summary-${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Daily summary CSV exported');
    } catch {
      toast.error('Error exporting daily summary');
    }
  };

  const handleExportReport = (reportType: string) => {
    const dateStr = dateRange?.from && dateRange?.to
      ? `${formatLocalDate(dateRange.from)}_to_${formatLocalDate(dateRange.to)}`
      : formatLocalDate(selectedDate);

    if (reportType === 'Top Products') {
      if (topProducts.length === 0) {
        toast.error('No product data to export');
        return;
      }
      downloadCsv(
        `pos-top-products-${dateStr}.csv`,
        ['Product', 'Quantity', 'Revenue', 'Sales Count', 'Average Price'],
        topProducts.map((product) => [
          product.name,
          product.quantity,
          product.revenue,
          product.salesCount,
          product.averagePrice,
        ]),
      );
      toast.success('Top products exported');
      return;
    }

    if (reportType === 'Sales by User') {
      if (salesByUser.length === 0) {
        toast.error('No user sales data to export');
        return;
      }
      downloadCsv(
        `pos-sales-by-user-${dateStr}.csv`,
        ['User', 'Total Sales', 'Transactions', 'Average Value'],
        salesByUser.map((user) => [
          user.userName,
          user.totalSales,
          user.transactionCount,
          user.averageValue,
        ]),
      );
      toast.success('Sales by user exported');
      return;
    }

    if (reportType === 'Payment Methods') {
      if (paymentMethods.length === 0) {
        toast.error('No payment data to export');
        return;
      }
      downloadCsv(
        `pos-payment-methods-${dateStr}.csv`,
        ['Method', 'Net Amount', 'Gross Amount', 'Refunds', 'Count', 'Share %'],
        paymentMethods.map((method) => [
          paymentMethodLabel(method.method),
          method.netAmount ?? method.totalAmount,
          method.grossAmount ?? method.totalAmount,
          method.refundAmount ?? 0,
          method.count,
          Number(method.percentage || 0).toFixed(1),
        ]),
      );
      toast.success('Payment methods exported');
      return;
    }

    if (reportType === 'Hourly Analysis') {
      if (hourlySales.length === 0) {
        toast.error('No hourly data to export');
        return;
      }
      downloadCsv(
        `pos-hourly-sales-${dateStr}.csv`,
        ['Hour', 'Sales', 'Transactions', 'Average Value'],
        hourlySales.map((hour) => [
          hour.label || `${hour.hour}:00`,
          hour.totalSales,
          hour.transactionCount,
          hour.averageTransactionValue,
        ]),
      );
      toast.success('Hourly analysis exported');
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH': return <DollarSign className="h-4 w-4" />;
      case 'CARD': return <CreditCard className="h-4 w-4" />;
      case 'MOBILE_PAYMENT': return <ShoppingCart className="h-4 w-4" />;
      case 'BANK_TRANSFER': return <BarChart3 className="h-4 w-4" />;
      case 'CHEQUE': return <CreditCard className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => paymentMethodLabel(method);

  const handleQuickDateSelect = (value: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (value) {
      case 'today':
        setSelectedDate(today);
        setDateRange(undefined);
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        setSelectedDate(yesterday);
        setDateRange(undefined);
        break;
      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        setDateRange({ from: startOfWeek, to: endOfWeek });
        setSelectedDate(today);
        break;
      case 'thisMonth':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        setDateRange({ from: startOfMonth, to: endOfMonth });
        setSelectedDate(today);
        break;
    }
  };

  const handleClearFilters = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
    setDateRange(undefined);
    setSelectedLocation('all');
  };

  // Calculate summary totals for date range
  const calculateRangeSummary = () => {
    if (!dateRange || !dailySummary) return null;
    
    // For date range, we'd need to fetch multiple daily summaries or a range summary
    // For now, return the daily summary if available
    return dailySummary;
  };

  const summaryData = dateRange ? calculateRangeSummary() : dailySummary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">POS Reports</h1>
          <p className="text-gray-600">Analytics and insights for your point of sale system</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              setSelectedDate(today);
              setDateRange(undefined);
            }}
            disabled={isLoading}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-300">Date Range</label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={(range) => {
                  if (range?.from && range?.to) {
                    const from = new Date(range.from);
                    from.setHours(0, 0, 0, 0);
                    const to = new Date(range.to);
                    to.setHours(23, 59, 59, 999);
                    setDateRange({ from, to });
                    setSelectedDate(from);
                  } else {
                    setDateRange(undefined);
                  }
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-300">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-300">Quick Date</label>
              <Select onValueChange={handleQuickDateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-300">Net Sales</p>
                <p className="text-2xl font-bold text-white">
                  {summaryData ? formatCurrency(summaryData.totalSales) : formatCurrency(0)}
                </p>
                <p className="text-xs text-gray-400">
                  Gross {summaryData ? formatCurrency(summaryData.grossSales ?? summaryData.totalSales) : formatCurrency(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 text-rose-500" />
              <div>
                <p className="text-sm font-medium text-gray-300">Sale Returns</p>
                <p className="text-2xl font-bold text-white">
                  {summaryData ? formatCurrency(summaryData.returnSummary?.processedAmount || 0) : formatCurrency(0)}
                </p>
                <p className="text-xs text-gray-400">
                  {summaryData?.returnSummary?.processedReturns ?? 0} processed /{' '}
                  {summaryData?.returnSummary?.pendingReturns ?? 0} pending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-300">Transactions</p>
                <p className="text-2xl font-bold text-white">
                  {summaryData ? summaryData.transactionCount : 0}
                </p>
                <p className="text-xs text-gray-400">
                  Gross {summaryData?.grossTransactionCount ?? summaryData?.transactionCount ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-300">Average Value</p>
                <p className="text-2xl font-bold text-white">
                  {summaryData ? formatCurrency(summaryData.averageTransactionValue) : formatCurrency(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-300">Top Performer</p>
                <p className="text-lg font-bold text-white">
                  {summaryData?.salesByUser && summaryData.salesByUser.length > 0 
                    ? formatCurrency(summaryData.salesByUser[0].totalSales)
                    : formatCurrency(0)
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!summaryData && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 mb-2">No data available for the selected date.</p>
            <p className="text-sm text-gray-400 mb-4">
              Selected date: {selectedDate.toLocaleDateString()}
            </p>
            <div className="text-sm text-gray-400 space-y-1">
              <p>• Make sure you're querying a date with completed sales</p>
              <p>• Try selecting today's date ({new Date().toLocaleDateString()}) or a date range that includes sales</p>
              <p>• Note: Only sales with status "COMPLETED" are included in reports</p>
              <p>• Sales with status "PARTIAL" or "DRAFT" are not included</p>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-4"
                onClick={() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  setSelectedDate(today);
                  setDateRange(undefined);
                }}
              >
                Load Today's Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="users">Sales by User</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
          <TabsTrigger value="hourly">Hourly Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Payment Methods</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethods.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No payment data available
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <div key={method.method} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getPaymentMethodIcon(method.method)}
                          <span className="text-sm font-medium">
                            {getPaymentMethodLabel(method.method)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(method.netAmount ?? method.totalAmount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Gross {formatCurrency(method.totalAmount)} · Refunds {formatCurrency(method.refundAmount ?? 0)}
                          </div>
                          <div className="text-xs text-gray-500">{method.count} transactions</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Products */}
            {summaryData?.returnSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <RotateCcw className="h-5 w-5" />
                    <span>Return Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-900/40 rounded-lg text-center">
                      <p className="text-sm text-gray-400">Processed</p>
                      <p className="text-xl font-semibold text-white">
                        {summaryData.returnSummary.processedReturns}
                      </p>
                      <p className="text-xs text-emerald-400">
                        {formatCurrency(summaryData.returnSummary.processedAmount)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-900/40 rounded-lg text-center">
                      <p className="text-sm text-gray-400">Pending</p>
                      <p className="text-xl font-semibold text-white">
                        {summaryData.returnSummary.pendingReturns}
                      </p>
                      <p className="text-xs text-yellow-400">
                        {formatCurrency(summaryData.returnSummary.pendingAmount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Top Products</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(summaryData?.topProducts?.length === 0 || topProducts.length === 0) ? (
                  <div className="text-center py-8 text-gray-500">
                    No product data available
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(topProducts.length > 0 ? topProducts : summaryData?.topProducts || []).slice(0, 5).map((product, index) => (
                      <div key={product.name} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-gray-500">
                            {product.quantity} sold • {product.salesCount} transactions
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(product.revenue)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top Selling Products</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => handleExportReport('Top Products')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No product data available for the selected period
                </div>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            {product.quantity} units sold • {product.salesCount} transactions
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatCurrency(product.revenue)}</div>
                        <div className="text-sm text-gray-500">
                          Avg: {formatCurrency(product.averagePrice || product.revenue / product.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales by User Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sales by User</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => handleExportReport('Sales by User')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {salesByUser.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No user data available for the selected period
                </div>
              ) : (
                <div className="space-y-4">
                  {salesByUser.map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">{user.userName}</div>
                          <div className="text-sm text-gray-500">
                            {user.transactionCount} transactions
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatCurrency(user.totalSales)}</div>
                        <div className="text-sm text-gray-500">
                          Avg: {formatCurrency(user.averageValue || user.totalSales / user.transactionCount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment Methods Analysis</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => handleExportReport('Payment Methods')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payment data available for the selected period
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <div key={method.method} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getPaymentMethodIcon(method.method)}
                        <div>
                          <div className="font-medium">{getPaymentMethodLabel(method.method)}</div>
                          <div className="text-sm text-gray-500">
                            {method.count} transactions
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatCurrency(method.netAmount ?? method.totalAmount)}</div>
                        <div className="text-sm text-gray-500">
                          {method.percentage.toFixed(1)}% of net volume
                        </div>
                        <div className="text-xs text-gray-500">
                          Gross {formatCurrency(method.grossAmount ?? method.totalAmount)} · Refunds {formatCurrency(method.refundAmount ?? 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hourly Analysis Tab */}
        <TabsContent value="hourly" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Hourly Sales Analysis</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => handleExportReport('Hourly Analysis')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {hourlySales.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hourly data available for the selected date
                </div>
              ) : (
                <div className="space-y-4">
                  {hourlySales.map((hour) => (
                    <div key={hour.hour} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="font-medium">
                            {hour.label || `${hour.hour}:00 - ${hour.hour + 1}:00`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {hour.transactionCount} transactions
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatCurrency(hour.totalSales || hour.averageTransactionValue * hour.transactionCount)}</div>
                        <div className="text-sm text-gray-500">
                          Avg: {formatCurrency(hour.averageTransactionValue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
