/**
 * Cookie utility functions for secure token management
 * These functions provide a safer way to handle authentication tokens
 */

interface CookieOptions {
  days?: number
  path?: string
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

/**
 * Set a cookie with secure defaults
 */
export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  if (typeof document === 'undefined') return
  const {
    days = 7,
    path = '/',
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'strict',
  } = options

  const maxAge = days * 24 * 60 * 60 // Convert days to seconds
  
  let cookieString = `${name}=${value}; path=${path}; max-age=${maxAge}; samesite=${sameSite}`
  
  if (secure) {
    cookieString += '; secure'
  }
  
  document.cookie = cookieString
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  
  for (let cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=')
    if (cookieName === name) {
      return cookieValue
    }
  }
  
  return null
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string, path: string = '/'): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:01 GMT;`
}

/**
 * Clear all authentication cookies
 */
export function clearAuthCookies(): void {
  deleteCookie('auth_token')
  deleteCookie('refresh_token')
}

/**
 * Set authentication tokens in cookies
 */
export function setAuthTokens(accessToken: string, refreshToken?: string): void {
  setCookie('auth_token', accessToken, { days: 7 })
  if (refreshToken) {
    setCookie('refresh_token', refreshToken, { days: 30 })
  }
}
