'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, MapPin, Loader2, Network, Thermometer, Droplets, Boxes } from 'lucide-react'
import { useSite, type SiteStatus, type SiteType } from '@/hooks/useSites'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { apiClient } from '@/lib/api-client'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
  QUARANTINE: 'bg-yellow-100 text-yellow-800',
  UNDER_MAINTENANCE: 'bg-orange-100 text-orange-800',
  FULL: 'bg-red-100 text-red-800',
}

const TYPE_COLORS: Record<string, string> = {
  WAREHOUSE: 'bg-blue-100 text-blue-800',
  ZONE: 'bg-purple-100 text-purple-800',
  UNIT: 'bg-cyan-100 text-cyan-800',
  PLANT: 'bg-emerald-100 text-emerald-800',
  WORKSHOP: 'bg-amber-100 text-amber-800',
  ROOM: 'bg-pink-100 text-pink-800',
  STORAGE: 'bg-indigo-100 text-indigo-800',
  AREA: 'bg-teal-100 text-teal-800',
}

const fmt = (v?: string | null) => (v ? v.replace(/_/g, ' ') : '—')
const formatDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value ?? '—'}</p>
    </div>
  )
}

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: site, isLoading, isError } = useSite(id)

  // #32 — the Site API returns only managerId (no manager relation), so resolve
  // the manager's name from the users dropdown on the client.
  const { data: users = [] } = useQuery({
    queryKey: ['users-dropdown'],
    queryFn: async () => {
      const { data: res } = await apiClient.get('/users/dropdown')
      const d = res?.data?.data ?? res?.data ?? res
      return (Array.isArray(d) ? d : []) as Array<{ id: string; name: string }>
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (isError || !site) {
    return (
      <div className="p-8 text-center text-gray-500">
        <MapPin className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <p className="font-medium">Site not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/sites')}>
          Back to Sites
        </Button>
      </div>
    )
  }

  const s = site as typeof site & {
    location?: { id: string; name: string }
    manager?: { id: string; name: string }
  }

  // #32 — prefer a manager relation if the API ever returns one, otherwise map the
  // managerId to its user name from the dropdown.
  const managerName =
    s.manager?.name ?? users.find(u => u.id === site.managerId)?.name ?? null

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-green-600" /> {site.name}
          </h1>
          <p className="text-gray-600 mt-1 font-mono text-sm">{site.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${TYPE_COLORS[site.type as SiteType] ?? 'bg-gray-100 text-gray-700'}`}>
            {fmt(site.type)}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${STATUS_COLORS[site.status as SiteStatus] ?? 'bg-gray-100 text-gray-700'}`}>
            {fmt(site.status)}
          </span>
          <ViewHistoryButton entityName="Site" entityId={site.id} size="default" />
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => router.push(`/dashboard/sites/${site.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
        </div>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader><CardTitle className="text-base">Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Type" value={fmt(site.type)} />
            <Field label="Category" value={fmt(site.category)} />
            <Field label="Status" value={fmt(site.status)} />
            <Field
              label="Parent Site"
              value={
                site.parent ? (
                  <button
                    className="text-green-700 hover:underline"
                    onClick={() => router.push(`/dashboard/sites/${site.parent!.id}`)}
                  >
                    {site.parent.name} <span className="font-mono text-xs text-gray-500">({site.parent.code})</span>
                  </button>
                ) : (
                  <span className="text-gray-400">No parent (top-level)</span>
                )
              }
            />
            <Field label="Location" value={s.location?.name ?? (site.locationId ? <span className="font-mono text-xs">{site.locationId}</span> : '—')} />
            <Field label="Manager" value={managerName ?? (site.managerId ? <span className="text-gray-400">Unknown manager</span> : '—')} />
          </div>
        </CardContent>
      </Card>

      {/* Capacity & environment */}
      <Card>
        <CardHeader><CardTitle className="text-base">Capacity &amp; Environment</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field
              label="Total Capacity"
              value={
                site.totalCapacity != null ? (
                  <span className="inline-flex items-center gap-1"><Boxes className="h-3.5 w-3.5 text-gray-400" />{site.totalCapacity} {fmt(site.capacityUnit)}</span>
                ) : '—'
              }
            />
            <Field
              label="Temperature"
              value={site.temperature != null ? <span className="inline-flex items-center gap-1"><Thermometer className="h-3.5 w-3.5 text-gray-400" />{site.temperature}°C</span> : '—'}
            />
            <Field
              label="Humidity"
              value={site.humidity != null ? <span className="inline-flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-gray-400" />{site.humidity}%</span> : '—'}
            />
            <Field label="Child Sites" value={<span className="inline-flex items-center gap-1"><Network className="h-3.5 w-3.5 text-gray-400" />{site.children?.length ?? 0}</span>} />
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      {site.description && (
        <Card>
          <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-800 whitespace-pre-wrap">{site.description}</p></CardContent>
        </Card>
      )}

      {/* Meta */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Field label="Created" value={formatDate(site.createdAt)} />
            <Field label="Updated" value={formatDate(site.updatedAt)} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
