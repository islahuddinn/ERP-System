'use client'

import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { useHoliday, HOLIDAY_TYPE_LABELS } from '@/hooks/useHolidays'
import { ArrowLeft, Edit, Loader2, CalendarDays } from 'lucide-react'

function formatDate(value: string): string {
  return format(new Date(value), 'MMM d, yyyy')
}

export default function HolidayDetailPage() {
  const router = useRouter()
  const params = useParams()
  const holidayId = params?.id as string
  const { data: holiday, isLoading } = useHoliday(holidayId)

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="holidays.view">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!holiday) {
    return (
      <ProtectedRoute requiredPermission="holidays.view">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-muted-foreground">
          <p>Holiday not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/holidays')}>
            Back to Holidays
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="holidays.view">
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
                <CalendarDays className="h-8 w-8 text-green-600" />
                {holiday.name}
              </h1>
              <p className="text-gray-600 mt-1">
                {formatDate(holiday.startDate)}
                {holiday.endDate !== holiday.startDate ? ` – ${formatDate(holiday.endDate)}` : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/hr/holidays/${holidayId}/edit`)}
              className="border-gray-300"
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <ViewHistoryButton entityName="Holiday" entityId={holidayId} size="default" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Holiday Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Name</p>
              <p className="font-medium">{holiday.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Type</p>
              <Badge variant={holiday.type === 'FULL_DAY' ? 'default' : 'secondary'}>
                {HOLIDAY_TYPE_LABELS[holiday.type]}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Start Date</p>
              <p className="font-medium">{formatDate(holiday.startDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">End Date</p>
              <p className="font-medium">{formatDate(holiday.endDate)}</p>
            </div>
            {holiday.dates && holiday.dates.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-muted-foreground text-xs">
                  Holiday Dates ({holiday.dates.length})
                </p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {holiday.dates.map((date) => (
                    <Badge key={date} variant="outline">
                      {formatDate(date)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <p className="text-muted-foreground text-xs">Description</p>
              <p className="font-medium">
                {holiday.description || <span className="text-gray-400">—</span>}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Created</p>
              <p className="font-medium">{formatDate(holiday.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last Updated</p>
              <p className="font-medium">{formatDate(holiday.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
