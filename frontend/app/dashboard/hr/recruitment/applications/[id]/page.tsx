'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, FileSpreadsheet, Edit, ArrowRightLeft, Loader2 } from 'lucide-react'
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
import { MoveStageDialog } from '@/components/hr/recruitment/MoveStageDialog'
import { recruitmentUserName } from '@/hooks/useRecruitmentShared'
import {
  useApplication,
  useDeleteApplication,
  allowedNextStages,
  type Application,
} from '@/hooks/useApplications'
import { candidateFullName } from '@/hooks/useCandidates'

const LIST = '/dashboard/hr/recruitment?tab=applications'

export default function ApplicationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const { data: application, isLoading } = useApplication(id)
  const deleteMutation = useDeleteApplication()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)

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

  if (!application) {
    return (
      <ProtectedRoute requiredPermission="hr.view_recruitment">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Application not found</p>
          <Button variant="outline" onClick={() => router.push(LIST)}>
            Back to Applications
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  const interviews = application.interviews ?? []
  const offers = application.offers ?? []
  const canMove = allowedNextStages(application.stage).length > 0

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
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                {application.candidate ? candidateFullName(application.candidate) : 'Application'}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <span>{application.requisition?.title ?? '—'}</span>
                <span>•</span>
                <ApplicationStageBadge stage={application.stage} />
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canMove && (
              <Button
                onClick={() => setMoveOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" /> Move Stage
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/hr/recruitment/applications/${id}/edit`)}
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
            <ViewHistoryButton entityName="Application" entityId={id} size="default" />
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="interviews">Interviews ({interviews.length})</TabsTrigger>
            <TabsTrigger value="offers">Offers ({offers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab application={application} />
          </TabsContent>
          <TabsContent value="interviews">
            <InterviewsTab
              application={application}
              onOpen={(interviewId) =>
                router.push(`/dashboard/hr/recruitment/interviews/${interviewId}`)
              }
            />
          </TabsContent>
          <TabsContent value="offers">
            <OffersTab
              application={application}
              onOpen={(offerId) => router.push(`/dashboard/hr/recruitment/offers/${offerId}`)}
            />
          </TabsContent>
        </Tabs>
      </div>

      <MoveStageDialog
        applicationId={id}
        currentStage={application.stage}
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Application"
        description="Are you sure you want to delete this application? This action cannot be undone."
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

function OverviewTab({ application }: { application: Application }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <Field
          label="Candidate"
          value={application.candidate ? candidateFullName(application.candidate) : '—'}
        />
        <Field label="Candidate Email" value={application.candidate?.email ?? '—'} />
        <Field label="Requisition" value={application.requisition?.title ?? '—'} />
        <Field label="Stage" value={<ApplicationStageBadge stage={application.stage} />} />
        <Field label="Status" value={application.status} />
        <Field label="Created By" value={recruitmentUserName(application.creator)} />
        <Field
          label="Applied"
          value={application.createdAt ? format(new Date(application.createdAt), 'MMM d, yyyy') : '—'}
        />
        <Field
          label="Last Updated"
          value={application.updatedAt ? format(new Date(application.updatedAt), 'MMM d, yyyy') : '—'}
        />
        <div className="md:col-span-3">
          <p className="text-muted-foreground text-xs">Notes</p>
          <p className="font-medium text-gray-900 whitespace-pre-line">{application.notes || '—'}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function InterviewsTab({
  application,
  onOpen,
}: {
  application: Application
  onOpen: (interviewId: string) => void
}) {
  const interviews = application.interviews ?? []
  return (
    <Card>
      <CardHeader>
        <CardTitle>Interviews</CardTitle>
      </CardHeader>
      <CardContent>
        {interviews.length === 0 ? (
          <p className="text-sm text-gray-500">No interviews scheduled for this application.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Interviewer</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviews.map((interview) => (
                <TableRow
                  key={interview.id}
                  className="cursor-pointer"
                  onClick={() => onOpen(interview.id)}
                >
                  <TableCell className="font-medium">{interview.interviewType}</TableCell>
                  <TableCell className="text-gray-600">
                    {interview.interviewDate
                      ? format(new Date(interview.interviewDate), 'MMM d, yyyy p')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {recruitmentUserName(interview.interviewer)}
                  </TableCell>
                  <TableCell className="text-gray-600">{interview.result || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function OffersTab({
  application,
  onOpen,
}: {
  application: Application
  onOpen: (offerId: string) => void
}) {
  const offers = application.offers ?? []
  return (
    <Card>
      <CardHeader>
        <CardTitle>Offers</CardTitle>
      </CardHeader>
      <CardContent>
        {offers.length === 0 ? (
          <p className="text-sm text-gray-500">No offers extended for this application.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow
                  key={offer.id}
                  className="cursor-pointer"
                  onClick={() => onOpen(offer.id)}
                >
                  <TableCell className="font-medium">{offer.status}</TableCell>
                  <TableCell className="text-gray-600">
                    {offer.createdAt ? format(new Date(offer.createdAt), 'MMM d, yyyy') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
