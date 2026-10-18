'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useCreateWorkOrder, type WorkOrderPriority } from '@/hooks/useWorkOrders'
import { usePlants } from '@/hooks/usePlants'
import { useUsers, type User } from '@/hooks/useUsers'
import { useProductionOrders, type ProductionOrder } from '@/hooks/useProductionOrders'
import { ArrowLeft, Loader2, ClipboardList, Save, Calendar as CalendarIcon } from 'lucide-react'

interface WorkOrderFormData {
    title: string
    description?: string
    priority: WorkOrderPriority
    plantId: string
    productionOrderId: string
    assignedToId?: string
    dueDate: string
}

export default function CreateWorkOrderPage() {
    const router = useRouter()
    const createMutation = useCreateWorkOrder()

    // Fetch plants for selection
    const { data: plantsResponse } = usePlants({ limit: 100 })
    const plants = useMemo(() => {
        if (!plantsResponse) return []
        const rawData = (plantsResponse as any).data ?? plantsResponse
        return Array.isArray(rawData) ? rawData : []
    }, [plantsResponse])

    // Fetch production orders to link work order
    const { data: productionOrdersResponse } = useProductionOrders({ page: 1, limit: 100 } as any)
    const productionOrders = useMemo<ProductionOrder[]>(() => {
        if (!productionOrdersResponse) return []
        const raw = (productionOrdersResponse as any).data ?? productionOrdersResponse
        return Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : []
    }, [productionOrdersResponse])

    // Fetch real users for assignment (active only)
    const { data: usersResponse } = useUsers({ limit: 100, status: 'ACTIVE' })
    const users = useMemo<User[]>(() => {
        const raw = usersResponse as any
        const data = raw?.data ?? raw
        return Array.isArray(data) ? data : []
    }, [usersResponse])

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<WorkOrderFormData>({
        defaultValues: {
            title: '',
            description: '',
            priority: 'MEDIUM',
            plantId: '',
            productionOrderId: '',
            assignedToId: undefined,
            dueDate: '',
        },
    })

    // Register productionOrderId with validation so we don't hit the backend
    // with an empty or invalid value.
    useEffect(() => {
        register('productionOrderId', {
            required: 'Production order is required',
        })
    }, [register])

    const onSubmit = async (data: WorkOrderFormData) => {
        try {
            if (!data.productionOrderId) {
                // Extra safety: prevent bad request if somehow no production order is selected
                toast.error('Please select a production order')
                return
            }

            const dueDateIso = data.dueDate
                ? new Date(data.dueDate).toISOString()
                : new Date().toISOString()

            // Backend expects CreateWorkOrderDto shape
            const backendPayload = {
                productionOrderId: data.productionOrderId,
                title: data.title.trim(),
                description: data.description?.trim() || undefined,
                // Work orders in DB start in SCHEDULED state; UI can still treat them as drafts
                status: 'SCHEDULED',
                priority: data.priority,
                scheduledStartDate: dueDateIso,
                scheduledEndDate: dueDateIso,
                assignedToId: data.assignedToId === 'none' ? undefined : data.assignedToId,
                notes: undefined as string | undefined,
            }

            await createMutation.mutateAsync(backendPayload)
            toast.success('Work order created successfully')
            router.push('/dashboard/work-orders')
        } catch (error: any) {
            console.error('Error creating work order:', error)
            toast.error(error.response?.data?.message || 'Failed to create work order')
        }
    }

    const isLoading = createMutation.isPending

    return (
        <ProtectedRoute>
            <div className="factory-section">
                <div className="factory-page-container">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => router.push('/dashboard/work-orders')}
                                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <ClipboardList className="h-8 w-8 text-green-600" />
                                    Create Work Order
                                </h1>
                                <p className="text-gray-600 mt-1">Create a new maintenance or repair task</p>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="space-y-6">
                                    {/* Basic Information */}
                                    <Card className="bg-white border border-gray-200 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="text-gray-900">Task Details</CardTitle>
                                            <CardDescription>Describe the work required</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <Label htmlFor="productionOrderId" className="text-gray-700 font-medium">
                                                    Production Order <span className="text-red-500">*</span>
                                                </Label>
                                                <Select
                                                    value={watch('productionOrderId')}
                                                    onValueChange={(value) =>
                                                        setValue('productionOrderId', value, {
                                                            shouldValidate: true,
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                                        <SelectValue placeholder="Select production order" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Array.isArray(productionOrders) &&
                                                            productionOrders.map((order) => (
                                                                <SelectItem key={order.id} value={order.id || ''}>
                                                                    {order.orderNumber} – {order.product?.name || 'Unknown'}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                                {errors.productionOrderId && (
                                                    <p className="text-sm text-red-600 mt-1">
                                                        {errors.productionOrderId.message}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <Label htmlFor="title" className="text-gray-700 font-medium">
                                                    Title <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="title"
                                                    {...register('title', {
                                                        required: 'Title is required',
                                                        minLength: { value: 3, message: 'Title must be at least 3 characters' }
                                                    })}
                                                    placeholder="e.g. Broken Conveyor Belt Repair"
                                                    className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                />
                                                {errors.title && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                                                )}
                                            </div>

                                            <div>
                                                <Label htmlFor="description" className="text-gray-700 font-medium">
                                                    Description
                                                </Label>
                                                <Textarea
                                                    id="description"
                                                    {...register('description')}
                                                    placeholder="Provide detailed instructions..."
                                                    rows={6}
                                                    className="mt-1.5 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="priority" className="text-gray-700 font-medium">
                                                    Priority <span className="text-red-500">*</span>
                                                </Label>
                                                <Select
                                                    value={watch('priority')}
                                                    onValueChange={(value) => setValue('priority', value as WorkOrderPriority)}
                                                >
                                                    <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                                        <SelectValue placeholder="Select priority" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="LOW">Low</SelectItem>
                                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                                        <SelectItem value="HIGH">High</SelectItem>
                                                        <SelectItem value="URGENT">Urgent</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-6">
                                    {/* Assignment & Location */}
                                    <Card className="bg-white border border-gray-200 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="text-gray-900">Assignment & Location</CardTitle>
                                            <CardDescription>Where and who needs to do the work</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <Label htmlFor="plantId" className="text-gray-700 font-medium">
                                                    Plant <span className="text-red-500">*</span>
                                                </Label>
                                                <Select
                                                    value={watch('plantId')}
                                                    onValueChange={(value) => setValue('plantId', value, { shouldValidate: true })}
                                                >
                                                    <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                                        <SelectValue placeholder="Select plant" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Array.isArray(plants) && plants.map((plant) => (
                                                            <SelectItem key={plant.id} value={plant.id}>
                                                                {plant.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {errors.plantId && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.plantId.message}</p>
                                                )}
                                            </div>

                                            <div>
                                                <Label htmlFor="assignedToId" className="text-gray-700 font-medium">
                                                    Assigned To
                                                </Label>
                                                <Select
                                                    value={watch('assignedToId') || 'none'}
                                                    onValueChange={(value) => setValue('assignedToId', value === 'none' ? undefined : value)}
                                                >
                                                    <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                                        <SelectValue placeholder="Unassigned" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Unassigned</SelectItem>
                                                        {Array.isArray(users) &&
                                                            users.map((user) => (
                                                                <SelectItem key={user.id} value={user.id}>
                                                                    {user.name} ({user.email})
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Label htmlFor="dueDate" className="text-gray-700 font-medium">
                                                    Due Date
                                                </Label>
                                                <div className="relative mt-1.5">
                                                    <Input
                                                        type="date"
                                                        id="dueDate"
                                                        {...register('dueDate')}
                                                        className="h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                    />
                                                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Summary Card */}
                                    <Card className="bg-green-50 border border-green-200 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="text-gray-900">Summary</CardTitle>
                                            <CardDescription>Review before creating</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Priority:</span>
                                                <span className="font-medium text-gray-900">{watch('priority')}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Plant:</span>
                                                <span className="font-medium text-gray-900">
                                                    {plants.find(p => p.id === watch('plantId'))?.name || 'Not selected'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Assignee:</span>
                                                <span className="font-medium text-gray-900">
                                                    {watch('assignedToId') && watch('assignedToId') !== 'none'
                                                        ? Array.isArray(users)
                                                            ? users.find(u => u.id === watch('assignedToId'))?.name
                                                            : 'Unassigned'
                                                        : 'Unassigned'}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push('/dashboard/work-orders')}
                                    disabled={isLoading}
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Create Work Order
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}
