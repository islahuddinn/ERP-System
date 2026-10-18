'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Plus,
  MoreVertical,
  Users,
  Edit,
  Trash2,
  FileText,
  Phone,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useCustomers, useDeleteCustomer, type Customer } from '@/hooks/useCustomers'
import { formatCustomerBalance } from '@/lib/currency'

export default function CustomersPage() {
  const router = useRouter()
  const controller = useDataTable()
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  // Server-side: search / sort / pagination go to the backend. The /customers
  // endpoint exposes no status filter param, so no status filter is offered here.
  const { data, isLoading, isError } = useCustomers({ ...(controller.queryParams as any) })
  const deleteMutation = useDeleteCustomer()

  const customers = data?.data ?? []
  const meta = data?.meta

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Customer deleted')
      setDeleteTarget(null)
    } catch (e: any) {
      // Surface the backend's specific reason (e.g. linked sales/payments) as a toast.
      toast.error(e?.response?.data?.message || 'Failed to delete customer')
      setDeleteTarget(null)
    }
  }

  const getStatusBadge = (status: Customer['status']) =>
    status === 'ACTIVE' ? (
      <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-700 border-gray-200">Inactive</Badge>
    )

  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (c) => <span className="font-medium text-gray-700">{c.code || c.id}</span>,
    },
    {
      key: 'shopName',
      header: 'Shop',
      sortable: true,
      render: (c) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Users className="h-4 w-4 text-gray-400" />
          {c.shopName}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (c) => getStatusBadge(c.status),
    },
    {
      key: 'contact',
      header: 'Contact',
      // Contact is a composite of email/phone; sort by the email scalar (backend-supported).
      sortable: true,
      sortKey: 'email',
      render: (c) => (
        <div className="flex flex-col text-sm text-gray-600">
          {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>}
          {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>}
          {!c.email && !c.phone && <span className="text-gray-400">No contact info</span>}
        </div>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      sortable: true,
      // Use the shared Rs. formatter so the list matches the ledger's currency &
      // Owes/Credit convention (was hard-coded "$", which showed the wrong currency).
      render: (c) => (
        <span className={(c.balance || 0) > 0 ? 'text-red-600 font-medium' : (c.balance || 0) < 0 ? 'text-green-600 font-medium' : 'text-gray-600 font-medium'}>
          {formatCustomerBalance(c.balance)}
        </span>
      ),
    },
  ]

  const filters: DataTableFilter<Customer>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
      ],
    },
  ]

  return (
    <ProtectedRoute>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Customers</h2>
            <p className="text-gray-500">Manage customer accounts and information.</p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/customers/create')}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <DataTable<Customer>
              columns={columns}
              data={customers}
              meta={meta}
              controller={controller}
              rowKey={(c) => c.id}
              isLoading={isLoading}
              isError={isError}
              errorMessage="Failed to load customers."
              searchable
              searchPlaceholder="Search customers..."
              filters={filters}
              pageSizeOptions
              emptyMessage="No customers found."
              onRowClick={(c) => router.push(`/dashboard/customers/${c.id}`)}
              actions={(c) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border-gray-200">
                    <DropdownMenuLabel className="text-gray-900">Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      className="cursor-pointer text-gray-700"
                      onClick={() => router.push(`/dashboard/customers/${c.id}`)}
                    >
                      <FileText className="mr-2 h-4 w-4" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-gray-700"
                      onClick={() => router.push(`/dashboard/customers/ledger?customerId=${c.id}`)}
                    >
                      <FileText className="mr-2 h-4 w-4" /> View Ledger
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-gray-700"
                      onClick={() => router.push(`/dashboard/customers/${c.id}/edit`)}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </CardContent>
        </Card>

        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete Customer"
          description={`Are you sure you want to delete customer "${deleteTarget?.shopName ?? ''}"? The customer's balance must be 0 to delete.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </ProtectedRoute>
  )
}
