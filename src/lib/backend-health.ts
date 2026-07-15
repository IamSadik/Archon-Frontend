import { API_BASE_URL } from './env'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isRetryableBackendError(status?: number) {
  return !status || status === 502 || status === 503 || status === 504
}

export async function wakeBackend(maxAttempts = 6): Promise<boolean> {
  // Cold-start wake is only relevant for hosted free-tier backends.
  if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
    try {
      const response = await fetch(`${API_BASE_URL}/health/`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE_URL}/health/`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      })
      if (response.ok) {
        return true
      }
    } catch {
      // Render free tier may still be waking from hibernation.
    }

    await sleep(Math.min(attempt * 2500, 12000))
  }

  return false
}

export function getApiBaseUrl() {
  return API_BASE_URL
}
