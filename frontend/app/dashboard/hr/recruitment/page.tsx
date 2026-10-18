'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RecruitmentStatsCards } from '@/components/hr/recruitment/RecruitmentStatsCards'
import { JobRequisitionsList } from '@/components/hr/recruitment/JobRequisitionsList'
import { CandidatesList } from '@/components/hr/recruitment/CandidatesList'
import { ApplicationsList } from '@/components/hr/recruitment/ApplicationsList'
import { InterviewsList } from '@/components/hr/recruitment/InterviewsList'
import { OffersList } from '@/components/hr/recruitment/OffersList'

const TABS = [
  'dashboard',
  'requisitions',
  'candidates',
  'applications',
  'interviews',
  'offers',
] as const

type RecruitmentTab = (typeof TABS)[number]

function RecruitmentHub() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as RecruitmentTab | null
  const activeTab: RecruitmentTab = tabParam && TABS.includes(tabParam) ? tabParam : 'dashboard'

  const handleTabChange = (value: string) => {
    router.replace(`/dashboard/hr/recruitment?tab=${value}`)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <Users className="h-8 w-8 text-green-600" />
          Recruitment
        </h2>
        <p className="text-gray-500">
          Manage job requisitions, candidates, applications, interviews and offers.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <RecruitmentStatsCards />
        </TabsContent>
        <TabsContent value="requisitions" className="mt-6">
          <JobRequisitionsList />
        </TabsContent>
        <TabsContent value="candidates" className="mt-6">
          <CandidatesList />
        </TabsContent>
        <TabsContent value="applications" className="mt-6">
          <ApplicationsList />
        </TabsContent>
        <TabsContent value="interviews" className="mt-6">
          <InterviewsList />
        </TabsContent>
        <TabsContent value="offers" className="mt-6">
          <OffersList />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function RecruitmentPage() {
  return (
    <ProtectedRoute requiredPermission="hr.view_recruitment">
      <Suspense fallback={null}>
        <RecruitmentHub />
      </Suspense>
    </ProtectedRoute>
  )
}
