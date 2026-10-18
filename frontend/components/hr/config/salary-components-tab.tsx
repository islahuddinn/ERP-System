'use client'

import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { Plus, MoreVertical, Edit, Trash2, Loader2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  useSalaryComponents,
  useCreateSalaryComponent,
  useUpdateSalaryComponent,
  useDeleteSalaryComponent,
  type SalaryComponent,
} from '@/hooks/useHrConfig'

interface SalaryComponentFormData {
  code: string
  name: string
  type: string
  category: string
  calculationType: string
  amount: string
  percentage: string
  formula: string
  effectiveFrom: string
  effectiveTo: string
  isTaxable: boolean
  isDefault: boolean
  isActive: boolean
}

const EMPTY_FORM: SalaryComponentFormData = {
  code: '',
  name: '',
  type: 'EARNING',
  category: '',
  calculationType: 'FIXED_AMOUNT',
  amount: '',
  percentage: '',
  formula: '',
  effectiveFrom: '',
  effectiveTo: '',
  isTaxable: true,
  isDefault: false,
  isActive: true,
}

const TYPE_OPTIONS = ['EARNING', 'DEDUCTION']
const CALC_OPTIONS = ['FIXED_AMOUNT', 'PERCENTAGE', 'FORMULA_BASED']

function toDateInput(value?: string | null): string {
  if (!value) return ''
  return value.slice(0, 10)
}

export function SalaryComponentsTab() {
  const controller = useDataTable({ initialSortBy: 'name', initialSortOrder: 'ASC' })
  const money = useMoney()
  const { data: rows, isLoading, isError } = useSalaryComponents()
  const createMutation = useCreateSalaryComponent()
  const updateMutation = useUpdateSalaryComponent()
  const deleteMutation = useDeleteSalaryComponent()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SalaryComponent | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SalaryComponentFormData>({ defaultValues: EMPTY_FORM })

  const paged = useMemo(
    () =>
      applyClientPaging<SalaryComponent>(rows, controller, {
        search: (r) => `${r.name} ${r.code} ${r.category ?? ''}`,
        filters: {
          type: (r) => r.type,
          isActive: (r) => String(r.isActive),
        },
        sort: {
          name: (r) => r.name.toLowerCase(),
          code: (r) => r.code.toLowerCase(),
          type: (r) => r.type,
        },
      }),
    [rows, controller],
  )

  const openCreate = () => {
    setEditing(null)
    reset(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (component: SalaryComponent) => {
    setEditing(component)
    reset({
      code: component.code,
      name: component.name,
      type: component.type,
      category: component.category ?? '',
      calculationType: component.calculationType,
      amount: component.amount === null || component.amount === undefined ? '' : String(component.amount),
      percentage: component.percentage === null || component.percentage === undefined ? '' : String(component.percentage),
      formula: component.formula ?? '',
      effectiveFrom: toDateInput(component.effectiveFrom),
      effectiveTo: toDateInput(component.effectiveTo),
      isTaxable: component.isTaxable,
      isDefault: component.isDefault,
      isActive: component.isActive,
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: SalaryComponentFormData) => {
    const payload = {
      code: data.code.trim(),
      name: data.name.trim(),
      type: data.type,
      category: data.category.trim() ? data.category.trim() : null,
      calculationType: data.calculationType,
      amount: data.amount.trim() ? data.amount.trim() : null,
      percentage: data.percentage.trim() ? data.percentage.trim() : null,
      formula: data.formula.trim() ? data.formula.trim() : null,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ? data.effectiveTo : null,
      isTaxable: data.isTaxable,
      isDefault: data.isDefault,
      isActive: data.isActive,
    }
    try {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, payload })
      else await createMutation.mutateAsync(payload)
      setDialogOpen(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save salary component'))
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

  const columns: DataTableColumn<SalaryComponent>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'code', header: 'Code', sortable: true, render: (r) => <span className="text-gray-700 font-mono text-xs">{r.code}</span> },
    { key: 'type', header: 'Type', sortable: true, render: (r) => <Badge variant={r.type === 'EARNING' ? 'default' : 'secondary'}>{r.type}</Badge> },
    { key: 'category', header: 'Category', render: (r) => (r.category ? <span className="text-gray-700">{r.category}</span> : <span className="text-gray-400">—</span>) },
    { key: 'calculationType', header: 'Calculation', render: (r) => <span className="text-gray-700">{r.calculationType}</span> },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      render: (r) =>
        r.amount !== null && r.amount !== undefined ? (
          <span className="text-gray-700">{money(Number(r.amount))}</span>
        ) : r.percentage !== null && r.percentage !== undefined ? (
          <span className="text-gray-700">{Number(r.percentage)}%</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    { key: 'isTaxable', header: 'Taxable', align: 'center', render: (r) => <Badge variant={r.isTaxable ? 'default' : 'secondary'}>{r.isTaxable ? 'Yes' : 'No'}</Badge> },
    { key: 'isActive', header: 'Status', align: 'center', render: (r) => <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
  ]

  const filters: DataTableFilter<SalaryComponent>[] = [
    { key: 'type', label: 'Type', options: TYPE_OPTIONS.map((t) => ({ value: t, label: t })) },
    { key: 'isActive', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
  ]

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-4">
      <DataTable<SalaryComponent>
        columns={columns}
        data={paged.data}
        meta={paged.meta}
        controller={controller}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to load salary components."
        searchable
        searchPlaceholder="Search salary components..."
        filters={filters}
        pageSizeOptions
        emptyMessage="No salary components found."
        toolbarRight={
          <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Component
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
              <Wallet className="h-5 w-5 text-green-600" />
              {editing ? 'Edit Salary Component' : 'Add Salary Component'}
            </DialogTitle>
            <DialogDescription>Define an earning or deduction line used when building salaries.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sc-name">Name <span className="text-red-500">*</span></Label>
                <Input id="sc-name" {...register('name', { required: 'Name is required', validate: (v) => v.trim().length > 0 || 'Name is required' })} placeholder="e.g. Basic Salary" className="mt-1.5" />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="sc-code">Code <span className="text-red-500">*</span></Label>
                <Input id="sc-code" {...register('code', { required: 'Code is required', maxLength: { value: 32, message: 'Max 32 characters' } })} placeholder="e.g. BASIC" className="mt-1.5" />
                {errors.code && <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>}
              </div>
              <div>
                <Label>Type <span className="text-red-500">*</span></Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>{TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="sc-category">Category</Label>
                <Input id="sc-category" {...register('category')} placeholder="Optional grouping" className="mt-1.5" />
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
                <Label htmlFor="sc-formula">Formula</Label>
                <Input id="sc-formula" {...register('formula')} placeholder="Optional expression" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="sc-amount">Amount</Label>
                <Input id="sc-amount" type="number" step="0.01" {...register('amount')} placeholder="Fixed amount" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="sc-percentage">Percentage (%)</Label>
                <Input id="sc-percentage" type="number" step="0.01" {...register('percentage')} placeholder="Percentage value" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="sc-from">Effective From <span className="text-red-500">*</span></Label>
                <Input id="sc-from" type="date" {...register('effectiveFrom', { required: 'Effective from is required' })} className="mt-1.5" />
                {errors.effectiveFrom && <p className="text-sm text-red-600 mt-1">{errors.effectiveFrom.message}</p>}
              </div>
              <div>
                <Label htmlFor="sc-to">Effective To</Label>
                <Input id="sc-to" type="date" {...register('effectiveTo')} className="mt-1.5" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="sc-taxable" checked={watch('isTaxable')} onCheckedChange={(c) => setValue('isTaxable', c === true)} />
                <Label htmlFor="sc-taxable" className="cursor-pointer">Taxable</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="sc-default" checked={watch('isDefault')} onCheckedChange={(c) => setValue('isDefault', c === true)} />
                <Label htmlFor="sc-default" className="cursor-pointer">Default</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="sc-active" checked={watch('isActive')} onCheckedChange={(c) => setValue('isActive', c === true)} />
                <Label htmlFor="sc-active" className="cursor-pointer">Active</Label>
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
        title="Deactivate Salary Component"
        description="This deactivates the component (soft delete) so payroll history stays intact. Continue?"
        confirmLabel="Deactivate"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
