// ─── Auth API ─────────────────────────────────────────────────────────────────

import { apiPost, setTokens, clearTokens } from './client'

export interface LoginResponse {
  success: true
  data: {
    accessToken: string
    refreshToken: string
    user: {
      id: string
      username: string
      displayName: string
      role: string
      siteId?: string
    }
  }
}

export interface AuthUser {
  id: string
  username: string
  displayName: string
  role: string
  siteId?: string
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await apiPost<LoginResponse>('/auth/login', { username, password })
  setTokens(res.data.accessToken, res.data.refreshToken)
  return res.data.user
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('refresh_token')
  try {
    if (refreshToken) {
      await apiPost('/auth/logout', { refreshToken })
    }
  } finally {
    clearTokens()
  }
}
