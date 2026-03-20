// ─── Sites & Locations API ────────────────────────────────────────────────────

import { apiGet, apiPost, toQueryString } from './client'
import type { ExternalLocation } from '../types'

// ── Response types ──────────────────────────────────────────────────────────

export interface SitesResponse {
  success: true
  data: Array<{
    id: string
    name: string
    createdAt: string
    buildings: Array<{
      id: string
      name: string
      createdAt: string
    }>
  }>
}

export interface BuildingsResponse {
  success: true
  data: Array<{
    id: string
    name: string
    siteId: string
    storageAreas: Array<{
      id: string
      code: string
    }>
  }>
}

export interface AreasResponse {
  success: true
  data: Array<{
    id: string
    code: string
    buildingId: string
    locations: Array<{
      id: string
      row: string
      shelf: string
      level: string
      label: string
    }>
  }>
}

export interface LocationDetailResponse {
  success: true
  data: {
    id: string
    label: string
    row: string
    shelf: string
    level: string
    storageArea: {
      code: string
      building: { name: string; site: { name: string } }
    }
    items: Array<Record<string, unknown>>
    containers: Array<Record<string, unknown>>
  }
}

export interface ExternalLocationsResponse {
  success: true
  data: ExternalLocation[]
}

// ── API functions ───────────────────────────────────────────────────────────

export function getSites(): Promise<SitesResponse> {
  return apiGet<SitesResponse>('/sites')
}

export function getBuildings(siteId: string): Promise<BuildingsResponse> {
  return apiGet<BuildingsResponse>(`/sites/${siteId}/buildings`)
}

export function getAreas(buildingId: string): Promise<AreasResponse> {
  return apiGet<AreasResponse>(`/buildings/${buildingId}/areas`)
}

export function getLocationDetail(locationId: string): Promise<LocationDetailResponse> {
  return apiGet<LocationDetailResponse>(`/locations/${locationId}`)
}

export function getExternalLocations(): Promise<ExternalLocationsResponse> {
  return apiGet<ExternalLocationsResponse>('/external-locations')
}

export function createSite(name: string): Promise<{ success: true; data: { id: string; name: string } }> {
  return apiPost('/sites', { name })
}

export function createBuilding(siteId: string, name: string): Promise<{ success: true; data: { id: string; name: string } }> {
  return apiPost(`/sites/${siteId}/buildings`, { name })
}

export function createArea(buildingId: string, code: string): Promise<{ success: true; data: { id: string; code: string } }> {
  return apiPost(`/buildings/${buildingId}/areas`, { code })
}

export function createLocation(areaId: string, row: string, shelf: string, level: string): Promise<{ success: true; data: { id: string; label: string } }> {
  return apiPost(`/areas/${areaId}/locations`, { row, shelf, level })
}

export function createExternalLocation(data: Omit<ExternalLocation, 'id'>): Promise<{ success: true; data: ExternalLocation }> {
  return apiPost('/external-locations', data)
}

export interface LocationsFlatResponse {
  success: true
  data: Array<{ id: string; label: string; buildingName: string; siteName: string }>
}

export function getLocationsFlat(params: { siteId?: string } = {}): Promise<LocationsFlatResponse> {
  const qs = toQueryString(params)
  return apiGet<LocationsFlatResponse>(`/locations${qs}`)
}
