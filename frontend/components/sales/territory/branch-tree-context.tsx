'use client'

import { GitBranch, MapPin, Users } from 'lucide-react'
import { StatusPill } from './status-pill'
import type { Branch } from '@/hooks/useBranches'
import type { BranchTree } from '@/hooks/useBranches'
import { countBranchTreeCustomers } from './utils/branch-tree'

interface BranchTreeContextProps {
  branchTree: BranchTree
  branchDetail?: Branch | null
}

/**
 * Context banner shown when the Areas tab is scoped to a branch via the tree endpoint.
 * Summarises branch metadata and tree aggregates without an extra list request.
 */
export function BranchTreeContext({ branchTree, branchDetail }: BranchTreeContextProps) {
  const areaCount = branchTree.areas?.length ?? 0
  const customerCount = countBranchTreeCustomers(branchTree)
  const cityName = branchDetail?.city?.name
  const regionZone =
    branchDetail?.city?.zone?.region?.name && branchDetail?.city?.zone?.name
      ? `${branchDetail.city.zone.region.name} / ${branchDetail.city.zone.name}`
      : branchDetail?.city?.zone?.name

  return (
    <div className="rounded-lg border border-green-200 bg-green-50/60 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <GitBranch className="h-4 w-4 text-green-700" />
            <p className="font-semibold text-gray-900">{branchTree.name}</p>
            <StatusPill status={branchTree.status} />
          </div>
          {(cityName || regionZone) && (
            <p className="flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {[regionZone, cityName].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Loaded from branch tree — areas and customer counts in one request.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Areas</p>
            <p className="font-semibold tabular-nums text-gray-900">{areaCount}</p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-xs uppercase tracking-wide text-gray-500">
              <Users className="h-3 w-3" />
              Customers
            </p>
            <p className="font-semibold tabular-nums text-gray-900">{customerCount}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
