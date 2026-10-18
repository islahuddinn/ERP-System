'use client'

import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { useShift } from '@/hooks/useShifts'
import { ArrowLeft, Edit, Loader2, Clock, Users } from 'lucide-react'

export default function ShiftDetailPage() {
  const router = useRouter()
  const params = useParams()
  const shiftId = params?.id as string
  const { data: shift, isLoading } = useShift(shiftId)

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="shifts.view">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!shift) {
    return (
      <ProtectedRoute requiredPermission="shifts.view">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Shift not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/shifts')}>
            Back to Shifts
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="shifts.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Clock className="h-8 w-8 text-green-600" />
                {shift.name}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-1">
                <Users className="h-4 w-4" /> {shift._count?.employees ?? 0} employees assigned
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/hr/shifts/${shiftId}/edit`)}
              className="border-gray-300"
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <ViewHistoryButton entityName="Shift" entityId={shiftId} size="default" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Shift Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Name</p>
              <p className="font-medium">{shift.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Type</p>
              <Badge variant={shift.type === 'FIXED' ? 'default' : 'secondary'}>{shift.type}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Start Time</p>
              <p className="font-medium font-mono">{shift.startTime}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">End Time</p>
              <p className="font-medium font-mono">{shift.endTime}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Crosses Midnight</p>
              <p className="font-medium">{shift.crossesMidnight ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Grace Period</p>
              <p className="font-medium">
                {shift.type === 'FIXED' ? (
                  shift.graceMinutes === null || shift.graceMinutes === undefined ? (
                    <span className="text-gray-400">Not set</span>
                  ) : (
                    `${shift.graceMinutes} min`
                  )
                ) : (
                  <span className="text-gray-400">N/A (flexible)</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Employees Assigned</p>
              <Badge variant="secondary">{shift._count?.employees ?? 0}</Badge>
            </div>
            <div className="md:col-span-2">
              <p className="text-muted-foreground text-xs">Description</p>
              <p className="font-medium">{shift.description || <span className="text-gray-400">—</span>}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Created</p>
              <p className="font-medium">{format(new Date(shift.createdAt), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last Updated</p>
              <p className="font-medium">{format(new Date(shift.updatedAt), 'MMM d, yyyy')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
