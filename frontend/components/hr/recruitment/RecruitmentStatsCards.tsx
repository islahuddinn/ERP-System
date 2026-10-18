'use client'

import { Briefcase, Users, FileSpreadsheet, CalendarClock, BadgeCheck, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApplicationStageBadge } from '@/components/hr/recruitment/RecruitmentBadges'
import { useRecruitmentStats } from '@/hooks/useRecruitmentStats'
import { APPLICATION_STAGES, type ApplicationStage } from '@/hooks/useApplications'

function StatCard({
  label,
  value,
  sublabel,
  icon,
}: {
  label: string
  value: number | string
  sublabel?: string
  icon: React.ReactNode
}) {
  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
        <span className="text-gray-400">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
      </CardContent>
    </Card>
  )
}

export function RecruitmentStatsCards() {
  const { data: stats, isLoading, isError } = useRecruitmentStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="p-6 text-sm text-gray-500">
          Unable to load recruitment statistics.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Job Requisitions"
          value={stats.totalRequisitions}
          sublabel={`${stats.openRequisitions} open`}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatCard
          label="Candidates"
          value={stats.totalCandidates}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Applications"
          value={stats.totalApplications}
          icon={<FileSpreadsheet className="h-5 w-5" />}
        />
        <StatCard
          label="Upcoming Interviews"
          value={stats.upcomingInterviews}
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <StatCard
          label="Pending Offers"
          value={stats.pendingOffers}
          icon={<BadgeCheck className="h-5 w-5" />}
        />
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 text-base">Applications by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {APPLICATION_STAGES.map((stage: ApplicationStage) => (
              <div key={stage} className="flex items-center gap-2">
                <ApplicationStageBadge stage={stage} />
                <span className="text-lg font-semibold text-gray-900">
                  {stats.applicationsByStage?.[stage] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
