'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { superAdminApiClient } from '@/lib/super-admin-api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import { toast } from 'react-hot-toast'
import { Eye, EyeOff, Shield } from 'lucide-react'
import Image from 'next/image'

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [bootstrapKey, setBootstrapKey] = useState('')
  const [bootstrapEnabled, setBootstrapEnabled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    superAdminApiClient
      .get('/super-admin/auth/bootstrap-status')
      .then((res) => {
        const payload = res.data?.data ?? res.data
        setBootstrapEnabled(Boolean(payload?.bootstrapEnabled))
      })
      .catch(() => setBootstrapEnabled(false))
  }, [])

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      await superAdminApiClient.post('/super-admin/auth/bootstrap', {
        email,
        password,
        bootstrapKey,
      })
      toast.success('Super admin created. Sign in with those credentials.')
      setBootstrapEnabled(false)
      setBootstrapKey('')
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Could not create super admin')
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await superAdminApiClient.post('/super-admin/auth/login', {
        email,
        password,
      })
      const payload = response.data?.data ?? response.data
      const accessToken = payload?.access_token
      const user = payload?.user

      if (accessToken && user) {
        // Store token in localStorage
        localStorage.setItem('superAdminToken', accessToken)
        localStorage.setItem('superAdminUser', JSON.stringify(user))
        
        // Ensure localStorage is written before navigation
        // Use a small delay to ensure state is persisted
        await new Promise(resolve => setTimeout(resolve, 50))
        
        toast.success('Login successful!')
        
        // Use replace to avoid adding to history
        router.replace('/super-admin/dashboard')
      } else {
        throw new Error('Login response missing token or user data')
      }
    } catch (error: any) {
      const errorMessage = getApiErrorMessage(error, 'Invalid email or password')
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative bg-gray-50">
      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="factory-light-card p-8 space-y-6 shadow-lg">
            {/* Logo and Title */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Super Admin</h1>
                <p className="text-gray-600 mt-2">Access the admin control panel</p>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-900 whitespace-pre-line">{error}</AlertDescription>
              </Alert>
            )}

            {bootstrapEnabled && (
              <form onSubmit={handleBootstrap} className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Create the first super admin</h2>
                  <p className="mt-1 text-xs text-gray-600">
                    No super admin exists yet. Use the bootstrap key from the backend env
                    variable <code>SUPER_ADMIN_BOOTSTRAP_KEY</code>.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup-email">Email</Label>
                  <Input id="setup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup-password">Password (8+ characters)</Label>
                  <Input id="setup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bootstrap-key">Bootstrap key</Label>
                  <Input id="bootstrap-key" type="password" value={bootstrapKey} onChange={e => setBootstrapKey(e.target.value)} required disabled={isLoading} />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {isLoading ? 'Creating…' : 'Create super admin'}
                </Button>
              </form>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="superadmin@malindtech.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="factory-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="factory-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Logging in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-500 text-sm mt-6">
            © 2024 Malind Tech. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

