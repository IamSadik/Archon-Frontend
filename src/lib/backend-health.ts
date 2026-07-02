const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '')

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isRetryableBackendError(status?: number) {
  return !status || status === 502 || status === 503 || status === 504
}

export async function wakeBackend(maxAttempts = 4): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}/health/`, {
        method: 'GET',
        cache: 'no-store',
      })
      if (response.ok) {
        return true
      }
    } catch {
      // Render free tier may still be waking from hibernation.
    }

    await sleep(attempt * 2000)
  }

  return false
}

export function getApiBaseUrl() {
  return API_URL
}
