'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash } from 'lucide-react'

type OrgChartEmployeeNode = {
  id: string
  employeeCode: string
  fullName: string
  positionTitle?: string | null
}

type OrgChartNode = {
  id: string
  name: string
  type: string
  children: OrgChartNode[]
  employees: OrgChartEmployeeNode[]
}

function OrgChartTree({ nodes, depth = 0, onDelete }: { nodes: OrgChartNode[]; depth?: number; onDelete: (id: string, name: string) => void }) {
  return (
    <ul className={depth === 0 ? 'space-y-2' : 'space-y-1'}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-start gap-2">
            <div
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                depth === 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <span>{node.name}</span>
              <span className="ml-2 text-xs uppercase text-gray-500">
                {node.type}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(node.id, node.name)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 mt-0.5"
            >
              <Trash className="h-3 w-3" />
            </Button>
          </div>
          {node.employees.length > 0 && (
            <div className="ml-4 mt-1 space-y-1">
              {node.employees.map((emp) => (
                <div
                  key={emp.id}
                  className="inline-flex items-center rounded-full bg-white border border-gray-200 px-3 py-1 text-xs text-gray-800 shadow-sm mr-2 mb-1"
                >
                  <span className="font-semibold mr-2">{emp.fullName}</span>
                  <span className="text-gray-500 mr-2">{emp.employeeCode}</span>
                  {emp.positionTitle && (
                    <span className="text-gray-400 italic">{emp.positionTitle}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {node.children.length > 0 && (
            <div className="ml-6 mt-2 border-l border-dashed border-gray-300 pl-4">
              <OrgChartTree nodes={node.children} depth={depth + 1} onDelete={onDelete} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function OrgChartPage() {
  const [chart, setChart] = useState<OrgChartNode[]>([])
  const [loading, setLoading] = useState(false)

  const deleteOrgUnit = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all child units and cannot be undone.`)) {
      return
    }
    
    try {
      await apiClient.delete(`/hr/core/org-units/${id}`)
      // Reload the chart
      const fetchChart = async () => {
        setLoading(true)
        try {
          const res = await apiClient.get<OrgChartNode[] | { data: OrgChartNode[] } | any>(
            '/hr/core/org-units/org-chart',
          )
          const payload: any = res.data
          if (Array.isArray(payload)) {
            setChart(payload)
          } else if (Array.isArray(payload?.data)) {
            setChart(payload.data)
          } else if (Array.isArray(payload?.data?.data)) {
            setChart(payload.data.data)
          } else {
            setChart([])
          }
        } catch (error) {
          console.error('Failed to load org chart', error)
          setChart([])
        } finally {
          setLoading(false)
        }
      }
      await fetchChart()
    } catch (error) {
      console.error('Failed to delete org unit', error)
      alert('Failed to delete org unit. It may have associated employees or dependencies.')
    }
  }

  useEffect(() => {
    const fetchChart = async () => {
      setLoading(true)
      try {
        const res = await apiClient.get<OrgChartNode[] | { data: OrgChartNode[] } | any>(
          '/hr/core/org-units/org-chart',
        )
        const payload: any = res.data
        if (Array.isArray(payload)) {
          setChart(payload)
        } else if (Array.isArray(payload?.data)) {
          setChart(payload.data)
        } else if (Array.isArray(payload?.data?.data)) {
          setChart(payload.data.data)
        } else {
          setChart([])
        }
      } catch (error) {
        console.error('Failed to load org chart', error)
        setChart([])
      } finally {
        setLoading(false)
      }
    }
    fetchChart()
  }, [])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-900">Org Chart</h2>
      <p className="text-gray-500">
        Visualize the organizational structure and reporting lines.
      </p>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Organization Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading org chart...</div>
          ) : chart.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No org units defined yet. Create org units and assign employees to see the chart.
            </div>
          ) : (
            <div className="py-2">
              <OrgChartTree nodes={chart} onDelete={deleteOrgUnit} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

