'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { ModuleStatusTabs } from '@/components/ui/module-status-tabs'
import { useDataTable } from '@/hooks/useDataTable'
import { useUrlStatusTabs, useListQueryParams } from '@/hooks/useUrlStatusTabs'
import { normalizeWorkOrderListStatus } from '@/lib/list-status-filters'
import { useWorkOrders, type WorkOrder } from '@/hooks/useWorkOrders'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RefreshCw, Factory, Calendar, Plus, Clock, CheckCircle, Ban, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

const BASE_PATH = '/dashboard/work-orders'

const STATUS_TABS = [
  { value: 'all', label: 'All Orders' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Canceled' },
]

export default function WorkOrdersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const controller = useDataTable({ initialLimit: 20 })

  const statusTabs = useUrlStatusTabs({
    basePath: BASE_PATH,
    normalizeValue: (raw) => normalizeWorkOrderListStatus(raw) ?? raw,
  })

  const queryParams = useListQueryParams(controller, statusTabs)

  const { data, isLoading, isError } = useWorkOrders(queryParams as Parameters<typeof useWorkOrders>[0])
  const workOrders = data?.data ?? []
  const meta = data?.meta

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['work-orders'] })
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { className: string; icon: typeof Clock; label: string }> = {
      DRAFT: { className: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock, label: 'Draft' },
      SCHEDULED: { className: 'bg-blue-100 text-blue-700 border-blue-200', icon: Calendar, label: 'Scheduled' },
      IN_PROGRESS: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: RefreshCw, label: 'In Progress' },
      COMPLETED: { className: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Completed' },
      CANCELLED: { className: 'bg-red-100 text-red-700 border-red-200', icon: Ban, label: 'Canceled' },
    }
    const style = styles[status] || styles.DRAFT
    const Icon = style.icon
    return (
      <Badge className={`flex items-center gap-1 w-fit font-medium ${style.className}`}>
        <Icon className="h-3 w-3" />
        {style.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-50 text-gray-600 border-gray-200',
      MEDIUM: 'bg-blue-50 text-blue-600 border-blue-200',
      HIGH: 'bg-orange-50 text-orange-600 border-orange-200',
      URGENT: 'bg-red-50 text-red-600 border-red-200',
    }
    return (
      <Badge variant="outline" className={colors[priority] || colors.LOW}>
        {priority}
      </Badge>
    )
  }

  const filters: DataTableFilter<WorkOrder>[] = [
    {
      key: 'priority',
      label: 'Priority',
      options: [
        { value: 'LOW', label: 'Low' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'HIGH', label: 'High' },
        { value: 'URGENT', label: 'Urgent' },
      ],
    },
  ]

  const columns: DataTableColumn<WorkOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      render: (wo) => <span className="font-mono font-medium text-gray-900">{wo.orderNumber}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      render: (wo) => (
        <div className="font-medium text-gray-900">
          {wo.title}
          {wo.machine && <div className="text-xs text-gray-500 mt-0.5">Machine: {wo.machine.name}</div>}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (wo) => (
        <div className="flex items-center gap-1 text-gray-600">
          <Factory className="h-3 w-3 text-gray-400" />
          {wo.plant?.name}
        </div>
      ),
    },
    {
      key: 'assignedToName',
      header: 'Assigned To',
      render: (wo) => <span className="text-gray-600">{wo.assignedToName || '-'}</span>,
    },
    { key: 'status', header: 'Status', render: (wo) => getStatusBadge(wo.status) },
    { key: 'priority', header: 'Priority', render: (wo) => getPriorityBadge(wo.priority) },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (wo) =>
        wo.dueDate ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400" />
            {format(new Date(wo.dueDate), 'MMM dd')}
          </div>
        ) : (
          <span className="text-gray-600">-</span>
        ),
    },
  ]

  return (
    <ProtectedRoute>
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <ClipboardList className="h-8 w-8 text-green-600" />
                  Work Orders
                </h1>
                <p className="text-gray-600 mt-1">Manage maintenance and repair tasks</p>
              </div>
              <Link href="/dashboard/work-orders/create">
                <Button className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Work Order
                </Button>
              </Link>
            </div>

            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="pb-3">
                <ModuleStatusTabs
                  value={statusTabs.value}
                  onChange={statusTabs.onChange}
                  tabs={STATUS_TABS}
                />
              </CardHeader>
              <CardContent className="pt-0 p-4">
                <DataTable<WorkOrder>
                  columns={columns}
                  data={workOrders}
                  meta={meta}
                  controller={controller}
                  rowKey={(wo) => wo.id}
                  isLoading={isLoading}
                  isError={isError}
                  searchable
                  searchPlaceholder="Search order #, title…"
                  filters={filters}
                  pageSizeOptions
                  emptyMessage="No work orders found"
                  onRowClick={(wo) => router.push(`/dashboard/work-orders/${wo.id}`)}
                  toolbarRight={
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
