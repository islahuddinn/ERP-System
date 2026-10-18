'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
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
import { ArrowLeft, Loader2, MapPin } from 'lucide-react'
import { useSite, useUpdateSite, useSitesDropdown, type SiteType, type SiteCategory, type SiteStatus } from '@/hooks/useSites'
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

export default function EditSitePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: site, isLoading } = useSite(id)
  const updateSite = useUpdateSite()
  const { data: dropdown = [], isLoading: dropdownLoading } = useSitesDropdown()

  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations-dropdown'],
    queryFn: async () => {
      const { data: res } = await apiClient.get('/locations', { params: { limit: 100 } })
      const d = res?.data?.data ?? res?.data ?? res
      return (Array.isArray(d) ? d : []) as Array<{ id: string; name: string; city?: string }>
    },
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
  })
  const users = usersData ?? []

  const dropdownsReady = !dropdownLoading && !locationsLoading && !usersLoading

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '', code: '', type: 'WAREHOUSE', category: 'GENERAL', status: 'ACTIVE',
      parentId: '', locationId: '', managerId: '', totalCapacity: '', capacityUnit: '',
      temperature: '', humidity: '', description: '',
    },
  })

  // Gate reset until site data AND all dropdown options are loaded so that
  // saved Select values (parentId, locationId, managerId, capacityUnit) are
  // present in their respective option lists when the form renders.
  useEffect(() => {
    if (site && dropdownsReady) {
      reset({
        name: site.name,
        code: site.code,
        type: site.type as SiteType,
        category: site.category as SiteCategory,
        status: site.status as SiteStatus,
        parentId: site.parentId || '',
        locationId: site.locationId || '',
        managerId: site.managerId || '',
        totalCapacity: site.totalCapacity ? String(site.totalCapacity) : '',
        capacityUnit: site.capacityUnit || '',
        temperature: site.temperature ? String(site.temperature) : '',
        humidity: site.humidity ? String(site.humidity) : '',
        description: site.description || '',
      })
    }
  }, [site, dropdownsReady, reset])

  const onSubmit = async (data: FormData) => {
    try {
      const payload: any = {
        name: data.name.trim(),
        code: data.code.trim(),
        type: data.type,
        category: data.category,
        status: data.status,
      }

      // Always send nullable optional fields so clearing them persists as null
      payload.parentId = (data.parentId && data.parentId !== 'none') ? data.parentId : null
      payload.locationId = (data.locationId && data.locationId !== 'none') ? data.locationId : null
      payload.managerId = (data.managerId && data.managerId !== 'none') ? data.managerId : null
      payload.description = data.description.trim() || null
      payload.totalCapacity = data.totalCapacity ? parseFloat(data.totalCapacity) : null
      payload.capacityUnit = (data.capacityUnit && data.capacityUnit !== 'none') ? data.capacityUnit : null
      payload.temperature = data.temperature ? parseFloat(data.temperature) : null
      payload.humidity = data.humidity ? parseFloat(data.humidity) : null

      await updateSite.mutateAsync({ siteId: id, data: payload })
      router.push('/dashboard/sites')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update site')
    }
  }

  if (isLoading || !dropdownsReady) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!site) return <div className="p-8 text-muted-foreground">Site not found</div>

  // Exclude the current site from parent options
  const parentOptions = dropdown.filter(s => s.id !== id)

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
            Edit Site
          </h1>
          <p className="text-gray-600 mt-1 font-mono text-sm">{site.code}</p>
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
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select key={field.value || 'k'} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SITE_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{fmt(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Category</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select key={field.value || 'k'} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SITE_CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{fmt(c)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select key={field.value || 'k'} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SITE_STATUSES.map(s => (
                          <SelectItem key={s} value={s}>{fmt(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Parent Site</Label>
                <Controller
                  control={control}
                  name="parentId"
                  render={({ field }) => (
                    <Select key={field.value || 'k'} value={field.value || 'none'} onValueChange={v => field.onChange(v === 'none' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="None (top-level)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (top-level)</SelectItem>
                        {parentOptions.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Location</Label>
                <Controller
                  control={control}
                  name="locationId"
                  render={({ field }) => (
                    <Select key={field.value || 'k'} value={field.value || 'none'} onValueChange={v => field.onChange(v === 'none' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No location</SelectItem>
                        {locations.length === 0 && (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">No locations available</div>
                        )}
                        {locations.map(l => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}{l.city ? ` (${l.city})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Manager</Label>
                <Controller
                  control={control}
                  name="managerId"
                  render={({ field }) => (
                    <Select key={field.value || 'k'} value={field.value || 'none'} onValueChange={v => field.onChange(v === 'none' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No manager</SelectItem>
                        {users.length === 0 && (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">No users available</div>
                        )}
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
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
                <Controller
                  control={control}
                  name="capacityUnit"
                  render={({ field }) => (
                    <Select key={field.value || 'k'} value={field.value || 'none'} onValueChange={v => field.onChange(v === 'none' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No unit</SelectItem>
                        {CAPACITY_UNITS.map(u => (
                          <SelectItem key={u} value={u}>{fmt(u)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
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

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={updateSite.isPending}
          >
            {updateSite.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              'Save Changes'
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
