'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard')
      } else {
        router.push('/auth/login')
      }
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading state while determining redirect
  return (
    <div className="flex h-[100dvh] items-center justify-center overflow-hidden bg-gray-50 overscroll-none">
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-green-600" />
      </div>
    </div>
  )
}
