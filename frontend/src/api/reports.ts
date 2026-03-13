// ─── Reports API ──────────────────────────────────────────────────────────────

import { apiGet, toQueryString } from './client'

// ── Response types ──────────────────────────────────────────────────────────

export interface ByLocationReport {
  success: true
  data: Array<{
    id: string
    label: string
    totalItems: number
    storageArea: { code: string; building: { name: string; site: { name: string } } }
    items: Array<{ id: string; itemType: string; status: string; labIdNumber: string; productName?: string; miscName?: string; manufacturer?: string }>
    containers: Array<{ id: string; label: string; items: Array<{ id: string; itemType: string; status: string; labIdNumber: string }> }>
  }>
}

export interface ExternalReport {
  success: true
  data: Array<{
    id: string
    operationType: string
    performedAt: string
    expectedReturnDate?: string
    isOverdue: boolean
    item: {
      id: string
      itemType: string
      labIdNumber: string
      externalLocation?: { id: string; name: string; city: string; contactPerson?: string }
    }
    performedBy: { id: string; displayName: string }
    toExternalLocation?: { id: string; name: string; city: string }
  }>
}

export interface ExpiryReportItem {
  id: string
  status: string
  labIdNumber: string
  manufacturer?: string
  consumableType?: string
  quantity?: number
  unit?: string
  lotNumber?: string
  expiryDate?: string
  daysUntilExpiry?: number | null
  location?: { id: string; label: string }
  container?: { id: string; label: string }
}

export interface ExpiryReport {
  success: true
  data: ExpiryReportItem[]
}

export interface AuditReportRecord {
  id: string
  operationType: string
  performedAt: string
  notes?: string
  quantityConsumed?: number
  expectedReturnDate?: string
  item: { id: string; itemType: string; labIdNumber: string; productName?: string; miscName?: string }
  performedBy: { id: string; displayName: string }
  fromLocation?: { id: string; label: string }
  toLocation?: { id: string; label: string }
  fromContainer?: { id: string; label: string }
  toContainer?: { id: string; label: string }
  fromExternalLocation?: { id: string; name: string }
  toExternalLocation?: { id: string; name: string }
}

export interface AuditReport {
  success: true
  data: AuditReportRecord[]
  meta: { total: number; page: number; pageSize: number; totalPages: number }
}

// ── API functions ────────────────────────────────────────────────────────────

export function getReportByLocation(
  params: { siteId?: string; buildingId?: string; areaId?: string } = {},
): Promise<ByLocationReport> {
  return apiGet<ByLocationReport>(`/reports/by-location${toQueryString(params)}`)
}

export function getReportExternal(
  params: { externalLocationId?: string; overdueOnly?: string } = {},
): Promise<ExternalReport> {
  return apiGet<ExternalReport>(`/reports/external${toQueryString(params)}`)
}

export function getReportExpiry(
  params: { siteId?: string; withinDays?: number; includeExpired?: string } = {},
): Promise<ExpiryReport> {
  return apiGet<ExpiryReport>(`/reports/expiry${toQueryString(params)}`)
}

export function getReportAudit(
  params: {
    itemId?: string
    operationType?: string
    performedById?: string
    siteId?: string
    from?: string
    to?: string
    page?: number
    pageSize?: number
  } = {},
): Promise<AuditReport> {
  return apiGet<AuditReport>(`/reports/audit${toQueryString(params)}`)
}
