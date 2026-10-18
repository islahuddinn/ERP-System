'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  FileText, 
  TrendingUp, 
  Plus,
  Eye,
  Edit,
  BarChart3
} from 'lucide-react'

export default function FinancialDashboardPage() {
  const financialModules = [
    {
      title: 'Chart of Accounts',
      description: 'Manage your financial accounts and chart structure',
      icon: BookOpen,
      color: 'bg-blue-500',
      href: '/dashboard/financial/coa',
      actions: [
        { label: 'View Accounts', href: '/dashboard/financial/coa', icon: Eye },
        { label: 'Add Account', href: '/dashboard/financial/coa/create', icon: Plus },
      ]
    },
    {
      title: 'Journal Entries',
      description: 'Create and manage journal entries',
      icon: FileText,
      color: 'bg-green-500',
      href: '/dashboard/financial/journal',
      actions: [
        { label: 'View Entries', href: '/dashboard/financial/journal', icon: Eye },
        { label: 'New Entry', href: '/dashboard/financial/journal/create', icon: Plus },
      ]
    },
    {
      title: 'Financial Reports',
      description: 'Generate trial balance and financial reports',
      icon: BarChart3,
      color: 'bg-purple-500',
      href: '/dashboard/financial/reports',
      actions: [
        { label: 'View Reports', href: '/dashboard/financial/reports', icon: Eye },
        { label: 'Generate Report', href: '/dashboard/financial/reports', icon: TrendingUp },
      ]
    }
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Financial Management</h2>
          <p className="text-gray-500">Manage your financial accounts, journal entries, and reports.</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Chart of Accounts</div>
                <div className="text-2xl font-bold text-gray-900">Core Module</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Journal Engine</div>
                <div className="text-2xl font-bold text-gray-900">Double Entry</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Reports</div>
                <div className="text-2xl font-bold text-gray-900">Trial Balance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {financialModules.map((module) => {
          const Icon = module.icon
          return (
            <Card key={module.title} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${module.color} rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {module.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 text-sm">
                  {module.description}
                </p>
                <div className="space-y-2">
                  {module.actions.map((action) => {
                    const ActionIcon = action.icon
                    return (
                      <Link key={action.label} href={action.href}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start bg-gray-50 border-gray-200 hover:bg-gray-100"
                        >
                          <ActionIcon className="mr-2 h-4 w-4" />
                          {action.label}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Phase 1 Features */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Phase 1 Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900 mb-1">Chart of Accounts</div>
              <div className="text-xs text-gray-600">Complete COA Management</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900 mb-1">Journal Entries</div>
              <div className="text-xs text-gray-600">Manual Entry & Validation</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900 mb-1">Posting System</div>
              <div className="text-xs text-gray-600">Secure Posting Logic</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900 mb-1">Trial Balance</div>
              <div className="text-xs text-gray-600">Financial Reporting</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
