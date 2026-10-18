'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useConfirm } from '@/components/ui/confirm-provider'
import { useSupplier } from '@/hooks/useSuppliers'
import { useSupplierTransactions, useCreateSupplierTransaction, useUpdateSupplierTransaction, useDeleteSupplierTransaction } from '@/hooks/useSupplierTransactions'
import { useSupplierLedger } from '@/hooks/useSupplierLedger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ArrowLeft, Plus, Edit, Trash2, Loader2, Truck, DollarSign, Package, RotateCcw, AlertCircle, Mail, Phone, MapPin, FileText } from 'lucide-react'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { BankAccountsSection } from '@/components/bank-accounts/BankAccountsSection'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { useForm } from 'react-hook-form'

type TransactionType = 'PURCHASE' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT'

interface TransactionFormData {
    date: string
    type: TransactionType | ''
    reference: string
    description: string
    amount: number | null
    notes?: string
}

function OverviewTab({ supplier }: { supplier: any }) {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {supplier.email && (
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium">{supplier.email}</p></div>
                        </div>
                    )}
                    {supplier.phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium">{supplier.phone}</p></div>
                        </div>
                    )}
                    {supplier.address && (
                        <div className="flex items-center gap-2 md:col-span-2">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div><p className="text-muted-foreground text-xs">Address</p><p className="font-medium">{supplier.address}</p></div>
                        </div>
                    )}
                    {supplier.notes && (
                        <div className="md:col-span-2">
                            <p className="text-muted-foreground text-xs mb-1">Notes</p>
                            <p>{supplier.notes}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-muted-foreground text-xs">Status</p>
                        <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                            {supplier.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Member Since</p>
                        <p className="font-medium">{format(new Date(supplier.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                </CardContent>
            </Card>

            {supplier.openingBalanceAmount && parseFloat(supplier.openingBalanceAmount) !== 0 && (
                <Card>
                    <CardHeader><CardTitle>Opening Balance</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground text-xs">Amount</p>
                            <p className="font-semibold text-lg">
                                {parseFloat(supplier.openingBalanceAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        {supplier.openingBalanceDate && (
                            <div>
                                <p className="text-muted-foreground text-xs">Date</p>
                                <p className="font-medium">{format(new Date(supplier.openingBalanceDate), 'MMM d, yyyy')}</p>
                            </div>
                        )}
                        {supplier.openingBalanceNote && (
                            <div>
                                <p className="text-muted-foreground text-xs">Note</p>
                                <p>{supplier.openingBalanceNote}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function LedgerTab({ supplierId }: { supplierId: string }) {
    const { data: ledgerData, isLoading } = useSupplierLedger(supplierId)

    if (isLoading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>

    // The ledger endpoint returns rows under `entries` (QA #9 — the tab previously
    // read `ledger`, which doesn't exist, so it always rendered empty).
    const entries: any[] = Array.isArray(ledgerData)
        ? ledgerData
        : ledgerData?.entries ?? ledgerData?.ledger ?? []

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No ledger entries found
                                </TableCell>
                            </TableRow>
                        ) : entries.map((entry: any, idx: number) => (
                            <TableRow key={entry.sourceId ?? entry.id ?? idx}>
                                <TableCell>{format(new Date(entry.date), 'MMM dd, yyyy')}</TableCell>
                                <TableCell><Badge variant="outline">{entry.type}</Badge></TableCell>
                                {/* Synthetic rows (e.g. Opening Balance) have no reference (QA #8) */}
                                <TableCell className="font-mono text-xs">{entry.reference || '—'}</TableCell>
                                <TableCell>{entry.description}</TableCell>
                                <TableCell className="text-right">
                                    {parseFloat(entry.debit || '0') > 0 ? parseFloat(entry.debit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                    {parseFloat(entry.credit || '0') > 0 ? parseFloat(entry.credit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {parseFloat(entry.balance || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function TransactionsTab({ supplierId, supplierCreatedAt }: { supplierId: string; supplierCreatedAt: string }) {
    const confirm = useConfirm()
    // A transaction can't be dated before the supplier existed. Used for the
    // date input's `min` and RHF validation (mirrors the backend guard).
    const minDate = supplierCreatedAt ? new Date(supplierCreatedAt).toISOString().split('T')[0] : undefined
    const { data: transactions, isLoading, refetch } = useSupplierTransactions(supplierId)
    const createMutation = useCreateSupplierTransaction(supplierId)
    const updateMutation = useUpdateSupplierTransaction(supplierId)
    const deleteMutation = useDeleteSupplierTransaction(supplierId)

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<any>(null)

    const EMPTY_FORM: TransactionFormData = {
        date: '',
        type: '',
        reference: '',
        description: '',
        amount: null,
        notes: '',
    }

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TransactionFormData>({
        defaultValues: EMPTY_FORM,
    })

    const transactionType = watch('type')

    const handleOpenDialog = (transaction?: any) => {
        if (transaction) {
            setEditingTransaction(transaction)
            // The single "amount" carries whichever side (debit/credit) is populated.
            const debitVal = parseFloat(transaction.debit) || 0
            const creditVal = parseFloat(transaction.credit) || 0
            reset({
                date: new Date(transaction.date).toISOString().split('T')[0],
                type: transaction.type,
                reference: transaction.reference,
                description: transaction.description,
                amount: debitVal > 0 ? debitVal : creditVal,
                notes: transaction.notes || '',
            })
        } else {
            setEditingTransaction(null)
            reset(EMPTY_FORM)
        }
        setIsDialogOpen(true)
    }

    const onSubmit = async (data: TransactionFormData) => {
        try {
            const amount = Number(data.amount) || 0
            // Accounting direction (matches backend ledger convention):
            //   debit  = reduces what the factory owes the supplier (PAYMENT, RETURN)
            //   credit = increases what the factory owes the supplier (PURCHASE, ADJUSTMENT)
            let finalDebit = 0
            let finalCredit = 0
            if (data.type === 'PURCHASE' || data.type === 'ADJUSTMENT') {
                finalCredit = amount
            } else {
                finalDebit = amount
            }
            const { amount: _omit, ...rest } = data
            // `type` is guaranteed non-empty here (RHF `required` validation gates submit).
            const payload = { ...rest, type: data.type as TransactionType, debit: finalDebit, credit: finalCredit }

            if (editingTransaction) {
                await updateMutation.mutateAsync({ id: editingTransaction.id, data: payload })
                toast.success('Transaction updated')
            } else {
                await createMutation.mutateAsync(payload)
                toast.success('Transaction created')
            }
            setIsDialogOpen(false)
            setEditingTransaction(null)
            reset()
            refetch()
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || 'Failed to save transaction')
        }
    }

    const handleDelete = async (id: string) => {
        if (!(await confirm({ title: 'Delete Transaction', description: 'Delete this transaction?', confirmLabel: 'Delete' }))) return
        try {
            await deleteMutation.mutateAsync(id)
            toast.success('Transaction deleted')
            refetch()
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || 'Failed to delete')
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'PURCHASE': return <Package className="h-4 w-4 text-blue-500" />
            case 'RETURN': return <RotateCcw className="h-4 w-4 text-orange-500" />
            case 'PAYMENT': return <DollarSign className="h-4 w-4 text-green-500" />
            case 'ADJUSTMENT': return <AlertCircle className="h-4 w-4 text-purple-500" />
            default: return <Package className="h-4 w-4 text-gray-500" />
        }
    }

    const txList: any[] = Array.isArray(transactions) ? transactions : transactions?.data ?? []

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Manual Transactions</CardTitle>
                            <CardDescription>Add, edit, or delete manual transactions for this supplier</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDialog()} className="bg-green-600 hover:bg-green-700 text-white">
                            <Plus className="mr-2 h-4 w-4" /> Add Transaction
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                        </div>
                    ) : txList.length > 0 ? (
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {txList.map((transaction: any) => (
                                    <TableRow key={transaction.id} className="hover:bg-gray-50">
                                        <TableCell>{format(new Date(transaction.date), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getTypeIcon(transaction.type)}
                                                <span>{transaction.type}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{transaction.reference}</TableCell>
                                        <TableCell>{transaction.description}</TableCell>
                                        <TableCell className="text-right">
                                            {parseFloat(transaction.debit || '0') > 0 ? parseFloat(transaction.debit).toFixed(2) : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {parseFloat(transaction.credit || '0') > 0 ? parseFloat(transaction.credit).toFixed(2) : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(transaction)}>
                                                    <Edit className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(transaction.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No transactions found. Click "Add Transaction" to create one.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
                        <DialogDescription>
                            {editingTransaction ? 'Update the transaction details' : 'Create a new manual transaction for this supplier'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Date <span className="text-red-500">*</span></Label>
                                <Input
                                    type="date"
                                    min={minDate}
                                    {...register('date', {
                                        required: 'Date is required',
                                        validate: (value) =>
                                            !minDate || value >= minDate ||
                                            `Date cannot be before the supplier's creation date (${minDate})`,
                                    })}
                                    className="mt-1.5"
                                />
                                {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>}
                            </div>
                            <div>
                                <Label>Type <span className="text-red-500">*</span></Label>
                                <input type="hidden" {...register('type', { required: 'Type is required' })} />
                                <Select
                                    value={transactionType || undefined}
                                    onValueChange={(value) => setValue('type', value as TransactionType, { shouldValidate: true })}
                                >
                                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PURCHASE">Purchase</SelectItem>
                                        <SelectItem value="PAYMENT">Payment</SelectItem>
                                        <SelectItem value="RETURN">Return</SelectItem>
                                        <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.type && <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>}
                            </div>
                        </div>
                        <div>
                            <Label>Reference <span className="text-red-500">*</span></Label>
                            <Input {...register('reference', { required: 'Reference is required' })} placeholder="e.g. TXN-001" className="mt-1.5" />
                            {errors.reference && <p className="text-sm text-red-600 mt-1">{errors.reference.message}</p>}
                        </div>
                        <div>
                            <Label>Description <span className="text-red-500">*</span></Label>
                            <Input {...register('description', { required: 'Description is required' })} placeholder="Transaction description" className="mt-1.5" />
                            {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>
                                    Amount
                                    {(transactionType === 'PURCHASE' || transactionType === 'ADJUSTMENT')
                                        ? ' (Credit)'
                                        : (transactionType === 'PAYMENT' || transactionType === 'RETURN') ? ' (Debit)' : ''}
                                    {' '}<span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    {...register('amount', {
                                        required: 'Amount is required',
                                        min: { value: 0.01, message: 'Amount must be greater than 0' },
                                        valueAsNumber: true,
                                    })}
                                    placeholder="0.00"
                                    className="mt-1.5"
                                />
                                {errors.amount && <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>}
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Textarea {...register('notes')} rows={3} placeholder="Additional notes (optional)" className="mt-1.5" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); reset() }}
                                disabled={createMutation.isPending || updateMutation.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white">
                                {(createMutation.isPending || updateMutation.isPending) ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                                ) : editingTransaction ? 'Update Transaction' : 'Create Transaction'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default function SupplierDetailPage() {
    const router = useRouter()
    const params = useParams()
    const supplierId = params?.id as string
    const { data: supplier, isLoading } = useSupplier(supplierId)

    if (isLoading) {
        return (
            <ProtectedRoute requiredPermission="suppliers.read">
                <div className="flex-1 flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                </div>
            </ProtectedRoute>
        )
    }

    if (!supplier) {
        return (
            <ProtectedRoute requiredPermission="suppliers.read">
                <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
                    <p>Supplier not found</p>
                    <Button variant="outline" onClick={() => router.push('/dashboard/suppliers')}>Back to Suppliers</Button>
                </div>
            </ProtectedRoute>
        )
    }

    return (
        <ProtectedRoute requiredPermission="suppliers.read">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.back()}
                            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <Truck className="h-8 w-8 text-green-600" />
                                {supplier.name}
                            </h1>
                            <p className="text-gray-600 mt-1">Supplier details, ledger, and transactions</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => router.push(`/dashboard/purchases/add?supplierId=${supplierId}`)}
                            className="bg-green-600 hover:bg-green-700 text-white">
                            <Package className="mr-2 h-4 w-4" /> Create Purchase Order
                        </Button>
                        <Button variant="outline" onClick={() => router.push(`/dashboard/suppliers/${supplierId}/edit`)}
                            className="border-gray-300">
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <ViewHistoryButton entityName="Supplier" entityId={supplierId} size="default" />
                    </div>
                </div>

                <Tabs defaultValue="overview">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="ledger">Ledger</TabsTrigger>
                        <TabsTrigger value="transactions">Transactions</TabsTrigger>
                        <TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <OverviewTab supplier={supplier} />
                    </TabsContent>

                    <TabsContent value="ledger">
                        <LedgerTab supplierId={supplierId} />
                    </TabsContent>

                    <TabsContent value="transactions">
                        <TransactionsTab supplierId={supplierId} supplierCreatedAt={supplier.createdAt} />
                    </TabsContent>

                    <TabsContent value="bank-accounts">
                        <BankAccountsSection ownerType="suppliers" ownerId={supplierId} />
                    </TabsContent>
                </Tabs>
            </div>
        </ProtectedRoute>
    )
}
