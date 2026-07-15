/**
 * Central env resolution for API / WebSocket bases.
 *
 * Toggle in `.env.local`:
 *   NEXT_PUBLIC_APP_ENV=development  → Django on http://localhost:8000
 *   NEXT_PUBLIC_APP_ENV=production   → deployed backend URLs
 *
 * Restart `next dev` after changing env values (NEXT_PUBLIC_* is inlined at build/start).
 */

export type AppEnv = 'development' | 'production'

const DEFAULT_DEV_API = 'http://localhost:8000'
const DEFAULT_PROD_API = 'https://archon-backend-mc2k.onrender.com'

function stripTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '')
}

/** Ensure absolute http(s) URL — bare "localhost:8000" breaks fetch ("scheme localhost"). */
export function normalizeHttpUrl(raw: string | undefined | null, fallback: string): string {
  const value = (raw || fallback).trim()
  if (!value) return stripTrailingSlashes(fallback)

  if (/^https?:\/\//i.test(value)) {
    return stripTrailingSlashes(value)
  }

  // Common mistake: host without scheme
  if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(value) || /^[\w.-]+:\d+/.test(value)) {
    return stripTrailingSlashes(`http://${value}`)
  }

  // Bare production host without scheme → assume https
  if (/^[\w.-]+\.[a-z]{2,}/i.test(value)) {
    return stripTrailingSlashes(`https://${value}`)
  }

  return stripTrailingSlashes(fallback)
}

function httpToWs(httpUrl: string): string {
  return httpUrl.replace(/^http/i, (scheme) =>
    scheme.toLowerCase() === 'https' ? 'wss' : 'ws'
  )
}

export function getAppEnv(): AppEnv {
  const raw = (process.env.NEXT_PUBLIC_APP_ENV || '').trim().toLowerCase()
  if (raw === 'production' || raw === 'prod') return 'production'
  if (raw === 'development' || raw === 'dev' || raw === 'local') return 'development'

  // Fall back to Next's NODE_ENV when APP_ENV is unset
  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

export function getApiBaseUrl(): string {
  const appEnv = getAppEnv()

  if (appEnv === 'development') {
    // Do not fall back to NEXT_PUBLIC_API_URL here — that is often still the prod host.
    return normalizeHttpUrl(process.env.NEXT_PUBLIC_DEV_API_URL, DEFAULT_DEV_API)
  }

  return normalizeHttpUrl(
    process.env.NEXT_PUBLIC_PROD_API_URL || process.env.NEXT_PUBLIC_API_URL,
    DEFAULT_PROD_API
  )
}

export function getWsBaseUrl(): string {
  const appEnv = getAppEnv()
  const apiUrl = getApiBaseUrl()
  const derived = httpToWs(apiUrl)

  const configured =
    appEnv === 'development'
      ? process.env.NEXT_PUBLIC_DEV_WS_URL
      : process.env.NEXT_PUBLIC_PROD_WS_URL || process.env.NEXT_PUBLIC_WS_URL

  if (!configured?.trim()) {
    return derived
  }

  // Take first entry if someone pasted a comma-separated list
  const first = configured.split(',')[0].trim()

  try {
    const withScheme = /^wss?:\/\//i.test(first)
      ? first
      : /^https?:\/\//i.test(first)
        ? first.replace(/^http/i, (s) => (s.toLowerCase() === 'https' ? 'wss' : 'ws'))
        : httpToWs(normalizeHttpUrl(first, apiUrl))

    const normalized = stripTrailingSlashes(withScheme)
    const wsHost = new URL(normalized).host
    const apiHost = new URL(apiUrl).host

    // Ignore stale WS host that doesn't match the active API (e.g. leftover localhost in prod)
    if (wsHost !== apiHost) {
      return derived
    }

    return normalized
  } catch {
    return derived
  }
}

export const APP_ENV = getAppEnv()
export const API_BASE_URL = getApiBaseUrl()
export const WS_BASE_URL = getWsBaseUrl()
