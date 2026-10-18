'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Interview list now lives in the Recruitment hub. Preserve deep links.
export default function InterviewsIndexPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/hr/recruitment?tab=interviews')
  }, [router])
  return null
}
