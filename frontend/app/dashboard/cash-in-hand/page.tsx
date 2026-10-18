'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Wallet, DollarSign, TrendingUp, TrendingDown, RefreshCw, CheckCircle, XCircle, Plus, History as HistoryIcon, DollarSign as DollarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { extractArrayFromResponse, unwrapResponse } from '@/lib/response-utils';
import { format } from 'date-fns';

interface CashBalance {
  locationId: string;
  locationName: string;
  date: string;
  openingBalance: number;
  currentBalance: number;
  cashInHand?: any;
}

interface CashTransaction {
  id: string;
  type: string;
  amount: number;
  description?: string;
  reference?: string;
  transactionDate: string;
  processor: {
    name: string;
    email: string;
  };
}

export default function CashInHandPage() {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<CashBalance | null>(null);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  
  // Dialog states
  const [openCashDialog, setOpenCashDialog] = useState(false);
  const [openCountDialog, setOpenCountDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [actualCount, setActualCount] = useState('');
  const [notes, setNotes] = useState('');
  
  // History data
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Helper to check if cash in hand record is for today
  const isCashRecordForToday = (cashInHand: any): boolean => {
    if (!cashInHand) return false;
    const recordDate = new Date(cashInHand.date);
    const today = new Date();
    recordDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return recordDate.getTime() === today.getTime();
  };

  // Check if we can open cash for today
  const canOpenCashForToday = (): boolean => {
    if (!balance?.cashInHand) return true; // No record exists, can open
    // If record exists but not for today, can open today
    if (!isCashRecordForToday(balance.cashInHand)) return true;
    // If record exists for today but is APPROVED, can reopen
    if (balance.cashInHand.status === 'APPROVED') return true;
    // If record exists for today and is OPEN/COUNTED, cannot open
    return false;
  };

  // Check if we can reopen today's approved cash
  const canReopenToday = (): boolean => {
    return balance?.cashInHand && 
           isCashRecordForToday(balance.cashInHand) && 
           balance.cashInHand.status === 'APPROVED';
  };

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadBalance();
      loadTransactions();
    }
  }, [selectedLocation]);

  // Update actualCount when count dialog opens and status is COUNTED
  useEffect(() => {
    if (openCountDialog && balance?.cashInHand?.status === 'COUNTED' && balance.cashInHand.actualCount) {
      setActualCount(balance.cashInHand.actualCount.toString());
      if (balance.cashInHand.notes) {
        setNotes(balance.cashInHand.notes);
      }
    } else if (openCountDialog && balance?.cashInHand?.status === 'OPEN') {
      // Reset when opening for new count
      setActualCount('');
      setNotes('');
    }
  }, [openCountDialog, balance?.cashInHand]);

  const loadLocations = async () => {
    try {
      const response = await apiClient.get('/locations');
      const locs = extractArrayFromResponse<{ id: string; name: string }>(response.data);
      setLocations(locs);
      if (locs.length > 0) {
        setSelectedLocation(locs[0].id);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Failed to load locations');
    }
  };

  const loadBalance = async () => {
    if (!selectedLocation) return;
    
    try {
      setIsLoading(true);
      const response = await apiClient.get(`/cash-in-hand/current-balance/${selectedLocation}`);
      setBalance(unwrapResponse(response.data));
    } catch (error: any) {
      console.error('Error loading balance:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load cash balance');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!selectedLocation) return;
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await apiClient.get(`/cash-in-hand/transactions?locationId=${selectedLocation}&startDate=${today}&endDate=${today}`);
      setTransactions(extractArrayFromResponse<CashTransaction>(response.data));
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleOpenCash = async () => {
    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }

    try {
      setIsLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      await apiClient.post('/cash-in-hand/open', {
        date: today,
        locationId: selectedLocation,
        openingBalance: openingBalance ? parseFloat(openingBalance) : undefined,
      });
      
      toast.success('Cash register opened successfully');
      setOpenCashDialog(false);
      setOpeningBalance('');
      loadBalance();
      loadTransactions();
    } catch (error: any) {
      console.error('Error opening cash:', error);
      toast.error(error.response?.data?.message || 'Failed to open cash register');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountCash = async () => {
    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }

    if (!actualCount) {
      toast.error('Please enter actual count');
      return;
    }

    try {
      setIsLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      await apiClient.patch(`/cash-in-hand/count/${selectedLocation}?date=${today}`, {
        actualCount: parseFloat(actualCount),
        notes: notes || undefined,
      });
      
      toast.success(balance?.cashInHand?.status === 'COUNTED' 
        ? 'Cash count updated successfully' 
        : 'Cash count saved successfully');
      setOpenCountDialog(false);
      setActualCount('');
      setNotes('');
      loadBalance();
    } catch (error: any) {
      console.error('Error counting cash:', error);
      toast.error(error.response?.data?.message || 'Failed to count cash');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveCount = async () => {
    if (!selectedLocation || !balance?.cashInHand) return;

    try {
      setIsLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      await apiClient.patch(`/cash-in-hand/approve/${selectedLocation}?date=${today}`, {});
      
      toast.success('Cash count approved successfully');
      loadBalance();
    } catch (error: any) {
      console.error('Error approving count:', error);
      toast.error(error.response?.data?.message || 'Failed to approve cash count');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!selectedLocation) return;

    try {
      setIsLoadingHistory(true);
      const response = await apiClient.get(`/cash-in-hand/history?locationId=${selectedLocation}`);
      setHistoryData(extractArrayFromResponse(response.data));
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Failed to load history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Open</Badge>;
      case 'COUNTED':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Counted</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
      case 'DISPUTED':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Disputed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'OPENING':
        return 'text-blue-600';
      case 'CASH_SALE':
        return 'text-green-600';
      case 'PAYMENT_OUT':
        return 'text-red-600';
      case 'REFUND':
        return 'text-orange-600';
      case 'ADJUSTMENT':
        return 'text-purple-600';
      case 'CLOSING':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'OPENING':
        return 'Opening';
      case 'CASH_SALE':
        return 'Cash Sale';
      case 'PAYMENT_OUT':
        return 'Payment Out';
      case 'REFUND':
        return 'Refund';
      case 'ADJUSTMENT':
        return 'Adjustment';
      case 'CLOSING':
        return 'Closing';
      default:
        return type;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Cash in Hand</h1>
          <p className="text-gray-400 mt-1">Manage and track cash balances</p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshCw 
            className={cn("w-5 h-5 text-white cursor-pointer hover:text-blue-400 transition-colors", isLoading && "animate-spin")}
            onClick={() => {
              loadBalance();
              loadTransactions();
            }}
          />
          {selectedLocation && canOpenCashForToday() && (
            <Dialog open={openCashDialog} onOpenChange={setOpenCashDialog}>
              <DialogTrigger asChild>
                <Button className={canReopenToday() ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"}>
                  <Plus className="w-4 h-4 mr-2" />
                  {canReopenToday() ? 'Reopen Cash' : 'Open Cash'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{canReopenToday() ? 'Reopen Cash Register' : 'Open Cash Register'}</DialogTitle>
                  <DialogDescription>
                    {canReopenToday() 
                      ? 'Reopen the cash register for today to continue making sales. The previous closing balance will be used as the new opening balance.'
                      : 'Set opening balance for today. Leave empty to use yesterday\'s closing balance.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="opening-balance">Opening Balance (Optional)</Label>
                    <Input
                      id="opening-balance"
                      type="number"
                      step="0.01"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-400">
                      {canReopenToday() && balance?.cashInHand?.closingBalance
                        ? `Previous closing balance: ${formatCurrency(Number(balance.cashInHand.closingBalance))} (will be used if left empty)`
                        : balance?.cashInHand && balance.cashInHand.closingBalance
                        ? `Previous closing balance: ${formatCurrency(Number(balance.cashInHand.closingBalance))}`
                        : `Leave empty to start with ${formatCurrency(0)}`}
                    </p>
                  </div>
                  {canReopenToday() && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-xs text-yellow-400">
                        ⚠️ Note: Reopening will reset the count status and allow you to continue making sales. You can count and approve again at the end of the day.
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenCashDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleOpenCash} disabled={isLoading}>
                    {isLoading ? (canReopenToday() ? 'Reopening...' : 'Opening...') : (canReopenToday() ? 'Reopen Cash' : 'Open Cash')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {balance?.cashInHand && isCashRecordForToday(balance.cashInHand) && balance.cashInHand.status === 'OPEN' && (
            <Dialog open={openCountDialog} onOpenChange={setOpenCountDialog}>
              <DialogTrigger asChild>
                <Button className="bg-yellow-600 hover:bg-yellow-700">
                  <DollarIcon className="w-4 h-4 mr-2" />
                  Count Cash
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Count Cash</DialogTitle>
                  <DialogDescription>
                    Enter the actual cash count for reconciliation.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="actual-count">Actual Count *</Label>
                    <Input
                      id="actual-count"
                      type="number"
                      step="0.01"
                      value={actualCount}
                      onChange={(e) => setActualCount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenCountDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCountCash} disabled={isLoading}>
                    {isLoading ? 'Counting...' : 'Count Cash'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {balance?.cashInHand && isCashRecordForToday(balance.cashInHand) && balance.cashInHand.status === 'COUNTED' && (
            <>
              <Dialog open={openCountDialog} onOpenChange={setOpenCountDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recount
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Recount Cash</DialogTitle>
                    <DialogDescription>
                      Update the cash count if the previous count was incorrect. This will recalculate the variance.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="actual-count-recount">Actual Count *</Label>
                      <Input
                        id="actual-count-recount"
                        type="number"
                        step="0.01"
                        value={actualCount || balance.cashInHand.actualCount || ''}
                        onChange={(e) => setActualCount(e.target.value)}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-400">
                        Previous count: {formatCurrency(Number(balance.cashInHand.actualCount))}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes-recount">Notes (Optional)</Label>
                      <Textarea
                        id="notes-recount"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setOpenCountDialog(false);
                      setActualCount('');
                      setNotes('');
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleCountCash} disabled={isLoading}>
                      {isLoading ? 'Updating Count...' : 'Update Count'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleApproveCount}
                disabled={isLoading}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Count
              </Button>
            </>
          )}
          <Dialog open={openHistoryDialog} onOpenChange={setOpenHistoryDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={loadHistory}>
                <HistoryIcon className="w-4 h-4 mr-2" />
                History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cash in Hand History</DialogTitle>
                <DialogDescription>
                  View historical cash balances and counts
                </DialogDescription>
              </DialogHeader>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Opening</TableHead>
                        <TableHead>Expected</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Variance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Counted By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {format(new Date(record.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{formatCurrency(Number(record.openingBalance))}</TableCell>
                          <TableCell>
                            {record.expectedClosing ? formatCurrency(Number(record.expectedClosing)) : '-'}
                          </TableCell>
                          <TableCell>
                            {record.actualCount ? formatCurrency(Number(record.actualCount)) : '-'}
                          </TableCell>
                          <TableCell>
                            {record.variance !== null ? (
                              <span className={Number(record.variance) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(Math.abs(Number(record.variance)))}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>{record.counter?.name || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {historyData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                            No history found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Location Selector */}
      <div className="flex items-center gap-4">
        <Label htmlFor="location-select" className="text-white font-medium">
          Location:
        </Label>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger id="location-select" className="w-64">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && !balance ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : balance ? (
        <>
          {/* Show message if viewing old day's record */}
          {balance.cashInHand && !isCashRecordForToday(balance.cashInHand) && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
              <p className="text-blue-400 text-sm">
                📅 You are viewing {format(new Date(balance.cashInHand.date), 'MMM dd, yyyy')}'s cash record. 
                {balance.cashInHand.status === 'APPROVED' && ' This day is closed. Click "Open Cash" or "Reopen Cash" to start today\'s cash register.'}
              </p>
            </div>
          )}
          {/* Show message if today's record is approved (can be reopened) */}
          {balance.cashInHand && isCashRecordForToday(balance.cashInHand) && balance.cashInHand.status === 'APPROVED' && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-4">
              <p className="text-orange-400 text-sm">
                📅 Today's cash register is closed. Click "Reopen Cash" to continue making sales for today.
              </p>
            </div>
          )}
          {/* Balance Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-blue-600/10 to-blue-800/5 border-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Opening Balance
                </CardTitle>
                <DollarSign className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(Number(balance.openingBalance))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Today's starting balance
                </p>
              </CardContent>
            </Card>

            <Card className={cn(
              "bg-gradient-to-br from-green-600/10 to-green-800/5 border-green-500/20",
              Number(balance.currentBalance) < 0 && "from-red-600/10 to-red-800/5 border-red-500/20"
            )}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Current Balance
                </CardTitle>
                {Number(balance.currentBalance) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  Number(balance.currentBalance) >= 0 ? "text-white" : "text-red-400"
                )}>
                  {formatCurrency(Number(balance.currentBalance))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Real-time balance
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-600/10 to-purple-800/5 border-purple-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Status
                </CardTitle>
                <Wallet className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-2">
                  {balance.cashInHand ? getStatusBadge(balance.cashInHand.status) : 'Not Opened'}
                </div>
                {balance.cashInHand && balance.cashInHand.variance !== null && (
                  <div className="mt-2 space-y-1">
                    <p className={cn(
                      "text-xs font-medium",
                      Number(balance.cashInHand.variance) === 0 
                        ? "text-green-400" 
                        : Number(balance.cashInHand.variance) > 0 
                          ? "text-blue-400" 
                          : "text-red-400"
                    )}>
                      Variance: {Number(balance.cashInHand.variance) >= 0 ? '+' : ''}{formatCurrency(Number(balance.cashInHand.variance))}
                      {Number(balance.cashInHand.variance) > 0 && ' (Over)'}
                      {Number(balance.cashInHand.variance) < 0 && ' (Short)'}
                      {Number(balance.cashInHand.variance) === 0 && ' (Perfect)'}
                    </p>
                    {balance.cashInHand.expectedClosing !== null && (
                      <p className="text-xs text-gray-400">
                        Expected: {formatCurrency(Number(balance.cashInHand.expectedClosing))}
                      </p>
                    )}
                    {balance.cashInHand.actualCount !== null && (
                      <p className="text-xs text-gray-400">
                        Actual: {formatCurrency(Number(balance.cashInHand.actualCount))}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Today's Transactions</CardTitle>
              <CardDescription>Cash flow for {format(new Date(), 'MMM dd, yyyy')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Processed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-gray-300">
                        {format(new Date(transaction.transactionDate), 'HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <span className={cn("font-medium", getTransactionTypeColor(transaction.type))}>
                          {getTransactionTypeLabel(transaction.type)}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {transaction.description || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-white">
                        {formatCurrency(Number(transaction.amount))}
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {transaction.processor.name}
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                        No transactions today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <Wallet className="w-16 h-16 text-gray-400 mx-auto" />
              <h3 className="text-lg font-semibold text-white">No Cash Data</h3>
              <p className="text-gray-400">
                Start by opening the cash register for today
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
