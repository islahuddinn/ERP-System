'use client'

import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ModuleStatusTabs } from '@/components/ui/module-status-tabs'
import type { StatusTabOption } from '@/hooks/useUrlStatusTabs'

interface ModuleListShellProps {
  title: string
  subtitle: string
  action?: ReactNode
  statusTabs?: {
    value: string
    onChange: (value: string) => void
    tabs: StatusTabOption[]
  }
  headerExtra?: ReactNode
  children: ReactNode
}

/**
 * List page layout aligned with Quality Control → Inspections:
 * title block, optional primary action, card with tab row + content.
 */
export function ModuleListShell({
  title,
  subtitle,
  action,
  statusTabs,
  headerExtra,
  children,
}: ModuleListShellProps) {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h2>
          <p className="text-gray-500">{subtitle}</p>
        </div>
        {action}
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        {(statusTabs || headerExtra) && (
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {statusTabs && (
                <ModuleStatusTabs
                  value={statusTabs.value}
                  onChange={statusTabs.onChange}
                  tabs={statusTabs.tabs}
                />
              )}
              {headerExtra}
            </div>
          </CardHeader>
        )}
        <CardContent className={statusTabs || headerExtra ? 'pt-0' : 'p-4'}>{children}</CardContent>
      </Card>
    </div>
  )
}
