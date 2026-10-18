'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SuperAdminPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('superAdminToken')
    
    if (token) {
      // If authenticated, redirect to dashboard
      router.push('/super-admin/dashboard')
    } else {
      // If not authenticated, redirect to login
      router.push('/super-admin/auth/login')
    }
  }, [router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="relative">
        <div className="animate-spin rounded-full h-32 w-32 border-4 border-transparent border-t-blue-600 border-r-green-600"></div>
      </div>
    </div>
  )
}

