// ─── API Client Base ──────────────────────────────────────────────────────────
// Centralized fetch wrapper with JWT auth, auto-refresh, and error handling.

const configuredBaseUrl = (import.meta.env.VITE_API_URL ?? '').trim()
const BASE_URL = configuredBaseUrl.length > 0 ? configuredBaseUrl : '/api/v1'

/** Retrieve the stored access token. */
function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

/** Retrieve the stored refresh token. */
function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token')
}

/** Store tokens after login or refresh. */
export function setTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

/** Clear tokens on logout. */
export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

/** Try to refresh the access token using the stored refresh token. Returns true on success. */
async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) return false

    const json = await res.json()
    if (json.success) {
      setTokens(json.data.accessToken, json.data.refreshToken)
      return true
    }
    return false
  } catch {
    return false
  }
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Main fetch wrapper. Automatically injects the Authorization header,
 * retries once on 401 after refreshing the token, and returns parsed JSON.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const doFetch = async (): Promise<Response> => {
    const token = getAccessToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
    return fetch(`${BASE_URL}${path}`, { ...options, headers })
  }

  let res = await doFetch()

  // Auto-refresh on 401
  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      res = await doFetch()
    } else {
      clearTokens()
      throw new ApiError('Session expired', 401)
    }
  }

  let json: any
  try {
    json = await res.json()
  } catch {
    throw new ApiError(`Server error (${res.status})`, res.status)
  }

  if (!res.ok || json.success === false) {
    throw new ApiError(json.error ?? 'Request failed', res.status)
  }

  return json as T
}

/** Helper for GET requests. */
export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' })
}

/** Helper for POST requests. */
export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

/** Helper for PATCH requests. */
export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}

/** Helper for DELETE requests. */
export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' })
}

/** Build a query string from an object, omitting undefined/null values. */
export function toQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null) as [string, string | number | boolean][]
  if (entries.length === 0) return ''
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
}
