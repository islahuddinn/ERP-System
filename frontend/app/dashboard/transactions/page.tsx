'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TransactionsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/stock/transactions')
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  )
}
