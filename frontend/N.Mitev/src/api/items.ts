// ─── Items API ────────────────────────────────────────────────────────────────

import { apiGet, apiPost, apiPatch, toQueryString } from './client'
import type { AnyItem } from '../types'

// ── Response types ──────────────────────────────────────────────────────────

export interface ItemListResponse {
  success: true
  data: AnyItem[]
  meta: { total: number; page: number; pageSize: number; totalPages: number }
}

export interface ItemDetailResponse {
  success: true
  data: AnyItem
}

export interface ItemHistoryResponse {
  success: true
  data: Array<{
    id: string
    operationType: string
    performedAt: string
    notes?: string
    performedBy: { id: string; displayName: string }
    fromLocation?: { id: string; label: string }
    toLocation?: { id: string; label: string }
    fromContainer?: { id: string; label: string }
    toContainer?: { id: string; label: string }
    fromExternalLocation?: { id: string; name: string }
    toExternalLocation?: { id: string; name: string }
    expectedReturnDate?: string
    quantityConsumed?: number
  }>
}

// ── Query params ────────────────────────────────────────────────────────────

export interface ItemListParams {
  itemType?: string
  status?: string
  siteId?: string
  locationId?: string
  containerId?: string
  search?: string
  page?: number
  pageSize?: number
}

// ── API functions ───────────────────────────────────────────────────────────

export function getItems(params: ItemListParams = {}): Promise<ItemListResponse> {
  return apiGet<ItemListResponse>(`/items${toQueryString({ ...params })}`)
}

export function getItem(id: string): Promise<ItemDetailResponse> {
  return apiGet<ItemDetailResponse>(`/items/${id}`)
}

export function getItemHistory(id: string): Promise<ItemHistoryResponse> {
  return apiGet<ItemHistoryResponse>(`/items/${id}/history`)
}

export function scanBarcode(barcode: string): Promise<ItemDetailResponse> {
  return apiGet<ItemDetailResponse>(`/items/scan/${encodeURIComponent(barcode)}`)
}

export function createItem(type: string, data: Record<string, unknown>): Promise<{ success: true; data: AnyItem }> {
  return apiPost(`/items/${type}`, data)
}

export function updateItem(id: string, data: Record<string, unknown>): Promise<{ success: true; data: AnyItem }> {
  return apiPatch(`/items/${id}`, data)
}
