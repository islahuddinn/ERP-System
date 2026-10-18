'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

/**
 * User accounts are provisioned through the HR Employee flow — the new backend
 * has no standalone POST /users endpoint. A login account is created when an
 * employee is given login access, so we direct admins there instead.
 */
export default function CreateUserPage() {
  const router = useRouter()

  return (
    <ProtectedRoute requiredPermission="users.read">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/users')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-green-600" />
              Create User
            </h1>
            <p className="text-gray-600 mt-1">How to add a new user account.</p>
          </div>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm max-w-2xl">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" /> User accounts are created via HR
            </CardTitle>
            <CardDescription>
              User login accounts are provisioned through the HR Employee module. Create an employee and grant
              them login access — a user account is created automatically and appears in this list, where you can
              then assign a role and manage login access.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => router.push('/dashboard/hr/employees')} className="bg-green-600 hover:bg-green-700 text-white">
              Go to Employees
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/users')} className="border-gray-300">
              Back to Users
            </Button>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
