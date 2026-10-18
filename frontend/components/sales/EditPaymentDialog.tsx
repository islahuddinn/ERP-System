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
import { useUpdateSalePayment, SalePayment, SalePaymentMethod } from '@/hooks/useSales'
import { toast } from 'react-hot-toast'
import { Pencil } from 'lucide-react'
import { format } from 'date-fns'

interface EditPaymentDialogProps {
    isOpen: boolean
    onClose: () => void
    sale: any
    payment: SalePayment | null
}

// Update/correct an existing payment on a confirmed sale — wired to
// PATCH /sales/:saleId/payments/:paymentId via useUpdateSalePayment.
export function EditPaymentDialog({ isOpen, onClose, sale, payment }: EditPaymentDialogProps) {
    // A payment can never be dated before the sale itself.
    const saleDay = sale?.saleDate ? format(new Date(sale.saleDate), 'yyyy-MM-dd') : ''

    const [amount, setAmount] = useState<string>('')
    const [paymentMethod, setPaymentMethod] = useState<string>('CASH')
    const [reference, setReference] = useState<string>('')
    const [notes, setNotes] = useState<string>('')
    const [paymentDate, setPaymentDate] = useState<string>('')

    const updatePaymentMutation = useUpdateSalePayment()

    // Pre-fill the form from the selected payment whenever the dialog opens.
    useEffect(() => {
        if (!payment) return
        setAmount(String(payment.amount ?? ''))
        setPaymentMethod(payment.paymentMethod || 'CASH')
        setReference(payment.referenceNumber || '')
        setNotes(payment.notes || '')
        setPaymentDate(payment.paymentDate ? format(new Date(payment.paymentDate), 'yyyy-MM-dd') : '')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, payment?.id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!sale || !payment) return

        const paymentAmount = parseFloat(amount)
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            toast.error('Please enter a payment amount greater than 0')
            return
        }

        if (saleDay && paymentDate && paymentDate < saleDay) {
            toast.error(`Payment date cannot be earlier than the sale date (${saleDay})`)
            return
        }

        try {
            await updatePaymentMutation.mutateAsync({
                saleId: sale.id,
                paymentId: payment.id,
                data: {
                    paymentMethod: paymentMethod as SalePaymentMethod,
                    amount: paymentAmount,
                    referenceNumber: reference || undefined,
                    paymentDate: paymentDate || undefined,
                    notes: notes || undefined,
                },
            })
            toast.success('Payment updated successfully')
            onClose()
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.details?.message ||
                error?.message ||
                'Failed to update payment'
            toast.error(Array.isArray(message) ? message[0] : message)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-green-600" />
                            Update Payment
                        </DialogTitle>
                        <DialogDescription>
                            Correct an existing payment for sale {sale?.saleNumber || 'Order'}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-amount" className="text-right text-gray-700">
                                Amount
                            </Label>
                            <Input
                                id="edit-amount"
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
                            <Label htmlFor="edit-date" className="text-right text-gray-700">
                                Date
                            </Label>
                            <Input
                                id="edit-date"
                                type="date"
                                value={paymentDate}
                                min={saleDay || undefined}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="col-span-3 border-gray-300 focus:ring-green-500"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-method" className="text-right text-gray-700">
                                Method
                            </Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger className="col-span-3 border-gray-300">
                                    <SelectValue placeholder="Select method" />
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
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-reference" className="text-right text-gray-700">
                                Reference
                            </Label>
                            <Input
                                id="edit-reference"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="Ref #, Tx ID, etc."
                                className="col-span-3 border-gray-300 focus:ring-green-500"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-notes" className="text-right text-gray-700">
                                Notes
                            </Label>
                            <Input
                                id="edit-notes"
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
                            disabled={updatePaymentMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {updatePaymentMutation.isPending ? 'Saving...' : 'Update Payment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
