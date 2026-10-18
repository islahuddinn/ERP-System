'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * The old "/dashboard/purchases/add" form had a broken "Add Order Item" button (QA #18).
 * It has been retired in favour of the rewritten "/dashboard/purchases/create" page
 * (searchable combobox, working item rows). This page now simply redirects there,
 * preserving any `supplierId` deep-link query param.
 */
export default function AddPurchaseRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supplierId = searchParams.get('supplierId')
    const target = supplierId
      ? `/dashboard/purchases/create?supplierId=${encodeURIComponent(supplierId)}`
      : '/dashboard/purchases/create'
    router.replace(target)
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )
}
