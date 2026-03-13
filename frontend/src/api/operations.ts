// ─── Operations API ───────────────────────────────────────────────────────────

import { apiGet, apiPost, toQueryString } from './client'

// ── Response types ──────────────────────────────────────────────────────────

export interface OperationResponse {
  success: true
  data: {
    id: string
    operationType: string
    itemId: string
    performedAt: string
    notes?: string
  }
}

export interface OperationListResponse {
  success: true
  data: Array<{
    id: string
    operationType: string
    performedAt: string
    notes?: string
    item: { id: string; barcode: string; itemType: string; labIdNumber: string; productName?: string; miscName?: string }
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
  meta: { total: number; page: number; pageSize: number; totalPages: number }
}

// ── Query params ────────────────────────────────────────────────────────────

export interface OperationListParams {
  itemId?: string
  operationType?: string
  performedById?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

// ── API functions ───────────────────────────────────────────────────────────

export function getOperations(params: OperationListParams = {}): Promise<OperationListResponse> {
  return apiGet<OperationListResponse>(`/operations${toQueryString({ ...params })}`)
}

export function recordReceipt(data: {
  itemId: string
  locationId?: string
  containerId?: string
  notes?: string
}): Promise<OperationResponse> {
  return apiPost<OperationResponse>('/operations/receipt', data)
}

export function recordMove(data: {
  itemId: string
  toLocationId?: string
  toContainerId?: string
  notes?: string
}): Promise<OperationResponse> {
  return apiPost<OperationResponse>('/operations/move', data)
}

export function recordExit(data: {
  itemId: string
  toExternalLocationId: string
  expectedReturnDate?: string
  notes?: string
}): Promise<OperationResponse> {
  return apiPost<OperationResponse>('/operations/exit', data)
}

export function recordReturn(data: {
  itemId: string
  toLocationId?: string
  toContainerId?: string
  notes?: string
}): Promise<OperationResponse> {
  return apiPost<OperationResponse>('/operations/return', data)
}

export function recordScrap(data: {
  itemId: string
  notes?: string
}): Promise<OperationResponse> {
  return apiPost<OperationResponse>('/operations/scrap', data)
}

export function recordConsume(data: {
  itemId: string
  quantityConsumed: number
  notes?: string
}): Promise<OperationResponse> {
  return apiPost<OperationResponse>('/operations/consume', data)
}
