'use client'

import { useState } from 'react'
import { Plus, Search, Edit, Trash2, DollarSign, Calendar, CreditCard, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/currency'
import { usePayments, useCreatePayment, useUpdatePayment, useDeletePayment, usePaymentStats, useSubscriptions, Payment } from '@/hooks/useSuperAdmin'
import { format } from 'date-fns'

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const [formData, setFormData] = useState({
    subscriptionId: '',
    amount: '',
    currency: 'USD',
    paymentDate: new Date().toISOString().slice(0, 16),
    paymentMethod: 'STRIPE' as const,
    referenceNumber: '',
    status: 'PENDING' as const,
    notes: '',
  })

  const toArray = (value: any) => {
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.data)) return value.data
    if (Array.isArray(value?.data?.data)) return value.data.data
    return []
  }

  const { data: subscriptionsData } = useSubscriptions({ limit: 1000 })
  const subscriptions = toArray(subscriptionsData)

  const { data, isLoading, refetch } = usePayments({
    page: currentPage,
    limit: 10,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    paymentMethod: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
  })

  const { data: stats } = usePaymentStats()

  const createPayment = useCreatePayment()
  const updatePayment = useUpdatePayment()
  const deletePayment = useDeletePayment()

  const payments = toArray(data)
  const totalPages = data?.meta?.totalPages || 1

  const handleCreate = async () => {
    try {
      await createPayment.mutateAsync({
        ...formData,
        amount: Number(formData.amount),
        paymentDate: new Date(formData.paymentDate).toISOString(),
      })
      setShowAddDialog(false)
      resetForm()
      refetch()
    } catch (error) {}
  }

  const resetForm = () => {
    setFormData({
      subscriptionId: '',
      amount: '',
      currency: 'USD',
      paymentDate: new Date().toISOString().slice(0, 16),
      paymentMethod: 'STRIPE',
      referenceNumber: '',
      status: 'PENDING',
      notes: '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-2">Track and manage all payments</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowAddDialog(true)
          }}
          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Payment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="factory-light-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card className="factory-light-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.totalPayments || 0}</div>
          </CardContent>
        </Card>
        <Card className="factory-light-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.byStatus?.find((s: any) => s.status === 'COMPLETED')?.count || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="factory-light-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.byStatus?.find((s: any) => s.status === 'PENDING')?.count || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="factory-light-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="factory-input">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="factory-input">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="STRIPE">Stripe</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="PAYPAL">PayPal</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600 flex items-center">
              Total: {data?.meta?.total || 0} payments
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="factory-light-card">
        <CardHeader>
          <CardTitle className="text-gray-900">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No payments found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="text-gray-700">Tenant</TableHead>
                      <TableHead className="text-gray-700">Amount</TableHead>
                      <TableHead className="text-gray-700">Method</TableHead>
                      <TableHead className="text-gray-700">Date</TableHead>
                      <TableHead className="text-gray-700">Status</TableHead>
                      <TableHead className="text-right text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: Payment) => (
                      <TableRow key={payment.id} className="border-gray-200 hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {payment.subscription?.tenant?.name || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {formatCurrency(Number(payment.amount))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge>{payment.paymentMethod}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              payment.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : payment.status === 'PENDING'
                                ? 'bg-orange-100 text-orange-700 border-orange-200'
                                : payment.status === 'FAILED'
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deletePayment.mutate(payment.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subscription *</Label>
              <Select value={formData.subscriptionId} onValueChange={(value) => setFormData({ ...formData, subscriptionId: value })}>
                <SelectTrigger className="factory-input">
                  <SelectValue placeholder="Select subscription" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptions.map((sub: any) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.tenant?.name} - {sub.type} ({formatCurrency(Number(sub.amount))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="factory-input"
                />
              </div>
              <div>
                <Label>Payment Method *</Label>
                <Select value={formData.paymentMethod} onValueChange={(value: any) => setFormData({ ...formData, paymentMethod: value })}>
                  <SelectTrigger className="factory-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STRIPE">Stripe</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="PAYPAL">PayPal</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Date *</Label>
                <Input
                  type="datetime-local"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="factory-input"
                />
              </div>
              <div>
                <Label>Reference Number</Label>
                <Input
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="factory-input"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createPayment.isPending}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
            >
              {createPayment.isPending ? 'Creating...' : 'Create Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

