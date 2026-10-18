'use client';

import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Search, Filter, Download, Eye, Receipt, RefreshCw, Calendar, User, MapPin, CreditCard, DollarSign, ShoppingCart, Undo2, RotateCcw, Edit, X, MoreVertical, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import RefundModal, { RefundData } from '@/components/pos/RefundModal';
import { useCancelSale } from '@/hooks/pos/useSaleMutations';
import { canEditSale } from '@/lib/sale-utils';
import { userResolver } from '@/lib/user-resolver';

interface Sale {
  id: string;
  saleNumber: string;
  saleDate: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
  };
  location: {
    id: string;
    name: string;
  };
  createdById: string;
  saleType: 'RETAIL' | 'SERVICE';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  changeGiven: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'CANCELLED';
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'CREDIT' | 'PARTIAL';
  _count: {
    saleItems: number;
    payments: number;
  };
  saleReturns?: Array<{
    id: string;
    status: string;
  }>;
  returns?: Array<{
    id: string;
    status: string;
  }>;
  createdAt: string;
}

interface SaleDetails {
  id: string;
  saleNumber: string;
  saleDate: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  location: {
    id: string;
    name: string;
    address?: string;
  };
  createdById: string;
  saleType: 'RETAIL' | 'SERVICE';
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  changeGiven: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'CANCELLED';
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'CREDIT' | 'PARTIAL';
  notes?: string;
  customerNotes?: string;
  saleItems: Array<{
    id: string;
    itemType: 'PRODUCT' | 'SERVICE';
    itemName: string;
    itemDescription?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    lineSubtotal: number;
    itemTaxAmount: number;
    itemDiscountAmount: number;
    lineTotal: number;
    product?: {
      id: string;
      name: string;
      sku: string;
    };
  }>;
  payments: Array<{
    id: string;
    paymentMethod: 'CASH' | 'CARD' | 'MOBILE_PAYMENT' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
    amount: number;
    referenceNumber?: string;
    cardLastFour?: string;
    cardType?: string;
    bankName?: string;
    chequeNumber?: string;
    paymentDate: string;
    processor: {
      id: string;
      name: string;
    };
  }>;
  receipts: Array<{
    id: string;
    receiptNumber: string;
    format: 'PDF' | 'THERMAL';
    generatedAt: string;
    printCount: number;
  }>;
  refunds: Array<{
    id: string;
    refundNumber: string;
    refundType: 'FULL' | 'PARTIAL';
    refundAmount: number;
    refundMethod: string;
    reason: string;
    processedAt: string;
  }>;
  saleReturns?: Array<{
    id: string;
    status: string;
  }>;
  returns?: Array<{
    id: string;
    status: string;
  }>;
}

interface Location {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function SalesHistoryPage() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleDetails | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [saleToRefund, setSaleToRefund] = useState<Sale | null>(null);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const cancelSaleMutation = useCancelSale();
  const [isRecalculatingStatus, setIsRecalculatingStatus] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [saleForPayment, setSaleForPayment] = useState<Sale | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
    // Handler to open payment modal
    const handleOpenPaymentModal = (sale: Sale) => {
      setSaleForPayment(sale);
      setPaymentAmount(sale.totalAmount - sale.amountPaid);
      setPaymentMethod('CASH');
      setShowPaymentModal(true);
    };

    // Handler to process payment
    const handleProcessPayment = async () => {
      if (!saleForPayment) return;
      setIsProcessingPayment(true);
      try {
        await apiClient.post(`/pos/sales/${saleForPayment.id}/payments`, {
          amount: paymentAmount,
          paymentMethod,
        });
        toast.success('Payment added successfully');
        setShowPaymentModal(false);
        setSaleForPayment(null);
        await loadSales();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to add payment');
      } finally {
        setIsProcessingPayment(false);
      }
    };

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [saleTypeFilter, setSaleTypeFilter] = useState<string>('all');
  
  // Data for filters
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalSales: 0,
    totalAmount: 0,
    averageValue: 0,
    pendingPayments: 0,
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const displayedRangeStart =
    sales.length === 0
      ? 0
      : totalItems > 0
      ? Math.min((currentPage - 1) * pageSize + 1, totalItems)
      : (currentPage - 1) * pageSize + 1;
  const displayedRangeEnd =
    sales.length === 0
      ? 0
      : totalItems > 0
      ? Math.min((currentPage - 1) * pageSize + sales.length, totalItems)
      : (currentPage - 1) * pageSize + sales.length;

  // Reset to page 1 when search term or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange, locationFilter, customerFilter, userFilter, statusFilter, paymentStatusFilter, saleTypeFilter]);

  useEffect(() => {
    loadSales();
  }, [currentPage, pageSize, searchTerm, dateRange, locationFilter, customerFilter, userFilter, statusFilter, paymentStatusFilter, saleTypeFilter]);

  useEffect(() => {
    loadLocations();
    loadUsers();
  }, []);

  // Initialize stats loading state on component mount
  useEffect(() => {
    setIsStatsLoading(true);
  }, []);

  const loadSales = async () => {
    try {
      setIsLoading(true);
      setIsStatsLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { saleNumber: searchTerm }),
        ...(dateRange?.from && { startDate: dateRange.from.toISOString().split('T')[0] }),
        ...(dateRange?.to && { endDate: dateRange.to.toISOString().split('T')[0] }),
        ...(locationFilter && locationFilter !== 'all' && { locationId: locationFilter }),
        ...(customerFilter && customerFilter !== 'all' && { customerId: customerFilter }),
        ...(userFilter && userFilter !== 'all' && { createdById: userFilter }),
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(paymentStatusFilter && paymentStatusFilter !== 'all' && { paymentStatus: paymentStatusFilter }),
        ...(saleTypeFilter && saleTypeFilter !== 'all' && { saleType: saleTypeFilter }),
      });

      const response = await apiClient.get(`/pos/sales?${params}`);
      const data = response.data;
      
      setSales(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalItems(data.meta?.totalItems || 0);
      
      // Load summary stats separately (all data, not just current page)
      await loadSummaryStats();
    } catch (error) {
      toast.error('Error loading sales');
      console.error(error);
      // Set empty stats on error
      setSummaryStats({
        totalSales: 0,
        totalAmount: 0,
        averageValue: 0,
        pendingPayments: 0,
      });
      setIsStatsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummaryStats = async () => {
    try {
      // First try the dedicated stats endpoint
      const statsParams = new URLSearchParams({
        ...(searchTerm && { saleNumber: searchTerm }),
        ...(dateRange?.from && { startDate: dateRange.from.toISOString().split('T')[0] }),
        ...(dateRange?.to && { endDate: dateRange.to.toISOString().split('T')[0] }),
        ...(locationFilter && locationFilter !== 'all' && { locationId: locationFilter }),
        ...(customerFilter && customerFilter !== 'all' && { customerId: customerFilter }),
        ...(userFilter && userFilter !== 'all' && { createdById: userFilter }),
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(paymentStatusFilter && paymentStatusFilter !== 'all' && { paymentStatus: paymentStatusFilter }),
        ...(saleTypeFilter && saleTypeFilter !== 'all' && { saleType: saleTypeFilter }),
      });

      const response = await apiClient.get(`/pos/sales-statistics?${statsParams}`);
      const stats = response.data;
      
      setSummaryStats({
        totalSales: stats.totalSales || 0,
        totalAmount: stats.totalAmount || 0,
        averageValue: stats.averageValue || 0,
        pendingPayments: stats.pendingPayments || 0,
      });
    } catch (error) {
      console.error('Dedicated stats endpoint failed, using fallback method:', error);
      
      // Fallback: Load all sales data to calculate stats properly
      try {
        const allSalesParams = new URLSearchParams({
          page: '1',
          limit: '1000', // Get more data for accurate stats
          ...(searchTerm && { saleNumber: searchTerm }),
          ...(dateRange?.from && { startDate: dateRange.from.toISOString().split('T')[0] }),
          ...(dateRange?.to && { endDate: dateRange.to.toISOString().split('T')[0] }),
          ...(locationFilter && locationFilter !== 'all' && { locationId: locationFilter }),
          ...(customerFilter && customerFilter !== 'all' && { customerId: customerFilter }),
          ...(userFilter && userFilter !== 'all' && { createdById: userFilter }),
          ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
          ...(paymentStatusFilter && paymentStatusFilter !== 'all' && { paymentStatus: paymentStatusFilter }),
          ...(saleTypeFilter && saleTypeFilter !== 'all' && { saleType: saleTypeFilter }),
        });

        const response = await apiClient.get(`/pos/sales?${allSalesParams}`);
        const allSales = response.data.data || [];
        
        const totalAmount = allSales.reduce((sum: number, sale: Sale) => sum + (sale.totalAmount || 0), 0);
        const pendingCount = allSales.filter((sale: Sale) => sale.paymentStatus === 'PENDING').length;
        
        setSummaryStats({
          totalSales: allSales.length,
          totalAmount,
          averageValue: allSales.length > 0 ? totalAmount / allSales.length : 0,
          pendingPayments: pendingCount,
        });
      } catch (fallbackError) {
        console.error('Fallback stats calculation failed:', fallbackError);
        // Last resort: use current page data
        const totalAmount = sales.reduce((sum: number, sale: Sale) => sum + (sale.totalAmount || 0), 0);
        const pendingCount = sales.filter((sale: Sale) => sale.paymentStatus === 'PENDING').length;
        
        setSummaryStats({
          totalSales: sales.length,
          totalAmount,
          averageValue: sales.length > 0 ? totalAmount / sales.length : 0,
          pendingPayments: pendingCount,
        });
      }
    } finally {
      setIsStatsLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await apiClient.get('/locations');
      const data = response.data;
      setLocations(data.data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      const data = response.data;
      setUsers(data.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadSaleDetails = async (saleId: string) => {
    try {
      const response = await apiClient.get(`/pos/sales/${saleId}`);
      const saleDetails = response.data;
      setSelectedSale(saleDetails);
      setShowDetailsDialog(true);
    } catch (error) {
      toast.error('Error loading sale details');
      console.error(error);
    }
  };

  const handleRefund = async (sale: Sale) => {
    // Check if sale can be refunded
    if (sale.status === 'CANCELLED') {
      toast.error('Cannot refund a cancelled sale');
      return;
    }
    
    if (sale.paymentStatus === 'CANCELLED') {
      toast.error('Cannot refund a cancelled sale');
      return;
    }

    // Allow refund if sale is completed or if it's been partially refunded (status might be REFUNDED but we allow partial)
    if (sale.paymentStatus === 'REFUNDED' && sale.status === 'REFUNDED') {
      toast.error('This sale has already been fully refunded');
      return;
    }

    setSaleToRefund(sale);
    setShowRefundModal(true);
  };

  const handleConfirmRefund = async (refundData: RefundData) => {
    if (!saleToRefund) return;

    try {
      setIsProcessingRefund(true);
      
      const response = await apiClient.post(`/pos/sales/${saleToRefund.id}/refund`, refundData);
      
      toast.success(`Refund processed successfully. Refund #${response.data.refundNumber}`);
      
      // Refresh sales list
      await loadSales();
      
      // Close modal
      setShowRefundModal(false);
      setSaleToRefund(null);
    } catch (error: any) {
      console.error('Refund error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to process refund. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handlePrintReceipt = async (saleId: string, format: 'PDF' | 'THERMAL') => {
    try {
      // First, generate the receipt (returns JSON with receipt data)
      const generateResponse = await apiClient.post(`/receipts/generate/${saleId}?format=${format}`);
      
      // Log response for debugging
      console.log('Generate receipt response:', {
        status: generateResponse.status,
        data: generateResponse.data,
        headers: generateResponse.headers
      });
      
      // Check if response is valid
      if (!generateResponse || !generateResponse.data) {
        console.error('Invalid response:', generateResponse);
        throw new Error('Invalid response from receipt generation endpoint');
      }
      
      // Extract receipt from response (handle different response structures)
      const responseData = generateResponse.data;
      const receipt = responseData.receipt || responseData;
      
      if (!receipt) {
        console.error('No receipt in response:', responseData);
        throw new Error('Receipt generation failed: No receipt data in response');
      }
      
      if (!receipt.id) {
        console.error('Receipt missing ID:', receipt);
        throw new Error('Receipt generation failed: Receipt ID missing');
      }

      console.log('Receipt generated successfully:', receipt);

      if (format === 'PDF') {
        // Download the PDF receipt using the receipt ID
        const downloadResponse = await apiClient.get(`/receipts/${receipt.id}/download`, {
          responseType: 'blob'
        });
        
        if (!downloadResponse.data) {
          throw new Error('Failed to download receipt file');
        }
        
        const blob = new Blob([downloadResponse.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${receipt.receiptNumber || saleId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('PDF receipt downloaded successfully');
      } else {
        // For thermal receipts, get the thermal receipt content
        const thermalResponse = await apiClient.get(`/receipts/${receipt.id}/thermal`);
        const text = thermalResponse.data?.thermalText || thermalResponse.data;
        
        if (!text) {
          throw new Error('Failed to retrieve thermal receipt content');
        }
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Receipt</title>
                <style>
                  body { 
                    font-family: monospace; 
                    font-size: 12px; 
                    white-space: pre-wrap;
                    padding: 20px;
                  }
                </style>
              </head>
              <body>
                <pre>${text}</pre>
              </body>
            </html>
          `);
          printWindow.document.close();
          // Wait a bit for the content to load before printing
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
        
        toast.success('Thermal receipt opened for printing');
      }
    } catch (error: any) {
      console.error('Error generating receipt:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to generate receipt';
      toast.error(errorMessage);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'COMPLETED': 'default',
      'DRAFT': 'secondary',
      'CANCELLED': 'destructive',
      'REFUNDED': 'outline',
    };
    
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'PAID': 'default',
      'PENDING': 'secondary',
      'PARTIAL': 'outline',
      'REFUNDED': 'destructive',
      'CANCELLED': 'destructive',
    };
    
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Memoized stats calculation to prevent unnecessary re-renders
  const memoizedStats = useMemo(() => {
    if (isStatsLoading) {
      return {
        totalSales: 0,
        totalAmount: 0,
        averageValue: 0,
        pendingPayments: 0,
      };
    }
    return summaryStats;
  }, [summaryStats, isStatsLoading]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Sales History</h1>
          <p className="text-gray-300">View and manage all sales transactions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/pos/returns">
            <Button 
              variant="outline" 
              className="bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Sale Returns
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => window.open('/dashboard/pos/credit-sales', '_blank')}
            className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Manage Credit Sales
          </Button>
          <Button variant="outline" onClick={loadSales}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Sales</p>
                {isStatsLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                ) : (
                  <p className="text-2xl font-bold">{memoizedStats.totalSales}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Total Amount</p>
                {isStatsLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(memoizedStats.totalAmount)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Average Value</p>
                {isStatsLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(memoizedStats.averageValue)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Pending Payments</p>
                {isStatsLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                ) : (
                  <p className="text-2xl font-bold">{memoizedStats.pendingPayments}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Sale number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label>Date Range</Label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
            
            <div>
              <Label>Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
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
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Payment Status</Label>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All payment statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payment statuses</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Sale Type</Label>
              <Select value={saleTypeFilter} onValueChange={setSaleTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All sale types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sale types</SelectItem>
                  <SelectItem value="RETAIL">Retail</SelectItem>
                  <SelectItem value="SERVICE">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Created By</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setDateRange(undefined);
                  setLocationFilter('');
                  setCustomerFilter('');
                  setUserFilter('');
                  setStatusFilter('');
                  setPaymentStatusFilter('');
                  setSaleTypeFilter('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading sales...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No sales found</p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale Number</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Sale Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div className="font-medium">{sale.saleNumber}</div>
                        <div className="text-sm text-gray-500">{sale.saleType}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(sale.saleDate)}</div>
                          <div className="text-gray-500">
                            {new Date(sale.saleDate).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sale.customer ? (
                          <div>
                            <div className="font-medium">{sale.customer.name}</div>
                            {sale.customer.email && (
                              <div className="text-sm text-gray-500">{sale.customer.email}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Guest</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <MapPin className="h-3 w-3 mr-1" />
                          {sale.location.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{sale._count.saleItems} items</div>
                          <div className="text-gray-500">{sale._count.payments} payments</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(sale.totalAmount)}</div>
                        {sale.changeGiven > 0 && (
                          <div className="text-sm text-gray-500">
                            Change: {formatCurrency(sale.changeGiven)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(sale.paymentStatus)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(sale.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <User className="h-3 w-3 mr-1" />
                          {userResolver.getUserName(sale.createdById)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => loadSaleDetails(sale.id)}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handlePrintReceipt(sale.id, 'PDF')}
                                className="cursor-pointer"
                              >
                                <Receipt className="h-4 w-4 mr-2" />
                                Download Receipt
                              </DropdownMenuItem>
                              {/* Edit - Show for editable sales */}
                              {(() => {
                                const editCheck = canEditSale(sale);
                                if (editCheck.canEdit) {
                                  return (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => router.push(`/dashboard/pos/sales/${sale.id}/edit`)}
                                        className="cursor-pointer text-blue-600"
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit Sale
                                      </DropdownMenuItem>
                                    </>
                                  );
                                } else {
                                  return (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        disabled
                                        className="cursor-not-allowed text-gray-400"
                                        title={editCheck.reason}
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit Sale
                                      </DropdownMenuItem>
                                    </>
                                  );
                                }
                              })()}
                              {/* Add Payment - Show for DRAFT, COMPLETED, PARTIAL, CREDIT */}
                              {(sale.status === 'DRAFT' || sale.status === 'COMPLETED' || sale.status === 'PARTIAL' || sale.status === 'CREDIT') &&
                                (sale.paymentStatus === 'PENDING' || sale.paymentStatus === 'PARTIAL') && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleOpenPaymentModal(sale)}
                                      className="cursor-pointer text-green-600"
                                    >
                                      <CreditCard className="h-4 w-4 mr-2" />
                                      Add Payment
                                    </DropdownMenuItem>
                                  </>
                                )}
                                    {/* Payment Modal */}
                                    {showPaymentModal && saleForPayment && (
                                      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Add Payment</DialogTitle>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <div>
                                              <Label>Amount</Label>
                                              <Input
                                                type="number"
                                                min={1}
                                                max={saleForPayment.totalAmount - saleForPayment.amountPaid}
                                                value={paymentAmount}
                                                onChange={e => setPaymentAmount(Number(e.target.value))}
                                                className="w-full"
                                              />
                                            </div>
                                            <div>
                                              <Label>Method</Label>
                                              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                <SelectTrigger className="w-full">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="CASH">Cash</SelectItem>
                                                  <SelectItem value="CREDIT">Credit</SelectItem>
                                                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                                                  <SelectItem value="ONLINE">Online</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </div>
                                          <DialogFooter>
                                            <Button variant="outline" onClick={() => setShowPaymentModal(false)} disabled={isProcessingPayment}>
                                              Cancel
                                            </Button>
                                            <Button onClick={handleProcessPayment} disabled={isProcessingPayment || paymentAmount <= 0}>
                                              {isProcessingPayment ? 'Processing...' : 'Add Payment'}
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                    )}
                              {/* Cancel - Show for cancellable sales */}
                              {sale.status !== 'CANCELLED' && 
                               sale.status !== 'REFUNDED' && 
                               sale.paymentStatus !== 'CANCELLED' && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSaleToCancel(sale);
                                    setShowCancelDialog(true);
                                  }}
                                  className="cursor-pointer text-red-600"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel Sale
                                </DropdownMenuItem>
                              )}
                              {/* Refund - Show for completed/refunded sales */}
                              {(sale.status === 'COMPLETED' || sale.status === 'REFUNDED') &&
                               sale.paymentStatus !== 'CANCELLED' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleRefund(sale)}
                                    className="cursor-pointer text-red-600"
                                    disabled={sale.paymentStatus === 'REFUNDED'}
                                  >
                                    <Undo2 className="h-4 w-4 mr-2" />
                                    {sale.paymentStatus === 'REFUNDED' ? 'Refunded' : 'Process Refund'}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {/* Create Return - Show for completed/refunded/credit sales */}
                              {(sale.status === 'COMPLETED' || sale.status === 'REFUNDED' || sale.status === 'CREDIT' || sale.status === 'PARTIAL') && (
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/pos/returns/create?saleId=${sale.id}`)}
                                  className="cursor-pointer"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Create Sale Return
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Rows per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 text-sm text-gray-500 md:flex-row md:items-center md:gap-4">
                <span>
                  {sales.length === 0
                    ? 'No records to display'
                    : `Showing ${displayedRangeStart}-${displayedRangeEnd}${
                        totalItems ? ` of ${totalItems}` : ''
                      }`}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {currentPage} of {Math.max(totalPages, 1)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Sale Details</DialogTitle>
              <div className="flex items-center gap-2">
                {/* Recalculate Status Button */}
                {selectedSale && selectedSale.status !== 'CANCELLED' && 
                 selectedSale.status !== 'REFUNDED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        setIsRecalculatingStatus(true);
                        await apiClient.post(`/pos/sales/${selectedSale.id}/recalculate-status`);
                        toast.success('Sale status recalculated successfully');
                        // Reload sale details to show updated status
                        await loadSaleDetails(selectedSale.id);
                        // Reload sales list to update status in table
                        loadSales();
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || 'Error recalculating sale status');
                        console.error(error);
                      } finally {
                        setIsRecalculatingStatus(false);
                      }
                    }}
                    disabled={isRecalculatingStatus}
                    className="text-green-600 hover:text-green-700"
                    title="Recalculate sale status based on current payments and returns"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {isRecalculatingStatus ? 'Recalculating...' : 'Recalculate Status'}
                  </Button>
                )}
                {/* Edit Button */}
                {selectedSale && (() => {
                  const editCheck = canEditSale(selectedSale);
                  if (editCheck.canEdit) {
                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowDetailsDialog(false);
                          router.push(`/dashboard/pos/sales/${selectedSale.id}/edit`);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Sale
                      </Button>
                    );
                  } else {
                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="text-gray-400 cursor-not-allowed"
                        title={editCheck.reason}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Sale
                      </Button>
                    );
                  }
                })()}
                {/* Cancel Button */}
                {selectedSale && selectedSale.status !== 'CANCELLED' && 
                 selectedSale.status !== 'REFUNDED' && 
                 selectedSale.paymentStatus !== 'CANCELLED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDetailsDialog(false);
                      const saleForCancel: Sale = {
                        id: selectedSale.id,
                        saleNumber: selectedSale.saleNumber,
                        saleDate: selectedSale.saleDate,
                        customer: selectedSale.customer,
                        location: selectedSale.location,
                        createdById: selectedSale.createdById,
                        saleType: selectedSale.saleType,
                        subtotal: selectedSale.subtotal,
                        taxAmount: selectedSale.taxAmount,
                        discountAmount: selectedSale.discountAmount,
                        totalAmount: selectedSale.totalAmount,
                        amountPaid: selectedSale.amountPaid,
                        changeGiven: 0,
                        paymentStatus: selectedSale.paymentStatus,
                        status: selectedSale.status,
                        _count: { saleItems: selectedSale.saleItems.length, payments: selectedSale.payments.length },
                        createdAt: selectedSale.saleDate,
                      };
                      setSaleToCancel(saleForCancel);
                      setShowCancelDialog(true);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Sale
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          {selectedSale && (
            <ScrollArea className="max-h-[70vh]">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="items">Items</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="receipts">Receipts</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Sale Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Sale Number</Label>
                          <p className="text-sm text-gray-600">{selectedSale.saleNumber}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Date & Time</Label>
                          <p className="text-sm text-gray-600">{formatDateTime(selectedSale.saleDate)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Sale Type</Label>
                          <p className="text-sm text-gray-600">{selectedSale.saleType}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Status</Label>
                          <div className="mt-1">{getStatusBadge(selectedSale.status)}</div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Payment Status</Label>
                          <div className="mt-1">{getPaymentStatusBadge(selectedSale.paymentStatus)}</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Customer Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedSale.customer ? (
                          <>
                            <div>
                              <Label className="text-sm font-medium">Name</Label>
                              <p className="text-sm text-gray-600">{selectedSale.customer.name}</p>
                            </div>
                            {selectedSale.customer.email && (
                              <div>
                                <Label className="text-sm font-medium">Email</Label>
                                <p className="text-sm text-gray-600">{selectedSale.customer.email}</p>
                              </div>
                            )}
                            {selectedSale.customer.phone && (
                              <div>
                                <Label className="text-sm font-medium">Phone</Label>
                                <p className="text-sm text-gray-600">{selectedSale.customer.phone}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-500">Guest customer</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Financial Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(selectedSale.subtotal)}</span>
                        </div>
                        {selectedSale.discountAmount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount:</span>
                            <span>-{formatCurrency(selectedSale.discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Tax ({selectedSale.taxRate}%):</span>
                          <span>{formatCurrency(selectedSale.taxAmount)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span>{formatCurrency(selectedSale.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount Paid:</span>
                          <span>{formatCurrency(selectedSale.amountPaid)}</span>
                        </div>
                        {selectedSale.changeGiven > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Change Given:</span>
                            <span>{formatCurrency(selectedSale.changeGiven)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="items" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sale Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Tax</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSale.saleItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.itemName}</div>
                                  {item.sku && (
                                    <div className="text-sm text-gray-500">{item.sku}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.itemType}</Badge>
                              </TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                              <TableCell>
                                {item.itemDiscountAmount > 0 ? (
                                  <span className="text-green-600">
                                    -{formatCurrency(item.itemDiscountAmount)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.itemTaxAmount > 0 ? (
                                  <span>{formatCurrency(item.itemTaxAmount)}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(item.lineTotal)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="payments" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedSale.payments.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No payments recorded</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Method</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Reference</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Processed By</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedSale.payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  <Badge variant="outline">{payment.paymentMethod}</Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                                <TableCell>
                                  {payment.referenceNumber || '-'}
                                </TableCell>
                                <TableCell>
                                  {formatDateTime(payment.paymentDate)}
                                </TableCell>
                                <TableCell>{payment.processor.name}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="receipts" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Generated Receipts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedSale.receipts.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No receipts generated</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedSale.receipts.map((receipt) => (
                            <div key={receipt.id} className="flex items-center justify-between p-3 border rounded">
                              <div>
                                <div className="font-medium">{receipt.receiptNumber}</div>
                                <div className="text-sm text-gray-500">
                                  {receipt.format} • {receipt.printCount} prints
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePrintReceipt(selectedSale.id, receipt.format)}
                                >
                                  <Receipt className="h-4 w-4 mr-2" />
                                  Print
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      {saleToRefund && (
        <RefundModal
          isOpen={showRefundModal}
          onClose={() => {
            setShowRefundModal(false);
            setSaleToRefund(null);
          }}
          onConfirm={handleConfirmRefund}
          sale={{
            id: saleToRefund.id,
            saleNumber: saleToRefund.saleNumber,
            totalAmount: saleToRefund.totalAmount,
            amountPaid: saleToRefund.amountPaid,
            status: saleToRefund.status,
            paymentStatus: saleToRefund.paymentStatus,
          }}
          isProcessing={isProcessingRefund}
        />
      )}

      {/* Cancel Sale Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Sale</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this sale? This action will reverse all impacts including stock, customer balance, and cash transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {saleToCancel && (
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm font-medium">Sale #{saleToCancel.saleNumber}</p>
                <p className="text-sm text-gray-600">Total: {formatCurrency(saleToCancel.totalAmount)}</p>
              </div>
            )}
            <div>
              <Label>Reason for Cancellation *</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Customer requested cancellation, duplicate sale..."
                rows={3}
                required
              />
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action cannot be undone. All stock will be restored, customer balance will be adjusted, and cash transactions will be reversed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCancelDialog(false);
              setSaleToCancel(null);
              setCancelReason('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!saleToCancel || !cancelReason.trim()) return;
                try {
                  await cancelSaleMutation.mutateAsync({
                    id: saleToCancel.id,
                    data: {
                      reason: cancelReason,
                      reverseStock: true,
                      reverseCustomerBalance: true,
                      reverseCashTransaction: true,
                    },
                  });
                  setShowCancelDialog(false);
                  setSaleToCancel(null);
                  setCancelReason('');
                  await loadSales();
                } catch (error) {
                  // Error handled by mutation hook
                }
              }}
              disabled={!cancelReason.trim() || cancelSaleMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelSaleMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
