'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ReorderRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/stock/reorder')
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  )
}
