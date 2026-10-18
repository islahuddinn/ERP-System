'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useWorkOrders, type WorkOrder } from '@/hooks/useWorkOrders'
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
    parseISO
} from 'date-fns'

export default function WorkOrderSchedulePage() {
    const router = useRouter()
    const [currentMonth, setCurrentMonth] = useState(new Date())

    // Fetch work orders
    const { data: workOrdersData, isLoading } = useWorkOrders({ limit: 200 })
    const workOrders = workOrdersData?.data || []

    // Calendar generation logic
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    // Navigation
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
    const jumpToToday = () => setCurrentMonth(new Date())

    const getOrdersForDay = (day: Date) => {
        return workOrders.filter((wo: WorkOrder) => {
            const start = wo.startDate ? parseISO(wo.startDate) : null
            const due = wo.dueDate ? parseISO(wo.dueDate) : null
            return (start && isSameDay(start, day)) || (due && isSameDay(due, day))
        })
    }

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            DRAFT: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200',
            SCHEDULED: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200',
            IN_PROGRESS: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200',
            COMPLETED: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200',
            CANCELLED: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200',
        }
        return colors[status] || colors.DRAFT
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

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
        <ProtectedRoute>
            <div className="factory-section">
                <div className="factory-page-container">

                    <div className="flex flex-col space-y-4">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Work Order Schedule</h1>
                                <p className="text-gray-500 mt-1">Monthly maintenance and repair overview</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button onClick={jumpToToday} variant="outline" size="sm">
                                    Today
                                </Button>
                                <div className="flex items-center bg-white border border-gray-200 rounded-md shadow-sm">
                                    <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9">
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="px-4 font-semibold min-w-[140px] text-center">
                                        {format(currentMonth, 'MMMM yyyy')}
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9">
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button
                                    onClick={() => router.push('/dashboard/work-orders/create')}
                                    className="bg-green-600 hover:bg-green-700 ml-2"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Order
                                </Button>
                            </div>
                        </div>

                        {/* Box Calendar Grid */}
                        <Card className="bg-white border text-gray-900 border-gray-200 shadow-sm overflow-hidden">
                            {/* Days Header */}
                            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                                {weekDays.map(day => (
                                    <div key={day} className="py-2.5 text-center text-sm font-semibold text-gray-500">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)]">
                                {calendarDays.map((day, dayIdx) => {
                                    const orders = getOrdersForDay(day)
                                    const isCurrentMonth = isSameMonth(day, monthStart)
                                    const isDayToday = isToday(day)

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={`
                                                relative border-b border-r border-gray-100 p-2 min-h-[120px] transition-colors
                                                ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'bg-white'}
                                                ${isDayToday ? 'bg-green-50/50' : ''}
                                                hover:bg-gray-50
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span
                                                    className={`
                                                        text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                                        ${isDayToday ? 'bg-green-600 text-white' : 'text-gray-700'}
                                                    `}
                                                >
                                                    {format(day, 'd')}
                                                </span>
                                                {orders.length > 0 && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5">
                                                        {orders.length}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="space-y-1.5">
                                                {orders.slice(0, 3).map((wo: WorkOrder) => (
                                                    <div
                                                        key={wo.id}
                                                        onClick={() => router.push(`/dashboard/work-orders/${wo.id}`)}
                                                        className={`
                                                            text-xs px-2 py-1.5 rounded cursor-pointer border truncate
                                                            ${getStatusColor(wo.status)}
                                                        `}
                                                        title={wo.title}
                                                    >
                                                        <span className="font-semibold mr-1.5">{wo.orderNumber}</span>
                                                        {wo.title}
                                                    </div>
                                                ))}
                                                {orders.length > 3 && (
                                                    <div className="text-xs text-center text-gray-500 font-medium py-1 hover:text-green-600 cursor-pointer">
                                                        + {orders.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </ProtectedRoute>
    )
}
