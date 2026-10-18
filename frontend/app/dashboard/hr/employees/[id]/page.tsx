'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { useMoney } from '@/contexts/currency-context'
import {
  useEmployee,
  useAttachEmployeeDocument,
  type Employee,
  type EmployeeStatus,
} from '@/hooks/useEmployees'
import { formatTime12h } from '@/hooks/useAttendance'
import { useContracts, useSalaryRevisions } from '@/hooks/useContracts'
import { ArrowLeft, Edit, Loader2, User, Plus, FileText, ExternalLink } from 'lucide-react'

const STATUS_VARIANT: Record<EmployeeStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  ONBOARDING: 'secondary',
  INACTIVE: 'outline',
  TERMINATED: 'destructive',
}

function OverviewTab({ employee }: { employee: Employee }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Name</p>
            <p className="font-medium">
              {employee.user
                ? `${employee.user.firstName} ${employee.user.lastName}`
                : employee.employeeCode}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Email</p>
            <p className="font-medium">{employee.user?.email || <span className="text-gray-400">—</span>}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Phone</p>
            <p className="font-medium">{employee.user?.phone || <span className="text-gray-400">—</span>}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Role</p>
            <p className="font-medium">{employee.user?.role?.name || <span className="text-gray-400">—</span>}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Login Access</p>
            <p className="font-medium">{employee.user?.loginAccess || <span className="text-gray-400">—</span>}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Employee Code</p>
            <p className="font-medium font-mono">{employee.employeeCode}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Status</p>
            <Badge variant={STATUS_VARIANT[employee.status]}>{employee.status}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Date of Joining</p>
            <p className="font-medium">{format(new Date(employee.dateOfJoining), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Shift</p>
            <p className="font-medium">
              {employee.shift ? (
                <>
                  {employee.shift.name}{' '}
                  {/* Crisp, normal-opacity 12-hour time with a readable AM/PM suffix —
                      previously rendered too faint/small to read clearly (#10). */}
                  <span className="text-gray-700 font-mono text-sm font-medium">
                    ({formatTime12h(employee.shift.startTime)}–{formatTime12h(employee.shift.endTime)})
                  </span>
                </>
              ) : (
                <span className="text-gray-400">No shift assigned</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Created</p>
            <p className="font-medium">{format(new Date(employee.createdAt), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Last Updated</p>
            <p className="font-medium">{format(new Date(employee.updatedAt), 'MMM d, yyyy')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface DocumentFormData {
  documentType: string
  fileUrl: string
}

function DocumentsTab({ employee }: { employee: Employee }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const attachMutation = useAttachEmployeeDocument()
  const documents = employee.documents ?? []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentFormData>({ defaultValues: { documentType: '', fileUrl: '' } })

  const onSubmit = async (data: DocumentFormData) => {
    await attachMutation.mutateAsync({
      id: employee.id,
      data: { documentType: data.documentType.trim(), fileUrl: data.fileUrl.trim() },
    })
    reset({ documentType: '', fileUrl: '' })
    setIsDialogOpen(false)
  }

  // Always start the popup empty — clear any previously-entered values whenever it
  // opens or closes so a reopened dialog never shows stale input.
  const handleDialogOpenChange = (open: boolean) => {
    reset({ documentType: '', fileUrl: '' })
    setIsDialogOpen(open)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Documents ({documents.length})</CardTitle>
        <Button
          size="sm"
          onClick={() => handleDialogOpenChange(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Document
        </Button>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No documents attached yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-800">{doc.documentType}</p>
                    <p className="text-xs text-gray-500">
                      Uploaded {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-green-700 hover:text-green-800"
                >
                  View <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Document</DialogTitle>
            <DialogDescription>Record a document by its type and public URL.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="documentType" className="text-gray-700 font-medium">
                Document Type <span className="text-red-500">*</span>
              </Label>
              <Input
                id="documentType"
                {...register('documentType', {
                  required: 'Document type is required',
                  validate: (v) => v.trim().length > 0 || 'Document type is required',
                  maxLength: { value: 64, message: 'Max 64 characters' },
                })}
                placeholder="e.g. CNIC, CONTRACT, OFFER_LETTER"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.documentType && <p className="text-sm text-red-600 mt-1">{errors.documentType.message}</p>}
            </div>
            <div>
              <Label htmlFor="fileUrl" className="text-gray-700 font-medium">
                File URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fileUrl"
                {...register('fileUrl', {
                  required: 'File URL is required',
                  pattern: { value: /^https?:\/\/.+/, message: 'Must be a valid URL (http/https)' },
                })}
                placeholder="https://..."
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.fileUrl && <p className="text-sm text-red-600 mt-1">{errors.fileUrl.message}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={attachMutation.isPending}
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={attachMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {attachMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  'Attach'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// Salary revisions live on the employee's contract. Show the increment history of
// the active contract (falling back to the most recently started one) read-only.
function SalaryRevisionsTab({ employeeId }: { employeeId: string }) {
  const money = useMoney()
  const { data: contractsResponse, isLoading: contractsLoading } = useContracts({ employeeId })
  const contracts = contractsResponse?.data ?? []
  const contract =
    contracts.find((c) => c.status === 'ACTIVE') ??
    [...contracts].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    )[0]

  const { data: revisions = [], isLoading: revisionsLoading } = useSalaryRevisions(contract?.id ?? '')
  const isLoading = contractsLoading || (!!contract && revisionsLoading)

  const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    CURRENT: 'default',
    DRAFT: 'secondary',
    SUPERSEDED: 'outline',
    SUSPENDED: 'destructive',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary Revisions ({revisions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
        ) : !contract ? (
          <p className="text-center py-8 text-muted-foreground">
            No contract found for this employee.
          </p>
        ) : revisions.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No salary revisions yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {revisions.map((revision) => (
              <li key={revision.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-800 flex items-center gap-2">
                    {money(Number(revision.baseSalary))}
                    <Badge variant={statusVariant[revision.status] ?? 'outline'}>{revision.status}</Badge>
                  </p>
                  <p className="text-sm text-gray-500">
                    Effective {format(new Date(revision.effectiveDate), 'MMM d, yyyy')}
                    {revision.reason ? ` — ${revision.reason}` : ''}
                  </p>
                  {revision.createdBy && (
                    <p className="text-xs text-gray-400">
                      Revised by {revision.createdBy.firstName} {revision.createdBy.lastName}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function EmployeeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params?.id as string
  const { data: employee, isLoading } = useEmployee(employeeId)

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="hr.view">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!employee) {
    return (
      <ProtectedRoute requiredPermission="hr.view">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Employee not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/employees')}>
            Back to Employees
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  const displayName = employee.user
    ? `${employee.user.firstName} ${employee.user.lastName}`
    : employee.employeeCode

  return (
    <ProtectedRoute requiredPermission="hr.view">
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
                <User className="h-8 w-8 text-green-600" />
                {displayName}
              </h1>
              <p className="text-gray-600 mt-1 font-mono text-sm">{employee.employeeCode}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/hr/employees/${employeeId}/edit`)}
              className="border-gray-300"
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <ViewHistoryButton entityName="Employee" entityId={employeeId} size="default" />
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents ({employee.documents?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="salary-revisions">Salary Revisions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab employee={employee} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab employee={employee} />
          </TabsContent>

          <TabsContent value="salary-revisions">
            <SalaryRevisionsTab employeeId={employeeId} />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
