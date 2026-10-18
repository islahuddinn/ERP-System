'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

/**
 * Legacy route. The production-orders module now lives at /dashboard/production-orders.
 * Redirect any old factory links to the canonical detail page.
 */
export default function LegacyFactoryProductionOrderRedirect() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    router.replace(id ? `/dashboard/production-orders/${id}` : '/dashboard/production-orders')
  }, [id, router])

  return null
}
