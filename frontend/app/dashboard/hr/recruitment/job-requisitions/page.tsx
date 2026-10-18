'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Requisition list now lives in the Recruitment hub. Preserve deep links.
export default function JobRequisitionsIndexPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/hr/recruitment?tab=requisitions')
  }, [router])
  return null
}
