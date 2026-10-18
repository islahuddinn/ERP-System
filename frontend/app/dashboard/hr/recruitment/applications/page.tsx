'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Application list now lives in the Recruitment hub. Preserve deep links.
export default function ApplicationsIndexPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/hr/recruitment?tab=applications')
  }, [router])
  return null
}
