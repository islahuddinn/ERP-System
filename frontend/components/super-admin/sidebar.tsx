'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { useSidebar } from '@/contexts/sidebar-context'

const navigation = [
  { name: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
  { name: 'Tenants', href: '/super-admin/tenants', icon: Users },
  { name: 'Subscriptions', href: '/super-admin/subscriptions', icon: CreditCard },
  { name: 'Payments', href: '/super-admin/payments', icon: DollarSign },
  { name: 'Analytics', href: '/super-admin/analytics', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isOpen } = useSidebar()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('superAdminToken')
    localStorage.removeItem('superAdminUser')
    window.location.href = '/super-admin/auth/login'
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-md"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 shadow-lg transition-transform duration-300 ease-in-out',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Super Admin</h1>
                <p className="text-xs text-gray-600">Control Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto scrollbar-visible">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-2 border-blue-400 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600 border border-gray-200 hover:border-gray-300'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-blue-600' : 'text-gray-500')} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-gray-900/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}

