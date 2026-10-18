"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEmployees, type Employee } from "@/hooks/useEmployees"

function employeeName(employee: Employee): string {
  if (employee.user) {
    return `${employee.user.firstName} ${employee.user.lastName}`.trim()
  }
  return employee.employeeCode
}

function isLeadershipRole(roleName: string | undefined): boolean {
  if (!roleName) return false
  const name = roleName.toLowerCase()
  return (
    name.includes("manager") ||
    name.includes("admin") ||
    name.includes("supervisor") ||
    name.includes("head")
  )
}

export default function ManagersPage() {
  const router = useRouter()
  const { data, isLoading, isError } = useEmployees({ status: "ACTIVE", limit: 100 })

  const employees = data?.data ?? []
  const managers = useMemo(
    () => employees.filter((employee) => isLeadershipRole(employee.user?.role?.name)),
    [employees],
  )
  const rows = managers.length > 0 ? managers : employees

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load employees")
    }
  }, [isError])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Managers</h2>
          <p className="text-sm text-gray-500 mt-1">
            Leadership roles from live employee records. Org structure is on the Org Chart.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/hr/org-chart")}>
          Open Org Chart
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{managers.length > 0 ? "Leadership" : "Active employees"}</CardTitle>
          <CardDescription>
            {managers.length > 0
              ? "Employees whose system role is a manager, supervisor, admin, or head."
              : "No manager-named roles yet — showing active employees. Assign roles on Users, or use Org Chart for reporting lines."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No active employees. Add people under HR → Employees first.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((employee) => (
                <div key={employee.id} className="border rounded-lg p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {employee.employeeCode} — {employeeName(employee)}
                      </span>
                      <Badge className="bg-green-100 text-green-800">{employee.status}</Badge>
                    </div>
                    {employee.user?.email && (
                      <div className="text-sm text-gray-600">{employee.user.email}</div>
                    )}
                    {employee.user?.role?.name && (
                      <div className="text-sm text-gray-600">
                        <strong>Role:</strong> {employee.user.role.name}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/hr/employees/${employee.id}`)}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
