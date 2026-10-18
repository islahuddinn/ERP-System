'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/confirm-provider';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Receipt,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  MoreHorizontal,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useExpenses, useDeleteExpense, useApproveExpense, useMarkExpenseAsPaid, type Expense } from '@/hooks/useExpenses';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { formatCurrency } from '@/lib/currency';
import { apiClient } from '@/lib/api-client';
import { userResolver } from '@/lib/user-resolver';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  PAID: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  MOBILE_PAYMENT: 'Mobile Payment',
  OTHER: 'Other',
};

export default function ExpensesPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageLimit = 20;

  // Fetch expenses
  const { data: expensesData, isLoading, error } = useExpenses({
    page: currentPage,
    limit: pageLimit,
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    paymentMethod: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
  });

  // Fetch categories for filter
  const { data: categories } = useExpenseCategories();

  // Mutations
  const deleteExpense = useDeleteExpense();
  const approveExpense = useApproveExpense();
  const markAsPaid = useMarkExpenseAsPaid();

  const handleDelete = async (id: string) => {
    if (await confirm({ title: 'Delete Expense', description: 'Are you sure you want to delete this expense?', confirmLabel: 'Delete' })) {
      deleteExpense.mutate(id);
    }
  };

  const handleApprove = (id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
    approveExpense.mutate({ id, status, rejectionReason });
  };

  const handleMarkAsPaid = async (id: string) => {
    if (await confirm({ title: 'Mark as Paid', description: 'Mark this expense as paid?', confirmLabel: 'Mark Paid', confirmVariant: 'default' })) {
      markAsPaid.mutate(id);
    }
  };

  const handleViewDetails = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowDetails(true);
  };

  // Calculate summary stats
  const totalExpenses = expensesData?.total || 0;
  const totalAmount = expensesData?.data?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;
  const pendingCount = expensesData?.data?.filter(e => e.status === 'PENDING').length || 0;
  const paidCount = expensesData?.data?.filter(e => e.status === 'PAID').length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading expenses: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Expenses</h1>
          <p className="text-gray-400">Manage and track your business expenses</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/dashboard/expenses/add')}
            title="Create a new expense"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-white" />
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Total Expenses</p>
                <p className="text-2xl font-semibold text-white">{totalExpenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-600 to-yellow-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-white" />
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-100">Pending</p>
                <p className="text-2xl font-semibold text-white">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-600 to-green-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle2 className="h-8 w-8 text-white" />
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Paid</p>
                <p className="text-2xl font-semibold text-white">{paidCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-600 to-purple-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-white" />
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-100">Total Amount</p>
                <p className="text-2xl font-semibold text-white">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by expense number, description, vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Array.isArray(categories) ? categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                )) : null}
              </SelectContent>
            </Select>
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Methods</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="MOBILE_PAYMENT">Mobile Payment</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Expenses</CardTitle>
          <CardDescription className="text-gray-400">
            Manage and track your business expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Expense #</TableHead>
                  <TableHead className="text-gray-300">Category</TableHead>
                  <TableHead className="text-gray-300">Location</TableHead>
                  <TableHead className="text-gray-300">Amount</TableHead>
                  <TableHead className="text-gray-300">Payment Method</TableHead>
                  <TableHead className="text-gray-300">Date</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesData?.data && expensesData.data.length > 0 ? (
                  expensesData.data.map((expense) => (
                    <TableRow key={expense.id} className="border-gray-700 hover:bg-gray-700/50">
                      <TableCell className="text-white font-medium">
                        {expense.expenseNumber}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div className="flex items-center gap-2">
                          {expense.category.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: expense.category.color }}
                            />
                          )}
                          {expense.category.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {expense.location.name}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {paymentMethodLabels[expense.paymentMethod] || expense.paymentMethod}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {format(new Date(expense.expenseDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[expense.status]}>
                          {expense.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(expense)}
                            className="text-gray-400 hover:text-white"
                            title="View expense details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/expenses/${expense.id}/edit`)}
                            className="text-indigo-400 hover:text-indigo-300"
                            title="Edit expense"
                            disabled={expense.status === 'PAID'}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {expense.status === 'PENDING' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(expense.id, 'APPROVED')}
                                className="text-green-400 hover:text-green-300"
                                title="Approve expense"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const reason = prompt('Rejection reason:');
                                  if (reason) handleApprove(expense.id, 'REJECTED', reason);
                                }}
                                className="text-red-400 hover:text-red-300"
                                title="Reject expense"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {expense.status === 'APPROVED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsPaid(expense.id)}
                              className="text-blue-400 hover:text-blue-300"
                              title="Mark as paid"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-400 hover:text-red-300"
                            title="Delete expense"
                            disabled={deleteExpense.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                      No expenses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {expensesData && expensesData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-400">
                Showing {((currentPage - 1) * pageLimit) + 1} to {Math.min(currentPage * pageLimit, expensesData.total)} of {expensesData.total} expenses
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(expensesData.totalPages, p + 1))}
                  disabled={currentPage === expensesData.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl bg-gray-800 border-gray-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Expense Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Expense #{selectedExpense?.expenseNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-6">
              {/* Expense Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Expense Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expense Number:</span>
                      <span className="text-white font-mono">{selectedExpense.expenseNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category:</span>
                      <div className="flex items-center gap-2">
                        {selectedExpense.category.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: selectedExpense.category.color }}
                          />
                        )}
                        <span className="text-white">{selectedExpense.category.name}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Location:</span>
                      <span className="text-white">{selectedExpense.location.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Amount:</span>
                      <span className="text-white font-semibold">{formatCurrency(selectedExpense.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Payment Method:</span>
                      <span className="text-white">{paymentMethodLabels[selectedExpense.paymentMethod] || selectedExpense.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expense Date:</span>
                      <span className="text-white">{format(new Date(selectedExpense.expenseDate), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Payment Date:</span>
                      <span className="text-white">{format(new Date(selectedExpense.paymentDate), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <Badge className={statusColors[selectedExpense.status]}>
                        {selectedExpense.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Additional Information</h3>
                  <div className="space-y-2 text-sm">
                    {selectedExpense.vendor && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Vendor:</span>
                        <span className="text-white">{selectedExpense.vendor}</span>
                      </div>
                    )}
                    {selectedExpense.referenceNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Reference Number:</span>
                        <span className="text-white font-mono">{selectedExpense.referenceNumber}</span>
                      </div>
                    )}
                    {selectedExpense.isRecurring && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Recurring:</span>
                        <span className="text-white">Yes ({selectedExpense.recurringFrequency})</span>
                      </div>
                    )}
                    {selectedExpense.nextRecurringDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Next Recurring Date:</span>
                        <span className="text-white">{format(new Date(selectedExpense.nextRecurringDate), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created By:</span>
                      <span className="text-white">{userResolver.getUserName(selectedExpense.createdById)}</span>
                    </div>
                    {selectedExpense.approvedById && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Approved By:</span>
                        <span className="text-white">{userResolver.getUserName(selectedExpense.approvedById)}</span>
                      </div>
                    )}
                    {selectedExpense.approvedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Approved At:</span>
                        <span className="text-white">{format(new Date(selectedExpense.approvedAt), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    )}
                    {selectedExpense.rejectionReason && (
                      <div className="flex flex-col">
                        <span className="text-gray-400 mb-1">Rejection Reason:</span>
                        <span className="text-red-400">{selectedExpense.rejectionReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {selectedExpense.description && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                  <p className="text-gray-300">{selectedExpense.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

