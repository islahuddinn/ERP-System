'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSupplierLedger, useExportSupplierLedger } from '@/hooks/useSupplierLedger'
import { format } from 'date-fns'

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
    OPENING_BALANCE: { label: 'Opening', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    PURCHASE_ORDER:  { label: 'Purchase', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    PAYMENT:         { label: 'Payment', className: 'bg-green-100 text-green-700 border-green-200' },
    PURCHASE_RETURN: { label: 'Return', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    ADJUSTMENT:      { label: 'Adjustment', className: 'bg-purple-100 text-purple-700 border-purple-200' },
}

function getTypeBadge(type: string) {
    const badge = TYPE_BADGE[type] ?? { label: type, className: 'bg-gray-100 text-gray-600' }
    return <Badge className={badge.className}>{badge.label}</Badge>
}

function BalanceDisplay({ amount }: { amount: number }) {
    if (amount > 0) return <span className="text-red-600 font-bold">{amount.toLocaleString()}</span>
    if (amount < 0) return <span className="text-blue-600 font-bold">{amount.toLocaleString()}</span>
    return <span className="text-green-600 font-bold">0</span>
}

export default function SupplierLedgerPage() {
    const router = useRouter()
    const params = useParams()
    const supplierId = params?.supplierId as string

    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const { data: ledger, isLoading, isError } = useSupplierLedger(supplierId, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
    })

    const exportMutation = useExportSupplierLedger()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        )
    }

    if (isError || !ledger) {
        return <div className="p-8 text-center text-red-500">Failed to load ledger</div>
    }

    const { supplier, openingBalance, currentBalance, summary, entries } = ledger

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard/suppliers')}
                    className="text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Suppliers
                </Button>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">{supplier?.name}</h2>
                    <p className="text-gray-500 text-sm">Supplier Ledger</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={exportMutation.isPending}
                    onClick={() => exportMutation.mutate({ ledger, format: 'pdf' })}
                >
                    {exportMutation.isPending
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : <Download className="mr-2 h-4 w-4" />
                    }
                    Export PDF
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Current Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BalanceDisplay amount={currentBalance ?? 0} />
                        <p className="text-xs text-gray-400 mt-1">
                            {(currentBalance ?? 0) > 0 ? 'Factory owes supplier' : (currentBalance ?? 0) < 0 ? 'Supplier credit' : 'Settled'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Purchases</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-gray-900">{(summary?.totalPurchases ?? 0).toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-green-700">{(summary?.totalPayments ?? 0).toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Opening Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-gray-900">{(openingBalance ?? 0).toLocaleString()}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Date Filter */}
            <Card>
                <CardContent className="pt-4 pb-3">
                    <div className="flex gap-4 items-end">
                        <div>
                            <Label className="text-xs text-gray-500">From</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-40" />
                        </div>
                        <div>
                            <Label className="text-xs text-gray-500">To</Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-40" />
                        </div>
                        {(startDate || endDate) && (
                            <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate('') }}>
                                Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Ledger Table */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Ledger Entries</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead className="font-semibold text-gray-900">Date</TableHead>
                                <TableHead className="font-semibold text-gray-900">Type</TableHead>
                                <TableHead className="font-semibold text-gray-900">Reference</TableHead>
                                <TableHead className="font-semibold text-gray-900">Description</TableHead>
                                <TableHead className="font-semibold text-gray-900 text-right">Debit</TableHead>
                                <TableHead className="font-semibold text-gray-900 text-right">Credit</TableHead>
                                <TableHead className="font-semibold text-gray-900 text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!entries || entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                                        No entries found
                                    </TableCell>
                                </TableRow>
                            ) : entries.map((entry: any, idx: number) => (
                                <TableRow key={entry.sourceId ?? idx} className="hover:bg-gray-50">
                                    <TableCell className="text-gray-600 text-sm">
                                        {format(new Date(entry.date), 'MMM dd, yyyy')}
                                    </TableCell>
                                    <TableCell>{getTypeBadge(entry.type)}</TableCell>
                                    <TableCell className="font-mono text-sm text-gray-700">
                                        {entry.reference ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm max-w-xs truncate">
                                        {entry.description}
                                    </TableCell>
                                    <TableCell className="text-right text-sm">
                                        {entry.debit > 0
                                            ? <span className="text-green-700 font-medium">{Number(entry.debit).toLocaleString()}</span>
                                            : <span className="text-gray-300">—</span>
                                        }
                                    </TableCell>
                                    <TableCell className="text-right text-sm">
                                        {entry.credit > 0
                                            ? <span className="text-red-600 font-medium">{Number(entry.credit).toLocaleString()}</span>
                                            : <span className="text-gray-300">—</span>
                                        }
                                    </TableCell>
                                    <TableCell className="text-right text-sm font-semibold text-gray-900">
                                        {Number(entry.balance).toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
