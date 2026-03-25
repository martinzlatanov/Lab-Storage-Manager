// ─── Users API ────────────────────────────────────────────────────────────────

import { apiGet, apiPatch, apiDelete } from './client'
import type { User } from '../types'

export interface UsersResponse {
  success: true
  data: User[]
}

export interface UserResponse {
  success: true
  data: User
}

export function getUsers(includeInactive = false): Promise<UsersResponse> {
  return apiGet<UsersResponse>(`/users${includeInactive ? '?includeInactive=true' : ''}`)
}

export function updateUser(id: string, data: { role?: string; siteId?: string | null; isActive?: boolean; displayName?: string; email?: string }): Promise<UserResponse> {
  return apiPatch<UserResponse>(`/users/${id}`, data)
}

export function deactivateUser(id: string): Promise<{ success: true; data: null }> {
  return apiDelete(`/users/${id}`)
}
