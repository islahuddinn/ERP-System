'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, ArrowRight, Factory, Warehouse, Package, TrendingUp } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { login, isAuthenticated } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      window.location.href = '/dashboard'
    }
  }, [isAuthenticated])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleCanPlay = () => {
      setVideoError(false)
      video.muted = true
      video.play().catch((err) => {
        console.error('Error playing video:', err)
        setVideoError(true)
      })
    }

    const handleError = () => {
      console.error('Video error occurred')
      setVideoError(true)
    }

    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password || !tenantId) {
      return
    }

    setIsSubmitting(true)
    
    try {
      await login({
        email,
        password,
        tenantId,
      })
      // Redirect is handled by AuthContext
    } catch (error: any) {
      // Error is already handled by AuthContext (toast shown)
      console.error('Login failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-full overflow-hidden overscroll-none bg-gray-900">
      {/* Video Background */}
      <div className="absolute inset-0 h-full w-full">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          preload="auto"
        >
          <source src="/videos/background_loop.mp4" type="video/mp4" />
        </video>
        {/* Fallback gradient if video doesn't load */}
        {videoError && (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100"></div>
        )}
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Left Section - Marketing Content */}
      <div className="hidden lg:flex lg:w-[60%] relative z-10 overflow-hidden">
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 py-16">
          <div className="max-w-lg">
            {/* Logo */}
            <div className="flex items-center mb-12">
              <div className="w-24 h-24 flex items-center justify-center mr-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-3">
                <Image
                  src="/images/logo.png"
                  alt="Malind Tech Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                  Malind <span className="text-green-400">Tech</span>
                </h1>
                <p className="text-gray-100 text-xl font-semibold drop-shadow-md">Distribution Management System</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
              <h2 className="text-5xl font-bold leading-tight text-white drop-shadow-lg">
                Streamline Your
                <span className="block text-green-400">Production Operations</span>
              </h2>
              
              <p className="text-lg text-gray-100 leading-relaxed drop-shadow-md">
                Manage warehouses, production orders, material flow, and quality control seamlessly. 
                Built for modern factories that demand precision, efficiency, and complete visibility.
              </p>

              {/* Features */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Factory className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium drop-shadow-md">Complete production tracking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Warehouse className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium drop-shadow-md">Warehouse & zone management</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium drop-shadow-md">Material flow & batch tracking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium drop-shadow-md">Real-time analytics & reporting</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-white/20">
              <p className="text-white text-sm font-medium drop-shadow-md">
                Empowering a digital tomorrow
              </p>
              <p className="text-gray-200 text-xs mt-2 drop-shadow-sm">
                Developed by Malind Tech Solutions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-[40%] relative z-10 flex items-center justify-center overflow-y-auto overscroll-contain p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center justify-center mb-10">
            <div className="w-32 h-32 flex items-center justify-center mb-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4">
              <Image
                src="/images/logo.png"
                alt="Malind Tech Logo"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                Malind <span className="text-green-400">Tech</span>
              </h1>
              <p className="text-gray-100 text-xl font-semibold drop-shadow-md">Factory Management System</p>
            </div>
          </div>

          {/* Login Card */}
          <div className="relative bg-white/15 backdrop-blur-xl rounded-3xl shadow-2xl p-8 lg:p-10 border border-white/30 overflow-hidden">
            {/* Subtle gradient border effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-green-500/10 via-transparent to-green-400/5 pointer-events-none"></div>
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-green-400 to-green-500"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Welcome Back</h2>
                <p className="text-gray-100 drop-shadow-md">Sign in to your factory management account</p>
              </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white drop-shadow-md">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="h-12 px-4 bg-white/25 border-white/40 !text-white placeholder:text-white/70 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:bg-white/30 transition-all duration-300 backdrop-blur-sm shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantId" className="text-white drop-shadow-md">
                  Tenant ID <span className="text-red-300">*</span>
                </Label>
                <Input
                  id="tenantId"
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="e.g. 0084, silk-production-factory, or full UUID"
                  required
                  className="h-12 px-4 bg-white/25 border-white/40 !text-white placeholder:text-white/70 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:bg-white/30 transition-all duration-300 backdrop-blur-sm shadow-sm"
                />
                <p className="text-xs text-gray-200 mt-1 drop-shadow-sm">
                  From Super Admin → Tenants: short code, subdomain, or tenant UUID (not the master row number alone unless it matches your short code).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white drop-shadow-md">
                  Password <span className="text-red-300">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="h-12 px-4 pr-12 bg-white/25 border-white/40 !text-white placeholder:text-white/70 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:bg-white/30 transition-all duration-300 backdrop-blur-sm shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-200 hover:text-white transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit"
                disabled={isSubmitting || !email || !password || !tenantId}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] focus:ring-4 focus:ring-green-500/50 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" 
              >
                <div className="flex items-center justify-center space-x-2">
                  {isSubmitting ? (
                    <>
                      <span>Signing in...</span>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </div>
              </Button>
            </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
