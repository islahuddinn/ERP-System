'use client'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Bell, User, Menu, Factory, Warehouse, Calculator } from 'lucide-react'
import { useSidebar } from '@/contexts/sidebar-context'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CalculatorModal } from '@/components/modals/CalculatorModal'

export function Header() {
  const { user, logout } = useAuth()
  const { toggleSidebar } = useSidebar()
  const router = useRouter()
  const [showCalculator, setShowCalculator] = useState(false)

  return (
    <>
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-2 border-b border-gray-200 bg-white backdrop-blur-xl px-3 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="flex flex-1 min-w-0 gap-x-2 self-stretch sm:gap-x-4 lg:gap-x-6">
        <div className="flex shrink-0 items-center gap-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-gray-600 hover:text-green-600 hover:bg-gray-100 transition-all duration-300"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </div>
        <div className="flex flex-1"></div>
          <div className="flex shrink-0 items-center gap-x-1 sm:gap-x-3 lg:gap-x-4">
            <Button 
              onClick={() => router.push('/dashboard/factory/warehouses')}
              className="bg-green-600 hover:bg-green-700 text-white border border-green-600 flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all duration-300 font-semibold"
              title="Manage Warehouses"
            >
              <Warehouse className="h-5 w-5" />
              <span className="hidden md:inline">Warehouses</span>
            </Button>
            <Button
              onClick={() => setShowCalculator(true)}
              className="flex items-center gap-2 rounded-lg px-2 sm:px-4 py-2 text-sm font-semibold border border-green-600 text-green-700 bg-green-50 hover:bg-green-100 transition-all duration-300"
              title="Quick Calculator"
            >
              <Calculator className="h-5 w-5" strokeWidth={1.8} />
              
            </Button>
          <Button variant="ghost" size="icon" className="text-gray-600 hover:text-green-600 hover:bg-gray-100 transition-all duration-300">
            <Bell className="h-5 w-5" />
            <span className="sr-only">View notifications</span>
          </Button>

          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-300" />

          <div className="hidden sm:flex items-center gap-x-2 min-w-0">
            <button
              type="button"
              onClick={() => router.push('/dashboard/settings/account')}
              title="View your profile"
              className="flex items-center gap-x-2 rounded-md px-2 py-1 hover:bg-gray-100 transition-colors min-w-0"
            >
              <User className="h-5 w-5 shrink-0 text-green-600" />
              <span className="text-sm font-medium text-gray-900 truncate max-w-[120px] md:max-w-none">
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || user?.email || 'User'}
              </span>
              {user?.role && <span className="hidden lg:inline text-xs text-gray-500">({user.role})</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
      <CalculatorModal open={showCalculator} onClose={() => setShowCalculator(false)} />
    </>
  )
}
