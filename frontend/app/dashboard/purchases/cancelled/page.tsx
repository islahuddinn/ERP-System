'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Legacy route — redirects to unified list with status filter. */
export default function CancelledPurchaseOrdersPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/purchases?status=CANCELLED')
  }, [router])
  return null
}
