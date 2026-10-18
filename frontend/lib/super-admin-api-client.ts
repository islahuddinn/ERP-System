import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export const superAdminApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

// Request interceptor to add super admin auth token
superAdminApiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('superAdminToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
superAdminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to super admin login on unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('superAdminToken')
        localStorage.removeItem('superAdminUser')
        window.location.href = '/super-admin/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

