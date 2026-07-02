import axios from 'axios'
import { clearAuthCookies, getCookie } from './cookies'

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const API_URL = RAW_API_URL.replace(/\/+$/, '')

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  // withCredentials: true, // removed to prevent CSRF 403 errors with DRF SessionAuth
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Skip adding token for auth endpoints (login, register)
  const isAuthEndpoint = config.url?.includes('/auth/login') ||
    config.url?.includes('/auth/register') ||
    config.url?.includes('/auth/refresh')

  if (!isAuthEndpoint) {
    // Try to get token from cookie first (more secure)
    let token = getCookie('auth_token')

    // Fallback to localStorage during migration
    if (!token) {
      token = localStorage.getItem('token')
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  return config
})

// Handle errors and automatic logout on 401 and 403
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle both 401 (Unauthorized) and 403 (Forbidden) as authentication failures
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear all auth data
      clearAuthCookies()
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')

      // Redirect to login if not already there
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=true'
      }
    }
    return Promise.reject(error)
  }
)

export default api
