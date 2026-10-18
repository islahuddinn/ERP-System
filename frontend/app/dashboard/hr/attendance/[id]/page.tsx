'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { CheckOutDialog } from '@/components/hr/attendance/check-out-dialog'
import {
  useAttendanceRecord,
  formatTime12h,
  ATTENDANCE_STATUS_LABELS,
  WORK_MODE_LABELS,
  ATTENDANCE_SOURCE_LABELS,
  type AttendanceDetail,
} from '@/hooks/useAttendance'
import { ArrowLeft, Edit, Loader2, CalendarCheck, LogOut } from 'lucide-react'

// Formats a raw minute count as "Xh Ym" (e.g. 135 -> "2h 15m"), collapsing to
// "Ym" when under an hour (e.g. 45 -> "45m") and "Xh" on a whole hour (#27).
function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '—'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

function employeeName(record: AttendanceDetail): string {
  if (record.employee.user) {
    return `${record.employee.user.firstName} ${record.employee.user.lastName}`
  }
  return record.employee.employeeCode
}

function userName(user: { firstName: string; lastName: string } | null): string {
  return user ? `${user.firstName} ${user.lastName}` : '—'
}

export default function AttendanceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const attendanceId = params?.id as string
  const { data: record, isLoading } = useAttendanceRecord(attendanceId)
  const [checkOutOpen, setCheckOutOpen] = useState(false)

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="attendance.view_all">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!record) {
    return (
      <ProtectedRoute requiredPermission="attendance.view_all">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Attendance record not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/attendance')}>
            Back to Attendance
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="attendance.view_all">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/hr/attendance')}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <CalendarCheck className="h-8 w-8 text-green-600" />
                {employeeName(record)}
              </h1>
              <p className="text-gray-600 mt-1">
                {format(new Date(record.date), 'EEEE, MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!record.checkOut && (
              <Button
                variant="outline"
                onClick={() => setCheckOutOpen(true)}
                className="border-gray-300"
              >
                <LogOut className="mr-2 h-4 w-4" /> Check out
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/hr/attendance/${attendanceId}/edit`)}
              className="border-gray-300"
            >
              <Edit className="mr-2 h-4 w-4" /> Correct
            </Button>
            <ViewHistoryButton entityName="Attendance" entityId={attendanceId} size="default" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Employee Code</p>
              <p className="font-medium">{record.employee.employeeCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Shift</p>
              <p className="font-medium">{record.shift?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <Badge variant="secondary">{ATTENDANCE_STATUS_LABELS[record.status]}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Check-in</p>
              <p className="font-medium font-mono">{formatTime12h(record.checkIn)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Check-out</p>
              <p className="font-medium font-mono">{formatTime12h(record.checkOut)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Worked</p>
              <p className="font-medium">{formatMinutes(record.workedMinutes)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Late</p>
              <p className="font-medium">{formatMinutes(record.lateMinutes)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Early Exit</p>
              <p className="font-medium">{formatMinutes(record.earlyExitMinutes)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Overtime</p>
              <p className="font-medium">{formatMinutes(record.overtimeMinutes)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Work Mode</p>
              <p className="font-medium">{WORK_MODE_LABELS[record.workMode]}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Source</p>
              <p className="font-medium">{ATTENDANCE_SOURCE_LABELS[record.source]}</p>
            </div>
            <div className="md:col-span-3">
              <p className="text-muted-foreground text-xs">Notes</p>
              <p className="font-medium">
                {record.notes || <span className="text-gray-400">—</span>}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Recorded By</p>
              <p className="font-medium">{userName(record.createdBy)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last Updated By</p>
              <p className="font-medium">{userName(record.updatedBy)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last Updated</p>
              <p className="font-medium">{format(new Date(record.updatedAt), 'MMM d, yyyy p')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <CheckOutDialog
        attendanceId={checkOutOpen ? attendanceId : null}
        onOpenChange={(open) => setCheckOutOpen(open)}
        onDone={() => setCheckOutOpen(false)}
      />
    </ProtectedRoute>
  )
}
