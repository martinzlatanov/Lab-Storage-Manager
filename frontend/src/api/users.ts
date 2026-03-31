// ─── Users API ────────────────────────────────────────────────────────────────

import { apiGet, apiPatch, apiDelete } from './client'
import type { User } from '../types'

export type PasswordResponse = { success: true; data: null }

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

/** Admin: set any user's password (no current password required). */
export function setUserPassword(id: string, newPassword: string): Promise<PasswordResponse> {
  return apiPatch<PasswordResponse>(`/users/${id}/password`, { newPassword })
}

/** Any authenticated user: change own password (currentPassword required for verification). */
export function changeMyPassword(id: string, currentPassword: string, newPassword: string): Promise<PasswordResponse> {
  return apiPatch<PasswordResponse>(`/users/${id}/password`, { currentPassword, newPassword })
}
