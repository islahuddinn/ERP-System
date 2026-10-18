'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Legacy route — redirects to unified list with status filter. */
export default function CompletedPurchaseOrdersPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/purchases?status=RECEIVED')
  }, [router])
  return null
}
