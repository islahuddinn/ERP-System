import type { TerritoryStatus } from '@/hooks/useRegions'
import type { Area } from '@/hooks/useAreas'
import type { BranchTree, BranchTreeAreaNode } from '@/hooks/useBranches'

/** Customer node nested under an area in GET /branches/:branchId/tree */
export interface BranchTreeCustomerNode {
  id: string
  shopName: string
  code: string
  phone: string
  status: TerritoryStatus
  address: string
}

/** Area row enriched from the branch tree (includes nested customer count). */
export interface AreaTreeRow extends Area {
  customerCount?: number
  treeCustomers?: BranchTreeCustomerNode[]
}

/**
 * Maps GET /branches/:branchId/tree areas into DataTable rows.
 * Branch breadcrumb fields are attached when `branchTree` is provided.
 */
export function mapBranchTreeAreasToRows(
  branchTree: BranchTree | undefined,
  branchDetail?: {
    id: string
    name: string
    city?: { id: string; name: string; zone?: { id: string; name: string; region?: { id: string; name: string } } }
  },
): AreaTreeRow[] {
  if (!branchTree?.areas?.length) return []

  const branchId = branchTree.id
  const branchName = branchDetail?.name ?? branchTree.name

  return branchTree.areas.map((area) => mapTreeAreaNode(area, branchId, branchName, branchDetail?.city))
}

function mapTreeAreaNode(
  area: BranchTreeAreaNode,
  branchId: string,
  branchName: string,
  city?: NonNullable<Area['branch']>['city'],
): AreaTreeRow {
  const customers = area.customers ?? []
  return {
    id: area.id,
    name: area.name,
    branchId,
    status: area.status,
    createdAt: '',
    updatedAt: '',
    customerCount: customers.length,
    treeCustomers: customers,
    branch: {
      id: branchId,
      name: branchName,
      ...(city ? { city } : {}),
    },
  }
}

/** Total customers across all areas in a branch tree (single-request aggregate). */
export function countBranchTreeCustomers(branchTree: BranchTree | undefined): number {
  if (!branchTree?.areas?.length) return 0
  return branchTree.areas.reduce((sum, area) => sum + (area.customers?.length ?? 0), 0)
}
