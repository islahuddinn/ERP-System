
'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useAddSalePayment, SalePaymentMethod } from '@/hooks/useSales'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { formatCurrency } from '@/lib/currency'
import { toast } from 'react-hot-toast'
import { DollarSign } from 'lucide-react'
import { format } from 'date-fns'

interface AddPaymentDialogProps {
    isOpen: boolean
    onClose: () => void
    sale: any
}

// Bank-style methods surface the customer's bank account dropdown (mirrors the
// purchase-order Add Payment BANK_ACCOUNT_METHODS rule). Hidden for other methods.
const BANK_ACCOUNT_METHODS: SalePaymentMethod[] = ['BANK_TRANSFER', 'CHEQUE']

export function AddPaymentDialog({ isOpen, onClose, sale }: AddPaymentDialogProps) {
    // A payment can never be dated before the sale itself — this is the min for
    // the date picker and is validated again on submit (backend enforces too).
    const saleDay = sale?.saleDate ? format(new Date(sale.saleDate), 'yyyy-MM-dd') : ''

    const [amount, setAmount] = useState<string>('')
    // Payment method starts EMPTY so the "Select Payment Method" placeholder shows;
    // required-validation on submit blocks an empty method.
    const [paymentMethod, setPaymentMethod] = useState<string>('')
    const [reference, setReference] = useState<string>('')
    const [notes, setNotes] = useState<string>('')
    // Payment date starts EMPTY — the user picks it (required on submit).
    const [paymentDate, setPaymentDate] = useState<string>('')
    const [bankAccountId, setBankAccountId] = useState<string>('')

    const addPaymentMutation = useAddSalePayment()

    // Load the customer's bank accounts for BANK_TRANSFER/CHEQUE payments. The
    // hook is disabled until a customerId exists (walk-in sales have none).
    const customerId: string = sale?.customerId ?? sale?.customer?.id ?? ''
    const { data: customerBankAccounts = [] } = useBankAccounts('customers', customerId)

    const remainingAmount = sale ? (Number(sale.totalAmount || 0) - Number(sale.amountPaid || 0)) : 0

    // Reset every field whenever the dialog opens or closes so previously
    // entered values never linger into the next session.
    useEffect(() => {
        setAmount('')
        setPaymentMethod('')
        setReference('')
        setNotes('')
        setPaymentDate('')
        setBankAccountId('')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!sale) return

        const paymentAmount = parseFloat(amount)
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            toast.error('Please enter a payment amount greater than 0')
            return
        }

        if (!paymentMethod) {
            toast.error('Please select a payment method')
            return
        }

        if (!paymentDate) {
            toast.error('Please select a payment date')
            return
        }

        if (saleDay && paymentDate && paymentDate < saleDay) {
            toast.error(`Payment date cannot be earlier than the sale date (${saleDay})`)
            return
        }

        try {
            await addPaymentMutation.mutateAsync({
                saleId: sale.id,
                data: {
                    paymentMethod: paymentMethod as SalePaymentMethod,
                    amount: paymentAmount,
                    referenceNumber: reference || undefined,
                    paymentDate: paymentDate || undefined,
                    notes: notes || undefined,
                    // Only send the bank account for bank-style methods.
                    ...(BANK_ACCOUNT_METHODS.includes(paymentMethod as SalePaymentMethod) && bankAccountId
                        ? { bankAccountId }
                        : {}),
                },
            })
            toast.success('Payment recorded successfully')
            setAmount('')
            setPaymentMethod('')
            setReference('')
            setNotes('')
            setPaymentDate('')
            setBankAccountId('')
            onClose()
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.details?.message ||
                error?.message ||
                'Failed to record payment'
            toast.error(Array.isArray(message) ? message[0] : message)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            Add Payment
                        </DialogTitle>
                        <DialogDescription>
                            Record a new payment for sale {sale?.saleNumber || sale?.orderNumber || 'Order'}.
                            <br />
                            Remaining balance: <span className="font-bold text-gray-900">{formatCurrency(remainingAmount)}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right text-gray-700">
                                Amount
                            </Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="col-span-3 border-gray-300 focus:ring-green-500"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="paymentDate" className="text-right text-gray-700">
                                Date
                            </Label>
                            <Input
                                id="paymentDate"
                                type="date"
                                value={paymentDate}
                                min={saleDay || undefined}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="col-span-3 border-gray-300 focus:ring-green-500"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="method" className="text-right text-gray-700">
                                Method
                            </Label>
                            <Select
                                value={paymentMethod || undefined}
                                onValueChange={(v) => {
                                    setPaymentMethod(v)
                                    // Clear any selected bank account when switching to a non-bank method.
                                    if (!BANK_ACCOUNT_METHODS.includes(v as SalePaymentMethod)) {
                                        setBankAccountId('')
                                    }
                                }}
                            >
                                <SelectTrigger className="col-span-3 border-gray-300">
                                    <SelectValue placeholder="Select Payment Method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="CARD">Card</SelectItem>
                                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                                    <SelectItem value="MOBILE_PAYMENT">Mobile Payment</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {BANK_ACCOUNT_METHODS.includes(paymentMethod as SalePaymentMethod) && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="bankAccount" className="text-right text-gray-700">
                                    Bank Account
                                </Label>
                                <div className="col-span-3">
                                    <Select
                                        value={bankAccountId || 'none'}
                                        onValueChange={(v) => setBankAccountId(v === 'none' ? '' : v)}
                                    >
                                        <SelectTrigger id="bankAccount" className="border-gray-300">
                                            <SelectValue placeholder="Select bank account" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                                            <SelectItem value="none">None</SelectItem>
                                            {customerBankAccounts.map((acc) => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.bankName} — {acc.accountTitle} ({acc.accountNumber})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {customerBankAccounts.length === 0 && (
                                        <p className="mt-1 text-xs text-gray-400">
                                            {customerId
                                                ? 'No bank accounts on file for this customer.'
                                                : 'Walk-in sale — no customer bank accounts.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reference" className="text-right text-gray-700">
                                Reference
                            </Label>
                            <Input
                                id="reference"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="Ref #, Tx ID, etc."
                                className="col-span-3 border-gray-300 focus:ring-green-500"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="notes" className="text-right text-gray-700">
                                Notes
                            </Label>
                            <Input
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="col-span-3 border-gray-300 focus:ring-green-500"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 hover:bg-gray-100">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={addPaymentMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {addPaymentMutation.isPending ? 'Processing...' : 'Record Payment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
