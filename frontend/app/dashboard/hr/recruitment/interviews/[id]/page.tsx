'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, CalendarClock, Edit, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { recruitmentUserName } from '@/hooks/useRecruitmentShared'
import { useInterview, useDeleteInterview } from '@/hooks/useInterviews'
import { candidateFullName } from '@/hooks/useCandidates'

const LIST = '/dashboard/hr/recruitment?tab=interviews'

export default function InterviewDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const { data: interview, isLoading } = useInterview(id)
  const deleteMutation = useDeleteInterview()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id)
      router.push(LIST)
    } finally {
      setConfirmDelete(false)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="hr.view_recruitment">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!interview) {
    return (
      <ProtectedRoute requiredPermission="hr.view_recruitment">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Interview not found</p>
          <Button variant="outline" onClick={() => router.push(LIST)}>
            Back to Interviews
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  const candidate = interview.application?.candidate

  return (
    <ProtectedRoute requiredPermission="hr.view_recruitment">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
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
                {candidate ? candidateFullName(candidate) : 'Interview'}
              </h1>
              <p className="text-gray-600 mt-1">
                {interview.interviewType} ·{' '}
                {interview.interviewDate
                  ? format(new Date(interview.interviewDate), 'MMM d, yyyy p')
                  : '—'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/hr/recruitment/interviews/${id}/edit`)}
              className="border-gray-300"
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
            <ViewHistoryButton entityName="Interview" entityId={id} size="default" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Interview Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <Field label="Candidate" value={candidate ? candidateFullName(candidate) : '—'} />
            <Field label="Requisition" value={interview.application?.requisition?.title ?? '—'} />
            <Field label="Interviewer" value={recruitmentUserName(interview.interviewer)} />
            <Field label="Type" value={interview.interviewType} />
            <Field
              label="Date & Time"
              value={
                interview.interviewDate
                  ? format(new Date(interview.interviewDate), 'MMM d, yyyy p')
                  : '—'
              }
            />
            <Field label="Result" value={interview.result || '—'} />
            <div className="md:col-span-3">
              <p className="text-muted-foreground text-xs">Feedback</p>
              <p className="font-medium text-gray-900 whitespace-pre-line">
                {interview.feedback || '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Interview"
        description="Are you sure you want to delete this interview? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </ProtectedRoute>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  )
}
