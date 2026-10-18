'use client'

import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { useMoney } from '@/contexts/currency-context'
import { useGrade, useGrades, type Grade } from '@/hooks/useGrades'
import { ArrowLeft, Edit, Loader2, Layers, Users } from 'lucide-react'

function OverviewTab({ grade }: { grade: Grade }) {
  const money = useMoney()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grade Information</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Name</p>
          <p className="font-medium">{grade.name}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Level</p>
          <Badge variant="secondary">{grade.level}</Badge>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Salary Band Min</p>
          <p className="font-medium">{money(Number(grade.salaryBandMin))}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Salary Band Max</p>
          <p className="font-medium">{money(Number(grade.salaryBandMax))}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Created</p>
          <p className="font-medium">{format(new Date(grade.createdAt), 'MMM d, yyyy')}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Last Updated</p>
          <p className="font-medium">{format(new Date(grade.updatedAt), 'MMM d, yyyy')}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function EmployeesTab({ grade }: { grade: Grade }) {
  const router = useRouter()
  const employees = grade.employees ?? []
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employees on this grade</CardTitle>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No employees are assigned to this grade.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {employees.map((emp) => (
              <li key={emp.id} className="flex items-center gap-2 py-3">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-800">{emp.firstName} {emp.lastName}</span>
                <span className="text-xs text-gray-400 font-mono">{emp.employeeCode}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function GradeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const gradeId = params?.id as string

  // Prefer the by-id endpoint; fall back to the full list cache while it loads
  // (or if it has not resolved) so the page always renders.
  const { data: gradeById, isLoading: isLoadingById } = useGrade(gradeId)
  const { data: gradeList, isLoading: isLoadingList } = useGrades()
  const grade = gradeById ?? gradeList?.find((g) => g.id === gradeId)
  const isLoading = isLoadingById && isLoadingList && !grade

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="hr.view">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!grade) {
    return (
      <ProtectedRoute requiredPermission="hr.view">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Grade not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/grades')}>Back to Grades</Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="hr.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Layers className="h-8 w-8 text-green-600" />
                {grade.name}
              </h1>
              <p className="text-gray-600 mt-1">Level {grade.level}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/hr/grades/${gradeId}/edit`)} className="border-gray-300">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <ViewHistoryButton entityName="Grade" entityId={gradeId} size="default" />
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="employees">Employees ({grade.employees?.length ?? 0})</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <OverviewTab grade={grade} />
          </TabsContent>
          <TabsContent value="employees">
            <EmployeesTab grade={grade} />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
