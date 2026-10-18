'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Network, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/*
 * Generic recursive renderer for the org-unit hierarchy. Works for both the
 * /tree response (units + children) and the /org-chart response (units +
 * children + employees), since it only reads the fields it needs.
 */

export interface OrgTreeEmployee {
  id: string
  fullName?: string
  firstName?: string
  lastName?: string
  employeeCode: string
  positionTitle?: string | null
}

export interface OrgTreeItem {
  id: string
  name: string
  type: string
  children?: OrgTreeItem[]
  employees?: OrgTreeEmployee[]
}

function employeeName(emp: OrgTreeEmployee): string {
  if (emp.fullName) return emp.fullName
  return `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()
}

function TreeNode({ node, depth, onSelect }: { node: OrgTreeItem; depth: number; onSelect?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(true)
  const children = node.children ?? []
  const employees = node.employees ?? []
  const hasChildren = children.length > 0 || employees.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-2 rounded hover:bg-gray-50"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="text-gray-400 hover:text-gray-700">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Network className="h-4 w-4 text-gray-400" />
        <button
          type="button"
          onClick={onSelect ? () => onSelect(node.id) : undefined}
          className={onSelect ? 'font-medium text-gray-800 hover:text-green-700' : 'font-medium text-gray-800'}
        >
          {node.name}
        </button>
        <Badge variant="secondary" className="text-xs">{node.type}</Badge>
      </div>

      {expanded && (
        <div>
          {employees.map((emp) => (
            <div key={emp.id} className="flex items-center gap-2 py-1.5 px-2 text-sm text-gray-600" style={{ paddingLeft: `${(depth + 1) * 20 + 28}px` }}>
              <User className="h-3.5 w-3.5 text-gray-400" />
              <span>{employeeName(emp)}</span>
              <span className="text-xs text-gray-400 font-mono">{emp.employeeCode}</span>
              {emp.positionTitle && <span className="text-xs text-gray-400">· {emp.positionTitle}</span>}
            </div>
          ))}
          {children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

export function OrgTree({ nodes, onSelect }: { nodes: OrgTreeItem[]; onSelect?: (id: string) => void }) {
  if (nodes.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">No org units to display.</p>
  }
  return (
    <div className="divide-y divide-gray-50">
      {nodes.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} onSelect={onSelect} />
      ))}
    </div>
  )
}
