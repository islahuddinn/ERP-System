'use client'

import { Settings } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { TaxRulesTab } from '@/components/hr/config/tax-rules-tab'
import { DeductionRulesTab } from '@/components/hr/config/deduction-rules-tab'
import { WorkingCalendarsTab } from '@/components/hr/config/working-calendars-tab'
import { SalaryComponentsTab } from '@/components/hr/config/salary-components-tab'

export default function HrConfigPage() {
  return (
    <ProtectedRoute requiredPermission="hr.manage">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Settings className="h-8 w-8 text-green-600" />
            HR Configuration
          </h2>
          <p className="text-gray-500">Manage payroll tax rules, deductions, working calendars and salary components.</p>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <Tabs defaultValue="tax-rules">
              <TabsList>
                <TabsTrigger value="tax-rules">Tax Rules</TabsTrigger>
                <TabsTrigger value="deduction-rules">Deduction Rules</TabsTrigger>
                <TabsTrigger value="working-calendars">Working Calendars</TabsTrigger>
                <TabsTrigger value="salary-components">Salary Components</TabsTrigger>
              </TabsList>

              <TabsContent value="tax-rules" className="mt-4">
                <TaxRulesTab />
              </TabsContent>
              <TabsContent value="deduction-rules" className="mt-4">
                <DeductionRulesTab />
              </TabsContent>
              <TabsContent value="working-calendars" className="mt-4">
                <WorkingCalendarsTab />
              </TabsContent>
              <TabsContent value="salary-components" className="mt-4">
                <SalaryComponentsTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
