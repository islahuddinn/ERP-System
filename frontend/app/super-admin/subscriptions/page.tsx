'use client'

import { useState } from 'react'
import { Plus, Search, Edit, Trash2, X, CreditCard, Calendar, DollarSign, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/currency'
import { useSubscriptions, useCreateSubscription, useUpdateSubscription, useCancelSubscription, useTenants, Subscription } from '@/hooks/useSuperAdmin'
import { format } from 'date-fns'

export default function SubscriptionsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)

  const [formData, setFormData] = useState({
    tenantId: '',
    type: 'MONTHLY' as const,
    startDate: new Date().toISOString(),
    endDate: '',
    amount: '',
    currency: 'USD',
    notes: '',
  })

  const toArray = (value: any) => {
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.data)) return value.data
    if (Array.isArray(value?.data?.data)) return value.data.data
    return []
  }

  const { data: tenantsData } = useTenants({ limit: 1000 })
  const tenants = toArray(tenantsData)

  const { data, isLoading, refetch } = useSubscriptions({
    page: currentPage,
    limit: 10,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const createSubscription = useCreateSubscription()
  const updateSubscription = useUpdateSubscription()
  const cancelSubscription = useCancelSubscription()

  const subscriptions = toArray(data)
  const totalPages = data?.meta?.totalPages || 1

  const handleCreate = async () => {
    try {
      await createSubscription.mutateAsync({
        ...formData,
        amount: Number(formData.amount),
        endDate: formData.endDate || undefined,
      })
      setShowAddDialog(false)
      resetForm()
      refetch()
    } catch (error) {}
  }

  const handleCancel = async (id: string) => {
    if (confirm('Are you sure you want to cancel this subscription?')) {
      try {
        await cancelSubscription.mutateAsync(id)
        refetch()
      } catch (error) {}
    }
  }

  const resetForm = () => {
    setFormData({
      tenantId: '',
      type: 'MONTHLY',
      startDate: new Date().toISOString(),
      endDate: '',
      amount: '',
      currency: 'USD',
      notes: '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-gray-600 mt-2">Manage tenant subscriptions</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowAddDialog(true)
          }}
          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Subscription
        </Button>
      </div>

      <Card className="factory-light-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 factory-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="factory-input">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600 flex items-center">
              Total: {data?.meta?.total || 0} subscriptions
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="factory-light-card">
        <CardHeader>
          <CardTitle className="text-gray-900">Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No subscriptions found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="text-gray-700">Tenant</TableHead>
                      <TableHead className="text-gray-700">Type</TableHead>
                      <TableHead className="text-gray-700">Amount</TableHead>
                      <TableHead className="text-gray-700">Period</TableHead>
                      <TableHead className="text-gray-700">Status</TableHead>
                      <TableHead className="text-right text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((subscription: Subscription) => (
                      <TableRow key={subscription.id} className="border-gray-200 hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {subscription.tenant?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-600">{subscription.tenant?.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge>{subscription.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {formatCurrency(Number(subscription.amount))}
                          </div>
                          <div className="text-sm text-gray-600">{subscription.currency}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-700">
                            {format(new Date(subscription.startDate), 'MMM dd, yyyy')}
                          </div>
                          {subscription.endDate && (
                            <div className="text-sm text-gray-600">
                              to {format(new Date(subscription.endDate), 'MMM dd, yyyy')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              subscription.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : subscription.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : subscription.status === 'EXPIRED'
                                ? 'bg-orange-100 text-orange-700 border-orange-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }
                          >
                            {subscription.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {subscription.status === 'ACTIVE' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancel(subscription.id)}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

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

      {/* Add Subscription Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tenant *</Label>
              <Select value={formData.tenantId} onValueChange={(value) => setFormData({ ...formData, tenantId: value })}>
                <SelectTrigger className="factory-input">
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant: any) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type *</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
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
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="factory-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="datetime-local"
                  value={formData.startDate ? new Date(formData.startDate).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value).toISOString() })}
                  className="factory-input"
                />
              </div>
              <div>
                <Label>End Date (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.endDate ? new Date(formData.endDate).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  className="factory-input"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createSubscription.isPending}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
            >
              {createSubscription.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

