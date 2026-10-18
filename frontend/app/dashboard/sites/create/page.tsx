'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, MapPin, Plus, X } from 'lucide-react'
import { useCreateSite, useSitesDropdown, type SiteType, type SiteCategory, type SiteStatus } from '@/hooks/useSites'
import { apiClient } from '@/lib/api-client'

const SITE_TYPES: SiteType[] = ['WAREHOUSE', 'ZONE', 'UNIT', 'PLANT', 'WORKSHOP', 'ROOM', 'STORAGE', 'AREA']
const SITE_CATEGORIES: SiteCategory[] = [
  'RAW_MATERIAL', 'WORK_IN_PROGRESS', 'FINISHED_GOODS', 'PACKAGING',
  'SPARE_PARTS', 'CONSUMABLES', 'REJECTED', 'QUARANTINE', 'HAZARDOUS', 'GENERAL',
]
const SITE_STATUSES: SiteStatus[] = ['ACTIVE', 'INACTIVE', 'QUARANTINE', 'UNDER_MAINTENANCE', 'FULL']
const CAPACITY_UNITS = ['CUBIC_METER', 'SQUARE_METER', 'PALLET', 'TON', 'KG', 'UNIT']

function fmt(val: string) {
  return val.replace(/_/g, ' ')
}

interface FormData {
  name: string
  code: string
  type: SiteType
  category: SiteCategory
  status: SiteStatus
  parentId: string
  locationId: string
  managerId: string
  totalCapacity: string
  capacityUnit: string
  temperature: string
  humidity: string
  description: string
}

interface MetaRow {
  key: string
  value: string
}

export default function CreateSitePage() {
  const router = useRouter()
  const createSite = useCreateSite()
  const { data: dropdown = [], isLoading: dropdownLoading } = useSitesDropdown()

  // #11 — freeform Metadata (Site.metadata is a JSON column; the create DTO accepts
  // `metadata?: Record<string, unknown>`). Collected here as key/value pairs.
  const [metaRows, setMetaRows] = useState<MetaRow[]>([{ key: '', value: '' }])
  const addMetaRow = () => setMetaRows(rows => [...rows, { key: '', value: '' }])
  // Remove any row (including the first/only one). Previously the single-row case
  // just reset the row instead of removing it, so the first tag could never be
  // deleted with its X icon. Now every row removes; an empty list is fine — the
  // "Add Field" button remains available to add rows back.
  const removeMetaRow = (index: number) =>
    setMetaRows(rows => rows.filter((_, i) => i !== index))
  const updateMetaRow = (index: number, field: keyof MetaRow, val: string) =>
    setMetaRows(rows => rows.map((r, i) => (i === index ? { ...r, [field]: val } : r)))

  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations-dropdown'],
    queryFn: async () => {
      const { data: res } = await apiClient.get('/locations', { params: { limit: 100 } })
      const d = res?.data?.data ?? res?.data ?? res
      return (Array.isArray(d) ? d : []) as Array<{ id: string; name: string; city?: string }>
    },
    // #23 — always refetch on mount so newly added/deleted locations show without a page refresh
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const locations = locationsData ?? []

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users-dropdown'],
    queryFn: async () => {
      const { data: res } = await apiClient.get('/users/dropdown')
      // Response is wrapped: { success, message, data: [...] }
      const d = res?.data?.data ?? res?.data ?? res
      return (Array.isArray(d) ? d : []) as Array<{ id: string; name: string; email: string }>
    },
    // #27 — always refetch on mount so newly added/removed users show without a page refresh
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const users = usersData ?? []

  const dropdownsReady = !dropdownLoading && !locationsLoading && !usersLoading

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      code: '',
      // Start empty so the Selects show the "Select Type/Category/Status" placeholder
      // instead of a pre-picked value. Type is required (validated on submit); category
      // and status are optional and default on the backend when omitted.
      type: '' as SiteType,
      category: '' as SiteCategory,
      status: '' as SiteStatus,
      parentId: '',
      locationId: '',
      managerId: '',
      totalCapacity: '',
      capacityUnit: '',
      temperature: '',
      humidity: '',
      description: '',
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      if (!data.type) {
        toast.error('Type is required')
        return
      }
      const payload: any = {
        name: data.name.trim(),
        code: data.code.trim(),
        type: data.type,
      }
      // category/status are optional — only send when the user picked one (the backend
      // defaults to GENERAL/ACTIVE otherwise); never send an empty string to @IsEnum.
      if (data.category) payload.category = data.category
      if (data.status) payload.status = data.status

      if (data.parentId) payload.parentId = data.parentId
      if (data.locationId) payload.locationId = data.locationId
      if (data.managerId) payload.managerId = data.managerId
      if (data.description.trim()) payload.description = data.description.trim()
      if (data.totalCapacity) payload.totalCapacity = parseFloat(data.totalCapacity)
      if (data.capacityUnit) payload.capacityUnit = data.capacityUnit
      if (data.temperature) payload.temperature = parseFloat(data.temperature)
      if (data.humidity) payload.humidity = parseFloat(data.humidity)

      // #11 — build the freeform metadata object from the key/value rows, keeping
      // only rows with a non-empty key. Send it only when at least one pair exists.
      const metadata = metaRows.reduce<Record<string, string>>((acc, row) => {
        const key = row.key.trim()
        if (key) acc[key] = row.value.trim()
        return acc
      }, {})
      if (Object.keys(metadata).length > 0) payload.metadata = metadata

      await createSite.mutateAsync(payload)
      router.push('/dashboard/sites')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create site')
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/sites')}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-green-600" />
            Add Site
          </h1>
          <p className="text-gray-600 mt-1">Create a new storage location or site.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Main Warehouse"
                  {...register('name', { required: 'Name is required' })}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">
                  Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder="e.g. WH-001"
                  {...register('code', { required: 'Code is required' })}
                  className={errors.code ? 'border-red-500' : ''}
                />
                {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('type') || undefined}
                  onValueChange={v => setValue('type', v as SiteType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SITE_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{fmt(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Category</Label>
                <Select
                  value={watch('category') || undefined}
                  onValueChange={v => setValue('category', v as SiteCategory)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {SITE_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{fmt(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Status</Label>
                <Select
                  value={watch('status') || undefined}
                  onValueChange={v => setValue('status', v as SiteStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {SITE_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{fmt(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Parent Site</Label>
                <Select
                  value={watch('parentId') || undefined}
                  onValueChange={v => setValue('parentId', v === 'none' ? '' : v)}
                  disabled={!dropdownsReady}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={dropdownsReady ? 'Select Parent Site' : 'Loading…'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level)</SelectItem>
                    {dropdown.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Location</Label>
                <Select
                  value={watch('locationId') || undefined}
                  onValueChange={v => setValue('locationId', v === 'none' ? '' : v)}
                  disabled={!dropdownsReady}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={dropdownsReady ? 'Select Location' : 'Loading…'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {locations.length === 0 && dropdownsReady && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No locations available</div>
                    )}
                    {locations.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}{l.city ? ` (${l.city})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Manager</Label>
                <Select
                  value={watch('managerId') || undefined}
                  onValueChange={v => setValue('managerId', v === 'none' ? '' : v)}
                  disabled={!dropdownsReady}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={dropdownsReady ? 'Select Manager' : 'Loading…'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {users.length === 0 && dropdownsReady && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No users available</div>
                    )}
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description..."
                {...register('description')}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Capacity & Environment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalCapacity">Total Capacity</Label>
                <Input
                  id="totalCapacity"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 5000"
                  {...register('totalCapacity')}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Capacity Unit</Label>
                <Select
                  value={watch('capacityUnit') || undefined}
                  onValueChange={v => setValue('capacityUnit', v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Capacity Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {CAPACITY_UNITS.map(u => (
                      <SelectItem key={u} value={u}>{fmt(u)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 4"
                  {...register('temperature')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="humidity">Humidity (%)</Label>
                <Input
                  id="humidity"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 65"
                  {...register('humidity')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* #11 — Metadata Information: freeform key/value pairs stored in Site.metadata (JSON). */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Metadata Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Add any extra descriptive attributes for this site as key/value pairs (e.g. zone, aisle, owner).
            </p>
            <div className="space-y-3">
              {metaRows.map((row, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Input
                    placeholder="Key (e.g. zone)"
                    value={row.key}
                    onChange={e => updateMetaRow(index, 'key', e.target.value)}
                  />
                  <Input
                    placeholder="Value (e.g. A)"
                    value={row.value}
                    onChange={e => updateMetaRow(index, 'value', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMetaRow(index)}
                    className="text-gray-500 hover:text-red-600 shrink-0"
                    aria-label="Remove metadata row"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMetaRow}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Field
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={createSite.isPending}
          >
            {createSite.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
              </>
            ) : (
              'Create Site'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/sites')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
