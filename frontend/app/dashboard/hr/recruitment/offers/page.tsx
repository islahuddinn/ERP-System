'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Offer list now lives in the Recruitment hub. Preserve deep links.
export default function OffersIndexPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/hr/recruitment?tab=offers')
  }, [router])
  return null
}
