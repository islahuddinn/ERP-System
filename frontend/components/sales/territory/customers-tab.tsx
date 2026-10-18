'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, MoreHorizontal, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import { useAreasDropdown } from '@/hooks/useAreas'
import { useCustomers, useDeleteCustomer, type Customer } from '@/hooks/useCustomers'
import { formatCustomerBalance } from '@/lib/currency'
import { CustomerFormDialog } from './customer-form-dialog'
import { StatusPill } from './status-pill'

interface CustomersTabProps {
  initialAreaId?: string
}

export function CustomersTab({ initialAreaId }: CustomersTabProps) {
  const router = useRouter()
  const controller = useDataTable({
    initialSortBy: 'shopName',
    initialSortOrder: 'ASC',
    initialFilters: initialAreaId ? { areaId: initialAreaId } : {},
  })
  const { data, isLoading, isError } = useCustomers(controller.queryParams as Record<string, string | number>)
  const deleteMutation = useDeleteCustomer()
  const { hasPermission } = usePermissionCheck()
  const canCreate = hasPermission('customers.create')
  const canUpdate = hasPermission('customers.update')
  const canDelete = hasPermission('customers.delete')
  const { data: areaOptions = [] } = useAreasDropdown()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (customer: Customer) => {
    setEditing(customer)
    setFormOpen(true)
  }

  const filters: DataTableFilter<Customer>[] = useMemo(
    () => [
      {
        key: 'areaId',
        label: 'Area',
        searchable: true,
        options: areaOptions.map((area) => ({ value: area.id, label: area.name })),
      },
      {
        key: 'status',
        label: 'Status',
        options: [
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
        ],
      },
      {
        key: 'customerType',
        label: 'Type',
        options: [
          { value: 'RETAILER', label: 'Retailer' },
          { value: 'WHOLESALER', label: 'Wholesaler' },
          { value: 'DISTRIBUTOR', label: 'Distributor' },
        ],
      },
    ],
    [areaOptions],
  )

  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (customer) => <span className="font-mono text-xs text-gray-700">{customer.code}</span>,
    },
    {
      key: 'shopName',
      header: 'Shop',
      sortable: true,
      render: (customer) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Users className="h-4 w-4 text-gray-400" />
          {customer.shopName}
        </span>
      ),
    },
    {
      key: 'category.name',
      header: 'Category',
      sortable: true,
      sortKey: 'category.name',
      render: (customer) => customer.category?.name ?? '—',
    },
    {
      key: 'area.name',
      header: 'Area / Branch',
      sortable: true,
      sortKey: 'area.name',
      render: (customer) =>
        customer.area ? (
          <span className="text-gray-600">
            {customer.area.name}
            {customer.area.branch?.name ? ` / ${customer.area.branch.name}` : ''}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      render: (customer) => customer.phone || '—',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (customer) => <StatusPill status={customer.status} />,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      sortable: true,
      render: (customer) => (
        <span
          className={
            (customer.balance || 0) > 0
              ? 'text-red-600 font-medium'
              : (customer.balance || 0) < 0
                ? 'text-green-600 font-medium'
                : 'text-gray-600 font-medium'
          }
        >
          {formatCustomerBalance(customer.balance)}
        </span>
      ),
    },
  ]

  return (
    <>
      <DataTable<Customer>
        columns={columns}
        data={data?.data}
        meta={data?.meta}
        controller={controller}
        rowKey={(customer) => customer.id}
        isLoading={isLoading}
        isError={isError}
        searchable
        searchPlaceholder="Search customers…"
        filters={filters}
        pageSizeOptions
        emptyMessage="No customers yet. Add a shop under an area."
        onRowClick={(customer) => router.push(`/dashboard/customers/${customer.id}`)}
        toolbarRight={
          canCreate ? (
            <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> New Customer
            </Button>
          ) : undefined
        }
        actions={(customer) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdate && (
                <DropdownMenuItem onClick={() => openEdit(customer)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(customer)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        defaultAreaId={initialAreaId}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete customer?"
        description={`This deactivates "${deleteTarget?.shopName}". The customer's balance must be 0 to delete.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            await deleteMutation.mutateAsync(deleteTarget.id)
          } catch {
            /* error toast handled in the hook */
          }
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
