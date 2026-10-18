import axios from 'axios'
import { authService } from './auth-service'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Skip ngrok's free-tier browser-warning interstitial on XHR/fetch so API
    // responses come back as JSON instead of ngrok's HTML page. Harmless when
    // not served through ngrok (the header is simply ignored).
    'ngrok-skip-browser-warning': 'true',
  },
  withCredentials: false,
})

// Request interceptor to add auth token and tenant ID
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const urlPath = `${config.url ?? ''}`.toLowerCase()
      const isSuperAdminRequest = urlPath.includes('/super-admin/')

      let token: string | null = null
      let tenantId: string | null = null

      if (!isSuperAdminRequest) {
        // Get token from auth service
        token = authService.getToken()
        tenantId = authService.getTenantId()

        if (token) {
          config.headers.Authorization = `Bearer ${token}`
          // Tenant is taken from JWT on the backend; do not send a stale X-Tenant-Id
          // from localStorage or you may see another tenant's data after switching users.
          delete (config.headers as any)['X-Tenant-Id']
        } else if (tenantId) {
          config.headers['X-Tenant-Id'] = tenantId
        }
      } else {
        // Super admin requests don't use tenant tokens
        delete config.headers.Authorization
        delete config.headers['X-Tenant-Id']
      }

    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    const urlPath = `${response.config?.url ?? ''}`.toLowerCase()
    return response
  },
  (error) => {
    const urlPath = `${error.config?.url ?? ''}`.toLowerCase()
    const isSuperAdminRequest = urlPath.includes('/super-admin/')

    // Debug logging removed after verification

    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401 && !isSuperAdminRequest) {
      // Clear auth data and redirect to login
      if (typeof window !== 'undefined') {
        authService.logout()
        window.location.href = '/auth/login'
      }
    }

    return Promise.reject(error)
  }
)

