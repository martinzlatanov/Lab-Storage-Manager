// ─── Auth Context ─────────────────────────────────────────────────────────────
// Provides authentication state and actions to the entire application.

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AuthUser } from '../api/auth'
import * as authApi from '../api/auth'
import { clearTokens } from '../api/client'

const DEV_AUTO_LOGIN = import.meta.env.VITE_DEV_AUTO_LOGIN === 'true'
const DEV_USERNAME = import.meta.env.VITE_DEV_USERNAME ?? 'admin'
const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD ?? 'admin'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_KEY = 'auth_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY)
      return stored ? (JSON.parse(stored) as AuthUser) : null
    } catch {
      return null
    }
  })
  // Start in loading state when dev auto-login is enabled and no session exists
  const [isLoading, setIsLoading] = useState(DEV_AUTO_LOGIN && !localStorage.getItem(USER_KEY))

  // Persist user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }, [user])

  // Clear auth state when the API client signals a session expiry (401 after refresh failure)
  // In dev auto-login mode, re-login immediately instead of dropping to the login page.
  useEffect(() => {
    function handleExpired() {
      if (DEV_AUTO_LOGIN) {
        authApi.login(DEV_USERNAME, DEV_PASSWORD)
          .then(setUser)
          .catch(() => setUser(null))
      } else {
        setUser(null)
      }
    }
    window.addEventListener('auth:session-expired', handleExpired)
    return () => window.removeEventListener('auth:session-expired', handleExpired)
  }, [])

  // Auto-login for development: runs once on mount if no existing session
  useEffect(() => {
    if (!DEV_AUTO_LOGIN || user) return
    authApi.login(DEV_USERNAME, DEV_PASSWORD)
      .then(setUser)
      .catch((err) => console.error('[DEV_AUTO_LOGIN] Failed:', err))
      .finally(() => setIsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const authUser = await authApi.login(username, password)
      setUser(authUser)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await authApi.logout()
    } finally {
      clearTokens()
      setUser(null)
      setIsLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
