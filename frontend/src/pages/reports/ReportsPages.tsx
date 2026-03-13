/**
 * Reports pages:
 * ItemsByLocationPage, ExternalReportPage, ExpiryReportPage, AuditLogPage
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, Download, ChevronDown, Loader2 } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { ItemStatusBadge, ItemTypeBadge, OperationBadge } from '../../components/ui/StatusBadge'
import { MOCK_ITEMS, MOCK_OPERATIONS, MOCK_SITES } from '../../mock/data'
import { ItemType, ItemStatus, OPERATION_TYPE_LABELS, OperationType } from '../../types'
import type { Consumable } from '../../types'
import { getSites, getReportByLocation, getReportExternal, getReportExpiry, getReportAudit } from '../../api'
import type { ByLocationReport, ExternalReport, ExpiryReportItem, AuditReportRecord } from '../../api'
import clsx from 'clsx'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

function formatDate(iso: string, includeTime = false) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(iso))
}

// ─── Items by Location ────────────────────────────────────────────────────────

export function ItemsByLocationPage() {
  const [siteFilter, setSiteFilter] = useState('')
  const [loading, setLoading] = useState(!USE_MOCKS)
  const [error, setError] = useState('')

  // API data
  const [apiData, setApiData] = useState<ByLocationReport['data']>([])
  const [siteOptions, setSiteOptions] = useState<Array<{ id: string; name: string }>>(
    USE_MOCKS ? MOCK_SITES : [],
  )

  const fetchData = useCallback(async () => {
    if (USE_MOCKS) return
    setLoading(true)
    setError('')
    try {
      const [reportRes, sitesRes] = await Promise.all([
        getReportByLocation(siteFilter ? { siteId: siteFilter } : {}),
        getSites(),
      ])
      setApiData(reportRes.data)
      setSiteOptions(sitesRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [siteFilter])

  useEffect(() => { fetchData() }, [fetchData])

  // Mock mode: client-side grouping
  const mockGroups: Record<string, typeof MOCK_ITEMS> = {}
  if (USE_MOCKS) {
    MOCK_ITEMS.filter(i => i.status !== ItemStatus.SCRAPPED && i.status !== ItemStatus.DEPLETED).forEach(item => {
      const loc = item.locationLabel ?? item.externalLocationName ?? 'Unassigned'
      if (!mockGroups[loc]) mockGroups[loc] = []
      mockGroups[loc].push(item)
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={siteFilter}
            onChange={e => setSiteFilter(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-7 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sites</option>
            {siteOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <button className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm px-3 py-2 rounded-lg transition-colors">
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700 flex items-center gap-3">
          {error}
          <button onClick={fetchData} className="ml-auto text-red-600 text-xs font-medium hover:text-red-700">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading report…</span>
        </div>
      ) : (
        <div className="space-y-3">
          {USE_MOCKS ? (
            Object.entries(mockGroups).map(([loc, items]) => (
              <Card key={loc}>
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-slate-800">{loc}</span>
                  <span className="text-xs text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {items.map(item => (
                    <Link key={item.id} to={`/items/${item.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-medium text-blue-600">{item.labIdNumber}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <ItemTypeBadge type={item.itemType} />
                          <ItemStatusBadge status={item.status} />
                        </div>
                      </div>
                      {item.containerLabel && (
                        <span className="text-xs text-slate-400 font-mono">{item.containerLabel}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </Card>
            ))
          ) : (
            apiData.filter(loc => loc.totalItems > 0).map(loc => {
              const allItems = [
                ...loc.items,
                ...loc.containers.flatMap(c => c.items),
              ]
              return (
                <Card key={loc.id}>
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm font-semibold text-slate-800">{loc.label}</span>
                      <span className="text-xs text-slate-400 ml-2">
                        {loc.storageArea.building.site.name} / {loc.storageArea.building.name}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{loc.totalItems} item{loc.totalItems !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {allItems.map(item => (
                      <Link key={item.id} to={`/items/${item.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono font-medium text-blue-600">{item.labIdNumber}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <ItemTypeBadge type={item.itemType} />
                            <ItemStatusBadge status={item.status} />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ─── External / Overdue ───────────────────────────────────────────────────────

export function ExternalReportPage() {
  const [loading, setLoading] = useState(!USE_MOCKS)
  const [error, setError] = useState('')
  const [apiData, setApiData] = useState<ExternalReport['data']>([])

  useEffect(() => {
    if (USE_MOCKS) return
    setLoading(true)
    getReportExternal()
      .then(r => setApiData(r.data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load report'))
      .finally(() => setLoading(false))
  }, [])

  // Mock mode
  const externalItems = USE_MOCKS ? MOCK_ITEMS.filter(i => i.status === ItemStatus.TEMP_EXIT) : []
  const mockOverdueItems = externalItems.filter(i =>
    i.expectedReturnDate != null && new Date(i.expectedReturnDate) < new Date()
  )

  // API mode
  const overdueCount = apiData.filter(r => r.isOverdue).length

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{error}</div>
      )}

      {(USE_MOCKS ? mockOverdueItems.length > 0 : overdueCount > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {USE_MOCKS ? mockOverdueItems.length : overdueCount} Overdue Return{(USE_MOCKS ? mockOverdueItems.length : overdueCount) > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-red-700">The following items have passed their expected return date. Contact the external location.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader
          title="Items at External Locations"
          subtitle={`${USE_MOCKS ? externalItems.length : apiData.length} item${(USE_MOCKS ? externalItems.length : apiData.length) !== 1 ? 's' : ''} currently away`}
          actions={
            <button className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs px-3 py-1.5 rounded-lg transition-colors">
              <Download size={12} />
              Export
            </button>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lab ID</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">External Location</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Expected Return</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {USE_MOCKS ? (
                  externalItems.map(item => {
                    const isOverdue = item.expectedReturnDate != null && new Date(item.expectedReturnDate) < new Date()
                    const exitOp = MOCK_OPERATIONS.find(op => op.itemId === item.id && op.operationType === OperationType.TEMP_EXIT)
                    return (
                      <tr key={item.id} className={clsx('hover:bg-slate-50 transition-colors', isOverdue && 'bg-red-50/30')}>
                        <td className="px-5 py-3.5">
                          <Link to={`/items/${item.id}`} className="font-mono text-blue-600 hover:text-blue-700 font-medium text-xs">{item.labIdNumber}</Link>
                        </td>
                        <td className="px-5 py-3.5"><ItemTypeBadge type={item.itemType} /></td>
                        <td className="px-5 py-3.5 text-slate-700">{item.externalLocationName}</td>
                        <td className="px-5 py-3.5">
                          {exitOp?.expectedReturnDate ? (
                            <span className={clsx('text-sm font-medium', isOverdue ? 'text-red-600' : 'text-slate-600')}>
                              {isOverdue && <AlertTriangle size={12} className="inline mr-1" />}
                              {formatDate(exitOp.expectedReturnDate)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          {isOverdue
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue</span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock size={10} />Away</span>
                          }
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  apiData.map(rec => {
                    const extLoc = rec.item.externalLocation ?? rec.toExternalLocation
                    return (
                      <tr key={rec.id} className={clsx('hover:bg-slate-50 transition-colors', rec.isOverdue && 'bg-red-50/30')}>
                        <td className="px-5 py-3.5">
                          <Link to={`/items/${rec.item.id}`} className="font-mono text-blue-600 hover:text-blue-700 font-medium text-xs">{rec.item.labIdNumber}</Link>
                        </td>
                        <td className="px-5 py-3.5"><ItemTypeBadge type={rec.item.itemType} /></td>
                        <td className="px-5 py-3.5 text-slate-700">{extLoc ? `${extLoc.name} (${extLoc.city})` : '—'}</td>
                        <td className="px-5 py-3.5">
                          {rec.expectedReturnDate ? (
                            <span className={clsx('text-sm font-medium', rec.isOverdue ? 'text-red-600' : 'text-slate-600')}>
                              {rec.isOverdue && <AlertTriangle size={12} className="inline mr-1" />}
                              {formatDate(rec.expectedReturnDate)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          {rec.isOverdue
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue</span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock size={10} />Away</span>
                          }
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Consumables Expiry ───────────────────────────────────────────────────────

export function ExpiryReportPage() {
  const [loading, setLoading] = useState(!USE_MOCKS)
  const [error, setError] = useState('')
  const [apiItems, setApiItems] = useState<ExpiryReportItem[]>([])

  useEffect(() => {
    if (USE_MOCKS) return
    setLoading(true)
    getReportExpiry({ includeExpired: 'true' })
      .then(r => setApiItems(r.data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load report'))
      .finally(() => setLoading(false))
  }, [])

  // Mock mode
  const mockConsumables = (USE_MOCKS
    ? MOCK_ITEMS.filter(i => i.itemType === ItemType.CONSUMABLE)
    : []) as Consumable[]

  function getMockExpiryStatus(c: Consumable): { label: string; color: string; days: number | null } {
    if (!c.expiryDate) return { label: 'No expiry', color: 'text-slate-400', days: null }
    const days = Math.ceil((new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) return { label: 'Expired', color: 'text-red-600', days }
    if (days <= 7) return { label: `${days}d`, color: 'text-red-500', days }
    if (days <= 30) return { label: `${days}d`, color: 'text-orange-500', days }
    return { label: `${days}d`, color: 'text-green-600', days }
  }

  const mockSorted = [...mockConsumables].sort((a, b) => {
    const dA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity
    const dB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity
    return dA - dB
  })

  // Summary counts
  const expiredCount = USE_MOCKS
    ? mockSorted.filter(c => c.expiryDate && new Date(c.expiryDate) < new Date()).length
    : apiItems.filter(i => i.daysUntilExpiry !== null && i.daysUntilExpiry !== undefined && i.daysUntilExpiry < 0).length

  const soonCount = USE_MOCKS
    ? mockSorted.filter(c => {
        if (!c.expiryDate) return false
        const d = (new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        return d >= 0 && d <= 30
      }).length
    : apiItems.filter(i => i.daysUntilExpiry !== null && i.daysUntilExpiry !== undefined && i.daysUntilExpiry >= 0 && i.daysUntilExpiry <= 30).length

  const totalCount = USE_MOCKS ? mockConsumables.length : apiItems.length

  function getApiExpiryColor(days: number | null | undefined): string {
    if (days === null || days === undefined) return 'text-slate-400'
    if (days < 0) return 'text-red-600'
    if (days <= 7) return 'text-red-500'
    if (days <= 30) return 'text-orange-500'
    return 'text-green-600'
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
          <p className="text-xs text-slate-500 mt-1">Expired</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{soonCount}</p>
          <p className="text-xs text-slate-500 mt-1">Expiring ≤30 days</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
          <p className="text-xs text-slate-500 mt-1">Total consumables</p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Consumables by Expiry"
          subtitle="Sorted by expiry date, soonest first"
          actions={
            <button className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs px-3 py-1.5 rounded-lg transition-colors">
              <Download size={12} />
              Export
            </button>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lab ID</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quantity</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lot #</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Expiry Date</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Days Left</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {USE_MOCKS ? (
                  mockSorted.map(c => {
                    const { label, color, days } = getMockExpiryStatus(c)
                    const rowBg = days !== null && days < 0 ? 'bg-red-50/50' : days !== null && days <= 7 ? 'bg-orange-50/50' : ''
                    return (
                      <tr key={c.id} className={clsx('hover:bg-slate-50 transition-colors', rowBg)}>
                        <td className="px-5 py-3.5">
                          <Link to={`/items/${c.id}`} className="font-mono text-blue-600 hover:text-blue-700 font-medium text-xs">{c.labIdNumber}</Link>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700">{c.consumableType}</td>
                        <td className="px-5 py-3.5">
                          <span className={clsx('font-medium', c.status === ItemStatus.DEPLETED ? 'text-slate-400 line-through' : 'text-slate-800')}>
                            {c.quantity} {c.unit}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{c.lotNumber ?? '—'}</td>
                        <td className="px-5 py-3.5 text-slate-600">{c.expiryDate ? formatDate(c.expiryDate) : '—'}</td>
                        <td className={clsx('px-5 py-3.5 font-semibold', color)}>{label}</td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs font-mono">{c.locationLabel ?? '—'}</td>
                      </tr>
                    )
                  })
                ) : (
                  apiItems.map(item => {
                    const days = item.daysUntilExpiry
                    const rowBg = days !== null && days !== undefined && days < 0 ? 'bg-red-50/50' : days !== null && days !== undefined && days <= 7 ? 'bg-orange-50/50' : ''
                    const locLabel = item.location?.label ?? item.container?.label ?? '—'
                    return (
                      <tr key={item.id} className={clsx('hover:bg-slate-50 transition-colors', rowBg)}>
                        <td className="px-5 py-3.5">
                          <Link to={`/items/${item.id}`} className="font-mono text-blue-600 hover:text-blue-700 font-medium text-xs">{item.labIdNumber}</Link>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700">{item.consumableType ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={clsx('font-medium', item.status === ItemStatus.DEPLETED ? 'text-slate-400 line-through' : 'text-slate-800')}>
                            {item.quantity} {item.unit}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{item.lotNumber ?? '—'}</td>
                        <td className="px-5 py-3.5 text-slate-600">{item.expiryDate ? formatDate(item.expiryDate) : '—'}</td>
                        <td className={clsx('px-5 py-3.5 font-semibold', getApiExpiryColor(days))}>
                          {days === null || days === undefined ? 'No expiry' : days < 0 ? 'Expired' : `${days}d`}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs font-mono">{locLabel}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export function AuditLogPage() {
  const [opTypeFilter, setOpTypeFilter] = useState<OperationType | ''>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(!USE_MOCKS)
  const [error, setError] = useState('')
  const [apiRecords, setApiRecords] = useState<AuditReportRecord[]>([])
  const [total, setTotal] = useState(0)

  const fetchAudit = useCallback(async () => {
    if (USE_MOCKS) return
    setLoading(true)
    setError('')
    try {
      const res = await getReportAudit({
        ...(opTypeFilter ? { operationType: opTypeFilter } : {}),
        pageSize: 100,
      })
      setApiRecords(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [opTypeFilter])

  useEffect(() => { fetchAudit() }, [fetchAudit])

  // Mock mode filtering
  const mockFiltered = USE_MOCKS
    ? MOCK_OPERATIONS.filter(op => {
        if (opTypeFilter && op.operationType !== opTypeFilter) return false
        if (search) {
          const q = search.toLowerCase()
          return op.itemLabId.toLowerCase().includes(q) ||
            op.performedByName.toLowerCase().includes(q) ||
            (op.notes ?? '').toLowerCase().includes(q)
        }
        return true
      })
    : []

  // API mode: client-side search filter on loaded records
  const apiFiltered = USE_MOCKS
    ? mockFiltered
    : search
      ? apiRecords.filter(op => {
          const q = search.toLowerCase()
          return op.item.labIdNumber.toLowerCase().includes(q) ||
            op.performedBy.displayName.toLowerCase().includes(q) ||
            (op.notes ?? '').toLowerCase().includes(q)
        })
      : apiRecords

  const displayCount = USE_MOCKS ? mockFiltered.length : (search ? apiFiltered.length : total)

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by item, user, notes…"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-64"
        />
        <div className="relative">
          <select
            value={opTypeFilter}
            onChange={e => setOpTypeFilter(e.target.value as OperationType | '')}
            className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-7 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Operations</option>
            {Object.entries(OPERATION_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <button className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm px-3 py-2 rounded-lg transition-colors ml-auto">
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700 flex items-center gap-3">
          {error}
          <button onClick={fetchAudit} className="ml-auto text-red-600 text-xs font-medium hover:text-red-700">Retry</button>
        </div>
      )}

      <Card>
        <CardHeader
          title="Operation History"
          subtitle={`${displayCount} record${displayCount !== 1 ? 's' : ''}`}
        />

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date / Time</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Operation</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Item</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Performed by</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {USE_MOCKS ? (
                  mockFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">No records match your filters.</td>
                    </tr>
                  ) : (
                    mockFiltered.map(op => (
                      <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">{formatDate(op.performedAt, true)}</td>
                        <td className="px-5 py-3.5"><OperationBadge type={op.operationType} /></td>
                        <td className="px-5 py-3.5">
                          <Link to={`/items/${op.itemId}`} className="font-mono text-blue-600 hover:text-blue-700 text-xs font-medium">{op.itemLabId}</Link>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 text-xs">{op.performedByName}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {op.toLocationLabel && <span>→ <span className="font-mono">{op.toLocationLabel}</span></span>}
                          {op.toExternalLocationName && <span className="text-yellow-600">→ {op.toExternalLocationName}</span>}
                          {op.quantityConsumed !== undefined && <span className="text-orange-600">Consumed {op.quantityConsumed}</span>}
                          {op.notes && <span className="italic text-slate-400"> — {op.notes}</span>}
                          {op.expectedReturnDate && <span className="text-slate-400"> (return: {formatDate(op.expectedReturnDate)})</span>}
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  apiFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">No records match your filters.</td>
                    </tr>
                  ) : (
                    apiFiltered.map(op => (
                      <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">{formatDate(op.performedAt, true)}</td>
                        <td className="px-5 py-3.5"><OperationBadge type={op.operationType} /></td>
                        <td className="px-5 py-3.5">
                          <Link to={`/items/${op.item.id}`} className="font-mono text-blue-600 hover:text-blue-700 text-xs font-medium">
                            {op.item.labIdNumber}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 text-xs">{op.performedBy.displayName}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {op.toLocation && <span>→ <span className="font-mono">{op.toLocation.label}</span></span>}
                          {op.toExternalLocation && <span className="text-yellow-600">→ {op.toExternalLocation.name}</span>}
                          {op.quantityConsumed !== undefined && <span className="text-orange-600">Consumed {op.quantityConsumed}</span>}
                          {op.notes && <span className="italic text-slate-400"> — {op.notes}</span>}
                          {op.expectedReturnDate && <span className="text-slate-400"> (return: {formatDate(op.expectedReturnDate)})</span>}
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
