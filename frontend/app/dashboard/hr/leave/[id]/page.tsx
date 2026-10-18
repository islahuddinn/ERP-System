'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import { DecideApprovalDialog } from '@/components/hr/leave/decide-approval-dialog'
import {
  useLeaveRequest,
  useDeleteLeaveRequest,
  LEAVE_STATUS_LABELS,
  LEAVE_DURATION_LABELS,
  LEAVE_APPROVAL_STATUS_LABELS,
  type LeaveRequest,
  type LeaveApprovalStatus,
  type LeaveRequestStatus,
} from '@/hooks/useLeaveRequests'
import { ArrowLeft, Loader2, CalendarClock, Check, X, Trash2 } from 'lucide-react'

const STATUS_BADGE_VARIANT: Record<LeaveRequestStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
}

const APPROVAL_BADGE_VARIANT: Record<LeaveApprovalStatus, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
}

function employeeName(leaveRequest: LeaveRequest): string {
  if (leaveRequest.employee.user) {
    return `${leaveRequest.employee.user.firstName} ${leaveRequest.employee.user.lastName}`
  }
  return leaveRequest.employee.employeeCode
}

export default function LeaveRequestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const leaveRequestId = params?.id as string
  const { data: leaveRequest, isLoading } = useLeaveRequest(leaveRequestId)
  const { hasPermission } = usePermissionCheck()
  const deleteMutation = useDeleteLeaveRequest()

  const [decision, setDecision] = useState<Extract<LeaveApprovalStatus, 'APPROVED' | 'REJECTED'> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const canApprove = hasPermission('leave-requests.approve')

  const handleDeleteConfirmed = async () => {
    try {
      await deleteMutation.mutateAsync(leaveRequestId)
      router.push('/dashboard/hr/leave')
    } finally {
      setConfirmDelete(false)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="leave-requests.view">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!leaveRequest) {
    return (
      <ProtectedRoute requiredPermission="leave-requests.view">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Leave request not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/leave')}>
            Back to Leave Requests
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  const isPending = leaveRequest.status === 'PENDING'

  return (
    <ProtectedRoute requiredPermission="leave-requests.view">
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
                <CalendarClock className="h-8 w-8 text-green-600" />
                {employeeName(leaveRequest)}
              </h1>
              <p className="text-gray-600 mt-1">
                {format(new Date(leaveRequest.startDate), 'MMM d, yyyy')} –{' '}
                {format(new Date(leaveRequest.endDate), 'MMM d, yyyy')} ({leaveRequest.totalDays} days)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canApprove && isPending && (
              <>
                <Button
                  onClick={() => setDecision('APPROVED')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="mr-2 h-4 w-4" /> Approve
                </Button>
                <Button
                  onClick={() => setDecision('REJECTED')}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <X className="mr-2 h-4 w-4" /> Reject
                </Button>
              </>
            )}
            {isPending && (
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                className="border-gray-300 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            )}
            <ViewHistoryButton entityName="LeaveRequest" entityId={leaveRequestId} size="default" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Employee</p>
              <p className="font-medium">{employeeName(leaveRequest)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Employee Code</p>
              <p className="font-medium">{leaveRequest.employee.employeeCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <Badge variant={STATUS_BADGE_VARIANT[leaveRequest.status]}>
                {LEAVE_STATUS_LABELS[leaveRequest.status]}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Start Date</p>
              <p className="font-medium">{format(new Date(leaveRequest.startDate), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">End Date</p>
              <p className="font-medium">{format(new Date(leaveRequest.endDate), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total Days</p>
              <p className="font-medium">{leaveRequest.totalDays}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Duration Type</p>
              <p className="font-medium">{LEAVE_DURATION_LABELS[leaveRequest.durationType]}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Payment</p>
              <Badge variant={leaveRequest.isPaid ? 'default' : 'outline'}>
                {leaveRequest.isPaid ? 'Paid' : 'Unpaid'}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Requested By</p>
              <p className="font-medium">
                {leaveRequest.createdBy
                  ? `${leaveRequest.createdBy.firstName} ${leaveRequest.createdBy.lastName}`
                  : '—'}
              </p>
            </div>
            <div className="md:col-span-3">
              <p className="text-muted-foreground text-xs">Reason</p>
              <p className="font-medium">
                {leaveRequest.reason || <span className="text-gray-400">—</span>}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaveRequest.approvals.length === 0 && (
              <p className="text-sm text-gray-500">No approvers assigned.</p>
            )}
            {leaveRequest.approvals.map((approval) => (
              <div
                key={approval.id}
                className="flex items-start justify-between gap-4 rounded-md border border-gray-200 p-3"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {approval.approver
                      ? `${approval.approver.firstName} ${approval.approver.lastName}`
                      : 'Unknown user'}
                  </p>
                  {approval.approver && (
                    <p className="text-xs text-gray-400">{approval.approver.email}</p>
                  )}
                  {approval.remarks && (
                    <p className="text-sm text-gray-600 mt-1">“{approval.remarks}”</p>
                  )}
                  {approval.decidedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      Decided {format(new Date(approval.decidedAt), 'MMM d, yyyy p')}
                    </p>
                  )}
                </div>
                <Badge variant={APPROVAL_BADGE_VARIANT[approval.status]}>
                  {LEAVE_APPROVAL_STATUS_LABELS[approval.status]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <DecideApprovalDialog
        leaveRequestId={decision ? leaveRequestId : null}
        decision={decision}
        onOpenChange={(open) => !open && setDecision(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Leave Request"
        description="Are you sure you want to delete this leave request? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(false)}
      />
    </ProtectedRoute>
  )
}
