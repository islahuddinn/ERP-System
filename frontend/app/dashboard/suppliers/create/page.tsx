'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useCreateSupplier } from '@/hooks/useSuppliers'
import { ArrowLeft, Loader2, Save, Truck, ChevronDown, ChevronUp } from 'lucide-react'

interface SupplierFormData {
    name: string
    email?: string
    phone?: string
    address?: string
    notes?: string
    isActive: boolean
}

export default function CreateSupplierPage() {
    const router = useRouter()
    const createMutation = useCreateSupplier()

    const [showOpeningBalance, setShowOpeningBalance] = useState(false)
    const [obAmount, setObAmount] = useState<string>('')
    const [obDate, setObDate] = useState<string>('')
    const [obNote, setObNote] = useState<string>('')

    const {
        register,
        handleSubmit,
        watch,
        setValue,
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

    const onSubmit = async (data: SupplierFormData) => {
        try {
            const payload: any = {
                name: data.name.trim(),
                isActive: data.isActive,
            }

            if (data.email?.trim()) payload.email = data.email.trim()
            if (data.phone?.trim()) payload.phone = data.phone.trim()
            if (data.address?.trim()) payload.address = data.address.trim()
            if (data.notes?.trim()) payload.notes = data.notes.trim()

            const obAmountNum = parseFloat(obAmount)
            if (showOpeningBalance && !isNaN(obAmountNum) && obAmountNum > 0) {
                payload.openingBalance = {
                    amount: obAmountNum,
                    date: obDate || undefined,
                    note: obNote || undefined,
                }
            }

            await createMutation.mutateAsync(payload)
            // Success toast is fired once by the mutation's onSuccess (useCreateSupplier).
            // Do not toast here too, or it shows twice (QA #8).
            router.push('/dashboard/suppliers')
        } catch (error: any) {
            console.error('Error creating supplier:', error)
            toast.error(error.response?.data?.message || error.message || 'Failed to create supplier')
        }
    }

    const isLoading = createMutation.isPending

    return (
        <ProtectedRoute requiredPermission="suppliers.create">
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
                        Add Supplier
                    </h1>
                    <p className="text-gray-600 mt-1">Register a new vendor.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-gray-900">Supplier Details</CardTitle>
                        <CardDescription>Enter the supplier's contact information.</CardDescription>
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

                        <div className="grid grid-cols-2 gap-4">
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
                        </div>

                        <div>
                            <Label htmlFor="address" className="text-gray-700 font-medium">
                                Address
                            </Label>
                            <Textarea
                                id="address"
                                {...register('address')}
                                rows={2}
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
                                placeholder="Optional notes about this supplier"
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
                            Set the outstanding balance at the time this supplier is added. Cannot be changed once the supplier has purchase orders.
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
                                Save Supplier
                            </>
                        )}
                    </Button>
                </div>
            </form>
            </div>
        </ProtectedRoute>
    )
}
