'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { formatCurrency } from '@/lib/currency'
import {
  ArrowLeft,
  Users,
  Edit,
  Trash2,
  FileText,
  Mail,
  Phone,
  MapPin,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Wallet,
  CreditCard,
  CalendarDays,
  CalendarClock,
} from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { useCustomer, useCustomerStats, useDeleteCustomer } from '@/hooks/useCustomers'
import { BankAccountsSection } from '@/components/bank-accounts/BankAccountsSection'
import { ViewHistoryButton } from '@/components/audit/entity-history'

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-green-50 p-3 shrink-0">
            <Icon className="h-6 w-6 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
            <p className="text-2xl font-semibold text-gray-900 truncate" title={value}>
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const customerId = params.id

  const { data: customer, isLoading } = useCustomer(customerId)
  const { data: stats } = useCustomerStats(customerId)
  const deleteMutation = useDeleteCustomer()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDeleteConfirmed = async () => {
    try {
      await deleteMutation.mutateAsync(customerId)
      router.push('/dashboard/customers')
    } finally {
      setConfirmDelete(false)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="customers.read">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!customer) {
    return (
      <ProtectedRoute requiredPermission="customers.read">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Customer not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/customers')}>
            Back to Customers
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  const balance = customer.balance || 0
  const fmt = (n: number) => formatCurrency(n || 0)

  return (
    <ProtectedRoute requiredPermission="customers.read">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/customers')}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="h-8 w-8 text-green-600" />
                {customer.shopName}
              </h1>
              <p className="text-gray-500 mt-1 font-mono text-sm">{customer.code}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <ViewHistoryButton entityName="Customer" entityId={customerId} variant="outline" size="sm" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/customers/ledger?customerId=${customerId}`)}
              className="border-gray-300"
            >
              <FileText className="mr-1.5 h-4 w-4" /> View Ledger
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/customers/${customerId}/edit`)}
              className="border-gray-300"
            >
              <Edit className="mr-1.5 h-4 w-4" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        {/* Sales statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Sales" value={String(stats?.totalSales ?? 0)} icon={ShoppingCart} />
          <StatCard label="Total Amount" value={fmt(stats?.totalAmount ?? 0)} icon={TrendingUp} />
          <StatCard label="Total Paid" value={fmt(stats?.totalPaid ?? 0)} icon={CreditCard} />
          <StatCard label="Outstanding Balance" value={fmt(stats?.outstandingBalance ?? balance)} icon={Wallet} />
          <StatCard label="Avg. Sale Value" value={fmt(stats?.averageSaleValue ?? 0)} icon={DollarSign} />
          <StatCard
            label="Last Sale Date"
            value={stats?.lastSaleDate ? format(new Date(stats.lastSaleDate), 'MMM d, yyyy') : '—'}
            icon={CalendarDays}
          />
          <StatCard label="Sales This Month" value={String(stats?.salesThisMonth ?? 0)} icon={CalendarClock} />
          <StatCard label="Amount This Month" value={fmt(stats?.amountThisMonth ?? 0)} icon={DollarSign} />
        </div>

        {/* Contact info */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500 text-xs">Email</p>
                  <p className="font-medium text-gray-900">{customer.email}</p>
                </div>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500 text-xs">Phone</p>
                  <p className="font-medium text-gray-900">{customer.phone}</p>
                </div>
              </div>
            )}
            {(customer.address || customer.area) && (
              <div className="flex items-center gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Address</p>
                  <p className="font-medium text-gray-900">
                    {[customer.address, customer.area?.name, customer.area?.branch?.name].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            )}
            {customer.remarks && (
              <div className="md:col-span-2">
                <p className="text-gray-500 text-xs mb-1">Remarks</p>
                <p className="text-gray-900">{customer.remarks}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500 text-xs">Status</p>
              <Badge variant={customer.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {customer.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Current Balance</p>
              <p className={`font-semibold ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                {fmt(Math.abs(balance))} {balance > 0 ? 'Owes' : balance < 0 ? 'Credit' : 'Paid Up'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Member Since</p>
              <p className="font-medium text-gray-900">{format(new Date(customer.createdAt), 'MMM d, yyyy')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Bank accounts */}
        <BankAccountsSection ownerType="customers" ownerId={customerId} />

        {/* Recent sales */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Sale #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(customer.sales ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No sales found for this customer.
                    </TableCell>
                  </TableRow>
                ) : (
                  (customer.sales ?? []).map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-xs">{sale.saleNumber}</TableCell>
                      <TableCell>{format(new Date(sale.saleDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(sale.totalAmount)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{sale.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{sale.paymentStatus}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <ConfirmDialog
          open={confirmDelete}
          title="Delete Customer"
          description={`Are you sure you want to delete "${customer.shopName}"? The customer's balance must be 0 to delete.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(false)}
        />
      </div>
    </ProtectedRoute>
  )
}
