// ─── Auth Context ─────────────────────────────────────────────────────────────
// Provides authentication state and actions to the entire application.

import { createContext, useContext, type ReactNode } from 'react'
import type { AuthUser } from '../api/auth'

// DEV MODE — auth bypassed, no LDAP required
const DEV_USER: AuthUser = { id: 'dev', username: 'dev', displayName: 'Dev User', role: 'admin' }

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{
      user: DEV_USER,
      isAuthenticated: true,
      isLoading: false,
      login: async () => {},
      logout: async () => {},
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
