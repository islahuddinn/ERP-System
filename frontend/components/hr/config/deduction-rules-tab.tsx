'use client'

import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Plus, MoreVertical, Edit, Trash2, Loader2, MinusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable, applyClientPaging } from '@/hooks/useDataTable'
import { useMoney } from '@/contexts/currency-context'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  useDeductionRules,
  useCreateDeductionRule,
  useUpdateDeductionRule,
  useDeleteDeductionRule,
  type DeductionRule,
} from '@/hooks/useHrConfig'

interface DeductionRuleFormData {
  code: string
  name: string
  description: string
  calculationType: string
  amount: string
  ratePercent: string
  formula: string
  effectiveFrom: string
  effectiveTo: string
  isStatutory: boolean
  isActive: boolean
}

const EMPTY_FORM: DeductionRuleFormData = {
  code: '',
  name: '',
  description: '',
  calculationType: 'FIXED_AMOUNT',
  amount: '',
  ratePercent: '',
  formula: '',
  effectiveFrom: '',
  effectiveTo: '',
  isStatutory: false,
  isActive: true,
}

const CALC_OPTIONS = ['FIXED_AMOUNT', 'PERCENTAGE', 'FORMULA_BASED']

function toDateInput(value?: string | null): string {
  if (!value) return ''
  return value.slice(0, 10)
}

export function DeductionRulesTab() {
  const controller = useDataTable({ initialSortBy: 'name', initialSortOrder: 'ASC' })
  const money = useMoney()
  const { data: rows, isLoading, isError } = useDeductionRules()
  const createMutation = useCreateDeductionRule()
  const updateMutation = useUpdateDeductionRule()
  const deleteMutation = useDeleteDeductionRule()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DeductionRule | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DeductionRuleFormData>({ defaultValues: EMPTY_FORM })

  const paged = useMemo(
    () =>
      applyClientPaging<DeductionRule>(rows, controller, {
        search: (r) => `${r.name} ${r.code}`,
        filters: { isActive: (r) => String(r.isActive) },
        sort: {
          name: (r) => r.name.toLowerCase(),
          code: (r) => r.code.toLowerCase(),
        },
      }),
    [rows, controller],
  )

  const openCreate = () => {
    setEditing(null)
    reset(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (rule: DeductionRule) => {
    setEditing(rule)
    reset({
      code: rule.code,
      name: rule.name,
      description: rule.description ?? '',
      calculationType: rule.calculationType,
      amount: rule.amount === null || rule.amount === undefined ? '' : String(rule.amount),
      ratePercent: rule.ratePercent === null || rule.ratePercent === undefined ? '' : String(rule.ratePercent),
      formula: rule.formula ?? '',
      effectiveFrom: toDateInput(rule.effectiveFrom),
      effectiveTo: toDateInput(rule.effectiveTo),
      isStatutory: rule.isStatutory ?? false,
      isActive: rule.isActive,
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: DeductionRuleFormData) => {
    const payload = {
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description.trim() ? data.description.trim() : null,
      calculationType: data.calculationType,
      amount: data.amount.trim() ? data.amount.trim() : null,
      ratePercent: data.ratePercent.trim() ? data.ratePercent.trim() : null,
      formula: data.formula.trim() ? data.formula.trim() : null,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ? data.effectiveTo : null,
      isStatutory: data.isStatutory,
      isActive: data.isActive,
    }
    try {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, payload })
      else await createMutation.mutateAsync(payload)
      setDialogOpen(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save deduction rule'))
    }
  }

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const columns: DataTableColumn<DeductionRule>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'code', header: 'Code', sortable: true, render: (r) => <span className="text-gray-700 font-mono text-xs">{r.code}</span> },
    { key: 'calculationType', header: 'Calculation', render: (r) => <span className="text-gray-700">{r.calculationType}</span> },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      render: (r) =>
        r.amount !== null && r.amount !== undefined ? (
          <span className="text-gray-700">{money(Number(r.amount))}</span>
        ) : r.ratePercent !== null && r.ratePercent !== undefined ? (
          <span className="text-gray-700">{Number(r.ratePercent)}%</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    { key: 'isStatutory', header: 'Statutory', align: 'center', render: (r) => <Badge variant={r.isStatutory ? 'default' : 'secondary'}>{r.isStatutory ? 'Yes' : 'No'}</Badge> },
    { key: 'isActive', header: 'Status', align: 'center', render: (r) => <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
  ]

  const filters: DataTableFilter<DeductionRule>[] = [
    { key: 'isActive', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
  ]

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-4">
      <DataTable<DeductionRule>
        columns={columns}
        data={paged.data}
        meta={paged.meta}
        controller={controller}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to load deduction rules."
        searchable
        searchPlaceholder="Search deduction rules..."
        filters={filters}
        pageSizeOptions
        emptyMessage="No deduction rules found."
        toolbarRight={
          <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Deduction Rule
          </Button>
        }
        actions={(r) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-gray-200">
              <DropdownMenuItem onClick={() => openEdit(r)} className="cursor-pointer text-gray-700">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteTargetId(r.id)} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
                <Trash2 className="mr-2 h-4 w-4" /> Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MinusCircle className="h-5 w-5 text-green-600" />
              {editing ? 'Edit Deduction Rule' : 'Add Deduction Rule'}
            </DialogTitle>
            <DialogDescription>Define a payroll deduction and how it is calculated.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dr-name">Name <span className="text-red-500">*</span></Label>
                <Input id="dr-name" {...register('name', { required: 'Name is required', validate: (v) => v.trim().length > 0 || 'Name is required' })} placeholder="e.g. Provident Fund" className="mt-1.5" />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="dr-code">Code <span className="text-red-500">*</span></Label>
                <Input id="dr-code" {...register('code', { required: 'Code is required', maxLength: { value: 32, message: 'Max 32 characters' } })} placeholder="e.g. PF" className="mt-1.5" />
                {errors.code && <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>}
              </div>
              <div>
                <Label>Calculation Type <span className="text-red-500">*</span></Label>
                <Controller
                  control={control}
                  name="calculationType"
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select calculation" /></SelectTrigger>
                      <SelectContent>{CALC_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="dr-formula">Formula</Label>
                <Input id="dr-formula" {...register('formula')} placeholder="Optional expression" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="dr-amount">Amount</Label>
                <Input id="dr-amount" type="number" step="0.01" {...register('amount')} placeholder="Fixed amount" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="dr-rate">Rate (%)</Label>
                <Input id="dr-rate" type="number" step="0.01" {...register('ratePercent')} placeholder="Percentage value" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="dr-from">Effective From <span className="text-red-500">*</span></Label>
                <Input id="dr-from" type="date" {...register('effectiveFrom', { required: 'Effective from is required' })} className="mt-1.5" />
                {errors.effectiveFrom && <p className="text-sm text-red-600 mt-1">{errors.effectiveFrom.message}</p>}
              </div>
              <div>
                <Label htmlFor="dr-to">Effective To</Label>
                <Input id="dr-to" type="date" {...register('effectiveTo')} className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label htmlFor="dr-description">Description</Label>
              <Textarea id="dr-description" {...register('description')} rows={2} placeholder="Optional description" className="mt-1.5" />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="dr-statutory" checked={watch('isStatutory')} onCheckedChange={(c) => setValue('isStatutory', c === true)} />
                <Label htmlFor="dr-statutory" className="cursor-pointer">Statutory</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="dr-active" checked={watch('isActive')} onCheckedChange={(c) => setValue('isActive', c === true)} />
                <Label htmlFor="dr-active" className="cursor-pointer">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white min-w-[100px]">
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : editing ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTargetId}
        title="Deactivate Deduction Rule"
        description="This deactivates the deduction rule (soft delete) so payroll history stays intact. Continue?"
        confirmLabel="Deactivate"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
