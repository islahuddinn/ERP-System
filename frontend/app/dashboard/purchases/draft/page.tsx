'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Legacy route — redirects to unified list with status filter. */
export default function DraftPurchaseOrdersPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/purchases?status=DRAFT')
  }, [router])
  return null
}
