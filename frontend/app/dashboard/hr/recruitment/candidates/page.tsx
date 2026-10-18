'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Candidate list now lives in the Recruitment hub. Preserve deep links.
export default function CandidatesIndexPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/hr/recruitment?tab=candidates')
  }, [router])
  return null
}
