'use client'

import { useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { useOrgUnit, useOrgUnits, type OrgUnit } from '@/hooks/useOrgUnits'
import { ArrowLeft, Edit, Loader2, Network, GitBranch } from 'lucide-react'

export default function OrgUnitDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orgUnitId = params?.id as string

  // Prefer by-id; fall back to the list cache while it loads. Children are
  // derived from the flat list (parentId === id) so the count is always current.
  const { data: unitById, isLoading: isLoadingById } = useOrgUnit(orgUnitId)
  const { data: unitList, isLoading: isLoadingList } = useOrgUnits()
  const orgUnit = unitById ?? unitList?.find((u) => u.id === orgUnitId)
  const isLoading = isLoadingById && isLoadingList && !orgUnit

  const parent = useMemo(
    () => (orgUnit?.parentId ? unitList?.find((u) => u.id === orgUnit.parentId) : null),
    [orgUnit, unitList],
  )
  const children = useMemo(
    () => (unitList ?? []).filter((u) => u.parentId === orgUnitId),
    [unitList, orgUnitId],
  )

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="hr.view">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!orgUnit) {
    return (
      <ProtectedRoute requiredPermission="hr.view">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Org unit not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/org-units')}>Back to Org Units</Button>
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
                <Network className="h-8 w-8 text-green-600" />
                {orgUnit.name}
              </h1>
              <p className="text-gray-600 mt-1"><Badge variant="secondary">{orgUnit.type}</Badge></p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/hr/org-units/${orgUnitId}/edit`)} className="border-gray-300">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <ViewHistoryButton entityName="OrgUnit" entityId={orgUnitId} size="default" />
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="children">Child Units ({children.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Org Unit Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Name</p>
                  <p className="font-medium">{orgUnit.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <Badge variant="secondary">{orgUnit.type}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Parent Unit</p>
                  <p className="font-medium">{parent ? parent.name : <span className="text-gray-400">Top level</span>}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Child Units</p>
                  <Badge variant="secondary">{children.length}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p className="font-medium">{format(new Date(orgUnit.createdAt), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Last Updated</p>
                  <p className="font-medium">{format(new Date(orgUnit.updatedAt), 'MMM d, yyyy')}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="children">
            <Card>
              <CardHeader>
                <CardTitle>Child Units</CardTitle>
              </CardHeader>
              <CardContent>
                {children.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">This unit has no child units.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {children.map((child: OrgUnit) => (
                      <li key={child.id} onClick={() => router.push(`/dashboard/hr/org-units/${child.id}`)} className="flex items-center gap-2 py-3 cursor-pointer hover:bg-gray-50 px-2 rounded">
                        <GitBranch className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-800">{child.name}</span>
                        <Badge variant="secondary" className="text-xs">{child.type}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
