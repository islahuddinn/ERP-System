import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import axios from 'axios'

// Use internal URL for server-to-server calls if in Docker environment
const API_BASE_URL = process.env.NEXTAUTH_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantId: { label: 'Tenant ID', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // TenantId is required for multi-tenant login
        if (!credentials?.tenantId) {
          throw new Error('Tenant ID is required for login')
        }

        try {
          console.log('Attempting login with:', credentials.email, 'tenantId:', credentials.tenantId)

          const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: credentials.email,
            password: credentials.password,
            tenantId: credentials.tenantId,
          }, {
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-Id': credentials.tenantId,
            },
            timeout: 10000, // 10 second timeout
          })

          console.log('Login response status:', response.status)
          console.log('Login response data:', response.data)

          // Backend wraps the payload as { success, message, data: { access_token, user } }.
          // Fall back to the flat shape for safety. The RBAC-refactored User has
          // firstName/lastName + roleId (no `name`/`role` enum), so compose a display
          // name and carry roleId — permission gating is done via the permissions API.
          const body = response.data?.data ?? response.data
          const u = body?.user
          if (u) {
            return {
              id: u.id,
              name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email,
              email: u.email,
              role: u.roleId ?? u.role,
              tenantId: u.tenantId,
              accessToken: body.access_token,
            }
          }
        } catch (error) {
          console.error('Auth error:', error)

          // Type guard to check if error is an AxiosError
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as any
            console.error('Error response status:', axiosError.response?.status)
            console.error('Error response data:', axiosError.response?.data)
          } else if (error && typeof error === 'object' && 'request' in error) {
            const axiosError = error as any
            console.error('No response received:', axiosError.request)
          } else if (error && typeof error === 'object' && 'message' in error) {
            const errorWithMessage = error as any
            console.error('Error setting up request:', errorWithMessage.message)
          } else {
            console.error('Unknown error occurred:', error)
          }
        }

        return null
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in
      if (user) {
        token.accessToken = user.accessToken
        token.role = user.role
        token.tenantId = (user as any).tenantId
        token.exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role
        session.user.tenantId = (token as any).tenantId // ← NEW: Include tenantId in session
        session.accessToken = token.accessToken
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/login',
  },
  debug: process.env.NODE_ENV !== 'production',
}
