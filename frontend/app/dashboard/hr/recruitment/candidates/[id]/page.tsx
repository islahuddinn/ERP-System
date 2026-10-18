'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, User, Edit, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { ApplicationStageBadge } from '@/components/hr/recruitment/RecruitmentBadges'
import { recruitmentUserName } from '@/hooks/useRecruitmentShared'
import {
  useCandidate,
  useDeleteCandidate,
  candidateFullName,
  type Candidate,
  type CandidateApplicationRef,
} from '@/hooks/useCandidates'
import type { ApplicationStage } from '@/hooks/useApplications'

const LIST = '/dashboard/hr/recruitment?tab=candidates'

export default function CandidateDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const { data: candidate, isLoading } = useCandidate(id)
  const deleteMutation = useDeleteCandidate()
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

  if (!candidate) {
    return (
      <ProtectedRoute requiredPermission="hr.view_recruitment">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Candidate not found</p>
          <Button variant="outline" onClick={() => router.push(LIST)}>
            Back to Candidates
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  const applications = candidate.applications ?? []

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
                <User className="h-8 w-8 text-green-600" />
                {candidateFullName(candidate)}
              </h1>
              <p className="text-gray-600 mt-1">{candidate.email}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/hr/recruitment/candidates/${id}/edit`)}
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
            <ViewHistoryButton entityName="Candidate" entityId={id} size="default" />
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab candidate={candidate} />
          </TabsContent>
          <TabsContent value="applications">
            <ApplicationsTab
              applications={applications}
              onOpen={(applicationId) =>
                router.push(`/dashboard/hr/recruitment/applications/${applicationId}`)
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Candidate"
        description="Are you sure you want to delete this candidate? This action cannot be undone."
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
      <p className="font-medium text-gray-900 break-words">{value}</p>
    </div>
  )
}

function OverviewTab({ candidate }: { candidate: Candidate }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidate Profile</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <Field label="First Name" value={candidate.firstName} />
        <Field label="Last Name" value={candidate.lastName} />
        <Field label="Email" value={candidate.email} />
        <Field label="Phone" value={candidate.phone || '—'} />
        <Field label="Source" value={candidate.source || '—'} />
        <Field
          label="Resume"
          value={
            candidate.resumeUrl ? (
              <a
                href={candidate.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 underline"
              >
                View resume
              </a>
            ) : (
              '—'
            )
          }
        />
        <Field label="Added By" value={recruitmentUserName(candidate.creator)} />
        <Field
          label="Created"
          value={candidate.createdAt ? format(new Date(candidate.createdAt), 'MMM d, yyyy') : '—'}
        />
        <Field
          label="Last Updated"
          value={candidate.updatedAt ? format(new Date(candidate.updatedAt), 'MMM d, yyyy') : '—'}
        />
      </CardContent>
    </Card>
  )
}

function ApplicationsTab({
  applications,
  onOpen,
}: {
  applications: CandidateApplicationRef[]
  onOpen: (applicationId: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications</CardTitle>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="text-sm text-gray-500">This candidate has not applied to any roles yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requisition</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application) => (
                <TableRow
                  key={application.id}
                  className="cursor-pointer"
                  onClick={() => onOpen(application.id)}
                >
                  <TableCell className="font-medium">
                    {application.requisition?.title ?? '—'}
                  </TableCell>
                  <TableCell>
                    <ApplicationStageBadge stage={application.stage as ApplicationStage} />
                  </TableCell>
                  <TableCell className="text-gray-600">{application.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
