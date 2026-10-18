'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/ui/confirm-provider'
import {
  Plus,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  MapPin,
  ChevronRight,
  Network,
  Power,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import {
  useSites,
  useSiteTree,
  useUpdateSiteStatus,
  useDeleteSite,
  type Site,
  type SiteType,
  type SiteCategory,
  type SiteStatus,
} from '@/hooks/useSites'

const SITE_TYPES: SiteType[] = ['WAREHOUSE', 'ZONE', 'UNIT', 'PLANT', 'WORKSHOP', 'ROOM', 'STORAGE', 'AREA']
const SITE_CATEGORIES: SiteCategory[] = [
  'RAW_MATERIAL', 'WORK_IN_PROGRESS', 'FINISHED_GOODS', 'PACKAGING',
  'SPARE_PARTS', 'CONSUMABLES', 'REJECTED', 'QUARANTINE', 'HAZARDOUS', 'GENERAL',
]
const SITE_STATUSES: SiteStatus[] = ['ACTIVE', 'INACTIVE', 'QUARANTINE', 'UNDER_MAINTENANCE', 'FULL']

const STATUS_COLORS: Record<SiteStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
  QUARANTINE: 'bg-yellow-100 text-yellow-800',
  UNDER_MAINTENANCE: 'bg-orange-100 text-orange-800',
  FULL: 'bg-red-100 text-red-800',
}

const TYPE_COLORS: Record<SiteType, string> = {
  WAREHOUSE: 'bg-blue-100 text-blue-800',
  ZONE: 'bg-purple-100 text-purple-800',
  UNIT: 'bg-cyan-100 text-cyan-800',
  PLANT: 'bg-emerald-100 text-emerald-800',
  WORKSHOP: 'bg-amber-100 text-amber-800',
  ROOM: 'bg-pink-100 text-pink-800',
  STORAGE: 'bg-indigo-100 text-indigo-800',
  AREA: 'bg-teal-100 text-teal-800',
}

function fmt(val: string) {
  return val.replace(/_/g, ' ')
}

// ─── Tree view (feature: nested site hierarchy) ──────────────────────────────

function SiteTreeNode({ node }: { node: Site }) {
  const children = node.children ?? []
  const hasChildren = children.length > 0
  const [open, setOpen] = useState(true)

  return (
    <li>
      <div className="oc-node rounded-lg border border-gray-200 bg-white shadow-sm px-3 py-2 min-w-[180px] hover:border-green-300 hover:shadow transition-colors">
        <div className="flex items-center justify-center gap-1.5">
          <MapPin className="h-4 w-4 text-green-600 shrink-0" />
          <span className="font-semibold text-gray-900 text-sm whitespace-nowrap">{node.name}</span>
          <span className="font-mono text-[11px] text-gray-500 whitespace-nowrap">{node.code}</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${TYPE_COLORS[node.type]}`}>
            {fmt(node.type)}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[node.status]}`}>
            {fmt(node.status)}
          </span>
        </div>
        {node.location && (
          <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-gray-500 whitespace-nowrap">
            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
            {node.location.name}
            {node.location.address ? ` · ${node.location.address}` : ''}
          </p>
        )}
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800"
            aria-label={open ? 'Collapse children' : 'Expand children'}
          >
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
            {children.length} child{children.length !== 1 ? 'ren' : ''}
          </button>
        )}
      </div>
      {hasChildren && open && (
        <ul>
          {children.map(child => (
            <SiteTreeNode key={child.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  )
}

function SiteTreeTab() {
  const { data: tree = [], isLoading, isError } = useSiteTree()

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Site Hierarchy</h3>
        </div>
        <p className="text-sm text-gray-500">Top-down view of parent sites and their nested child sites.</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading tree...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">Failed to load site tree.</div>
        ) : tree.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Network className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="font-medium">No sites to display</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="oc-tree">
              {tree.map(node => (
                <ul key={node.id}>
                  <SiteTreeNode node={node} />
                </ul>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SitesPage() {
  const router = useRouter()
  const confirm = useConfirm()
  const controller = useDataTable()

  const [statusDialog, setStatusDialog] = useState<{ open: boolean; site: Site | null }>({ open: false, site: null })
  const [newStatus, setNewStatus] = useState<SiteStatus>('ACTIVE')

  // Server-side: search / sort / pagination + type / category / status filters
  // all map to backend SitesQueryDto params.
  const { data, isLoading, isError } = useSites({ ...(controller.queryParams as any) })

  const updateStatus = useUpdateSiteStatus()
  const deleteSite = useDeleteSite()

  const sites: Site[] = data?.data ?? []
  const meta = data?.meta

  const openStatusDialog = (site: Site) => {
    setNewStatus(site.status)
    setStatusDialog({ open: true, site })
  }

  const handleStatusSave = async () => {
    if (!statusDialog.site) return
    try {
      await updateStatus.mutateAsync({ siteId: statusDialog.site.id, status: newStatus })
      setStatusDialog({ open: false, site: null })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status')
    }
  }

  const handleDelete = async (site: Site) => {
    if (!(await confirm({ title: 'Deactivate Site', description: `Deactivate site "${site.name}"? This sets it to INACTIVE.`, confirmLabel: 'Deactivate' }))) return
    try {
      await deleteSite.mutateAsync(site.id)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to deactivate site')
    }
  }

  const handleActivate = async (site: Site) => {
    if (!(await confirm({ title: 'Activate Site', description: `Activate site "${site.name}"? This sets it to ACTIVE.`, confirmLabel: 'Activate' }))) return
    try {
      await updateStatus.mutateAsync({ siteId: site.id, status: 'ACTIVE' })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to activate site')
    }
  }

  const filters: DataTableFilter<Site>[] = [
    {
      key: 'type',
      label: 'Type',
      options: SITE_TYPES.map(t => ({ value: t, label: fmt(t) })),
    },
    {
      key: 'category',
      label: 'Category',
      searchable: true,
      options: SITE_CATEGORIES.map(c => ({ value: c, label: fmt(c) })),
    },
    {
      key: 'status',
      label: 'Status',
      options: SITE_STATUSES.map(s => ({ value: s, label: fmt(s) })),
    },
  ]

  const columns: DataTableColumn<Site>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (s) => <span className="font-mono text-sm text-gray-600">{s.code}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (s) => <span className="font-medium text-gray-900">{s.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      sortKey: 'type',
      render: (s) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[s.type]}`}>
          {fmt(s.type)}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      sortKey: 'category',
      render: (s) => <span className="text-sm text-gray-600">{fmt(s.category)}</span>,
    },
    {
      key: 'parent',
      header: 'Parent',
      sortable: true,
      sortKey: 'parent.name',
      render: (s) => <span className="text-sm text-gray-500">{s.parent ? s.parent.name : '—'}</span>,
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      sortKey: 'location.name',
      render: (s) => <span className="text-sm text-gray-600">{s.location?.name ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortKey: 'status',
      render: (s) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s.status]}`}>
          {fmt(s.status)}
        </span>
      ),
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Sites</h2>
          <p className="text-gray-500">Manage storage locations, warehouses, zones, and other sites.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/sites/create')}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Site
        </Button>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="bg-gray-100 border border-gray-200">
          <TabsTrigger
            value="list"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-green-700 data-[state=active]:shadow-sm"
          >
            List
          </TabsTrigger>
          <TabsTrigger
            value="tree"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-green-700 data-[state=active]:shadow-sm"
          >
            Tree
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-0">
          <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
            <CardContent className="p-4">
              <DataTable<Site>
                columns={columns}
                data={sites}
                meta={meta}
                controller={controller}
                rowKey={(s) => s.id}
                isLoading={isLoading}
                isError={isError}
                errorMessage="Failed to load sites."
                searchable
                searchPlaceholder="Search name or code..."
                filters={filters}
                pageSizeOptions
                emptyMessage="No sites found. Try adjusting filters or add a new site."
                actions={(site) => (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/sites/${site.id}`)}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/sites/${site.id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openStatusDialog(site)}>
                        <MapPin className="mr-2 h-4 w-4" /> Change Status
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {site.status === 'INACTIVE' ? (
                        <DropdownMenuItem
                          className="text-green-600 focus:text-green-600"
                          onClick={() => handleActivate(site)}
                        >
                          <Power className="mr-2 h-4 w-4" /> Activate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDelete(site)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Deactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tree" className="mt-0">
          <SiteTreeTab />
        </TabsContent>
      </Tabs>

      {/* Status Change Dialog */}
      <Dialog open={statusDialog.open} onOpenChange={open => setStatusDialog(s => ({ ...s, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Site Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Site: <span className="font-medium">{statusDialog.site?.name}</span>
            </p>
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={v => setNewStatus(v as SiteStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  {SITE_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{fmt(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog({ open: false, site: null })}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleStatusSave}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
