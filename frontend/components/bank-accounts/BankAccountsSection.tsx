'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Banknote, Plus, Edit, Trash2, Loader2, Star, StarOff } from 'lucide-react'
import {
    type BankAccount,
    type BankAccountOwnerType,
    type CreateBankAccountDto,
    useBankAccounts,
    useCreateBankAccount,
    useUpdateBankAccount,
    useDeleteBankAccount,
    useSetDefaultBankAccount,
} from '@/hooks/useBankAccounts'

interface BankAccountFormData {
    bankName: string
    accountTitle: string
    accountNumber: string
    iban: string
    swiftCode: string
    currency: string
    isDefault: boolean
    isActive: boolean
}

const emptyForm: BankAccountFormData = {
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    iban: '',
    swiftCode: '',
    currency: '',
    isDefault: false,
    isActive: true,
}

function extractError(error: any, fallback: string): string {
    return error?.response?.data?.message || error?.message || fallback
}

export function BankAccountsSection({
    ownerType,
    ownerId,
}: {
    ownerType: BankAccountOwnerType
    ownerId: string
}) {
    const { data: accounts, isLoading } = useBankAccounts(ownerType, ownerId)
    const createMutation = useCreateBankAccount(ownerType, ownerId)
    const updateMutation = useUpdateBankAccount(ownerType, ownerId)
    const deleteMutation = useDeleteBankAccount(ownerType, ownerId)
    const setDefaultMutation = useSetDefaultBankAccount(ownerType, ownerId)

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editing, setEditing] = useState<BankAccount | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null)
    // Holds a pending payload awaiting confirmation of a sensitive payment-detail change (QA #8)
    const [pendingSensitivePayload, setPendingSensitivePayload] = useState<CreateBankAccountDto | null>(null)

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<BankAccountFormData>({ defaultValues: emptyForm })

    const isDefault = watch('isDefault')
    const isActive = watch('isActive')

    const list = accounts ?? []
    const noDefault = list.length > 0 && list.every((a) => !a.isDefault)

    const handleOpenDialog = (account?: BankAccount) => {
        if (account) {
            setEditing(account)
            reset({
                bankName: account.bankName ?? '',
                accountTitle: account.accountTitle ?? '',
                accountNumber: account.accountNumber ?? '',
                iban: account.iban ?? '',
                swiftCode: account.swiftCode ?? '',
                // Show the actual stored currency (empty if cleared) — don't re-default to PKR (QA #3)
                currency: account.currency ?? '',
                isDefault: account.isDefault ?? false,
                isActive: account.isActive ?? true,
            })
        } else {
            setEditing(null)
            reset(emptyForm)
        }
        setIsDialogOpen(true)
    }

    const closeDialog = () => {
        setIsDialogOpen(false)
        setEditing(null)
        reset(emptyForm)
    }

    const persist = async (payload: CreateBankAccountDto) => {
        try {
            if (editing) {
                await updateMutation.mutateAsync({ bankAccountId: editing.id, dto: payload })
                toast.success('Bank account updated')
            } else {
                await createMutation.mutateAsync(payload)
                toast.success('Bank account added')
            }
            closeDialog()
        } catch (error: any) {
            toast.error(extractError(error, 'Failed to save bank account'))
        }
    }

    const onSubmit = async (form: BankAccountFormData) => {
        const payload: CreateBankAccountDto = {
            bankName: form.bankName.trim(),
            accountTitle: form.accountTitle.trim(),
            accountNumber: form.accountNumber.trim(),
            // When editing, send an explicit empty string for cleared optional fields so the
            // backend overwrites (instead of keeping) the old value (QA #46). The backend
            // normalises "" → NULL for unique fields. On create, omit empty optionals.
            iban: form.iban.trim() || (editing ? '' : undefined),
            swiftCode: form.swiftCode.trim() || (editing ? '' : undefined),
            // On edit, persist the entered currency verbatim (empty allowed) so a cleared
            // value sticks (QA #3); only default to PKR when creating.
            currency: form.currency.trim() || (editing ? '' : 'PKR'),
            isDefault: form.isDefault,
            isActive: form.isActive,
        }

        // Confirm sensitive financial edits (account number / IBAN changed on an existing
        // account) via the app's ConfirmDialog instead of a native browser popup (QA #8).
        if (editing) {
            const sensitiveChanged =
                form.accountNumber !== editing.accountNumber ||
                (form.iban || '') !== (editing.iban || '')
            if (sensitiveChanged) {
                setPendingSensitivePayload(payload)
                return
            }
        }

        await persist(payload)
    }

    const handleSetDefault = async (account: BankAccount) => {
        try {
            await setDefaultMutation.mutateAsync(account.id)
            toast.success(`${account.bankName} set as default`)
        } catch (error: any) {
            toast.error(extractError(error, 'Failed to set default'))
        }
    }

    const handleDeleteConfirmed = async () => {
        if (!deleteTarget) return
        try {
            await deleteMutation.mutateAsync(deleteTarget.id)
            toast.success('Bank account deleted')
        } catch (error: any) {
            toast.error(extractError(error, 'Failed to delete bank account'))
        } finally {
            setDeleteTarget(null)
        }
    }

    const saving = createMutation.isPending || updateMutation.isPending

    return (
        <>
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-gray-900">
                                <Banknote className="h-5 w-5 text-green-600" /> Bank Accounts
                            </CardTitle>
                            <CardDescription>
                                Manage bank accounts used for payments and refunds
                            </CardDescription>
                        </div>
                        <Button
                            onClick={() => handleOpenDialog()}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Bank Account
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {noDefault && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                            No default account set. Please select a default bank account.
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                        </div>
                    ) : list.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <Banknote className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                            <p>No bank accounts yet. Click "Add Bank Account" to create one.</p>
                        </div>
                    ) : (
                        list.map((account) => (
                            <div
                                key={account.id}
                                className="flex items-start justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900">{account.bankName}</span>
                                        {account.isDefault && (
                                            <Badge className="bg-green-600 hover:bg-green-600 text-white">Default</Badge>
                                        )}
                                        {!account.isActive && <Badge variant="secondary">Inactive</Badge>}
                                        {/* QA #10: only render the currency pill when a currency exists — no empty badge */}
                                        {account.currency ? (
                                            <Badge variant="outline">{account.currency}</Badge>
                                        ) : null}
                                    </div>
                                    <p className="text-sm text-gray-700">{account.accountTitle}</p>
                                    <p className="text-sm font-mono text-gray-600">{account.accountNumber}</p>
                                    {account.iban && (
                                        <p className="text-xs font-mono text-gray-500">IBAN: {account.iban}</p>
                                    )}
                                    {account.swiftCode && (
                                        <p className="text-xs font-mono text-gray-500">SWIFT: {account.swiftCode}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    {!account.isDefault && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            title="Set as default"
                                            disabled={setDefaultMutation.isPending}
                                            onClick={() => handleSetDefault(account)}
                                        >
                                            <Star className="h-4 w-4 text-amber-500" />
                                        </Button>
                                    )}
                                    {account.isDefault && (
                                        <Button variant="ghost" size="sm" title="Default account" disabled>
                                            <StarOff className="h-4 w-4 text-gray-300" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        title="Edit"
                                        onClick={() => handleOpenDialog(account)}
                                    >
                                        <Edit className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        title="Delete"
                                        onClick={() => setDeleteTarget(account)}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Add / Edit dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
                        <DialogDescription>
                            {editing
                                ? 'Update the bank account details'
                                : 'Add a new bank account for payments and refunds'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Bank Name <span className="text-red-500">*</span></Label>
                                <Input
                                    {...register('bankName', { required: 'Bank name is required' })}
                                    placeholder="e.g. HBL"
                                    className="mt-1.5"
                                />
                                {errors.bankName && (
                                    <p className="text-sm text-red-600 mt-1">{errors.bankName.message}</p>
                                )}
                            </div>
                            <div>
                                <Label>Account Title <span className="text-red-500">*</span></Label>
                                <Input
                                    {...register('accountTitle', { required: 'Account title is required' })}
                                    placeholder="Account holder name"
                                    className="mt-1.5"
                                />
                                {errors.accountTitle && (
                                    <p className="text-sm text-red-600 mt-1">{errors.accountTitle.message}</p>
                                )}
                            </div>
                        </div>
                        <div>
                            <Label>Account Number <span className="text-red-500">*</span></Label>
                            <Input
                                {...register('accountNumber', { required: 'Account number is required' })}
                                placeholder="e.g. 01234567890"
                                className="mt-1.5 font-mono"
                            />
                            {errors.accountNumber && (
                                <p className="text-sm text-red-600 mt-1">{errors.accountNumber.message}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>IBAN</Label>
                                <Input
                                    {...register('iban')}
                                    placeholder="PK36SCBL..."
                                    className="mt-1.5 font-mono"
                                />
                            </div>
                            <div>
                                <Label>SWIFT / BIC Code</Label>
                                <Input
                                    {...register('swiftCode')}
                                    placeholder="e.g. HABBPKKA"
                                    className="mt-1.5 font-mono"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Currency</Label>
                                <Input
                                    {...register('currency')}
                                    placeholder="PKR"
                                    className="mt-1.5"
                                />
                            </div>
                            <div className="flex flex-col justify-end gap-2 pt-1">
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 accent-green-600"
                                        checked={isDefault}
                                        onChange={(e) => setValue('isDefault', e.target.checked)}
                                    />
                                    Set as default account
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 accent-green-600"
                                        checked={isActive}
                                        onChange={(e) => setValue('isActive', e.target.checked)}
                                    />
                                    Active
                                </label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : editing ? (
                                    'Update Account'
                                ) : (
                                    'Add Account'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Bank Account"
                description={
                    deleteTarget
                        ? `Delete "${deleteTarget.bankName} — ${deleteTarget.accountNumber}"? This cannot be undone.`
                        : ''
                }
                confirmLabel="Delete"
                onConfirm={handleDeleteConfirmed}
                onCancel={() => setDeleteTarget(null)}
            />

            <ConfirmDialog
                open={!!pendingSensitivePayload}
                title="Change payment details?"
                description="You are changing payment details (account number or IBAN) for this account. Are you sure?"
                confirmLabel="Yes, update"
                confirmVariant="default"
                onConfirm={async () => {
                    const payload = pendingSensitivePayload
                    setPendingSensitivePayload(null)
                    if (payload) await persist(payload)
                }}
                onCancel={() => setPendingSensitivePayload(null)}
            />
        </>
    )
}
