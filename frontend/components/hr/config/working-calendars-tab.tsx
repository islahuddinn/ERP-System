'use client'

import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Plus, MoreVertical, Edit, Trash2, Loader2, CalendarDays } from 'lucide-react'
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
import { getApiErrorMessage } from '@/lib/api-error'
import {
  useWorkingCalendars,
  useCreateWorkingCalendar,
  useUpdateWorkingCalendar,
  useDeleteWorkingCalendar,
  type WorkingCalendar,
} from '@/hooks/useHrConfig'

// A working calendar defines, per year, which weekdays are weekends.
// Everything else (total/weekend/holiday/working day counts) is computed by the
// backend at read time — holidays come from the separate /hr/holidays module and
// are NOT stored on the calendar.
interface WorkingCalendarFormData {
  name: string
  year: string
  countryCode: string
  weekendDays: number[]
  isActive: boolean
}

const EMPTY_FORM: WorkingCalendarFormData = {
  name: '',
  year: String(new Date().getFullYear()),
  countryCode: '',
  weekendDays: [0, 6],
  isActive: true,
}

// index === day-of-week integer the backend expects (0 = Sunday … 6 = Saturday).
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MIN_YEAR = 2000
const MAX_YEAR = 2100

function formatWeekendDays(days: number[] | undefined): string {
  if (!days || days.length === 0) return '—'
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d] ?? d)
    .join(', ')
}

// workingDays / holidayDayCount can be fractional (HALF_DAY holidays count 0.5),
// so trim trailing zeros rather than forcing a fixed decimal count.
function formatDayCount(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  return String(Number(value))
}

export function WorkingCalendarsTab() {
  const controller = useDataTable({ initialSortBy: 'year', initialSortOrder: 'DESC' })
  const { data: rows, isLoading, isError } = useWorkingCalendars()
  const createMutation = useCreateWorkingCalendar()
  const updateMutation = useUpdateWorkingCalendar()
  const deleteMutation = useDeleteWorkingCalendar()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<WorkingCalendar | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WorkingCalendarFormData>({ defaultValues: EMPTY_FORM })

  const paged = useMemo(
    () =>
      applyClientPaging<WorkingCalendar>(rows, controller, {
        search: (r) => `${r.name} ${r.countryCode} ${r.year}`,
        filters: { isActive: (r) => String(r.isActive) },
        sort: {
          name: (r) => r.name.toLowerCase(),
          year: (r) => r.year,
          countryCode: (r) => r.countryCode,
          workingDays: (r) => Number(r.workingDays),
        },
      }),
    [rows, controller],
  )

  const openCreate = () => {
    setEditing(null)
    reset(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (calendar: WorkingCalendar) => {
    setEditing(calendar)
    reset({
      name: calendar.name,
      year: String(calendar.year),
      countryCode: calendar.countryCode,
      weekendDays: calendar.weekendDays ?? [],
      isActive: calendar.isActive,
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: WorkingCalendarFormData) => {
    const payload = {
      name: data.name.trim(),
      year: Number(data.year),
      countryCode: data.countryCode.trim().toUpperCase(),
      weekendDays: data.weekendDays,
      isActive: data.isActive,
    }
    try {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, payload })
      else await createMutation.mutateAsync(payload)
      setDialogOpen(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save working calendar'))
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

  const toggleWeekendDay = (day: number, checked: boolean) => {
    const current = watch('weekendDays') ?? []
    const next = checked ? [...new Set([...current, day])] : current.filter((d) => d !== day)
    setValue('weekendDays', next, { shouldValidate: true })
  }

  const columns: DataTableColumn<WorkingCalendar>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'year', header: 'Year', sortable: true, render: (r) => <span className="text-gray-700">{r.year}</span> },
    { key: 'countryCode', header: 'Country', sortable: true, render: (r) => <span className="text-gray-700">{r.countryCode}</span> },
    { key: 'weekendDays', header: 'Weekend Days', render: (r) => <span className="text-gray-600">{formatWeekendDays(r.weekendDays)}</span> },
    { key: 'weekendDayCount', header: 'Weekend Day Count', align: 'right', render: (r) => <span className="text-gray-600">{formatDayCount(r.weekendDayCount)}</span> },
    { key: 'holidayDayCount', header: 'Holiday Days', align: 'right', render: (r) => <span className="text-gray-600">{formatDayCount(r.holidayDayCount)}</span> },
    { key: 'workingDays', header: 'Working Days', align: 'right', sortable: true, render: (r) => <span className="font-medium text-gray-900">{formatDayCount(r.workingDays)}</span> },
    { key: 'isActive', header: 'Status', align: 'center', render: (r) => <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
  ]

  const filters: DataTableFilter<WorkingCalendar>[] = [
    { key: 'isActive', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
  ]

  const isSaving = createMutation.isPending || updateMutation.isPending
  const selectedWeekendDays = watch('weekendDays') ?? []

  return (
    <div className="space-y-4">
      <DataTable<WorkingCalendar>
        columns={columns}
        data={paged.data}
        meta={paged.meta}
        controller={controller}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to load working calendars."
        searchable
        searchPlaceholder="Search working calendars..."
        filters={filters}
        pageSizeOptions
        emptyMessage="No working calendars found."
        toolbarRight={
          <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Working Calendar
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
              <CalendarDays className="h-5 w-5 text-green-600" />
              {editing ? 'Edit Working Calendar' : 'Add Working Calendar'}
            </DialogTitle>
            <DialogDescription>
              Define the weekend days for a country and year. Working-day counts are computed automatically from the
              weekend configuration and the holidays defined in the Holidays module.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="wc-name">Name <span className="text-red-500">*</span></Label>
                <Input id="wc-name" {...register('name', { required: 'Name is required', validate: (v) => v.trim().length > 0 || 'Name is required' })} placeholder="e.g. Pakistan 2026" className="mt-1.5" />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="wc-year">Year <span className="text-red-500">*</span></Label>
                <Input
                  id="wc-year"
                  type="number"
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                  step={1}
                  {...register('year', {
                    required: 'Year is required',
                    validate: (v) => {
                      const year = Number(v)
                      if (!Number.isInteger(year)) return 'Year must be a whole number'
                      if (year < MIN_YEAR || year > MAX_YEAR) return `Year must be between ${MIN_YEAR} and ${MAX_YEAR}`
                      return true
                    },
                  })}
                  placeholder="e.g. 2026"
                  className="mt-1.5"
                />
                {errors.year && <p className="text-sm text-red-600 mt-1">{errors.year.message}</p>}
              </div>
              <div>
                <Label htmlFor="wc-country">Country Code <span className="text-red-500">*</span></Label>
                <Input id="wc-country" {...register('countryCode', { required: 'Country code is required', maxLength: { value: 4, message: 'Max 4 characters' } })} placeholder="e.g. PK" className="mt-1.5" />
                {errors.countryCode && <p className="text-sm text-red-600 mt-1">{errors.countryCode.message}</p>}
              </div>
              <div className="flex items-center gap-2 mt-6">
                <Checkbox id="wc-active" checked={watch('isActive')} onCheckedChange={(c) => setValue('isActive', c === true)} />
                <Label htmlFor="wc-active" className="cursor-pointer">Active</Label>
              </div>
            </div>

            <div>
              <Label>Weekend Days <span className="text-red-500">*</span></Label>
              <Controller
                control={control}
                name="weekendDays"
                rules={{ validate: (v) => (v && v.length > 0) || 'Select at least one weekend day' }}
                render={() => (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {DAY_LABELS.map((label, day) => (
                      <label key={day} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedWeekendDays.includes(day)}
                          onCheckedChange={(c) => toggleWeekendDay(day, c === true)}
                        />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
              {errors.weekendDays && <p className="text-sm text-red-600 mt-1">{errors.weekendDays.message}</p>}
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
        title="Deactivate Working Calendar"
        description="This deactivates the working calendar (soft delete). Continue?"
        confirmLabel="Deactivate"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
