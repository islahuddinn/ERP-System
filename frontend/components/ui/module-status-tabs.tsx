'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { StatusTabOption } from '@/hooks/useUrlStatusTabs'

interface ModuleStatusTabsProps {
  value: string
  onChange: (value: string) => void
  tabs: StatusTabOption[]
  className?: string
}

/** Segmented status filter — matches Quality Control → Inspections. */
export function ModuleStatusTabs({ value, onChange, tabs, className }: ModuleStatusTabsProps) {
  return (
    <Tabs value={value} onValueChange={onChange} className={className ?? 'w-full md:w-auto'}>
      <TabsList className="bg-gray-100">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
