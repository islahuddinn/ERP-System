'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useSupplier, useUpdateSupplier } from '@/hooks/useSuppliers'
import { ArrowLeft, Loader2, Save, Truck, ChevronDown, ChevronUp } from 'lucide-react'

interface SupplierFormData {
    name: string
    email?: string
    phone?: string
    address?: string
    notes?: string
    isActive: boolean
}

export default function EditSupplierPage() {
    const router = useRouter()
    const params = useParams()
    const supplierId = params?.id as string
    const { data: supplier, isLoading: isLoadingSupplier } = useSupplier(supplierId)
    const updateMutation = useUpdateSupplier()

    // Opening balance fields (openingBalanceAmount/Date/Note on the supplier) —
    // kept outside react-hook-form to mirror the create screen's local state.
    const [showOpeningBalance, setShowOpeningBalance] = useState(false)
    const [obAmount, setObAmount] = useState<string>('')
    const [obDate, setObDate] = useState<string>('')
    const [obNote, setObNote] = useState<string>('')

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<SupplierFormData>({
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            address: '',
            notes: '',
            isActive: true
        },
    })

    // Populate form when supplier data loads
    useEffect(() => {
        if (supplier) {
            reset({
                name: supplier.name || '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                address: supplier.address || '',
                notes: supplier.notes || '',
                isActive: supplier.isActive ?? true
            })

            // Prefill opening balance. openingBalanceAmount is a Decimal string;
            // openingBalanceDate is an ISO string → slice to yyyy-mm-dd for <input type="date">.
            const amount = supplier.openingBalanceAmount ?? ''
            setObAmount(amount ? String(amount) : '')
            setObDate(supplier.openingBalanceDate ? supplier.openingBalanceDate.slice(0, 10) : '')
            setObNote(supplier.openingBalanceNote || '')
            // Auto-expand the section when the supplier already carries an opening balance.
            if (amount && parseFloat(String(amount)) > 0) setShowOpeningBalance(true)
        }
    }, [supplier, reset])

    const onSubmit = async (data: SupplierFormData) => {
        try {
            // Build payload matching backend DTO. Send an explicit empty string for cleared
            // optional fields (not undefined) so the backend overwrites — instead of keeping —
            // the previous value, otherwise removed fields reappear after save (QA #9).
            const payload: any = {
                name: data.name.trim(),
                isActive: data.isActive,
                email: data.email?.trim() ?? '',
                phone: data.phone?.trim() ?? '',
                address: data.address?.trim() ?? '',
                notes: data.notes?.trim() ?? '',
            }

            // Only send openingBalance when it actually CHANGED from what was loaded.
            // Re-sending the unchanged balance (a) makes the audit "View History" show
            // Opening Amount even though only e.g. the name was edited, and (b) trips the
            // backend "cannot modify opening balance after PO exists" guard on unrelated
            // edits. Compare against the originals captured at load time.
            const origAmount = (supplier?.openingBalanceAmount ?? '') === ''
                ? ''
                : String(supplier?.openingBalanceAmount)
            const origDate = supplier?.openingBalanceDate ? supplier.openingBalanceDate.slice(0, 10) : ''
            const origNote = supplier?.openingBalanceNote || ''

            const obChanged =
                obAmount.trim() !== origAmount.trim() ||
                obDate !== origDate ||
                obNote !== origNote

            if (obChanged) {
                const obAmountNum = parseFloat(obAmount)
                if (!isNaN(obAmountNum) && obAmountNum > 0) {
                    payload.openingBalance = {
                        amount: obAmountNum,
                        date: obDate || undefined,
                        note: obNote || undefined,
                    }
                } else {
                    // Cleared the opening balance → send an empty object so the backend
                    // resets the stored columns.
                    payload.openingBalance = {}
                }
            }

            await updateMutation.mutateAsync({ id: supplierId, data: payload })
            // Success toast is fired once by the mutation's onSuccess (useUpdateSupplier).
            // Do not toast here too, or it shows twice (QA #8).
            router.push('/dashboard/suppliers')
        } catch (error: any) {
            console.error('Error updating supplier:', error)
            toast.error(error.response?.data?.message || error.message || 'Failed to update supplier')
        }
    }

    const isLoading = updateMutation.isPending || isLoadingSupplier

    if (isLoadingSupplier) {
        return (
            <ProtectedRoute requiredPermission="suppliers.update">
                <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    </div>
                </div>
            </ProtectedRoute>
        )
    }

    if (!supplier) {
        return (
            <ProtectedRoute requiredPermission="suppliers.update">
                <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                    <div className="text-center text-red-500">
                        <p>Supplier not found</p>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/dashboard/suppliers')}
                            className="mt-4"
                        >
                            Back to Suppliers
                        </Button>
                    </div>
                </div>
            </ProtectedRoute>
        )
    }

    return (
        <ProtectedRoute requiredPermission="suppliers.update">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard/suppliers')}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Truck className="h-8 w-8 text-green-600" />
                        Edit Supplier
                    </h1>
                    <p className="text-gray-600 mt-1">Update supplier information.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-gray-900">Supplier Details</CardTitle>
                        <CardDescription>Update the supplier's contact and billing information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="name" className="text-gray-700 font-medium">
                                Supplier Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                {...register('name', {
                                    required: 'Name is required',
                                    validate: (v) => v.trim().length > 0 || 'Name is required',
                                })}
                                placeholder="e.g. MetalCorp Inc."
                                className="mt-1.5 h-11 border-gray-300"
                            />
                            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
                        </div>

                        <div>
                            <Label htmlFor="phone" className="text-gray-700 font-medium">
                                Phone Number
                            </Label>
                            <Input
                                id="phone"
                                {...register('phone', {
                                    pattern: {
                                        value: /^[0-9+\-()\s]{7,20}$/,
                                        message: 'Phone number is invalid',
                                    },
                                })}
                                placeholder="+1 555-0123"
                                className="mt-1.5 h-11 border-gray-300"
                            />
                            {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
                        </div>

                        <div>
                            <Label htmlFor="email" className="text-gray-700 font-medium">
                                Email Address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                {...register('email', {
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: 'Invalid email address'
                                    }
                                })}
                                placeholder="sales@company.com"
                                className="mt-1.5 h-11 border-gray-300"
                            />
                            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
                        </div>

                        <div>
                            <Label htmlFor="address" className="text-gray-700 font-medium">
                                Billing Address
                            </Label>
                            <Textarea
                                id="address"
                                {...register('address')}
                                rows={3}
                                className="mt-1.5 border-gray-300"
                            />
                        </div>

                        <div>
                            <Label htmlFor="notes" className="text-gray-700 font-medium">
                                Notes
                            </Label>
                            <Textarea
                                id="notes"
                                {...register('notes')}
                                rows={2}
                                className="mt-1.5 border-gray-300"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="isActive"
                                checked={watch('isActive')}
                                onCheckedChange={(checked) => setValue('isActive', checked === true)}
                            />
                            <Label htmlFor="isActive" className="text-gray-700 font-medium cursor-pointer">
                                Active Supplier
                            </Label>
                        </div>
                    </CardContent>
                </Card>

                {/* Opening Balance */}
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader
                        className="cursor-pointer select-none"
                        onClick={() => setShowOpeningBalance(v => !v)}
                    >
                        <CardTitle className="text-gray-900 flex items-center justify-between text-base">
                            Opening Balance (optional)
                            {showOpeningBalance ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </CardTitle>
                        <CardDescription>
                            The outstanding balance carried when this supplier was added. Cannot be changed once the supplier has purchase orders.
                        </CardDescription>
                    </CardHeader>
                    {showOpeningBalance && (
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-700 font-medium">Amount</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={obAmount}
                                        onChange={e => setObAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="mt-1.5 h-11 border-gray-300"
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-700 font-medium">Date</Label>
                                    <Input
                                        type="date"
                                        value={obDate}
                                        onChange={e => setObDate(e.target.value)}
                                        className="mt-1.5 h-11 border-gray-300"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-gray-700 font-medium">Note (optional)</Label>
                                <Textarea
                                    value={obNote}
                                    onChange={e => setObNote(e.target.value)}
                                    rows={2}
                                    placeholder="e.g. Balance carried over from previous system"
                                    className="mt-1.5 border-gray-300"
                                />
                            </div>
                        </CardContent>
                    )}
                </Card>

                <div className="flex items-center justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/dashboard/suppliers')}
                        disabled={isLoading}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </form>
            </div>
        </ProtectedRoute>
    )
}

