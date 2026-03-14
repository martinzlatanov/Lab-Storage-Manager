// ─── Auth Context ─────────────────────────────────────────────────────────────
// Provides authentication state and actions to the entire application.

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { login as apiLogin, logout as apiLogout, type AuthUser } from '../api/auth'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Restore user from localStorage on mount — only if access_token also exists
    const stored = localStorage.getItem('auth_user')
    const token = localStorage.getItem('access_token')
    if (stored && token) return JSON.parse(stored)
    // Token is missing — clear stale user data
    localStorage.removeItem('auth_user')
    return null
  })
  const [isLoading, setIsLoading] = useState(false)

  const isAuthenticated = !!user && !!localStorage.getItem('access_token')

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const authUser = await apiLogin(username, password)
      setUser(authUser)
      localStorage.setItem('auth_user', JSON.stringify(authUser))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setUser(null)
      localStorage.removeItem('auth_user')
    }
  }, [])

  // Listen for storage events (token cleared by another tab or auto-refresh failure)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'access_token' && !e.newValue) {
        setUser(null)
        localStorage.removeItem('auth_user')
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
