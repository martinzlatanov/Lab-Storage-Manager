// ─── Containers API ───────────────────────────────────────────────────────────

import { apiGet, apiPost, apiPatch, toQueryString } from './client'

// ── Response types ──────────────────────────────────────────────────────────

export interface ContainerResponse {
  success: true
  data: {
    id: string
    barcode: string
    label: string
    notes?: string
    locationId?: string
    externalLocationId?: string
    location?: { id: string; label: string }
    items?: Array<Record<string, unknown>>
  }
}

export interface ContainerListResponse {
  success: true
  data: Array<ContainerResponse['data']>
}

// ── API functions ───────────────────────────────────────────────────────────

export function getContainers(params: Record<string, string | undefined> = {}): Promise<ContainerListResponse> {
  return apiGet<ContainerListResponse>(`/containers${toQueryString(params)}`)
}

export function getContainer(id: string): Promise<ContainerResponse> {
  return apiGet<ContainerResponse>(`/containers/${id}`)
}

export function createContainer(data: {
  barcode: string
  label: string
  notes?: string
  locationId?: string
  externalLocationId?: string
}): Promise<ContainerResponse> {
  return apiPost<ContainerResponse>('/containers', data)
}

export function updateContainer(id: string, data: {
  label?: string
  notes?: string
  locationId?: string
  externalLocationId?: string
}): Promise<ContainerResponse> {
  return apiPatch<ContainerResponse>(`/containers/${id}`, data)
}
