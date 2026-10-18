'use client'

import { useRouter } from 'next/navigation'
import { ShieldX, Home, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function AccessDeniedPage() {
  const router = useRouter()

  return (
    <ProtectedRoute>
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="bg-white border-gray-200 shadow-lg max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-4">
                <ShieldX className="h-12 w-12 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Access Denied</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              You don't have permission to access this resource.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                If you believe you should have access to this page, please contact your system administrator.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}

