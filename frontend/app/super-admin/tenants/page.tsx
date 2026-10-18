'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Users, Mail, Phone, MapPin, Shield, AlertTriangle, CheckCircle, XCircle, Ban, Unlock, Database, User, Copy, Check, Power, PowerOff, Loader2, CalendarDays, Info, ImageIcon, RefreshCw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTenants, useTenant, useCreateTenant, useUpdateTenant, useDeleteTenant, useSuspendTenant, useUnsuspendTenant, useToggleTenantActive, Tenant, CreateTenantDto, UpdateTenantDto, useHardDeleteTenant, useTenantUserPassword, useTenantBranding, useUpdateTenantBranding, useUpdateTenantSchema, useUpdateAllTenantsSchema } from '@/hooks/useSuperAdmin'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import Image from 'next/image'
import { formatCurrency } from '@/lib/currency'

export default function TenantsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'inactive'>('all')
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [showStoredAdminPassword, setShowStoredAdminPassword] = useState(false)
  const [copiedTenantIdentifier, setCopiedTenantIdentifier] = useState<string | null>(null)
  const [copiedAdminPassword, setCopiedAdminPassword] = useState(false)
  const [togglingTenantId, setTogglingTenantId] = useState<string | null>(null)
  const [confirmSoftDeleteId, setConfirmSoftDeleteId] = useState<string | null>(null)
  const [confirmHardDelete, setConfirmHardDelete] = useState<{ id: string; name: string } | null>(null)
  const [hardDeleteText, setHardDeleteText] = useState('')
  const [editPrefilled, setEditPrefilled] = useState(false)
  const [brandingNameForm, setBrandingNameForm] = useState('')
  const [brandingLogoFile, setBrandingLogoFile] = useState<File | null>(null)
  const [brandingLogoPreview, setBrandingLogoPreview] = useState<string | null>(null)
  const [updatingSchemaTenantId, setUpdatingSchemaTenantId] = useState<string | null>(null)
  const [showUpdateAllSchemasDialog, setShowUpdateAllSchemasDialog] = useState(false)

  const [formData, setFormData] = useState<CreateTenantDto & UpdateTenantDto>({
    name: '',
    email: '',
    phone: '',
    address: '',
    subdomain: '',
    subscriptionType: 'MONTHLY',
    subscriptionStartDate: new Date().toISOString(),
    subscriptionEndDate: '',
    databaseUrl: '',
    adminEmail: '',
    adminPassword: '',
    isActive: true,
    isSuspended: false,
    suspensionReason: '',
  })

  const { data, isLoading, refetch } = useTenants({
    page: currentPage,
    limit: 10,
    search: searchTerm || undefined,
    isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
    isSuspended: statusFilter === 'suspended' ? true : undefined,
    subscriptionType: subscriptionFilter !== 'all' ? subscriptionFilter : undefined,
  })

  const createTenant = useCreateTenant()
  const updateTenant = useUpdateTenant()
  const deleteTenant = useDeleteTenant()
  const hardDeleteTenant = useHardDeleteTenant()
  const suspendTenant = useSuspendTenant()
  const unsuspendTenant = useUnsuspendTenant()
  const toggleTenantActive = useToggleTenantActive()
  const updateTenantSchema = useUpdateTenantSchema()
  const updateAllTenantsSchema = useUpdateAllTenantsSchema()

  const toArray = (value: any) => {
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.data)) return value.data
    if (Array.isArray(value?.data?.data)) return value.data.data
    return []
  }

  const tenants = toArray(data)
  const totalPages = data?.meta?.totalPages || 1

  const handleCreate = async () => {
    try {
      await createTenant.mutateAsync(formData)
      setShowAddDialog(false)
      resetForm()
      refetch()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleUpdate = async () => {
    if (!selectedTenant) return
    try {
      await updateTenant.mutateAsync({
        id: selectedTenant.id,
        data: formData,
      })
      const trimmedBrandingName = brandingNameForm.trim()
      const currentBrandingName =
        tenantBranding?.name ?? tenantDetails?.brandingName ?? selectedTenant.name ?? ''
      const brandingChanged =
        trimmedBrandingName !== currentBrandingName.trim() || !!brandingLogoFile

      if (brandingChanged) {
        await updateTenantBranding.mutateAsync({
          id: selectedTenant.id,
          brandingName: trimmedBrandingName,
          logo: brandingLogoFile ?? undefined,
        })
      }
      setShowEditDialog(false)
      resetForm()
      refetch()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleDelete = (id: string) => {
    setConfirmSoftDeleteId(id)
  }

  const handleHardDelete = (id: string, name: string) => {
    setConfirmHardDelete({ id, name })
    setHardDeleteText('')
  }

  const handleSuspend = async (id: string, reason?: string) => {
    try {
      await suspendTenant.mutateAsync({ id, reason })
      refetch()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleUnsuspend = async (id: string) => {
    try {
      await unsuspendTenant.mutateAsync(id)
      refetch()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleToggleActive = async (tenant: Tenant) => {
    try {
      setTogglingTenantId(tenant.id)
      await toggleTenantActive.mutateAsync({ id: tenant.id, isActive: !tenant.isActive })
      refetch()
    } catch (error) {
      // Error handled by mutation
    } finally {
      setTogglingTenantId(null)
    }
  }

  const handleUpdateSchema = async (tenantId: string) => {
    try {
      setUpdatingSchemaTenantId(tenantId)
      await updateTenantSchema.mutateAsync(tenantId)
      refetch()
    } catch (error) {
      // Error handled by mutation
    } finally {
      setUpdatingSchemaTenantId(null)
    }
  }

  const handleUpdateAllSchemas = async () => {
    try {
      const result = await updateAllTenantsSchema.mutateAsync()
      setShowUpdateAllSchemasDialog(false)
      refetch()
      
      // Show detailed results if available
      if (result && result.results) {
        const failedTenants = result.results.filter(r => !r.success)
        if (failedTenants.length > 0) {
          toast.error(
            `Some tenants failed to update: ${failedTenants.map(t => t.tenantName).join(', ')}`,
            { duration: 5000 }
          )
        }
      }
    } catch (error) {
      // Error handled by mutation
      setShowUpdateAllSchemasDialog(false)
    }
  }

  const handleBrandingLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setBrandingLogoFile(null)
      setBrandingLogoPreview(tenantBranding?.logoUrl ?? null)
      return
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PNG, JPEG, and WEBP files are allowed.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be smaller than 2 MB.')
      return
    }

    if (brandingLogoPreview && brandingLogoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(brandingLogoPreview)
    }

    setBrandingLogoFile(file)
    setBrandingLogoPreview(URL.createObjectURL(file))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      subdomain: '',
      subscriptionType: 'MONTHLY',
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: '',
      databaseUrl: '',
      adminEmail: '',
      adminPassword: '',
    })
    setSelectedTenant(null)
    if (brandingLogoPreview && brandingLogoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(brandingLogoPreview)
    }
    setBrandingNameForm('')
    setBrandingLogoFile(null)
    setBrandingLogoPreview(null)
  }

  const openEditDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || '',
      address: tenant.address || '',
      subdomain: tenant.subdomain || '',
      subscriptionType: tenant.subscriptionType,
      subscriptionStartDate: tenant.subscriptionStartDate,
      subscriptionEndDate: tenant.subscriptionEndDate || '',
      databaseUrl: '',
      adminEmail: '',
      adminPassword: '',
      isActive: tenant.isActive,
      isSuspended: tenant.isSuspended,
      suspensionReason: tenant.suspensionReason || '',
    })
    setEditPrefilled(false)
    setShowEditDialog(true)
  }

  // Fetch full tenant details (including decrypted DB URL and current admin email) when editing
  const { data: tenantDetails } = useTenant(selectedTenant?.id || '')
const { data: tenantPassword, isLoading: isPasswordLoading } = useTenantUserPassword(
  selectedTenant?.id,
  tenantDetails?.adminEmail,
)
const { data: tenantBranding } = useTenantBranding(selectedTenant?.id)
const updateTenantBranding = useUpdateTenantBranding()

  // When details arrive for current tenant and not yet applied, prefill DB/admin fields
  if (showEditDialog && selectedTenant && tenantDetails && !editPrefilled) {
    setFormData((prev) => ({
      ...prev,
      databaseUrl: tenantDetails.databaseUrlDecrypted || prev.databaseUrl || '',
      adminEmail: tenantDetails.adminEmail || prev.adminEmail || '',
    }))
    setEditPrefilled(true)
  }

useEffect(() => {
  if (showEditDialog && tenantBranding) {
    setBrandingNameForm(tenantBranding.name ?? '')
    setBrandingLogoFile(null)
    setBrandingLogoPreview(tenantBranding.logoUrl ?? null)
  }
}, [showEditDialog, tenantBranding])

useEffect(() => {
  return () => {
    if (brandingLogoPreview && brandingLogoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(brandingLogoPreview)
    }
  }
}, [brandingLogoPreview])

  const openDetailsDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setShowDetailsDialog(true)
  }

  const copyTenantIdentifier = (value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedTenantIdentifier(value)
    setTimeout(() => setCopiedTenantIdentifier(null), 2000)
    toast.success('Tenant identifier copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-gray-600 mt-2">Manage all your tenants and their subscriptions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/super-admin/tenants/deleted')}
            title="View deleted tenants"
          >
            View Deleted Tenants
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowUpdateAllSchemasDialog(true)}
            title="Update database schema for all active tenants"
            className="border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Update All Schemas
          </Button>
          <Button
            onClick={() => {
              resetForm()
              setShowAddDialog(true)
            }}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="factory-light-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10 factory-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="factory-input">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="factory-input">
                <SelectValue placeholder="Subscription Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
                <SelectItem value="PERMANENT">Permanent</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600 flex items-center">
              Total: {data?.meta?.total || 0} tenants
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card className="factory-light-card">
        <CardHeader>
          <CardTitle className="text-gray-900">Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No tenants found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="text-gray-700">Name</TableHead>
                      <TableHead className="text-gray-700">Email</TableHead>
                      <TableHead className="text-gray-700">Tenant IDs</TableHead>
                      <TableHead className="text-gray-700">Subscription</TableHead>
                      <TableHead className="text-gray-700">Status</TableHead>
                      <TableHead className="text-gray-700">Created</TableHead>
                      <TableHead className="text-right text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant: Tenant) => (
                      <TableRow key={tenant.id} className="border-gray-200 hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium text-gray-900">{tenant.name}</div>
                          {tenant.subdomain && (
                            <div className="text-sm text-gray-600">{tenant.subdomain}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">{tenant.email}</span>
                          </div>
                          {tenant.phone && (
                            <div className="flex items-center space-x-2 mt-1">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-600">{tenant.phone}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {tenant.shortTenantId && (
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-900 font-mono text-sm">{tenant.shortTenantId}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => copyTenantIdentifier(tenant.shortTenantId!)}
                                  title="Copy short tenant ID"
                                  aria-label="Copy short tenant ID"
                                >
                                  {copiedTenantIdentifier === tenant.shortTenantId ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-gray-500 hover:text-gray-900" />
                                  )}
                                </Button>
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-700 font-mono text-xs">{tenant.id.substring(0, 8)}...</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyTenantIdentifier(tenant.id)}
                                title="Copy tenant UUID"
                                aria-label="Copy tenant UUID"
                              >
                                {copiedTenantIdentifier === tenant.id ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3 text-gray-500 hover:text-gray-900" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              tenant.subscriptionType === 'PERMANENT'
                                ? 'bg-purple-100 text-purple-700 border-purple-200'
                                : tenant.subscriptionType === 'YEARLY'
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : tenant.subscriptionType === 'MONTHLY'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-orange-100 text-orange-700 border-orange-200'
                            }
                          >
                            {tenant.subscriptionType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tenant.isSuspended ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Suspended
                            </Badge>
                          ) : tenant.isActive ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {format(new Date(tenant.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDetailsDialog(tenant)}
                              title="View tenant details"
                              aria-label="View tenant details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(tenant)}
                              title="Edit tenant"
                              aria-label="Edit tenant"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!tenant.isSuspended && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(tenant)}
                                disabled={togglingTenantId === tenant.id && toggleTenantActive.isPending}
                                title={tenant.isActive ? 'Deactivate tenant' : 'Activate tenant'}
                                aria-label={tenant.isActive ? 'Deactivate tenant' : 'Activate tenant'}
                              >
                                {togglingTenantId === tenant.id && toggleTenantActive.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                ) : tenant.isActive ? (
                                  <PowerOff className="h-4 w-4 text-red-400" />
                                ) : (
                                  <Power className="h-4 w-4 text-green-400" />
                                )}
                              </Button>
                            )}
                            {tenant.isSuspended ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnsuspend(tenant.id)}
                                title="Unsuspend tenant"
                                aria-label="Unsuspend tenant"
                              >
                                <Unlock className="h-4 w-4 text-green-400" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSuspend(tenant.id)}
                                title="Suspend tenant"
                                aria-label="Suspend tenant"
                              >
                                <Ban className="h-4 w-4 text-red-400" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(tenant.id)}
                              title="Soft delete tenant"
                              aria-label="Soft delete tenant"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Hard delete tenant (wipe data)"
                              aria-label="Hard delete tenant (wipe data)"
                              onClick={() => handleHardDelete(tenant.id, tenant.name)}
                            >
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            </Button>
                            {tenant.isActive && !tenant.isSuspended && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateSchema(tenant.id)}
                                disabled={updatingSchemaTenantId === tenant.id && updateTenantSchema.isPending}
                                title="Update tenant database schema to latest version"
                                aria-label="Update tenant database schema"
                              >
                                {updatingSchemaTenantId === tenant.id && updateTenantSchema.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                                ) : (
                                  <Settings className="h-4 w-4 text-blue-400" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Tenant Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-visible">
          <DialogHeader>
            <DialogTitle>Add New Tenant</DialogTitle>
            <DialogDescription>Create a new tenant account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="factory-input"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="factory-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="factory-input"
                />
              </div>
              <div>
                <Label>Subdomain</Label>
                <Input
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                  className="factory-input"
                  placeholder="optional"
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="factory-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Subscription Type *</Label>
                <Select
                  value={formData.subscriptionType}
                  onValueChange={(value: any) => setFormData({ ...formData, subscriptionType: value })}
                >
                  <SelectTrigger className="factory-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                    <SelectItem value="PERMANENT">Permanent</SelectItem>
                    <SelectItem value="TRIAL">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="datetime-local"
                  value={formData.subscriptionStartDate ? new Date(formData.subscriptionStartDate).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, subscriptionStartDate: new Date(e.target.value).toISOString() })}
                  className="factory-input"
                />
              </div>
            </div>
            <div>
              <Label>End Date (Optional)</Label>
              <Input
                type="datetime-local"
                value={formData.subscriptionEndDate ? new Date(formData.subscriptionEndDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, subscriptionEndDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                className="factory-input"
              />
            </div>
            
            {/* Database Configuration Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Database className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Database Configuration</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Database Connection String *</Label>
                  <Textarea
                    value={formData.databaseUrl}
                    onChange={(e) => setFormData({ ...formData, databaseUrl: e.target.value })}
                    className="factory-input font-mono text-sm"
                    placeholder="postgresql://user:password@host:port/database?schema=public"
                    rows={3}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    ⚠️ Database must be created manually before provisioning. Provide the full PostgreSQL connection string.
                  </p>
                </div>
              </div>
            </div>

            {/* Admin User Credentials Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center space-x-2 mb-4">
                <User className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Admin User Credentials</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Admin Email *</Label>
                  <Input
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    className="factory-input"
                    placeholder="admin@tenant.com"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Email for the tenant admin user (will be created during provisioning)
                  </p>
                </div>
                <div>
                  <Label>Admin Password *</Label>
                  <div className="relative">
                    <Input
                      type={showAdminPassword ? 'text' : 'password'}
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      className="factory-input pr-10"
                      placeholder="Minimum 8 characters"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-900 focus:outline-none"
                    >
                      {showAdminPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Password for the tenant admin user (minimum 8 characters)
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createTenant.isPending || !formData.name || !formData.email || !formData.databaseUrl || !formData.adminEmail || !formData.adminPassword || formData.adminPassword.length < 8}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
            >
              {createTenant.isPending ? 'Provisioning...' : 'Create & Provision Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Soft Delete */}
      <Dialog open={!!confirmSoftDeleteId} onOpenChange={(open) => !open && setConfirmSoftDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tenant</DialogTitle>
            <DialogDescription>
              This will move the tenant to Deleted Tenants. You can restore it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSoftDeleteId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!confirmSoftDeleteId) return
                try {
                  await deleteTenant.mutateAsync(confirmSoftDeleteId)
                  toast.success('Tenant moved to Deleted Tenants')
                  refetch()
                } finally {
                  setConfirmSoftDeleteId(null)
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Hard Delete */}
      <Dialog open={!!confirmHardDelete} onOpenChange={(open) => !open && setConfirmHardDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanent Delete Tenant</DialogTitle>
            <DialogDescription>
              This will wipe all data in the tenant&apos;s database and remove it from the master database.
              Type DELETE to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Type DELETE to confirm</Label>
            <Input value={hardDeleteText} onChange={(e) => setHardDeleteText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmHardDelete(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={hardDeleteText !== 'DELETE' || !confirmHardDelete}
              onClick={async () => {
                if (!confirmHardDelete) return
                try {
                  await hardDeleteTenant.mutateAsync(confirmHardDelete.id)
                  toast.success('Tenant permanently deleted')
                  refetch()
                } finally {
                  setConfirmHardDelete(null)
                  setHardDeleteText('')
                }
              }}
            >
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Tenant Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-visible">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>Update tenant information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="factory-input"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="factory-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="factory-input"
                />
              </div>
              <div>
                <Label>Subdomain</Label>
                <Input
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                  className="factory-input"
                  placeholder="optional"
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="factory-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Subscription Type *</Label>
                <Select
                  value={formData.subscriptionType}
                  onValueChange={(value: any) => setFormData({ ...formData, subscriptionType: value })}
                >
                  <SelectTrigger className="factory-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                    <SelectItem value="PERMANENT">Permanent</SelectItem>
                    <SelectItem value="TRIAL">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="datetime-local"
                  value={formData.subscriptionStartDate ? new Date(formData.subscriptionStartDate).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, subscriptionStartDate: new Date(e.target.value).toISOString() })}
                  className="factory-input"
                />
              </div>
            </div>
            <div>
              <Label>End Date (Optional)</Label>
              <Input
                type="datetime-local"
                value={formData.subscriptionEndDate ? new Date(formData.subscriptionEndDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, subscriptionEndDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                className="factory-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={!!formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="suspended"
                  checked={!!formData.isSuspended}
                  onCheckedChange={(checked) => setFormData({ ...formData, isSuspended: !!checked })}
                />
                <Label htmlFor="suspended">Suspended</Label>
              </div>
            </div>
            {formData.isSuspended ? (
              <div>
                <Label>Suspension Reason</Label>
                <Input
                  value={formData.suspensionReason || ''}
                  onChange={(e) => setFormData({ ...formData, suspensionReason: e.target.value })}
                  className="factory-input"
                  placeholder="Reason for suspension"
                />
              </div>
            ) : null}
            {/* Database & Admin Credentials */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center space-x-2 mb-3">
                <Database className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Database Configuration</h3>
              </div>
              <Label>Database Connection String</Label>
              <Textarea
                value={formData.databaseUrl}
                onChange={(e) => setFormData({ ...formData, databaseUrl: e.target.value })}
                className="factory-input font-mono text-sm"
                placeholder="postgresql://user:password@host:port/database?schema=public"
                rows={3}
              />
              <p className="text-xs text-gray-600 mt-1">
                Changing this requires a valid, accessible database; the system will validate connectivity.
              </p>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center space-x-2 mb-3">
                <User className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Admin User Credentials</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Admin Email</Label>
                  <Input
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    className="factory-input"
                    placeholder="admin@tenant.com"
                  />
                </div>
                <div>
                  <Label>Admin Password</Label>
                  <div className="relative">
                    <Input
                      type={showAdminPassword ? 'text' : 'password'}
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      className="factory-input pr-10"
                      placeholder="Leave empty to keep existing"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-900 focus:outline-none"
                    >
                      {showAdminPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Only set if you want to change the admin password.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateTenant.isPending}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
            >
              {updateTenant.isPending ? 'Updating...' : 'Update Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">Name</Label>
                  <p className="text-gray-900">{selectedTenant.name}</p>
                </div>
                <div>
                  <Label className="text-gray-700">Email</Label>
                  <p className="text-gray-900">{selectedTenant.email}</p>
                </div>
                <div>
                  <Label className="text-gray-700">Phone</Label>
                  <p className="text-gray-900">{selectedTenant.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-700">Subdomain</Label>
                  <p className="text-gray-900">{selectedTenant.subdomain || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-700">Short Tenant ID</Label>
                  {selectedTenant.shortTenantId ? (
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-gray-900 font-mono text-sm">{selectedTenant.shortTenantId}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => copyTenantIdentifier(selectedTenant.shortTenantId!)}
                        title="Copy short tenant ID"
                      >
                        {copiedTenantIdentifier === selectedTenant.shortTenantId ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-500 hover:text-gray-900" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-gray-500 mt-1">-</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Share this 4-digit code with tenant users.</p>
                </div>
                <div>
                  <Label className="text-gray-700">Tenant UUID</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-gray-900 font-mono text-sm">{selectedTenant.id}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => copyTenantIdentifier(selectedTenant.id)}
                      title="Copy tenant UUID"
                    >
                      {copiedTenantIdentifier === selectedTenant.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-500 hover:text-gray-900" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Retained for internal tracking & migrations.</p>
                </div>
                <div>
                  <Label className="text-gray-700">Branding</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="h-12 w-12 flex items-center justify-center overflow-hidden">
                      {tenantBranding?.logoUrl ? (
                        <Image
                          src={tenantBranding.logoUrl}
                          alt={`${tenantBranding.name || selectedTenant.name} logo`}
                          width={48}
                          height={48}
                          className="object-contain h-full w-full"
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">{tenantBranding?.name || selectedTenant.name}</p>
                      {tenantBranding?.updatedAt && (
                        <p className="text-xs text-gray-500">
                          Updated {format(new Date(tenantBranding.updatedAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700">Admin Email</Label>
                  <p className="text-gray-900 mt-1">
                    {tenantDetails?.adminEmail || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-700">Admin Password (latest)</Label>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>Last updated by {tenantPassword?.lastUpdatedBy ?? 'N/A'}</span>
                    {tenantPassword?.lastUpdatedAt && (
                      <span>{format(new Date(tenantPassword.lastUpdatedAt), 'MMM dd, yyyy HH:mm')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type={showStoredAdminPassword ? 'text' : 'password'}
                      value={tenantPassword?.password ?? ''}
                      readOnly
                      disabled={isPasswordLoading}
                      className="factory-input font-mono"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowStoredAdminPassword((prev) => !prev)}
                      title={showStoredAdminPassword ? 'Hide password' : 'Show password'}
                    >
                      {showStoredAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!tenantPassword?.password}
                      onClick={() => {
                        if (!tenantPassword?.password) return
                        navigator.clipboard.writeText(tenantPassword.password)
                        setCopiedAdminPassword(true)
                        toast.success('Password copied to clipboard')
                        setTimeout(() => setCopiedAdminPassword(false), 2000)
                      }}
                      title="Copy password"
                    >
                      {copiedAdminPassword ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Password updates can be performed via the Edit Tenant dialog.
                  </p>
                </div>
                <div>
                  <Label className="text-gray-700">Database Name</Label>
                  <p className="text-gray-900 font-mono text-sm">{selectedTenant.databaseName}</p>
                </div>
                <div>
                  <Label className="text-gray-700">Status</Label>
                  <div className="mt-1">
                    {selectedTenant.isSuspended ? (
                      <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>
                    ) : selectedTenant.isActive ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 border-gray-200">Inactive</Badge>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-700">Address</Label>
                  <p className="text-gray-900">{selectedTenant.address || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-700">Subscription Type</Label>
                  <p className="text-gray-900">{selectedTenant.subscriptionType}</p>
                </div>
                <div>
                  <Label className="text-gray-700">Subscription Start</Label>
                  <p className="text-gray-900">{selectedTenant.subscriptionStartDate ? format(new Date(selectedTenant.subscriptionStartDate), 'MMM dd, yyyy HH:mm') : '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-700">Subscription End</Label>
                  <p className="text-gray-900">{selectedTenant.subscriptionEndDate ? format(new Date(selectedTenant.subscriptionEndDate), 'MMM dd, yyyy HH:mm') : '-'}</p>
                </div>
                {selectedTenant.isSuspended && (
                  <div className="col-span-2">
                    <Label className="text-gray-700">Suspension Reason</Label>
                    <p className="text-gray-900">{selectedTenant.suspensionReason || '-'}</p>
                  </div>
                )}
                <div>
                  <Label className="text-gray-700">Created</Label>
                  <p className="text-gray-900">{format(new Date(selectedTenant.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                <div>
                  <Label className="text-gray-700">Updated</Label>
                  <p className="text-gray-900">{format(new Date(selectedTenant.updatedAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>
              {selectedTenant.subscriptions && selectedTenant.subscriptions.length > 0 && (
                <div>
                  <Label className="text-gray-700">Subscriptions</Label>
                  <div className="mt-2 space-y-2">
                    {selectedTenant.subscriptions.map((sub: any) => (
                      <Card key={sub.id} className="bg-gray-50 p-3 border border-gray-200">
                        <div className="flex justify-between">
                          <span className="text-gray-900">{sub.type}</span>
                          <span className="text-green-600">{formatCurrency(Number(sub.amount))}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update All Schemas Confirmation Dialog */}
      <Dialog open={showUpdateAllSchemasDialog} onOpenChange={setShowUpdateAllSchemasDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update All Tenant Schemas</DialogTitle>
            <DialogDescription>
              This will update the database schema for all active tenants to the latest version.
              Pending migrations will be applied to each tenant database.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-medium text-gray-900 mb-1">What this does:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Runs pending Prisma migrations on each tenant database</li>
                  <li>Adds any missing tables (e.g., warehouse management tables)</li>
                  <li>Updates existing tables with new fields if needed</li>
                  <li>Only affects active tenants (suspended/inactive tenants are skipped)</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-medium text-yellow-700 mb-1">Important:</p>
                <p className="text-gray-600">
                  This process may take several minutes depending on the number of tenants.
                  Do not close this window or navigate away during the update.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateAllSchemasDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAllSchemas}
              disabled={updateAllTenantsSchema.isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {updateAllTenantsSchema.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating Schemas...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update All Schemas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

