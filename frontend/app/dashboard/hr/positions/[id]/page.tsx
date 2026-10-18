'use client'

import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { usePosition } from '@/hooks/usePositions'
import { ArrowLeft, Edit, Loader2, Briefcase, Users } from 'lucide-react'

export default function PositionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const positionId = params?.id as string
  const { data: position, isLoading } = usePosition(positionId)

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="hr.view">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!position) {
    return (
      <ProtectedRoute requiredPermission="hr.view">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Position not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/positions')}>
            Back to Positions
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
                <Briefcase className="h-8 w-8 text-green-600" />
                {position.title}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-1">
                <Users className="h-4 w-4" /> {position._count?.contracts ?? 0} employees
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/hr/positions/${positionId}/edit`)}
              className="border-gray-300"
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <ViewHistoryButton entityName="Position" entityId={positionId} size="default" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Position Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Title</p>
              <p className="font-medium">{position.title}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Employees</p>
              <Badge variant="secondary">{position._count?.contracts ?? 0}</Badge>
            </div>
            <div className="md:col-span-2">
              <p className="text-muted-foreground text-xs">Description</p>
              <p className="font-medium">{position.description || <span className="text-gray-400">—</span>}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Created</p>
              <p className="font-medium">{format(new Date(position.createdAt), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last Updated</p>
              <p className="font-medium">{format(new Date(position.updatedAt), 'MMM d, yyyy')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
