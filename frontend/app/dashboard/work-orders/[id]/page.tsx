'use client'

import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useWorkOrder, useUpdateWorkOrder, type WorkOrder } from '@/hooks/useWorkOrders'
import { ArrowLeft, Loader2, Factory, Calendar, User, Clock, CheckCircle, Ban, AlertTriangle, Printer, Play, CheckSquare } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

export default function WorkOrderDetailsPage() {
    const router = useRouter()
    const params = useParams()
    const orderId = (params?.id as string) || ''

    const { data: workOrder, isLoading } = useWorkOrder(orderId)
    const updateMutation = useUpdateWorkOrder()

    const handleStatusUpdate = async (newStatus: WorkOrder['status']) => {
        try {
            await updateMutation.mutateAsync({
                id: orderId,
                data: { status: newStatus }
            })
            toast.success(`Work Order updated to ${newStatus}`)
        } catch (error) {
            console.error('Error updating work order status:', error)
            toast.error('Failed to update status')
        }
    }

    if (isLoading) {
        return (
            <ProtectedRoute>
                <div className="flex items-center justify-center h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                </div>
            </ProtectedRoute>
        )
    }

    if (!workOrder) {
        return (
            <ProtectedRoute>
                <div className="flex flex-col items-center justify-center h-screen">
                    <h1 className="text-2xl font-bold text-gray-900">Work Order Not Found</h1>
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/dashboard/work-orders')}
                        className="mt-4 text-green-600 hover:text-green-700"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Work Orders
                    </Button>
                </div>
            </ProtectedRoute>
        )
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { className: string; icon: any; label: string }> = {
            DRAFT: { className: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock, label: 'Draft' },
            SCHEDULED: { className: 'bg-blue-100 text-blue-700 border-blue-200', icon: Calendar, label: 'Scheduled' },
            IN_PROGRESS: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertTriangle, label: 'In Progress' },
            COMPLETED: { className: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Completed' },
            CANCELLED: { className: 'bg-red-100 text-red-700 border-red-200', icon: Ban, label: 'Cancelled' },
        }
        const style = styles[status] || styles.DRAFT
        const Icon = style.icon

        return (
            <Badge className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium ${style.className}`}>
                <Icon className="h-4 w-4" />
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

    return (
        <ProtectedRoute>
            <div className="factory-section">
                <div className="factory-page-container">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => router.push('/dashboard/work-orders')}
                                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                </Button>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                        {workOrder.orderNumber}
                                    </h1>
                                    <p className="text-gray-600 text-sm mt-0.5">
                                        Created on {format(new Date(workOrder.createdAt), 'MMMM dd, yyyy')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {workOrder.status === 'DRAFT' && (
                                    <Button
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => handleStatusUpdate('SCHEDULED')}
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Schedule
                                    </Button>
                                )}
                                {workOrder.status === 'SCHEDULED' && (
                                    <Button
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleStatusUpdate('IN_PROGRESS')}
                                    >
                                        <Play className="mr-2 h-4 w-4" />
                                        Start Work
                                    </Button>
                                )}
                                {workOrder.status === 'IN_PROGRESS' && (
                                    <Button
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleStatusUpdate('COMPLETED')}
                                    >
                                        <CheckSquare className="mr-2 h-4 w-4" />
                                        Complete
                                    </Button>
                                )}
                                {(workOrder.status === 'SCHEDULED' || workOrder.status === 'IN_PROGRESS') && (
                                    <Button
                                        variant="outline"
                                        className="text-red-600 border-red-300 hover:bg-red-50"
                                        onClick={() => handleStatusUpdate('CANCELLED')}
                                        disabled={updateMutation.isPending}
                                    >
                                        <Ban className="mr-2 h-4 w-4" />
                                        Cancel
                                    </Button>
                                )}
                                <Button variant="outline" className="text-gray-600">
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Overview */}
                                <Card className="bg-white border border-gray-200 shadow-sm">
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-xl text-gray-900">{workOrder.title}</CardTitle>
                                                <CardDescription className="mt-1">Work Order Overview</CardDescription>
                                            </div>
                                            {getStatusBadge(workOrder.status)}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                                            <p className="text-gray-900 whitespace-pre-wrap">{workOrder.description || 'No description provided.'}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500 mb-1">Priority</h3>
                                                {getPriorityBadge(workOrder.priority)}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500 mb-1">Due Date</h3>
                                                <div className="flex items-center text-gray-900">
                                                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                    {workOrder.dueDate ? format(new Date(workOrder.dueDate), 'MMM dd, yyyy') : 'Not set'}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Location & Assignment */}
                                <Card className="bg-white border border-gray-200 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-base text-gray-900">Context</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Location</h3>
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-gray-100 rounded-lg">
                                                    <Factory className="h-5 w-5 text-gray-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{workOrder.plant?.name || 'N/A'}</div>
                                                    <div className="text-sm text-gray-500">{workOrder.plant?.code}</div>
                                                    {workOrder.productionLine && (
                                                        <div className="text-sm text-gray-500 mt-0.5">{workOrder.productionLine.name}</div>
                                                    )}
                                                    {workOrder.machine && (
                                                        <div className="text-sm text-gray-500 mt-0.5">Machine: {workOrder.machine.name}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100">
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Assigned To</h3>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 rounded-full">
                                                    <User className="h-5 w-5 text-gray-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{workOrder.assignedToName || 'Unassigned'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Timeline (Placeholder) */}
                                <Card className="bg-white border border-gray-200 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-base text-gray-900">Timeline</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex gap-3">
                                                <div className="mt-1">
                                                    <div className="h-2 w-2 rounded-full bg-green-500 ring-4 ring-green-100" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">Created</div>
                                                    <div className="text-xs text-gray-500">{format(new Date(workOrder.createdAt), 'MMM dd, HH:mm')}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}
