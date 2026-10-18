'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Briefcase, Edit, Loader2 } from 'lucide-react'
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
import { RequisitionStatusBadge, ApplicationStageBadge } from '@/components/hr/recruitment/RecruitmentBadges'
import { recruitmentUserName } from '@/hooks/useRecruitmentShared'
import {
  useJobRequisition,
  useDeleteJobRequisition,
  employmentTypeLabel,
  type JobRequisition,
} from '@/hooks/useJobRequisitions'
import type { ApplicationStage } from '@/hooks/useApplications'

const LIST = '/dashboard/hr/recruitment?tab=requisitions'

export default function JobRequisitionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const { data: requisition, isLoading } = useJobRequisition(id)
  const deleteMutation = useDeleteJobRequisition()
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

  if (!requisition) {
    return (
      <ProtectedRoute requiredPermission="hr.view_recruitment">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Job requisition not found</p>
          <Button variant="outline" onClick={() => router.push(LIST)}>
            Back to Requisitions
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  const applications = requisition.applications ?? []

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
                <Briefcase className="h-8 w-8 text-green-600" />
                {requisition.title}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <span>{requisition.department?.name ?? '—'}</span>
                <span>•</span>
                <RequisitionStatusBadge status={requisition.status} />
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/hr/recruitment/job-requisitions/${id}/edit`)}
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
            <ViewHistoryButton entityName="JobRequisition" entityId={id} size="default" />
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab requisition={requisition} />
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
        title="Delete Job Requisition"
        description="Are you sure you want to delete this job requisition? This action cannot be undone."
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

function OverviewTab({ requisition }: { requisition: JobRequisition }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Requisition Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <Field label="Title" value={requisition.title} />
        <Field label="Department" value={requisition.department?.name ?? '—'} />
        <Field label="Position" value={requisition.position?.title ?? '—'} />
        <Field
          label="Employment Type"
          value={requisition.employmentType ? employmentTypeLabel(requisition.employmentType) : '—'}
        />
        <Field label="Openings" value={requisition.openings ?? '—'} />
        <Field label="Status" value={<RequisitionStatusBadge status={requisition.status} />} />
        <Field label="Created By" value={recruitmentUserName(requisition.creator)} />
        <Field
          label="Created"
          value={requisition.createdAt ? format(new Date(requisition.createdAt), 'MMM d, yyyy') : '—'}
        />
        <Field
          label="Last Updated"
          value={requisition.updatedAt ? format(new Date(requisition.updatedAt), 'MMM d, yyyy') : '—'}
        />
        <div className="md:col-span-3">
          <p className="text-muted-foreground text-xs">Description</p>
          <p className="font-medium text-gray-900 whitespace-pre-line">
            {requisition.description || '—'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

interface RequisitionApplication {
  id: string
  stage: string
  status: string
  candidate?: { firstName: string; lastName: string; email: string } | null
}

function ApplicationsTab({
  applications,
  onOpen,
}: {
  applications: RequisitionApplication[]
  onOpen: (applicationId: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications</CardTitle>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="text-sm text-gray-500">No applications for this requisition yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
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
                    {application.candidate
                      ? `${application.candidate.firstName} ${application.candidate.lastName}`
                      : '—'}
                    <span className="block text-xs text-gray-500">
                      {application.candidate?.email}
                    </span>
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
