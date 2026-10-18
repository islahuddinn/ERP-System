'use client'

import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { useDepartment, type Department } from '@/hooks/useDepartments'
import { ArrowLeft, Edit, Loader2, Building2, Users, GitBranch } from 'lucide-react'

function OverviewTab({ department }: { department: Department }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Department Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Name</p>
            <p className="font-medium">{department.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Parent Department</p>
            <p className="font-medium">
              {department.parent ? department.parent.name : <span className="text-gray-400">Top level</span>}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Employees</p>
            <Badge variant="secondary">{department._count?.contracts ?? 0}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Sub-departments</p>
            <Badge variant="secondary">{department.childDepartments?.length ?? 0}</Badge>
          </div>
          <div className="md:col-span-2">
            <p className="text-muted-foreground text-xs">Description</p>
            <p className="font-medium">{department.description || <span className="text-gray-400">—</span>}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Created</p>
            <p className="font-medium">{format(new Date(department.createdAt), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Last Updated</p>
            <p className="font-medium">{format(new Date(department.updatedAt), 'MMM d, yyyy')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SubDepartmentsTab({ department }: { department: Department }) {
  const router = useRouter()
  const children = department.childDepartments ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sub-departments</CardTitle>
      </CardHeader>
      <CardContent>
        {children.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">This department has no sub-departments.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {children.map((child) => (
              <li
                key={child.id}
                onClick={() => router.push(`/dashboard/hr/departments/${child.id}`)}
                className="flex items-center gap-2 py-3 cursor-pointer hover:bg-gray-50 px-2 rounded"
              >
                <GitBranch className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-800">{child.name}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function DepartmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const departmentId = params?.id as string
  const { data: department, isLoading } = useDepartment(departmentId)

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="hr.view">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!department) {
    return (
      <ProtectedRoute requiredPermission="hr.view">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Department not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/departments')}>
            Back to Departments
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

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
                <Building2 className="h-8 w-8 text-green-600" />
                {department.name}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-1">
                <Users className="h-4 w-4" /> {department._count?.contracts ?? 0} employees
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/hr/departments/${departmentId}/edit`)}
              className="border-gray-300"
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <ViewHistoryButton entityName="Department" entityId={departmentId} size="default" />
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sub-departments">
              Sub-departments ({department.childDepartments?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab department={department} />
          </TabsContent>

          <TabsContent value="sub-departments">
            <SubDepartmentsTab department={department} />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
