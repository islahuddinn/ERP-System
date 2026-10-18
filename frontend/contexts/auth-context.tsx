'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService, User, LoginCredentials, RegisterData } from '@/lib/auth-service'
import { toast } from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  /** Flat list of the user's granted permission names, from the login response. */
  permissions: string[]
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedUser = authService.getUser()
        const token = authService.getToken()

        if (storedUser && token && !authService.isTokenExpired()) {
          setUser(storedUser)
          setPermissions(authService.getPermissions())
        } else {
          // Token expired or missing - clear auth
          authService.logout()
          setUser(null)
          setPermissions([])
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        authService.logout()
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  // Keep permissions live: re-fetch the current user's effective permissions from the
  // server on mount and whenever the tab regains focus, so a role/permission change
  // applies without requiring a re-login (#12).
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    const refresh = async () => {
      const perms = await authService.refreshPermissions()
      if (!cancelled) setPermissions(perms)
    }
    refresh()
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [user?.id])

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      const response = await authService.login(credentials)
      setUser(response.user)
      setPermissions(authService.getPermissions())
      toast.success('Login successful!')
      router.push('/dashboard')
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed. Please check your credentials.'
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true)
      await authService.register(data)
      toast.success('Registration successful! Please login.')
      router.push('/auth/login')
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed.'
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
    setPermissions([])
    toast.success('Logged out successfully')
    router.push('/auth/login')
  }

  const refreshUser = async () => {
    try {
      const storedUser = authService.getUser()
      if (storedUser) {
        setUser(storedUser)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  const value: AuthContextType = {
    user,
    permissions,
    isLoading,
    isAuthenticated: !!user && authService.isAuthenticated() && !authService.isTokenExpired(),
    login,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

