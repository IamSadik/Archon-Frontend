import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { clearAuthCookies, getCookie } from './cookies'
import { isRetryableBackendError, wakeBackend } from './backend-health'

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const API_URL = RAW_API_URL.replace(/\/+$/, '')

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  __retryCount?: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
  // withCredentials: true, // removed to prevent CSRF 403 errors with DRF SessionAuth
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Skip adding token for auth endpoints (login, register)
  const isAuthEndpoint = config.url?.includes('/auth/login') ||
    config.url?.includes('/auth/register') ||
    config.url?.includes('/auth/refresh')

  if (!isAuthEndpoint) {
    const token = getCookie('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  return config
})

// Retry Render cold-start / wake failures, then handle auth errors.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined
    const status = error.response?.status

    if (config && isRetryableBackendError(status)) {
      config.__retryCount = config.__retryCount ?? 0

      if (config.__retryCount < 4) {
        config.__retryCount += 1

        if (config.__retryCount === 1) {
          await wakeBackend()
        } else {
          await sleep(config.__retryCount * 2000)
        }

        return api(config)
      }
    }

    // Handle both 401 (Unauthorized) and 403 (Forbidden) as authentication failures
    if (status === 401 || status === 403) {
      clearAuthCookies()
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=true'
      }
    }

    return Promise.reject(error)
  }
)

export default api
