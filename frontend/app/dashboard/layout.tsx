'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context'
import { Loader2 } from 'lucide-react'
import { ErrorBoundary } from '@/components/error-boundary'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar()

  return (
    <div className="flex min-h-dvh w-full bg-gray-50">
      <Sidebar />

      {/* In-flow spacer reserves the same width as the fixed sidebar so main content
          never sits underneath it (fixes scroll/wheel only working on the far right). */}
      <div
        aria-hidden
        className={cn(
          'hidden shrink-0 transition-all duration-300 ease-in-out lg:block',
          isOpen ? 'w-72' : 'w-16',
        )}
      />

      <div className="relative z-0 min-w-0 flex-1">
        <Header />
        <main className="bg-gray-50 py-4 sm:py-6">
          <div className="mx-auto w-full min-w-0 max-w-7xl px-3 sm:px-6 lg:px-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <SidebarProvider>
      <DashboardShell>{children}</DashboardShell>
    </SidebarProvider>
  )
}
