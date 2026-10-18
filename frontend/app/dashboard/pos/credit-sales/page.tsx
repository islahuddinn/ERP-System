'use client';

import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CreditCard, 
  DollarSign, 
  User, 
  Calendar,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Edit,
  X,
  MoreVertical,
  RotateCcw,
  Percent,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { useRouter } from 'next/navigation';
import { useCancelSale } from '@/hooks/pos/useSaleMutations';
import { canEditSale } from '@/lib/sale-utils';
import { userResolver } from '@/lib/user-resolver';

interface CreditSale {
  id: string;
  saleNumber: string;
  saleDate: string;
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    balance: number;
  };
  location: {
    id: string;
    name: string;
  };
  createdById: string;
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'PARTIAL' | 'CREDIT';
  payments: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    referenceNumber?: string;
    notes?: string;
  }>;
  saleReturns?: Array<{
    id: string;
    status: string;
  }>;
  returns?: Array<{
    id: string;
    status: string;
  }>;
  _count?: {
    payments: number;
  };
  createdAt: string;
}

interface PaymentFormData {
  amount: number;
  paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE_PAYMENT' | 'OTHER';
  referenceNumber: string;
  notes: string;
}

export default function CreditSalesPage() {
  const router = useRouter();
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<CreditSale | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<CreditSale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  
  // Payment form
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    amount: 0,
    paymentMethod: 'CASH',
    referenceNumber: '',
    notes: ''
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isDiscountMode, setIsDiscountMode] = useState(false);

  // Cancel sale mutation
  const cancelSaleMutation = useCancelSale();

  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalCreditSales: 0,
    totalOutstanding: 0,
    totalCollected: 0,
    averageOutstanding: 0,
  });
  const displayedRangeStart =
    creditSales.length === 0
      ? 0
      : totalItems > 0
      ? Math.min((currentPage - 1) * pageSize + 1, totalItems)
      : (currentPage - 1) * pageSize + 1;
  const displayedRangeEnd =
    creditSales.length === 0
      ? 0
      : totalItems > 0
      ? Math.min((currentPage - 1) * pageSize + creditSales.length, totalItems)
      : (currentPage - 1) * pageSize + creditSales.length;

  // Reset to page 1 when search term or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange, statusFilter, customerFilter]);

  useEffect(() => {
    loadCreditSales();
  }, [currentPage, pageSize, searchTerm, dateRange, statusFilter, customerFilter]);

  const loadCreditSales = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        statuses: statusFilter === 'all' ? 'CREDIT,PARTIAL' : statusFilter, // Filter by status
        ...(searchTerm && { saleNumber: searchTerm }),
        ...(dateRange?.from && { startDate: dateRange.from.toISOString().split('T')[0] }),
        ...(dateRange?.to && { endDate: dateRange.to.toISOString().split('T')[0] }),
        ...(customerFilter && customerFilter !== 'all' && { customerId: customerFilter }),
      });

      const response = await apiClient.get(`/pos/sales?${params}`);
      const data = response.data;
      
      // Filter for credit sales and calculate outstanding balances
      const creditSalesData = (data.data || [])
        .map((sale: any) => {
          // Calculate net payments from all payment records
          // Positive amounts = payments (reduce outstanding)
          // Negative amounts = refunds (increase outstanding back)
          const netPayments = (sale.payments || []).reduce((sum: number, payment: any) => {
            return sum + Number(payment.amount || 0);
          }, 0);
          
          // Outstanding balance = totalAmount - netPayments
          // For credit sale with refund: 1200000 - (-600000) = 1800000 (wrong!)
          // The issue is refunds are stored as negative, but they should reduce outstanding
          // So we need: outstanding = totalAmount - (positive payments) - (absolute value of refunds)
          const positivePayments = (sale.payments || [])
            .filter((p: any) => Number(p.amount || 0) > 0)
            .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
          
          const refunds = (sale.payments || [])
            .filter((p: any) => Number(p.amount || 0) < 0)
            .reduce((sum: number, p: any) => sum + Math.abs(Number(p.amount || 0)), 0);
          
          // Outstanding = total - payments + refunds (refunds increase what's owed)
          // But actually, refunds should reduce outstanding, so:
          // Outstanding = total - payments - refunds
          const outstandingBalance = Number(sale.totalAmount) - positivePayments - refunds;
          
          return {
            ...sale,
            outstandingBalance: Math.max(0, outstandingBalance), // Ensure non-negative
            customer: sale.customer
              ? {
                  ...sale.customer,
                  balance: Number(sale.customer.balance || 0),
                }
              : {
                  id: '',
                  name: 'Walk-in Customer',
                  email: undefined,
                  phone: undefined,
                  balance: 0,
                },
            totalAmount: Number(sale.totalAmount),
            amountPaid: positivePayments, // Show only positive payments
          };
        })
        .filter((sale: any) => {
          // Only include sales that have outstanding balance AND are not cancelled/refunded
          return (
            sale.outstandingBalance > 0 &&
            sale.status !== 'CANCELLED' &&
            sale.status !== 'REFUNDED'
          );
        });
      
      setCreditSales(creditSalesData);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalItems(data.meta?.totalItems || 0);
      
      // Calculate summary stats
      const totalOutstanding = creditSalesData.reduce((sum: any, sale: any) => sum + sale.outstandingBalance, 0);
      const totalCollected = creditSalesData.reduce((sum: any, sale: any) => sum + (sale.amountPaid || 0), 0);
      
      setSummaryStats({
        totalCreditSales: creditSalesData.length,
        totalOutstanding,
        totalCollected,
        averageOutstanding: creditSalesData.length > 0 ? totalOutstanding / creditSalesData.length : 0,
      });
    } catch (error: any) {
      console.error('Error loading credit sales:', error);
      toast.error(error.response?.data?.message || 'Error loading credit sales');
      
      // Set empty data on error
      setCreditSales([]);
      setSummaryStats({
        totalCreditSales: 0,
        totalOutstanding: 0,
        totalCollected: 0,
        averageOutstanding: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPayment = (sale: CreditSale) => {
    // Check if sale is cancelled or refunded
    if (sale.status === 'CANCELLED' || sale.status === 'REFUNDED') {
      toast.error('Cannot add payment to cancelled or refunded sale');
      return;
    }

    setSelectedSale(sale);
    setPaymentForm({
      amount: 0,
      paymentMethod: 'CASH',
      referenceNumber: '',
      notes: ''
    });
    setIsDiscountMode(false); // Reset to payment mode
    setShowPaymentDialog(true);
  };

  const handleViewDetails = (sale: CreditSale) => {
    console.log('🔍 Viewing sale with payments:', {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      payments: sale.payments,
      paymentsCount: sale.payments?.length || 0,
      amountPaid: sale.amountPaid,
      totalAmount: sale.totalAmount
    });
    setSelectedSale(sale);
    setShowDetailsModal(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedSale) {
      toast.error('No sale selected');
      return;
    }

    if (isDiscountMode) {
      // Discount mode: amount should be positive, will be sent as negative
      if (paymentForm.amount <= 0) {
        toast.error('Please enter a valid discount amount');
        return;
      }

      if (paymentForm.amount > selectedSale.outstandingBalance) {
        toast.error('Discount amount cannot exceed outstanding balance');
        return;
      }
    } else {
      // Payment mode: normal validation
      if (paymentForm.amount <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }

      if (paymentForm.amount > selectedSale.outstandingBalance) {
        toast.error('Payment amount cannot exceed outstanding balance');
        return;
      }
    }

    try {
      setIsProcessingPayment(true);
      
      // Send negative amount for discounts, positive for payments
      const amount = isDiscountMode ? -paymentForm.amount : paymentForm.amount;
      
      // For discounts, use 'OTHER' payment method and format notes like edit sale page
      // For payments, use the selected payment method
      const paymentMethod = isDiscountMode ? 'OTHER' : paymentForm.paymentMethod;
      
      // For discounts, match the notes format from edit sale page
      const notes = isDiscountMode 
        ? (paymentForm.notes || `Discount adjustment: ${formatCurrency(paymentForm.amount)}`)
        : paymentForm.notes;

      const response = await apiClient.post(`/pos/sales/${selectedSale.id}/payments`, {
        amount: amount,
        paymentMethod: paymentMethod,
        referenceNumber: paymentForm.referenceNumber || undefined,
        notes: notes || undefined,
      });

      toast.success(isDiscountMode ? 'Discount applied successfully' : 'Payment added successfully');
      setShowPaymentDialog(false);
      loadCreditSales(); // Refresh the list
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Error ${isDiscountMode ? 'applying discount' : 'processing payment'}`);
      console.error(error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'CREDIT': 'destructive',
      'PARTIAL': 'secondary',
      'COMPLETED': 'default',
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
      'PENDING': 'destructive',
      'PARTIAL': 'secondary',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Credit Sales Management</h1>
          <p className="text-gray-300">Manage credit sales and outstanding payments</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadCreditSales}>
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
              <CreditCard className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Credit Sales</p>
                <p className="text-2xl font-bold">{summaryStats.totalCreditSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summaryStats.totalOutstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Collected</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summaryStats.totalCollected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Avg Outstanding</p>
                <p className="text-2xl font-bold">{formatCurrency(summaryStats.averageOutstanding)}</p>
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
                  placeholder="Sale number, customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    // Allow all standard text input keys
                    if (
                      e.key === 'Backspace' ||
                      e.key === 'Delete' ||
                      e.key === 'ArrowLeft' ||
                      e.key === 'ArrowRight' ||
                      e.key === 'ArrowUp' ||
                      e.key === 'ArrowDown' ||
                      e.key === 'Tab' ||
                      e.key === 'Enter' ||
                      e.key.length === 1 // Allow any single character
                    ) {
                      return;
                    }
                    e.preventDefault();
                  }}
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
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setDateRange(undefined);
                  setStatusFilter('all');
                  setCustomerFilter('all');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Credit Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading credit sales...</p>
            </div>
          ) : creditSales.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No outstanding credit sales found</p>
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
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Sale Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div className="font-medium">{sale.saleNumber}</div>
                        <div className="text-sm text-gray-500">{sale.location.name}</div>
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
                        <div>
                          <div className="font-medium">{sale.customer.name}</div>
                          {sale.customer.email && (
                            <div className="text-sm text-gray-500">{sale.customer.email}</div>
                          )}
                          <div className="text-xs text-gray-400">
                            Balance: {formatCurrency(sale.customer.balance)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(sale.totalAmount)}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(sale.amountPaid)}
                      </TableCell>
                      <TableCell className="font-medium text-red-600">
                        {formatCurrency(sale.outstandingBalance)}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(sale.paymentStatus)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(sale.status)}
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
                                onClick={() => handleViewDetails(sale)}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {/* Add Payment - Always visible but disabled when not applicable */}
                              <DropdownMenuItem
                                onClick={() => handleAddPayment(sale)}
                                disabled={sale.outstandingBalance <= 0 || sale.status === 'CANCELLED' || sale.status === 'REFUNDED'}
                                className="cursor-pointer text-green-600"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Payment
                              </DropdownMenuItem>
                              {/* Create Sale Return - Show for credit/partial/completed sales */}
                              {(sale.status === 'CREDIT' || sale.status === 'PARTIAL' || sale.status === 'COMPLETED' || sale.status === 'REFUNDED') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/dashboard/pos/returns/create?saleId=${sale.id}`)}
                                    className="cursor-pointer"
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Create Sale Return
                                  </DropdownMenuItem>
                                </>
                              )}
                              {/* Edit - Show for editable sales */}
                              {sale.status !== 'REFUNDED' && 
                               sale.status !== 'CANCELLED' && (
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
                              )}
                              {/* Cancel - Show for cancellable sales */}
                              {sale.status !== 'CANCELLED' && 
                               sale.status !== 'REFUNDED' && (
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
                  {creditSales.length === 0
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

      {/* Add Payment / Apply Discount Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                {isDiscountMode ? (
                  <>
                    <Percent className="h-5 w-5 text-orange-500" />
                    Apply Discount
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Add Payment
                  </>
                )}
              </DialogTitle>
              {/* Toggle Button */}
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${!isDiscountMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Payment
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsDiscountMode(!isDiscountMode);
                    setPaymentForm({ ...paymentForm, amount: 0 }); // Reset amount when switching
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isDiscountMode ? 'bg-orange-600' : 'bg-blue-600'
                  }`}
                  aria-label="Toggle between payment and discount mode"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isDiscountMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${isDiscountMode ? 'text-orange-400' : 'text-gray-500'}`}>
                  Discount
                </span>
              </div>
            </div>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-6">
              {/* Sale Info */}
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <h4 className="font-semibold text-lg text-white">Sale Information</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Sale Number</span>
                    <p className="text-sm font-mono text-gray-200 bg-gray-700 px-2 py-1 rounded border border-gray-600">{selectedSale.saleNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Customer</span>
                    <p className="text-sm font-medium text-gray-200">{selectedSale.customer.name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Amount</span>
                    <p className="text-sm font-semibold text-gray-200">{formatCurrency(selectedSale.totalAmount)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Amount Paid</span>
                    <p className="text-sm font-semibold text-green-400">{formatCurrency(selectedSale.amountPaid)}</p>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Outstanding Balance</span>
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                      <p className="text-xl font-bold text-red-400">{formatCurrency(selectedSale.outstandingBalance)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment / Discount Form */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">
                      {isDiscountMode ? 'Discount Amount *' : 'Payment Amount *'}
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={selectedSale.outstandingBalance}
                      value={paymentForm.amount || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                        setPaymentForm({ ...paymentForm, amount: value });
                      }}
                      onKeyDown={(e) => {
                        // Allow backspace, delete, arrow keys, and number keys
                        if (
                          e.key === 'Backspace' ||
                          e.key === 'Delete' ||
                          e.key === 'ArrowLeft' ||
                          e.key === 'ArrowRight' ||
                          e.key === 'ArrowUp' ||
                          e.key === 'ArrowDown' ||
                          e.key === 'Tab' ||
                          e.key === 'Enter' ||
                          /[0-9]/.test(e.key) ||
                          e.key === '.'
                        ) {
                          return;
                        }
                        e.preventDefault();
                      }}
                      placeholder={isDiscountMode ? "Enter discount amount" : "Enter payment amount"}
                      className={`w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        isDiscountMode ? 'border-orange-500 focus:border-orange-400 focus:ring-orange-400' : ''
                      }`}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-xs ${isDiscountMode ? 'text-orange-400' : 'text-gray-500'}`}>
                        Maximum: {formatCurrency(selectedSale.outstandingBalance)}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPaymentForm({ ...paymentForm, amount: selectedSale.outstandingBalance })}
                        className={`text-xs h-6 px-2 ${
                          isDiscountMode ? 'border-orange-500 text-orange-400 hover:bg-orange-500/10' : ''
                        }`}
                      >
                        Fill Max
                      </Button>
                    </div>
                    {isDiscountMode && (
                      <p className="text-xs text-orange-400 mt-1">
                        This will reduce the outstanding balance by {formatCurrency(paymentForm.amount || 0)}
                      </p>
                    )}
                  </div>

                  {!isDiscountMode && (
                    <div>
                      <Label htmlFor="paymentMethod">Payment Method *</Label>
                      <Select 
                        value={paymentForm.paymentMethod} 
                        onValueChange={(value: any) => setPaymentForm({ ...paymentForm, paymentMethod: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="CARD">Card</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                          <SelectItem value="MOBILE_PAYMENT">Mobile Payment</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {isDiscountMode && (
                    <div>
                      <Label htmlFor="paymentMethod" className="text-orange-400">Discount Type</Label>
                      <div className="px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-md text-sm text-orange-300">
                        Adjustment (No payment method required)
                      </div>
                      <p className="text-xs text-orange-400 mt-1">
                        Discounts are recorded as adjustments, not actual payments
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                    onKeyDown={(e) => {
                      // Allow all standard text input keys
                      if (
                        e.key === 'Backspace' ||
                        e.key === 'Delete' ||
                        e.key === 'ArrowLeft' ||
                        e.key === 'ArrowRight' ||
                        e.key === 'ArrowUp' ||
                        e.key === 'ArrowDown' ||
                        e.key === 'Tab' ||
                        e.key === 'Enter' ||
                        e.key.length === 1 // Allow any single character
                      ) {
                        return;
                      }
                      e.preventDefault();
                    }}
                    placeholder="Optional reference number"
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    onKeyDown={(e) => {
                      // Allow all standard text input keys including Enter for multiline
                      if (
                        e.key === 'Backspace' ||
                        e.key === 'Delete' ||
                        e.key === 'ArrowLeft' ||
                        e.key === 'ArrowRight' ||
                        e.key === 'ArrowUp' ||
                        e.key === 'ArrowDown' ||
                        e.key === 'Tab' ||
                        e.key === 'Enter' ||
                        e.key.length === 1 // Allow any single character
                      ) {
                        return;
                      }
                      e.preventDefault();
                    }}
                    placeholder={isDiscountMode ? "Optional discount reason or notes" : "Optional payment notes"}
                    rows={3}
                    className="w-full resize-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  disabled={isProcessingPayment}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProcessPayment}
                  disabled={isProcessingPayment || paymentForm.amount <= 0 || paymentForm.amount > selectedSale.outstandingBalance}
                  className={`w-full sm:w-auto ${
                    isDiscountMode 
                      ? 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400' 
                      : ''
                  }`}
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isDiscountMode ? (
                    <>
                      <Percent className="h-4 w-4 mr-2" />
                      Apply Discount
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Add Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sale Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Sale Details - {selectedSale?.saleNumber}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {/* Edit Button */}
                {selectedSale && (() => {
                  const editCheck = canEditSale(selectedSale);
                  if (editCheck.canEdit) {
                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowDetailsModal(false);
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
                 selectedSale.status !== 'REFUNDED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSaleToCancel(selectedSale);
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
            <div className="space-y-6">
              {/* Sale Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sale Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sale Number:</span>
                      <span className="font-medium">{selectedSale.saleNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date & Time:</span>
                      <span className="font-medium">
                        {formatDate(selectedSale.saleDate)} {new Date(selectedSale.saleDate).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{selectedSale.location.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created By:</span>
                      <span className="font-medium">{userResolver.getUserName(selectedSale.createdById)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sale Status:</span>
                      <Badge variant={selectedSale.status === 'CREDIT' ? 'destructive' : 'secondary'}>
                        {selectedSale.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status:</span>
                      <Badge variant={selectedSale.paymentStatus === 'PENDING' ? 'destructive' : 'secondary'}>
                        {selectedSale.paymentStatus}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedSale.customer.name}</span>
                    </div>
                    {selectedSale.customer.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{selectedSale.customer.email}</span>
                      </div>
                    )}
                    {selectedSale.customer.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{selectedSale.customer.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Balance:</span>
                      <span className={`font-medium ${selectedSale.customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(selectedSale.customer.balance)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(selectedSale.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-600">Total Amount</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(selectedSale.amountPaid || 0)}
                      </div>
                      <div className="text-sm text-gray-600">Amount Paid</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(selectedSale.outstandingBalance)}
                      </div>
                      <div className="text-sm text-gray-600">Outstanding Balance</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedSale.payments && selectedSale.payments.length > 0 ? (
                    <div className="space-y-3">
                      {selectedSale.payments.map((payment: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{payment.paymentMethod}</div>
                            {payment.referenceNumber && (
                              <div className="text-sm text-gray-600 dark:text-gray-300">Ref: {payment.referenceNumber}</div>
                            )}
                            {payment.notes && (
                              <div className="text-sm text-gray-600 dark:text-gray-300">{payment.notes}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(payment.amount)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {formatDate(payment.paymentDate)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                      <p>No payments recorded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleAddPayment(selectedSale);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={selectedSale.outstandingBalance <= 0 || selectedSale.status === 'CANCELLED' || selectedSale.status === 'REFUNDED'}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <p className="text-sm text-gray-600">Outstanding: {formatCurrency(saleToCancel.outstandingBalance)}</p>
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
                  await loadCreditSales();
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
