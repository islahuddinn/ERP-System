'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Search,
  Download,
  Calendar,
  DollarSign,
  Package,
  RotateCcw,
  ArrowLeft,
  FileText,
  RefreshCw,
  Eye,
  Truck,
  TrendingUp,
  AlertCircle,
  User,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSupplierLedger, useExportSupplierLedger } from '@/hooks/useSupplierLedger';
import { useSupplierLedgerOverview } from '@/hooks/useSupplierLedgerOverview';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'react-hot-toast';

interface Supplier {
  id: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  openingBalanceAmount?: number
  openingBalanceType?: 'RECEIVABLE' | 'PAYABLE'
  openingBalanceDate?: string
  openingBalanceNote?: string
}

interface LedgerEntry {
  id?: string
  sourceId?: string | null
  date: string
  type: 'PURCHASE' | 'RETURN' | 'PAYMENT' | 'OPENING_BALANCE'
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
}

interface SupplierLedger {
  supplier: Supplier
  // The API returns opening/current balance at the TOP LEVEL (not inside summary).
  openingBalance: number
  currentBalance: number
  summary: {
    totalPurchases: number
    totalPayments: number
    totalReturns: number
  }
  // Ledger rows are returned under `entries`.
  entries: LedgerEntry[]
}

// Safe currency formatter — never throws on null/undefined/NaN values from the API
const money = (v: any): string => `Rs. ${Number(v ?? 0).toFixed(2)}`

export default function SupplierLedgerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supplierId = searchParams.get('supplierId') || '';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(supplierId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Debounce the search so we don't refetch on every keystroke (QA #11)
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch supplier ledger overview (all suppliers)
  // isFetching → subtle indicator during a search refetch; isLoading → only the first load.
  const { data: suppliers, isLoading: isLoadingOverview, isFetching: isFetchingOverview, error: overviewError, refetch: refetchOverview } = useSupplierLedgerOverview(debouncedSearch);

  // Fetch specific supplier ledger if one is selected
  const { data: ledger, isLoading: isLoadingLedger, error: ledgerError, refetch: refetchLedger } = useSupplierLedger(selectedSupplier || '', {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const exportMutation = useExportSupplierLedger();

  // Real total supplier count for the overview card (QA #6). The ledger overview
  // endpoint only returns active suppliers (and is filtered by the search box),
  // so the card must read the actual total from the suppliers list meta instead.
  const { data: suppliersList } = useSuppliers({ page: 1, limit: 1 });

  // Refetch data when component mounts or when navigating to the page
  useEffect(() => {
    if (selectedSupplier) {
      refetchLedger();
    } else {
      refetchOverview();
    }
  }, []); // Empty dependency array means this runs once on mount

  const handleViewLedger = (supplierId: string) => {
    setSelectedSupplier(supplierId);
    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('supplierId', supplierId);
    window.history.pushState({}, '', url.toString());
  };

  const handleBackToOverview = () => {
    setSelectedSupplier(null);
    setStartDate('');
    setEndDate('');
    // Remove supplierId from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('supplierId');
    window.history.pushState({}, '', url.toString());
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!selectedSupplier) return;
    if (!ledger) {
      toast.error('Ledger is still loading. Please wait a moment and try again.');
      return;
    }
    // Export is generated client-side from the loaded ledger (no backend export endpoint yet).
    exportMutation.mutate({ ledger, format });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return <Package className="h-4 w-4 text-blue-500" />
      case 'RETURN':
        return <RotateCcw className="h-4 w-4 text-orange-500" />
      case 'PAYMENT':
        return <DollarSign className="h-4 w-4 text-green-500" />
      case 'OPENING_BALANCE':
        return <AlertCircle className="h-4 w-4 text-purple-500" />
      default:
        return <Package className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return 'text-blue-600'
      case 'RETURN':
        return 'text-orange-600'
      case 'PAYMENT':
        return 'text-green-600'
      case 'OPENING_BALANCE':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  const filteredLedger = (ledger?.entries ?? []).filter((entry: LedgerEntry) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      entry.reference?.toLowerCase().includes(search) ||
      entry.description?.toLowerCase().includes(search) ||
      entry.type?.toLowerCase().includes(search)
    );
  }) || [];

  // Show loading state ONLY on the very first load (not on search refetches — QA #11).
  // During a search refetch keepPreviousData keeps the list mounted, so we never blank out.
  if (isLoadingOverview && !selectedSupplier) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-600">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading supplier ledgers...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (overviewError && !selectedSupplier) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading supplier ledgers</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // If a specific supplier is selected, show their detailed ledger
  if (selectedSupplier) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToOverview}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Supplier Ledger</h1>
                <p className="text-gray-500">Transaction history and payment tracking</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                onClick={() => handleExport('csv')}
                disabled={exportMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={() => handleExport('pdf')}
                disabled={exportMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Supplier Information */}
          {ledger && (
            <Card className="mb-6 bg-white shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Supplier Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-gray-500 text-sm">Name</Label>
                    <p className="text-gray-900 font-medium">{ledger.supplier.name}</p>
                  </div>
                  {ledger.supplier.contactPerson && (
                    <div>
                      <Label className="text-gray-500 text-sm">Contact Person</Label>
                      <p className="text-gray-900">{ledger.supplier.contactPerson}</p>
                    </div>
                  )}
                  {ledger.supplier.email && (
                    <div>
                      <Label className="text-gray-500 text-sm">Email</Label>
                      <p className="text-gray-900">{ledger.supplier.email}</p>
                    </div>
                  )}
                  {ledger.supplier.phone && (
                    <div>
                      <Label className="text-gray-500 text-sm">Phone</Label>
                      <p className="text-gray-900">{ledger.supplier.phone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Date Filters */}
          <Card className="mb-6 bg-white shadow-sm border-gray-200">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date" className="text-gray-700">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1.5 bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-gray-700">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1.5 bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          {ledger && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <Card className="bg-white shadow-sm border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Purchases</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {money(ledger.summary.totalPurchases)}
                      </p>
                    </div>
                    <Package className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Opening Balance</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {money(Math.abs(ledger.openingBalance || 0))}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ledger.openingBalance && ledger.openingBalance > 0
                          ? 'You owe supplier'
                          : 'Supplier owes you'}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Paid</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {money(ledger.summary.totalPayments)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Returns</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {money(ledger.summary.totalReturns)}
                      </p>
                    </div>
                    <RotateCcw className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className={`shadow-sm border-gray-200 ${ledger.currentBalance >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Current Balance</p>
                      <p className={`text-2xl font-semibold ${ledger.currentBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {money(ledger.currentBalance)}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-gray-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {isLoadingLedger && (
            <Card className="bg-white shadow-sm border-gray-200 mb-8">
              <CardContent className="p-12">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-green-600" />
                  <span className="text-gray-600">Loading ledger data...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {ledgerError && (
            <Card className="bg-white shadow-sm border-gray-200 mb-8">
              <CardContent className="p-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 font-medium mb-2">Error loading ledger</p>
                  <p className="text-gray-500 text-sm mb-4">{ledgerError.message || 'Failed to load supplier ledger data'}</p>
                  <Button onClick={() => refetchLedger()} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transaction Ledger */}
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">
                Transaction Ledger
                {ledger && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    Showing {filteredLedger.length} of {(ledger.entries ?? []).length} transactions
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 bg-gray-50">
                      <TableHead className="text-gray-700 font-semibold">Date</TableHead>
                      <TableHead className="text-gray-700 font-semibold">Type</TableHead>
                      <TableHead className="text-gray-700 font-semibold">Reference</TableHead>
                      <TableHead className="text-gray-700 font-semibold">Description</TableHead>
                      <TableHead className="text-gray-700 font-semibold text-right">Debit</TableHead>
                      <TableHead className="text-gray-700 font-semibold text-right">Credit</TableHead>
                      <TableHead className="text-gray-700 font-semibold text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingLedger ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-green-600" />
                            <span className="text-gray-500">Loading transactions...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredLedger.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-8 w-8 text-gray-400" />
                            <p className="font-medium">No transactions found</p>
                            <p className="text-sm">
                              {ledgerError
                                ? 'Error loading transactions. Please try again.'
                                : 'Transactions will appear here when you create purchase orders, payments, or returns for this supplier.'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLedger.map((entry: LedgerEntry, idx: number) => (
                        <TableRow key={entry.id ?? entry.sourceId ?? idx} className="border-gray-200 hover:bg-gray-50">
                          <TableCell className="text-gray-700">
                            {format(new Date(entry.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTypeIcon(entry.type)}
                              <span className={getTypeColor(entry.type)}>
                                {entry.type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700 font-mono text-sm">
                            {/* Synthetic rows (e.g. Opening Balance) have no reference (QA #8) */}
                            {entry.reference || '—'}
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {entry.description}
                          </TableCell>
                          <TableCell className="text-right text-gray-700">
                            {Number(entry.debit ?? 0) > 0 ? money(entry.debit) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-gray-700">
                            {Number(entry.credit ?? 0) > 0 ? money(entry.credit) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-gray-900 font-medium">
                            {money(entry.balance)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show supplier overview (default view)
  // Ensure suppliers is always an array
  const suppliersArray = Array.isArray(suppliers)
    ? suppliers
    : ((suppliers as any)?.data || []);

  // Whether the empty state is shown because a search returned nothing vs. there
  // genuinely being no suppliers at all (QA #12 — render the empty state inside the
  // layout so the search bar stays usable instead of a blank screen).
  const isEmpty = !suppliersArray || suppliersArray.length === 0;
  const isSearching = debouncedSearch.trim().length > 0;

  // Total supplier count. When a search is active the card must reflect the
  // filtered/searched results (QA #3), so use the overview array length (the
  // overview endpoint is filtered by `search`). With no search, fall back to the
  // suppliers list meta — the actual number of suppliers in the system (QA #6).
  const totalSuppliers = isSearching
    ? suppliersArray.length
    : (suppliersList?.meta?.total ?? suppliersArray.length);
  const totalPurchases = (suppliersArray as any[]).reduce((sum, supplier: any) => sum + (Number(supplier.totalPurchases) || 0), 0);
  const totalPaid = (suppliersArray as any[]).reduce((sum, supplier: any) => sum + (Number(supplier.totalPayments) || 0), 0);
  const totalOutstanding = (suppliersArray as any[]).reduce((sum, supplier: any) => sum + (Number(supplier.balance) || 0), 0);
  const suppliersWithBalance = (suppliersArray as any[]).filter((supplier: any) => (supplier.balance || 0) > 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Supplier Ledger Overview</h1>
            <p className="text-gray-500">All active suppliers and their ledger summaries</p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={() => router.push('/dashboard/suppliers')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Truck className="h-4 w-4 mr-2" />
              Manage Suppliers
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Suppliers</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalSuppliers}</p>
                </div>
                <Truck className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Purchases</p>
                  <p className="text-2xl font-semibold text-gray-900">{money(totalPurchases)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Paid</p>
                  <p className="text-2xl font-semibold text-gray-900">{money(totalPaid)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={`shadow-sm border-gray-200 ${totalOutstanding > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Outstanding Balance</p>
                  <p className={`text-2xl font-semibold ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {money(totalOutstanding)}
                  </p>
                  <p className="text-xs text-gray-600">{suppliersWithBalance} suppliers with outstanding balance</p>
                </div>
                <AlertCircle className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 bg-white shadow-sm border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="text-gray-700">Search Suppliers</Label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by name, email, phone, or contact person..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white border-gray-300 text-gray-900"
                  />
                  {/* Subtle indicator while a search refetch is in flight (QA #11) */}
                  {isFetchingOverview && (
                    <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                  )}
                </div>
              </div>
              <Button
                onClick={() => setSearchTerm('')}
                variant="outline"
                className="h-10 shrink-0 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Empty state — kept inside the layout so the search bar stays usable (QA #12) */}
        {isEmpty ? (
          <Card className="bg-white shadow-sm border-gray-200">
            <CardContent className="p-12">
              <div className="text-center">
                <Truck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Active Suppliers</h2>
                <p className="text-gray-500 mb-6">
                  {isSearching
                    ? `No suppliers match "${debouncedSearch}". Try a different search.`
                    : 'There are no active suppliers with ledger data.'}
                </p>
                {isSearching ? (
                  <Button
                    onClick={() => setSearchTerm('')}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Clear Search
                  </Button>
                ) : (
                  <Button
                    onClick={() => router.push('/dashboard/suppliers')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Manage Suppliers
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
        /* Supplier Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(suppliersArray as any[]).map((supplier: any) => (
            <Card key={supplier.id} className="flex flex-col bg-white hover:border-gray-300 transition-colors shadow-sm border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-gray-900 text-lg">{supplier.name}</CardTitle>
                    {supplier.contactPerson && (
                      <p className="text-gray-500 text-sm">{supplier.contactPerson}</p>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${supplier.balance > 0
                    ? 'bg-red-100 text-red-700'
                    : supplier.balance < 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                    }`}>
                    {supplier.balance > 0 ? 'Owes' : supplier.balance < 0 ? 'Credit' : 'Paid Up'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                {/* Content sections — kept in their own space-y-4 wrapper so the
                    Actions block below can rely on mt-auto. Putting space-y-* on the
                    flex parent silently defeats mt-auto: Tailwind's space-y selector
                    (.space-y-4 > * ~ *) outranks the .mt-auto utility by specificity,
                    so the button never dropped to the bottom (QA #2). */}
                <div className="space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-1">
                    {supplier.email && (
                      <p className="text-gray-500 text-sm">{supplier.email}</p>
                    )}
                    {supplier.phone && (
                      <p className="text-gray-500 text-sm">{supplier.phone}</p>
                    )}
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Purchases</p>
                      <p className="text-gray-900 font-semibold">{money(supplier.totalPurchases)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Paid</p>
                      <p className="text-gray-900 font-semibold">{money(supplier.totalPayments)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Balance</p>
                      <p className={`font-semibold ${supplier.balance > 0
                        ? 'text-red-600'
                        : supplier.balance < 0
                          ? 'text-green-600'
                          : 'text-gray-600'
                        }`}>
                        {money(Math.abs(Number(supplier.balance) || 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Transactions</p>
                      <p className="text-gray-900 font-semibold">{supplier.transactionCount}</p>
                    </div>
                  </div>

                  {/* Last Transaction */}
                  {supplier.lastTransactionDate && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-gray-500 text-xs">Last Transaction</p>
                      <p className="text-gray-900 text-sm">
                        {format(new Date(supplier.lastTransactionDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions — mt-auto now genuinely pins this to the card bottom, so the
                    button aligns across cards regardless of content height (QA #2) */}
                <div className="mt-auto pt-4">
                  <Button
                    onClick={() => handleViewLedger(supplier.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Detailed Ledger
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

