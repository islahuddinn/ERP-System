'use client';

import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Trash2, CheckCircle2, XCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useExpense, useDeleteExpense, useApproveExpense, useMarkExpenseAsPaid } from '@/hooks/useExpenses';
import { formatCurrency } from '@/lib/currency';
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

export default function ExpenseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params?.id ? params.id.toString() : '';

  const { data: expense, isLoading } = useExpense(expenseId);
  const deleteExpense = useDeleteExpense();
  const approveExpense = useApproveExpense();
  const markAsPaid = useMarkExpenseAsPaid();

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this expense?')) {
      deleteExpense.mutate(expenseId, {
        onSuccess: () => {
          router.push('/dashboard/expenses');
        },
      });
    }
  };

  const handleApprove = (status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED') {
      const reason = prompt('Rejection reason:');
      if (reason) {
        approveExpense.mutate({ id: expenseId, status, rejectionReason: reason });
      }
    } else {
      approveExpense.mutate({ id: expenseId, status });
    }
  };

  const handleMarkAsPaid = () => {
    if (confirm('Mark this expense as paid?')) {
      markAsPaid.mutate(expenseId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Expense not found</p>
        <Button onClick={() => router.push('/dashboard/expenses')} className="mt-4">
          Back to Expenses
        </Button>
      </div>
    );
  }

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
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Expense Details</h1>
            <p className="text-gray-400">Expense #{expense.expenseNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {expense.status !== 'PAID' && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/expenses/${expenseId}/edit`)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {expense.status === 'PENDING' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleApprove('APPROVED')}
                className="border-green-600 text-green-400 hover:bg-green-900/20"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => handleApprove('REJECTED')}
                className="border-red-600 text-red-400 hover:bg-red-900/20"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          {expense.status === 'APPROVED' && (
            <Button
              variant="outline"
              onClick={handleMarkAsPaid}
              className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDelete}
            className="border-red-600 text-red-400 hover:bg-red-900/20"
            disabled={deleteExpense.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expense Information */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Expense Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Expense Number</p>
                  <p className="text-white font-mono">{expense.expenseNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <Badge className={statusColors[expense.status]}>
                    {expense.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Category</p>
                  <div className="flex items-center gap-2">
                    {expense.category.color && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: expense.category.color }}
                      />
                    )}
                    <p className="text-white">{expense.category.name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Location</p>
                  <p className="text-white">{expense.location.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Amount</p>
                  <p className="text-white font-semibold text-lg">
                    {formatCurrency(expense.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Payment Method</p>
                  <p className="text-white">
                    {paymentMethodLabels[expense.paymentMethod] || expense.paymentMethod}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Expense Date</p>
                  <p className="text-white">
                    {format(new Date(expense.expenseDate), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Payment Date</p>
                  <p className="text-white">
                    {format(new Date(expense.paymentDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {expense.description && (
                <>
                  <Separator className="bg-gray-700" />
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Description</p>
                    <p className="text-white">{expense.description}</p>
                  </div>
                </>
              )}

              {(expense.vendor || expense.referenceNumber) && (
                <>
                  <Separator className="bg-gray-700" />
                  <div className="grid grid-cols-2 gap-4">
                    {expense.vendor && (
                      <div>
                        <p className="text-sm text-gray-400">Vendor</p>
                        <p className="text-white">{expense.vendor}</p>
                      </div>
                    )}
                    {expense.referenceNumber && (
                      <div>
                        <p className="text-sm text-gray-400">Reference Number</p>
                        <p className="text-white font-mono">{expense.referenceNumber}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {expense.isRecurring && (
                <>
                  <Separator className="bg-gray-700" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Recurring</p>
                      <p className="text-white">Yes ({expense.recurringFrequency})</p>
                    </div>
                    {expense.nextRecurringDate && (
                      <div>
                        <p className="text-sm text-gray-400">Next Recurring Date</p>
                        <p className="text-white">
                          {format(new Date(expense.nextRecurringDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Approval Information */}
          {(expense.approvedById || expense.approvedAt || expense.rejectionReason) && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Approval Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {expense.approvedById && (
                  <div>
                    <p className="text-sm text-gray-400">Approved By</p>
                    <p className="text-white">{userResolver.getUserName(expense.approvedById)}</p>
                    <p className="text-xs text-gray-500">{userResolver.getUserEmail(expense.approvedById)}</p>
                  </div>
                )}
                {expense.approvedAt && (
                  <div>
                    <p className="text-sm text-gray-400">Approved At</p>
                    <p className="text-white">
                      {format(new Date(expense.approvedAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                )}
                {expense.rejectionReason && (
                  <div>
                    <p className="text-sm text-gray-400">Rejection Reason</p>
                    <p className="text-red-400">{expense.rejectionReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Creator Information */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Created By</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-white">{userResolver.getUserName(expense.createdById || '')}</p>
                <p className="text-xs text-gray-500">{userResolver.getUserEmail(expense.createdById || '')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Created At</p>
                <p className="text-white text-sm">
                  {format(new Date(expense.createdAt), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Last Updated</p>
                <p className="text-white text-sm">
                  {format(new Date(expense.updatedAt), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

