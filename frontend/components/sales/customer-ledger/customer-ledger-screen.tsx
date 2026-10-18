'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  Download,
  Eye,
  Loader2,
  RotateCcw,
  Search,
  ShoppingCart,
  Truck,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import {
  useCustomerLedger,
  useExportCustomerLedgerCsv,
  LEDGER_ENTRY_TYPE_LABELS,
  type CustomerLedgerEntry,
  type CustomerLedgerEntryType,
} from '@/hooks/useCustomerLedger'
import { useCustomerLedgerOverview } from '@/hooks/useCustomerLedgerOverview'
import { formatCurrency } from '@/lib/currency'

export interface CustomerLedgerScreenProps {
  /** Route used for in-app navigation (overview + detail deep links). */
  basePath?: string
  pageTitle?: string
  pageSubtitle?: string
  /** At least one permission grants access — matches customers module + distribution sales. */
  requiredPermissions?: string[]
}

function getEntryTypeStyle(type: CustomerLedgerEntryType) {
  switch (type) {
    case 'DELIVERY':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'RECOVERY':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'RETURN':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'ADJUSTMENT':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'OPENING_BALANCE':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function EntryTypeIcon({ type }: { type: CustomerLedgerEntryType }) {
  switch (type) {
    case 'DELIVERY':
      return <Truck className="h-4 w-4 text-red-600" />
    case 'RECOVERY':
      return <Wallet className="h-4 w-4 text-green-600" />
    case 'RETURN':
      return <RotateCcw className="h-4 w-4 text-blue-600" />
    case 'ADJUSTMENT':
      return <ShoppingCart className="h-4 w-4 text-amber-600" />
    default:
      return <BookOpen className="h-4 w-4 text-gray-600" />
  }
}

function BalanceBadge({ balance }: { balance: number }) {
  if (balance > 0) {
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Outstanding</Badge>
  }
  if (balance < 0) {
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Credit</Badge>
  }
  return <Badge className="bg-green-100 text-green-800 border-green-200">Settled</Badge>
}

export function CustomerLedgerScreen({
  basePath = '/dashboard/sales/customer-ledger',
  pageTitle = 'Shop Ledger',
  pageSubtitle = 'Distribution sales balances — deliveries, recoveries, and returns per shop.',
  requiredPermissions = ['customer-ledger.view', 'customers.read'],
}: CustomerLedgerScreenProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { hasPermission } = usePermissionCheck()
  const canRecordRecovery = hasPermission('customer-recovery.create')
  const customerIdFromUrl = searchParams.get('customerId') ?? ''

  const openedWithCustomerIdRef = useRef(Boolean(customerIdFromUrl))

  const [overviewSearch, setOverviewSearch] = useState('')
  const [entrySearch, setEntrySearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerIdFromUrl)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const controller = useDataTable({ initialLimit: 15 })

  useEffect(() => {
    setSelectedCustomerId(customerIdFromUrl)
  }, [customerIdFromUrl])

  const ledgerFilters = useMemo(
    () => ({
      ...(controller.queryParams as Record<string, string | number>),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    }),
    [controller.queryParams, startDate, endDate],
  )

  const {
    data: overviewCustomers = [],
    isLoading: isLoadingOverview,
    isError: isOverviewError,
    refetch: refetchOverview,
  } = useCustomerLedgerOverview(overviewSearch)

  const {
    data: ledgerResponse,
    isLoading: isLoadingLedger,
    isError: isLedgerError,
    isFetching: isFetchingLedger,
    refetch: refetchLedger,
  } = useCustomerLedger(selectedCustomerId, ledgerFilters)

  const exportCsvMutation = useExportCustomerLedgerCsv()

  // Preserve prior behaviour: refresh when the user returns to this tab.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (selectedCustomerId) {
        refetchLedger()
      } else {
        refetchOverview()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [selectedCustomerId, refetchLedger, refetchOverview])

  const openCustomerLedger = (customerId: string) => {
    setSelectedCustomerId(customerId)
    openedWithCustomerIdRef.current = false
    const url = new URL(window.location.href)
    url.pathname = basePath
    url.searchParams.set('customerId', customerId)
    window.history.pushState({}, '', url.toString())
  }

  const backFromDetail = () => {
    if (openedWithCustomerIdRef.current) {
      router.back()
      return
    }

    setSelectedCustomerId('')
    setStartDate('')
    setEndDate('')
    setEntrySearch('')
    router.push(basePath)
  }

  const handleExportCsv = () => {
    if (!selectedCustomerId) return
    exportCsvMutation.mutate({
      customerId: selectedCustomerId,
      customerLedgerFilters: {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      },
    })
  }

  const filteredLedgerEntries = useMemo(() => {
    const entries = ledgerResponse?.ledger.data ?? []
    if (!entrySearch.trim()) return entries

    const query = entrySearch.trim().toLowerCase()
    return entries.filter(
      (entry) =>
        entry.reference?.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.type.toLowerCase().includes(query) ||
        LEDGER_ENTRY_TYPE_LABELS[entry.type]?.toLowerCase().includes(query),
    )
  }, [ledgerResponse?.ledger.data, entrySearch])

  const ledgerColumns: DataTableColumn<CustomerLedgerEntry>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (entry) => (
        <span className="text-gray-700">{format(new Date(entry.date), 'MMM d, yyyy')}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (entry) => (
        <div className="flex items-center gap-2">
          <EntryTypeIcon type={entry.type} />
          <Badge className={getEntryTypeStyle(entry.type)}>
            {LEDGER_ENTRY_TYPE_LABELS[entry.type] ?? entry.type}
          </Badge>
        </div>
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (entry) => (
        <span className="font-mono text-sm text-gray-700">{entry.reference ?? '—'}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (entry) => <span className="text-gray-800">{entry.description}</span>,
    },
    {
      key: 'debit',
      header: 'Debit',
      align: 'right',
      render: (entry) => (
        <span className="tabular-nums text-red-700">
          {entry.debit > 0 ? formatCurrency(Number(entry.debit)) : '—'}
        </span>
      ),
    },
    {
      key: 'credit',
      header: 'Credit',
      align: 'right',
      render: (entry) => (
        <span className="tabular-nums text-green-700">
          {entry.credit > 0 ? formatCurrency(Number(entry.credit)) : '—'}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (entry) => (
        <span className="tabular-nums font-medium text-gray-900">
          {formatCurrency(Number(entry.balance))}
        </span>
      ),
    },
  ]

  const sortedOverview = useMemo(
    () => [...overviewCustomers].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0)),
    [overviewCustomers],
  )

  const totalOutstanding = sortedOverview.reduce((sum, customer) => sum + (customer.balance ?? 0), 0)
  const customersWithBalance = sortedOverview.filter((customer) => (customer.balance ?? 0) > 0).length

  return (
    <ProtectedRoute requiredPermissions={requiredPermissions} requireAll={false}>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {!selectedCustomerId ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <BookOpen className="h-8 w-8 text-green-600" />
                  {pageTitle}
                </h1>
                <p className="text-gray-600 mt-1">{pageSubtitle}</p>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard/customers">Manage Customers</Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Active Shops</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">{sortedOverview.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Outstanding</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalOutstanding)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Shops With Dues</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">{customersWithBalance}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="relative max-w-xl">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={overviewSearch}
                    onChange={(event) => setOverviewSearch(event.target.value)}
                    placeholder="Search by shop name, code, email, or phone…"
                    className="pl-10 h-11 border-gray-300"
                  />
                </div>
              </CardContent>
            </Card>

            {isLoadingOverview && (
              <div className="flex items-center justify-center py-16 text-gray-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading shop balances…
              </div>
            )}

            {isOverviewError && (
              <Card>
                <CardContent className="py-10 text-center text-red-600">
                  Failed to load shop ledger overview.
                </CardContent>
              </Card>
            )}

            {!isLoadingOverview && !isOverviewError && sortedOverview.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-gray-500">
                  No active shops found for the current search.
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedOverview.map((customer) => (
                <Card key={customer.id} className="border-gray-200 shadow-sm flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg text-gray-900">{customer.shopName}</CardTitle>
                        <p className="text-sm text-gray-500">{customer.code}</p>
                      </div>
                      <BalanceBadge balance={customer.balance ?? 0} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div className="space-y-1 text-sm text-gray-600">
                      {customer.email && <p>{customer.email}</p>}
                      {customer.phone && <p>{customer.phone}</p>}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Current Balance</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatCurrency(Math.abs(Number(customer.balance ?? 0)))}
                      </p>
                    </div>
                    {customer.lastTransactionDate && (
                      <p className="text-xs text-gray-500">
                        Last entry: {format(new Date(customer.lastTransactionDate), 'MMM d, yyyy')}
                      </p>
                    )}
                    <Button
                      className="mt-auto bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => openCustomerLedger(customer.id)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Detailed Ledger
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="ghost" onClick={backFromDetail} className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold text-gray-900 truncate">
                  {ledgerResponse?.customer?.shopName ?? 'Shop Ledger'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {ledgerResponse?.customer?.code ?? selectedCustomerId}
                </p>
              </div>
              <Button
                onClick={handleExportCsv}
                disabled={exportCsvMutation.isPending || isLoadingLedger}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              {canRecordRecovery && (
                <Button asChild variant="outline">
                  <Link
                    href={`/dashboard/sales/customer-recovery/create?customerId=${selectedCustomerId}`}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    Record Recovery
                  </Link>
                </Button>
              )}
            </div>

            {isLoadingLedger && (
              <div className="flex items-center justify-center py-16 text-gray-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading ledger…
              </div>
            )}

            {isLedgerError && (
              <Card>
                <CardContent className="py-10 text-center text-red-600">
                  Failed to load this shop&apos;s ledger.
                </CardContent>
              </Card>
            )}

            {ledgerResponse && !isLedgerError && (
              <>
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <Label className="text-gray-500">Shop</Label>
                      <p className="font-medium text-gray-900">{ledgerResponse.customer.shopName}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Code</Label>
                      <p className="font-mono text-gray-900">{ledgerResponse.customer.code}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Email</Label>
                      <p className="text-gray-900">{ledgerResponse.customer.email ?? '—'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Phone</Label>
                      <p className="text-gray-900">{ledgerResponse.customer.phone ?? '—'}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Deliveries (Debit)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold text-red-700">
                        {formatCurrency(Number(ledgerResponse.summary.totalDeliveries))}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Recoveries (Credit)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold text-green-700">
                        {formatCurrency(Number(ledgerResponse.summary.totalRecoveries))}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Returns (Credit)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold text-blue-700">
                        {formatCurrency(Number(ledgerResponse.summary.totalReturns))}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Current Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(Number(ledgerResponse.summary.currentBalance))}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Total Entries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold text-gray-900">
                        {ledgerResponse.summary.totalEntries}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-gray-200 shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <Label htmlFor="ledger-start-date">Start date</Label>
                        <Input
                          id="ledger-start-date"
                          type="date"
                          value={startDate}
                          onChange={(event) => setStartDate(event.target.value)}
                          className="mt-1.5 h-11 border-gray-300"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ledger-end-date">End date</Label>
                        <Input
                          id="ledger-end-date"
                          type="date"
                          value={endDate}
                          onChange={(event) => setEndDate(event.target.value)}
                          className="mt-1.5 h-11 border-gray-300"
                        />
                      </div>
                      <div className="flex items-end gap-2 md:col-span-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setStartDate('')
                            setEndDate('')
                          }}
                        >
                          Clear dates
                        </Button>
                      </div>
                    </div>
                    <div className="relative max-w-xl">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={entrySearch}
                        onChange={(event) => setEntrySearch(event.target.value)}
                        placeholder="Search entries on this page by reference, description, or type…"
                        className="pl-10 h-11 border-gray-300"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    <DataTable<CustomerLedgerEntry>
                      columns={ledgerColumns}
                      data={filteredLedgerEntries}
                      meta={ledgerResponse.ledger.meta}
                      controller={controller}
                      rowKey={(entry) => entry.id}
                      isLoading={isLoadingLedger}
                      isError={isLedgerError}
                      errorMessage="Failed to load ledger entries."
                      pageSizeOptions
                      emptyMessage={
                        entrySearch.trim()
                          ? 'No matching entries on this page.'
                          : 'No ledger entries yet for this shop in the selected date range.'
                      }
                    />
                    {isFetchingLedger && !isLoadingLedger && (
                      <p className="text-xs text-gray-500 mt-3">Refreshing ledger…</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
