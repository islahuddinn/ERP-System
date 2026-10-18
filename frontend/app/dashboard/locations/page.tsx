'use client'

import { useState, useEffect } from 'react'
import { useConfirm } from '@/components/ui/confirm-provider'
import {
  Plus,
  MapPin,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import type { SortOrder } from '@/components/ui/table-sort'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { isDummyDataEnabled } from '@/lib/dummy-data'

const USE_DUMMY_DATA = isDummyDataEnabled()

interface Location {
  id: string
  name: string
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  lat?: number | null
  lng?: number | null
  createdAt?: string
  updatedAt?: string
}

interface LocationsMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext?: boolean
  hasPrev?: boolean
}

interface LocationsQuery {
  search?: string
  country?: string
  city?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: SortOrder
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useLocations(query: LocationsQuery) {
  return useQuery({
    queryKey: ['master-locations', query],
    queryFn: async (): Promise<{ data: Location[]; meta: LocationsMeta | null }> => {
      if (USE_DUMMY_DATA) {
        const data: Location[] = [
          { id: 'loc-1', name: 'Main Warehouse', address: '123 Main St', city: 'Karachi', state: 'Sindh', country: 'Pakistan', phone: '+92-21-1234567', email: 'main@company.com' },
          { id: 'loc-2', name: 'Production Floor A', address: '456 Production Ave', city: 'Lahore', state: 'Punjab', country: 'Pakistan' },
          { id: 'loc-3', name: 'Dispatch Dock', address: '789 Dispatch Rd', city: 'Karachi', state: 'Sindh', country: 'Pakistan' },
        ]
        return { data, meta: { total: data.length, page: 1, limit: 10, totalPages: 1 } }
      }

      const params: Record<string, string | number> = {
        page: query.page ?? 1,
        limit: query.limit ?? 10,
      }
      if (query.search) params.search = query.search
      if (query.country) params.country = query.country
      if (query.city) params.city = query.city
      if (query.sortBy) {
        params.sortBy = query.sortBy
        params.sortOrder = query.sortOrder ?? 'ASC'
      }

      const { data: response } = await apiClient.get('/locations', { params })
      // Backend ResponseInterceptor SPREADS paginated results to the top level:
      //   { success, message, data: [...], meta: {...} }
      // so `meta` sits alongside `data`, not nested under it. Fall back to a
      // nested shape just in case an endpoint returns { data: { data, meta } }.
      const list = Array.isArray(response?.data) ? response.data : (response?.data?.data ?? [])
      const meta = response?.meta ?? response?.data?.meta ?? null
      return { data: list, meta }
    },
    placeholderData: (prev) => prev,
  })
}

// Distinct Country / City options for the filter dropdowns, sourced from the
// lightweight dropdown endpoint (returns every location's city + country).
function useLocationFilterOptions() {
  return useQuery({
    queryKey: ['master-locations-filter-options'],
    queryFn: async (): Promise<{ countries: string[]; cities: string[] }> => {
      if (USE_DUMMY_DATA) {
        return { countries: ['Pakistan'], cities: ['Karachi', 'Lahore'] }
      }
      const { data: response } = await apiClient.get('/locations/dropdown')
      const list: Array<{ city?: string | null; country?: string | null }> =
        response?.data ?? response ?? []
      const countries = Array.from(
        new Set(list.map((l) => l.country).filter((c): c is string => !!c && c.trim() !== '')),
      ).sort()
      const cities = Array.from(
        new Set(list.map((l) => l.city).filter((c): c is string => !!c && c.trim() !== '')),
      ).sort()
      return { countries, cities }
    },
  })
}

function buildPayload(data: LocationForm) {
  // #13 — send an explicit `null` (not `undefined`) for cleared optional fields
  // so a value the user wiped is persisted as null instead of being omitted from
  // the payload (which would leave the old value untouched on the server).
  // #24 — `address` is now nullable, so send `null` when cleared (like the other
  // optional fields) so clearing it actually persists.
  const orNull = (v?: string) => (v && v.trim() !== '' ? v.trim() : null)
  return {
    name: data.name?.trim() ?? '',
    address: orNull(data.address),
    city: orNull(data.city),
    state: orNull(data.state),
    country: orNull(data.country),
    phone: orNull(data.phone),
    email: orNull(data.email),
    lat: data.lat != null && String(data.lat).trim() !== '' ? Number(data.lat) : null,
    lng: data.lng != null && String(data.lng).trim() !== '' ? Number(data.lng) : null,
  }
}

function useCreateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: LocationForm) => {
      if (USE_DUMMY_DATA) return { ...data, id: `loc-${Date.now()}` }
      const { data: response } = await apiClient.post('/locations', buildPayload(data))
      return response?.data ?? response
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['master-locations'] })
      await queryClient.invalidateQueries({ queryKey: ['master-locations-filter-options'] })
      toast.success('Location created')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Failed to create location'
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })
}

function useUpdateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LocationForm }) => {
      if (USE_DUMMY_DATA) return { ...data, id }
      const { data: response } = await apiClient.patch(`/locations/${id}`, buildPayload(data))
      return response?.data ?? response
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['master-locations'] })
      await queryClient.invalidateQueries({ queryKey: ['master-locations-filter-options'] })
      toast.success('Location updated')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Failed to update location'
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })
}

function useDeleteLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_DUMMY_DATA) return true
      await apiClient.delete(`/locations/${id}`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['master-locations'] })
      await queryClient.invalidateQueries({ queryKey: ['master-locations-filter-options'] })
      toast.success('Location deleted')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Failed to delete location'
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })
}

interface LocationForm {
  name: string
  address?: string
  city?: string
  state?: string
  country?: string
  phone?: string
  email?: string
  lat?: string
  lng?: string
}

const EMPTY_FORM: LocationForm = {
  name: '', address: '', city: '', state: '', country: '', phone: '', email: '', lat: '', lng: '',
}

export default function LocationsPage() {
  const confirm = useConfirm()

  // Server-side: search / sort / pagination + country / city filters map to
  // backend LocationsQueryDto params.
  const controller = useDataTable()

  const { data, isLoading, isError } = useLocations({ ...(controller.queryParams as any) })
  const { data: filterOptions } = useLocationFilterOptions()

  const locations: Location[] = data?.data ?? []
  const meta = data?.meta

  const countries = filterOptions?.countries ?? []
  const cities = filterOptions?.cities ?? []

  // Dialog state
  const [dialog, setDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; location: Location | null }>({
    open: false,
    mode: 'create',
    location: null,
  })
  const [viewLocation, setViewLocation] = useState<Location | null>(null)

  const createMutation = useCreateLocation()
  const updateMutation = useUpdateLocation()
  const deleteMutation = useDeleteLocation()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LocationForm>({
    defaultValues: EMPTY_FORM,
  })

  // Prefill (edit) or clear (create) the form whenever the dialog opens (#6, #25).
  useEffect(() => {
    if (!dialog.open) return
    if (dialog.mode === 'edit' && dialog.location) {
      reset({
        name: dialog.location.name ?? '',
        address: dialog.location.address ?? '',
        city: dialog.location.city ?? '',
        state: dialog.location.state ?? '',
        country: dialog.location.country ?? '',
        phone: dialog.location.phone ?? '',
        email: dialog.location.email ?? '',
        lat: dialog.location.lat != null ? String(dialog.location.lat) : '',
        lng: dialog.location.lng != null ? String(dialog.location.lng) : '',
      })
    } else {
      reset(EMPTY_FORM)
    }
  }, [dialog, reset])

  const openCreate = () => setDialog({ open: true, mode: 'create', location: null })
  const openEdit = (location: Location) => setDialog({ open: true, mode: 'edit', location })

  const onSubmit = async (formData: LocationForm) => {
    try {
      if (dialog.mode === 'edit' && dialog.location) {
        await updateMutation.mutateAsync({ id: dialog.location.id, data: formData })
      } else {
        await createMutation.mutateAsync(formData)
        // Clear any active search/filters so the newly created location is visible —
        // a leftover filter would hide it and show "No locations found".
        controller.setSearchInput('')
        controller.resetFilters()
      }
      setDialog({ open: false, mode: 'create', location: null })
      reset(EMPTY_FORM)
    } catch (error) {
      console.error('Failed to save location', error)
    }
  }

  const handleDelete = async (location: Location) => {
    if (await confirm({ title: 'Delete Location', description: `Are you sure you want to delete "${location.name}"?`, confirmLabel: 'Delete' })) {
      await deleteMutation.mutateAsync(location.id)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  // Country / City filter options come from the full-distinct dropdown endpoint
  // (better than page-derived), so they stay functional across pages.
  const filters: DataTableFilter<Location>[] = [
    {
      key: 'country',
      label: 'Country',
      searchable: countries.length > 12,
      options: countries.map((c) => ({ value: c, label: c })),
    },
    {
      key: 'city',
      label: 'City',
      searchable: cities.length > 12,
      options: cities.map((c) => ({ value: c, label: c })),
    },
  ]

  const columns: DataTableColumn<Location>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (loc) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <MapPin className="h-4 w-4 text-gray-400" />
          {loc.name}
        </span>
      ),
    },
    { key: 'city', header: 'City', sortable: true, render: (loc) => <span className="text-gray-600">{loc.city || '-'}</span> },
    { key: 'state', header: 'State', sortable: true, render: (loc) => <span className="text-gray-600">{loc.state || '-'}</span> },
    { key: 'country', header: 'Country', sortable: true, render: (loc) => <span className="text-gray-600">{loc.country || '-'}</span> },
    { key: 'phone', header: 'Phone', sortable: true, render: (loc) => <span className="text-gray-600">{loc.phone || '-'}</span> },
    { key: 'email', header: 'Email', sortable: true, render: (loc) => <span className="text-gray-600">{loc.email || '-'}</span> },
    {
      key: 'address',
      header: 'Address',
      sortable: true,
      render: (loc) => (
        <span className="block max-w-[220px] truncate text-gray-600" title={loc.address || ''}>
          {loc.address || '-'}
        </span>
      ),
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Locations</h2>
          <p className="text-gray-500">Master list of physical facility zones.</p>
        </div>
        <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Location
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Location>
            columns={columns}
            data={locations}
            meta={meta}
            controller={controller}
            rowKey={(loc) => loc.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load locations."
            searchable
            searchPlaceholder="Search locations..."
            filters={filters}
            pageSizeOptions
            emptyMessage="No locations found."
            actions={(loc) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setViewLocation(loc)} className="cursor-pointer">
                    <Eye className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(loc)} className="cursor-pointer">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(loc)}
                    className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </CardContent>
      </Card>

      {/* Add / Edit Location Dialog */}
      <Dialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}
      >
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog.mode === 'edit' ? 'Edit Location' : 'Add Location'}</DialogTitle>
            <DialogDescription>
              {dialog.mode === 'edit' ? 'Update this physical area.' : 'Define a new physical area.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                {...register('name', {
                  required: 'Name is required',
                  validate: (v) => (v && v.trim() !== '') || 'Name is required',
                })}
                placeholder="e.g. Main Warehouse"
              />
              {errors.name && <span className="text-sm text-red-500">{errors.name.message}</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} placeholder="e.g. Karachi" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State / Province</Label>
                <Input id="state" {...register('state')} placeholder="e.g. Sindh" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" {...register('country')} placeholder="e.g. Pakistan" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register('phone', {
                    pattern: {
                      value: /^[0-9+\-()\s]{7,20}$/,
                      message: 'Phone number is invalid',
                    },
                  })}
                  placeholder="e.g. +92-21-1234567"
                />
                {errors.phone && <span className="text-sm text-red-500">{errors.phone.message}</span>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email', {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                })}
                placeholder="e.g. location@company.com"
              />
              {errors.email && <span className="text-sm text-red-500">{errors.email.message}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} placeholder="e.g. 123 Main St" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  {...register('lat', {
                    validate: (v) =>
                      !v || String(v).trim() === '' || (Number(v) >= -90 && Number(v) <= 90) ||
                      'Latitude must be between -90 and 90',
                  })}
                  placeholder="e.g. 24.8607"
                />
                {errors.lat && <span className="text-sm text-red-500">{errors.lat.message}</span>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  {...register('lng', {
                    validate: (v) =>
                      !v || String(v).trim() === '' || (Number(v) >= -180 && Number(v) <= 180) ||
                      'Longitude must be between -180 and 180',
                  })}
                  placeholder="e.g. 67.0011"
                />
                {errors.lng && <span className="text-sm text-red-500">{errors.lng.message}</span>}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog({ open: false, mode: 'create', location: null })}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dialog.mode === 'edit' ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewLocation} onOpenChange={(open) => !open && setViewLocation(null)}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              {viewLocation?.name}
            </DialogTitle>
            <DialogDescription>Location details</DialogDescription>
          </DialogHeader>
          {viewLocation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 py-2 text-sm">
              <DetailRow label="City" value={viewLocation.city} />
              <DetailRow label="State / Province" value={viewLocation.state} />
              <DetailRow label="Country" value={viewLocation.country} />
              <DetailRow label="Phone" value={viewLocation.phone} />
              <DetailRow label="Email" value={viewLocation.email} />
              {/* #12 — surface the stored coordinates on the details screen. */}
              <DetailRow label="Latitude" value={viewLocation.lat != null ? String(viewLocation.lat) : null} />
              <DetailRow label="Longitude" value={viewLocation.lng != null ? String(viewLocation.lng) : null} />
              <DetailRow label="Address" value={viewLocation.address} className="sm:col-span-2" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewLocation(null)}>Close</Button>
            {viewLocation && (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  const loc = viewLocation
                  setViewLocation(null)
                  openEdit(loc)
                }}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailRow({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-gray-900 break-words">{value || '-'}</p>
    </div>
  )
}
