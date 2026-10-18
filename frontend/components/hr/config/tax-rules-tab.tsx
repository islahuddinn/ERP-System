'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { Plus, MoreVertical, Edit, Trash2, Loader2, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
  useTaxRules,
  useCreateTaxRule,
  useUpdateTaxRule,
  useDeleteTaxRule,
  type TaxRule,
} from '@/hooks/useHrConfig'

interface TaxRuleFormData {
  countryCode: string
  name: string
  slabMin: string
  slabMax: string
  ratePercent: string
  effectiveFrom: string
  effectiveTo: string
  isActive: boolean
}

const EMPTY_FORM: TaxRuleFormData = {
  countryCode: '',
  name: '',
  slabMin: '',
  slabMax: '',
  ratePercent: '',
  effectiveFrom: '',
  effectiveTo: '',
  isActive: true,
}

// ISO date (YYYY-MM-DD) suitable for an <input type="date"> from an API timestamp.
function toDateInput(value?: string | null): string {
  if (!value) return ''
  return value.slice(0, 10)
}

export function TaxRulesTab() {
  const controller = useDataTable({ initialSortBy: 'effectiveFrom', initialSortOrder: 'DESC' })
  const money = useMoney()
  const { data: rows, isLoading, isError } = useTaxRules()
  const createMutation = useCreateTaxRule()
  const updateMutation = useUpdateTaxRule()
  const deleteMutation = useDeleteTaxRule()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TaxRule | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaxRuleFormData>({ defaultValues: EMPTY_FORM })

  const paged = useMemo(
    () =>
      applyClientPaging<TaxRule>(rows, controller, {
        search: (r) => `${r.name} ${r.countryCode}`,
        filters: { isActive: (r) => String(r.isActive) },
        sort: {
          name: (r) => r.name.toLowerCase(),
          countryCode: (r) => r.countryCode,
          ratePercent: (r) => Number(r.ratePercent),
          effectiveFrom: (r) => r.effectiveFrom,
        },
      }),
    [rows, controller],
  )

  const openCreate = () => {
    setEditing(null)
    reset(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (rule: TaxRule) => {
    setEditing(rule)
    reset({
      countryCode: rule.countryCode,
      name: rule.name,
      slabMin: String(rule.slabMin ?? ''),
      slabMax: rule.slabMax === null || rule.slabMax === undefined ? '' : String(rule.slabMax),
      ratePercent: String(rule.ratePercent ?? ''),
      effectiveFrom: toDateInput(rule.effectiveFrom),
      effectiveTo: toDateInput(rule.effectiveTo),
      isActive: rule.isActive,
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: TaxRuleFormData) => {
    const payload = {
      countryCode: data.countryCode.trim().toUpperCase(),
      name: data.name.trim(),
      slabMin: data.slabMin.trim(),
      slabMax: data.slabMax.trim() ? data.slabMax.trim() : null,
      ratePercent: data.ratePercent.trim(),
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ? data.effectiveTo : null,
      isActive: data.isActive,
    }
    try {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, payload })
      else await createMutation.mutateAsync(payload)
      setDialogOpen(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save tax rule'))
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

  const columns: DataTableColumn<TaxRule>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'countryCode', header: 'Country', sortable: true, render: (r) => <span className="text-gray-700">{r.countryCode}</span> },
    { key: 'slabMin', header: 'Slab Min', align: 'right', render: (r) => <span className="text-gray-700">{money(Number(r.slabMin))}</span> },
    {
      key: 'slabMax',
      header: 'Slab Max',
      align: 'right',
      render: (r) =>
        r.slabMax === null || r.slabMax === undefined ? (
          <span className="text-gray-400">No upper limit</span>
        ) : (
          <span className="text-gray-700">{money(Number(r.slabMax))}</span>
        ),
    },
    { key: 'ratePercent', header: 'Rate', align: 'right', sortable: true, render: (r) => <span className="text-gray-700">{Number(r.ratePercent)}%</span> },
    { key: 'effectiveFrom', header: 'Effective From', sortable: true, render: (r) => <span className="text-gray-600">{format(new Date(r.effectiveFrom), 'MMM d, yyyy')}</span> },
    {
      key: 'isActive',
      header: 'Status',
      align: 'center',
      render: (r) => (
        <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
      ),
    },
  ]

  const filters: DataTableFilter<TaxRule>[] = [
    {
      key: 'isActive',
      label: 'Status',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' },
      ],
    },
  ]

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-4">
      <DataTable<TaxRule>
        columns={columns}
        data={paged.data}
        meta={paged.meta}
        controller={controller}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to load tax rules."
        searchable
        searchPlaceholder="Search tax rules..."
        filters={filters}
        pageSizeOptions
        emptyMessage="No tax rules found."
        toolbarRight={
          <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Tax Rule
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-green-600" />
              {editing ? 'Edit Tax Rule' : 'Add Tax Rule'}
            </DialogTitle>
            <DialogDescription>Define an income-tax slab and its rate.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tr-name">Name <span className="text-red-500">*</span></Label>
                <Input id="tr-name" {...register('name', { required: 'Name is required', validate: (v) => v.trim().length > 0 || 'Name is required' })} placeholder="e.g. First Slab" className="mt-1.5" />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="tr-country">Country Code <span className="text-red-500">*</span></Label>
                <Input id="tr-country" {...register('countryCode', { required: 'Country code is required', maxLength: { value: 4, message: 'Max 4 characters' } })} placeholder="e.g. PK" className="mt-1.5" />
                {errors.countryCode && <p className="text-sm text-red-600 mt-1">{errors.countryCode.message}</p>}
              </div>
              <div>
                <Label htmlFor="tr-slabMin">Slab Min <span className="text-red-500">*</span></Label>
                <Input id="tr-slabMin" type="number" step="0.01" {...register('slabMin', { required: 'Slab min is required' })} placeholder="0.00" className="mt-1.5" />
                {errors.slabMin && <p className="text-sm text-red-600 mt-1">{errors.slabMin.message}</p>}
              </div>
              <div>
                <Label htmlFor="tr-slabMax">Slab Max</Label>
                <Input id="tr-slabMax" type="number" step="0.01" {...register('slabMax')} placeholder="Leave empty for no upper limit" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="tr-rate">Rate (%) <span className="text-red-500">*</span></Label>
                <Input id="tr-rate" type="number" step="0.01" {...register('ratePercent', { required: 'Rate is required' })} placeholder="e.g. 5.00" className="mt-1.5" />
                {errors.ratePercent && <p className="text-sm text-red-600 mt-1">{errors.ratePercent.message}</p>}
              </div>
              <div>
                <Label htmlFor="tr-from">Effective From <span className="text-red-500">*</span></Label>
                <Input id="tr-from" type="date" {...register('effectiveFrom', { required: 'Effective from is required' })} className="mt-1.5" />
                {errors.effectiveFrom && <p className="text-sm text-red-600 mt-1">{errors.effectiveFrom.message}</p>}
              </div>
              <div>
                <Label htmlFor="tr-to">Effective To</Label>
                <Input id="tr-to" type="date" {...register('effectiveTo')} className="mt-1.5" />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <Checkbox id="tr-active" checked={watch('isActive')} onCheckedChange={(c) => setValue('isActive', c === true)} />
                <Label htmlFor="tr-active" className="cursor-pointer">Active</Label>
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
        title="Deactivate Tax Rule"
        description="This deactivates the tax rule (soft delete) so payroll history stays intact. Continue?"
        confirmLabel="Deactivate"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
