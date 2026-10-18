'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { useMoney } from '@/contexts/currency-context'
import {
  useContract,
  useActivateContract,
  useTerminateContract,
  useContractAllowances,
  useCreateAllowance,
  useUpdateAllowance,
  useDeleteAllowance,
  useSalaryRevisions,
  useCreateSalaryRevision,
  useActivateSalaryRevision,
  type Contract,
  type ContractAllowance,
  type AllowanceType,
  type SalaryFrequency,
} from '@/hooks/useContracts'
import {
  ALLOWANCE_TYPE_LABEL,
  ALLOWANCE_TYPE_OPTIONS,
  CONTRACT_STATUS_VARIANT,
  CONTRACT_TYPE_LABEL,
  SALARY_FREQUENCY_OPTIONS,
  contractEmployeeName,
} from '@/components/hr/contracts/constants'
import { ArrowLeft, Edit, Loader2, FileSignature, Plus, Trash2, CheckCircle2, Play, Ban } from 'lucide-react'

const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/
const NUMERIC_ONLY_PATTERN = /^\d*\.?\d*$/

// Validation rules for a money amount field. Ordered so an alphabetic / special
// character shows a "numeric only" message, a valid number with too many decimals
// shows the precision message, and zero shows the "greater than 0" message.
function moneyAmountRules(fieldLabel: string) {
  return {
    numeric: (value: string) =>
      (value.trim() !== '' && NUMERIC_ONLY_PATTERN.test(value.trim())) ||
      `${fieldLabel} must contain numbers only`,
    decimals: (value: string) =>
      DECIMAL_PATTERN.test(value.trim()) || 'Enter a valid amount (max 2 decimals)',
    positive: (value: string) => Number(value) > 0 || `${fieldLabel} must be greater than 0`,
  }
}

function OverviewTab({ contract }: { contract: Contract }) {
  const money = useMoney()
  const salary = (contract.salaryRevisions ?? []).find((r) => r.status === 'CURRENT') ?? contract.salaryRevisions?.[0]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Contract Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Employee</p>
            <p className="font-medium">{contractEmployeeName(contract)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Type</p>
            <p className="font-medium">{CONTRACT_TYPE_LABEL[contract.contractType]}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Department</p>
            <p className="font-medium">{contract.department?.name || <span className="text-gray-400">—</span>}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Position</p>
            <p className="font-medium">{contract.position?.title || <span className="text-gray-400">—</span>}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Start Date</p>
            <p className="font-medium">{format(new Date(contract.startDate), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">End Date</p>
            <p className="font-medium">{format(new Date(contract.endDate), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Probation End</p>
            <p className="font-medium">
              {contract.probationEndDate ? format(new Date(contract.probationEndDate), 'MMM d, yyyy') : <span className="text-gray-400">—</span>}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Leaves (used / total)</p>
            <p className="font-medium">{Number(contract.consumedLeaves)} / {Number(contract.totalLeaves)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Current Salary</p>
            <p className="font-medium">
              {salary ? money(Number(salary.baseSalary)) : <span className="text-gray-400">—</span>}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-muted-foreground text-xs">Notes</p>
            <p className="font-medium">{contract.notes || <span className="text-gray-400">—</span>}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface AllowanceFormData {
  allowanceType: AllowanceType | ''
  amount: string
}

function AllowancesTab({ contractId, readOnly }: { contractId: string; readOnly: boolean }) {
  const money = useMoney()
  const { data: allowances = [], isLoading } = useContractAllowances(contractId)
  const createMutation = useCreateAllowance()
  const updateMutation = useUpdateAllowance()
  const deleteMutation = useDeleteAllowance()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ContractAllowance | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AllowanceFormData>({ defaultValues: { allowanceType: '', amount: '' } })

  const openAdd = () => {
    setEditing(null)
    reset({ allowanceType: '', amount: '' })
    setDialogOpen(true)
  }

  const openEdit = (allowance: ContractAllowance) => {
    setEditing(allowance)
    reset({ allowanceType: allowance.allowanceType, amount: String(allowance.amount) })
    setDialogOpen(true)
  }

  const onSubmit = async (data: AllowanceFormData) => {
    if (editing) {
      await updateMutation.mutateAsync({ contractId, allowanceId: editing.id, data: { amount: data.amount } })
    } else {
      await createMutation.mutateAsync({
        contractId,
        data: { allowanceType: data.allowanceType as AllowanceType, amount: data.amount },
      })
    }
    setDialogOpen(false)
  }

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync({ contractId, allowanceId: deleteTargetId })
    } finally {
      setDeleteTargetId(null)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const allowanceType = watch('allowanceType')

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Allowances ({allowances.length})</CardTitle>
          {readOnly && (
            <p className="text-xs text-gray-500 mt-1">Allowances cannot be changed on a terminated contract.</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={openAdd}
          disabled={readOnly}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Allowance
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
        ) : allowances.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No allowances added yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {allowances.map((allowance) => (
              <li key={allowance.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-800">{ALLOWANCE_TYPE_LABEL[allowance.allowanceType]}</p>
                  <p className="text-sm text-gray-500">{money(Number(allowance.amount))}</p>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(allowance)} className="text-gray-600">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTargetId(allowance.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Allowance' : 'Add Allowance'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the allowance amount.' : 'Add a new allowance to this contract.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="allowanceType" className="text-gray-700 font-medium">
                Allowance Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={allowanceType || undefined}
                onValueChange={(v) => setValue('allowanceType', v as AllowanceType)}
                disabled={!!editing}
              >
                <SelectTrigger id="allowanceType" className="mt-1.5 h-11 border-gray-300">
                  <SelectValue placeholder="Select allowance type" />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWANCE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!editing && !allowanceType && (
                <input
                  type="hidden"
                  {...register('allowanceType', { required: 'Allowance type is required' })}
                />
              )}
              {errors.allowanceType && <p className="text-sm text-red-600 mt-1">{errors.allowanceType.message}</p>}
            </div>
            <div>
              <Label htmlFor="amount" className="text-gray-700 font-medium">
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                inputMode="decimal"
                {...register('amount', {
                  required: 'Amount is required',
                  validate: moneyAmountRules('Amount'),
                })}
                placeholder="e.g. 5000.00"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.amount && <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving} className="border-gray-300">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white">
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : editing ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTargetId}
        title="Remove Allowance"
        description="Are you sure you want to remove this allowance from the contract?"
        confirmLabel="Remove"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </Card>
  )
}

interface RevisionFormData {
  baseSalary: string
  currency: string
  salaryFrequency: SalaryFrequency
  effectiveDate: string
  reason: string
}

function SalaryRevisionsTab({ contract }: { contract: Contract }) {
  const money = useMoney()
  const contractId = contract.id
  const { data: revisions = [], isLoading } = useSalaryRevisions(contractId)
  const createMutation = useCreateSalaryRevision()
  const activateMutation = useActivateSalaryRevision()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [activateTargetId, setActivateTargetId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RevisionFormData>({
    defaultValues: { baseSalary: '', currency: '', salaryFrequency: 'MONTHLY', effectiveDate: '', reason: '' },
  })

  const canAddRevision = contract.status === 'ACTIVE'
  const frequency = watch('salaryFrequency')

  const openAdd = () => {
    reset({ baseSalary: '', currency: '', salaryFrequency: 'MONTHLY', effectiveDate: '', reason: '' })
    setDialogOpen(true)
  }

  const onSubmit = async (data: RevisionFormData) => {
    await createMutation.mutateAsync({
      contractId,
      data: {
        baseSalary: data.baseSalary,
        currency: data.currency.trim() || undefined,
        salaryFrequency: data.salaryFrequency,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate).toISOString() : undefined,
        reason: data.reason.trim() || undefined,
      },
    })
    setDialogOpen(false)
  }

  const handleActivateConfirmed = async () => {
    if (!activateTargetId) return
    try {
      await activateMutation.mutateAsync({ contractId, revisionId: activateTargetId })
    } finally {
      setActivateTargetId(null)
    }
  }

  const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    CURRENT: 'default',
    DRAFT: 'secondary',
    SUPERSEDED: 'outline',
    SUSPENDED: 'destructive',
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Salary Revisions ({revisions.length})</CardTitle>
          {!canAddRevision && (
            <p className="text-xs text-gray-500 mt-1">Revisions can only be added to an ACTIVE contract.</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={openAdd}
          disabled={!canAddRevision}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Revision
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
        ) : revisions.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No salary revisions yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {revisions.map((revision) => (
              <li key={revision.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-800 flex items-center gap-2">
                    {money(Number(revision.baseSalary))}
                    <Badge variant={statusVariant[revision.status] ?? 'outline'}>{revision.status}</Badge>
                  </p>
                  <p className="text-sm text-gray-500">
                    Effective {format(new Date(revision.effectiveDate), 'MMM d, yyyy')}
                    {revision.reason ? ` — ${revision.reason}` : ''}
                  </p>
                </div>
                {revision.status === 'DRAFT' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActivateTargetId(revision.id)}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Activate
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Salary Revision</DialogTitle>
            <DialogDescription>Creates a DRAFT revision — activate it to make it current.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="baseSalary" className="text-gray-700 font-medium">
                  Base Salary <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="baseSalary"
                  inputMode="decimal"
                  {...register('baseSalary', {
                    required: 'Base salary is required',
                    validate: moneyAmountRules('Basic salary'),
                  })}
                  placeholder="e.g. 120000.00"
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.baseSalary && <p className="text-sm text-red-600 mt-1">{errors.baseSalary.message}</p>}
              </div>
              <div>
                <Label htmlFor="currency" className="text-gray-700 font-medium">
                  Currency
                </Label>
                <Input
                  id="currency"
                  maxLength={3}
                  {...register('currency')}
                  placeholder="PKR"
                  className="mt-1.5 h-11 border-gray-300 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="salaryFrequency" className="text-gray-700 font-medium">
                  Frequency
                </Label>
                <Select value={frequency || undefined} onValueChange={(v) => setValue('salaryFrequency', v as SalaryFrequency)}>
                  <SelectTrigger id="salaryFrequency" className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {SALARY_FREQUENCY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="effectiveDate" className="text-gray-700 font-medium">
                  Effective Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  {...register('effectiveDate', {
                    required: 'Effective Date is required',
                    validate: {
                      afterStart: (value) =>
                        !value ||
                        new Date(value) >= new Date(contract.startDate) ||
                        'Effective date cannot be before the contract start date',
                      beforeEnd: (value) =>
                        !value ||
                        new Date(value) <= new Date(contract.endDate) ||
                        'Effective date cannot be after the contract end date',
                    },
                  })}
                  className="mt-1.5 h-11 border-gray-300"
                />
                {errors.effectiveDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.effectiveDate.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="reason" className="text-gray-700 font-medium">
                  Reason
                </Label>
                <Input
                  id="reason"
                  {...register('reason')}
                  placeholder="e.g. Annual increment"
                  className="mt-1.5 h-11 border-gray-300"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={createMutation.isPending} className="border-gray-300">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                {createMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Add Revision'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!activateTargetId}
        title="Activate Salary Revision"
        description="This will make this revision the current salary and supersede the existing one. Continue?"
        confirmLabel="Activate"
        onConfirm={handleActivateConfirmed}
        onCancel={() => setActivateTargetId(null)}
      />
    </Card>
  )
}

export default function ContractDetailPage() {
  const router = useRouter()
  const params = useParams()
  const contractId = params?.id as string
  const { data: contract, isLoading } = useContract(contractId)

  const activateMutation = useActivateContract()
  const terminateMutation = useTerminateContract()

  const [confirmActivate, setConfirmActivate] = useState(false)
  const [terminateOpen, setTerminateOpen] = useState(false)
  const [terminateNotes, setTerminateNotes] = useState('')

  const handleActivate = async () => {
    try {
      await activateMutation.mutateAsync(contractId)
    } finally {
      setConfirmActivate(false)
    }
  }

  const handleTerminate = async () => {
    await terminateMutation.mutateAsync({ id: contractId, notes: terminateNotes.trim() || undefined })
    setTerminateNotes('')
    setTerminateOpen(false)
  }

  // Always clear the note whenever the dialog opens or closes so a reopened popup
  // never shows the previously typed value.
  const handleTerminateOpenChange = (open: boolean) => {
    setTerminateNotes('')
    setTerminateOpen(open)
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="hr.view">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!contract) {
    return (
      <ProtectedRoute requiredPermission="hr.view">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Contract not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/contracts')}>
            Back to Contracts
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  // Allowances are only relevant to a live contract, so the tab is shown only
  // while the contract is ACTIVE (#46).
  const showAllowances = contract.status === 'ACTIVE'

  return (
    <ProtectedRoute requiredPermission="hr.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileSignature className="h-8 w-8 text-green-600" />
                {contractEmployeeName(contract)}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                {CONTRACT_TYPE_LABEL[contract.contractType]}
                <Badge variant={CONTRACT_STATUS_VARIANT[contract.status]}>{contract.status}</Badge>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {contract.status === 'DRAFT' && (
              <Button
                onClick={() => setConfirmActivate(true)}
                disabled={activateMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="mr-2 h-4 w-4" /> Activate
              </Button>
            )}
            {contract.status === 'ACTIVE' && (
              <Button
                variant="outline"
                onClick={() => setTerminateOpen(true)}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <Ban className="mr-2 h-4 w-4" /> Terminate
              </Button>
            )}
            {contract.status !== 'TERMINATED' && (
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/hr/contracts/${contractId}/edit`)}
                className="border-gray-300"
              >
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
            <ViewHistoryButton entityName="EmployeeContract" entityId={contractId} size="default" />
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {showAllowances && <TabsTrigger value="allowances">Allowances</TabsTrigger>}
            <TabsTrigger value="salary-revisions">Salary Revisions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab contract={contract} />
          </TabsContent>
          {showAllowances && (
            <TabsContent value="allowances">
              <AllowancesTab contractId={contractId} readOnly={false} />
            </TabsContent>
          )}
          <TabsContent value="salary-revisions">
            <SalaryRevisionsTab contract={contract} />
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={confirmActivate}
        title="Activate Contract"
        description="Activating supersedes any currently active contract for this employee. Continue?"
        confirmLabel="Activate"
        onConfirm={handleActivate}
        onCancel={() => setConfirmActivate(false)}
      />

      <Dialog open={terminateOpen} onOpenChange={handleTerminateOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Contract</DialogTitle>
            <DialogDescription>This ends the active contract. Optionally add a note.</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="terminateNotes" className="text-gray-700 font-medium">
              Notes
            </Label>
            <Textarea
              id="terminateNotes"
              value={terminateNotes}
              onChange={(e) => setTerminateNotes(e.target.value)}
              rows={3}
              placeholder="Optional reason for termination"
              className="mt-1.5 border-gray-300"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleTerminateOpenChange(false)} disabled={terminateMutation.isPending} className="border-gray-300">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleTerminate}
              disabled={terminateMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {terminateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Terminating...</> : 'Terminate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
