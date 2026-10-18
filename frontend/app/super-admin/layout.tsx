'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/super-admin/sidebar'
import { Header } from '@/components/super-admin/header'
import { SidebarProvider } from '@/contexts/sidebar-context'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Don't check auth on login page or root page
    if (pathname === '/super-admin/auth/login' || pathname === '/super-admin') {
      setIsLoading(false)
      setIsAuthenticated(false)
      return
    }

    // Check if user is authenticated
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('superAdminToken')
        const user = localStorage.getItem('superAdminUser')

        if (!token || !user) {
          setIsAuthenticated(false)
          setIsLoading(false)
          router.replace('/super-admin/auth/login')
          return
        }

        // Verify token and user are valid
        try {
          if (user) {
            JSON.parse(user) // Validate JSON
          }
        } catch {
          // Invalid user data, clear and redirect
          localStorage.removeItem('superAdminToken')
          localStorage.removeItem('superAdminUser')
          setIsAuthenticated(false)
          setIsLoading(false)
          router.replace('/super-admin/auth/login')
          return
        }

        setIsAuthenticated(true)
        setIsLoading(false)
      } catch (error) {
        console.error('Auth check error:', error)
        setIsAuthenticated(false)
        setIsLoading(false)
        router.replace('/super-admin/auth/login')
      }
    }

    // Check auth immediately and also after a small delay to catch localStorage updates
    checkAuth()
    const timeoutId = setTimeout(checkAuth, 150)
    
    return () => clearTimeout(timeoutId)
  }, [router, pathname])

  // Don't check auth on login page or root page (root page handles its own redirect)
  if (pathname === '/super-admin/auth/login' || pathname === '/super-admin') {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-4 border-transparent border-t-blue-600 border-r-green-600"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64 transition-all duration-300">
          <Header />
          <main className="py-6 relative bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

