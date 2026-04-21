/**
 * Reports pages:
 * ItemsByLocationPage, ExternalReportPage, ExpiryReportPage, AuditLogPage
 */

import { useState, useEffect, useCallback, useRef } from 'react'
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

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function todayStr() { return new Date().toLocaleDateString('en-CA') }

function isOverdueDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return dateStr.slice(0, 10) < new Date().toLocaleDateString('en-CA')
}

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
        <button
          onClick={() => {
            const header = ['Lab ID', 'Type', 'Status', 'Location']
            const rows = USE_MOCKS
              ? Object.entries(mockGroups).flatMap(([loc, items]) =>
                  items.map(i => [i.labIdNumber, i.itemType, i.status, loc])
                )
              : apiData.flatMap(loc => [
                  ...loc.items.map(i => [i.labIdNumber, i.itemType, i.status, loc.label]),
                  ...loc.containers.flatMap(c => c.items.map(i => [i.labIdNumber, i.itemType, i.status, loc.label])),
                ])
            downloadCsv([header, ...rows], `items-by-location-${todayStr()}.csv`)
          }}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm px-3 py-2 rounded-lg transition-colors"
        >
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
                            <ItemTypeBadge type={item.itemType as ItemType} />
                            <ItemStatusBadge status={item.status as ItemStatus} />
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
  const [colWidths, setColWidths] = useState([90, 110, 200, 130, 90])
  const resizeRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null)
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizeRef.current) return
      const { col, startX, startWidth } = resizeRef.current
      setColWidths(prev => { const n = [...prev]; n[col] = Math.max(60, startWidth + (e.clientX - startX)); return n })
    }
    function onMouseUp() { if (!resizeRef.current) return; resizeRef.current = null; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp) }
  }, [])

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
  const mockOverdueItems = externalItems.filter(i => isOverdueDate(i.expectedReturnDate))

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
            <button
              onClick={() => {
                const header = ['Lab ID', 'Type', 'External Location', 'Expected Return', 'Status']
                const rows = USE_MOCKS
                  ? externalItems.map(item => {
                      const exitOp = MOCK_OPERATIONS.find(op => op.itemId === item.id && op.operationType === OperationType.TEMP_EXIT)
                      return [item.labIdNumber, item.itemType, item.externalLocationName ?? '', exitOp?.expectedReturnDate ? formatDate(exitOp.expectedReturnDate) : '', isOverdueDate(item.expectedReturnDate) ? 'Overdue' : 'Away']
                    })
                  : apiData.map(rec => {
                      const extLoc = rec.item.externalLocation ?? rec.toExternalLocation
                      return [rec.item.labIdNumber, rec.item.itemType, extLoc ? `${extLoc.name} (${extLoc.city})` : '', rec.expectedReturnDate ? formatDate(rec.expectedReturnDate) : '', rec.isOverdue ? 'Overdue' : 'Away']
                    })
                downloadCsv([header, ...rows], `external-items-${todayStr()}.csv`)
              }}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
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
            <table className="text-sm" style={{ tableLayout: 'fixed', width: colWidths.reduce((s, w) => s + w, 0) }}>
              <colgroup>{colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {(['Lab ID', 'Type', 'External Location', 'Expected Return', 'Status'] as const).map((label, i) => (
                    <th key={i} className="relative px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide select-none overflow-hidden whitespace-nowrap">
                      <span className="block overflow-hidden">{label}</span>
                      <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group/handle" onMouseDown={e => { e.preventDefault(); resizeRef.current = { col: i, startX: e.clientX, startWidth: colWidths[i] }; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none' }}>
                        <div className="w-px h-4 bg-slate-200 group-hover/handle:bg-blue-400 transition-colors" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {USE_MOCKS ? (
                  externalItems.map(item => {
                    const isOverdue = isOverdueDate(item.expectedReturnDate)
                    const exitOp = MOCK_OPERATIONS.find(op => op.itemId === item.id && op.operationType === OperationType.TEMP_EXIT)
                    return (
                      <tr key={item.id} className={clsx('hover:bg-slate-50 transition-colors', isOverdue && 'bg-red-50/30')}>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                          <Link to={`/items/${item.id}`} className="font-mono text-blue-600 hover:text-blue-700 font-medium text-xs">{item.labIdNumber}</Link>
                        </td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap"><ItemTypeBadge type={item.itemType} /></td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-700">{item.externalLocationName}</td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                          {exitOp?.expectedReturnDate ? (
                            <span className={clsx('text-xs font-medium', isOverdue ? 'text-red-600' : 'text-slate-600')}>
                              {isOverdue && <AlertTriangle size={11} className="inline mr-1" />}
                              {formatDate(exitOp.expectedReturnDate)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
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
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                          <Link to={`/items/${rec.item.id}`} className="font-mono text-blue-600 hover:text-blue-700 font-medium text-xs">{rec.item.labIdNumber}</Link>
                        </td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap"><ItemTypeBadge type={rec.item.itemType as ItemType} /></td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-700">{extLoc ? `${extLoc.name} (${extLoc.city})` : '—'}</td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                          {rec.expectedReturnDate ? (
                            <span className={clsx('text-xs font-medium', rec.isOverdue ? 'text-red-600' : 'text-slate-600')}>
                              {rec.isOverdue && <AlertTriangle size={11} className="inline mr-1" />}
                              {formatDate(rec.expectedReturnDate)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
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
  const [colWidths, setColWidths] = useState([90, 160, 90, 70, 110, 110, 80, 140])
  const resizeRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null)
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizeRef.current) return
      const { col, startX, startWidth } = resizeRef.current
      setColWidths(prev => { const n = [...prev]; n[col] = Math.max(60, startWidth + (e.clientX - startX)); return n })
    }
    function onMouseUp() { if (!resizeRef.current) return; resizeRef.current = null; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp) }
  }, [])

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
    ? mockSorted.filter(c => isOverdueDate(c.expiryDate)).length
    : apiItems.filter(i => i.daysUntilExpiry !== null && i.daysUntilExpiry !== undefined && i.daysUntilExpiry < 0).length

  const soonCount = USE_MOCKS
    ? mockSorted.filter(c => {
        if (!c.expiryDate) return false
        const today = new Date().toLocaleDateString('en-CA')
        const in30 = new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-CA')
        return c.expiryDate.slice(0, 10) >= today && c.expiryDate.slice(0, 10) <= in30
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
            <button
              onClick={() => {
                const header = ['Lab ID', 'Type', 'Quantity', 'Unit', 'Lot #', 'Expiry Date', 'Days Left', 'Location']
                const rows = USE_MOCKS
                  ? mockSorted.map(c => {
                      const { label } = getMockExpiryStatus(c)
                      return [c.labIdNumber, c.consumableType, String(c.quantity), c.unit, c.lotNumber ?? '', c.expiryDate ? formatDate(c.expiryDate) : '', label, c.locationLabel ?? '']
                    })
                  : apiItems.map(i => {
                      const days = i.daysUntilExpiry
                      const daysLabel = days === null || days === undefined ? 'No expiry' : days < 0 ? 'Expired' : `${days}d`
                      return [i.labIdNumber, i.consumableType ?? '', String(i.quantity), i.unit ?? '', i.lotNumber ?? '', i.expiryDate ? formatDate(i.expiryDate) : '', daysLabel, i.location?.label ?? i.container?.label ?? '']
                    })
                downloadCsv([header, ...rows], `expiry-report-${todayStr()}.csv`)
              }}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
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
            <table className="text-sm" style={{ tableLayout: 'fixed', width: colWidths.reduce((s, w) => s + w, 0) }}>
              <colgroup>{colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {(['Lab ID', 'Type', 'Quantity', 'Unit', 'Lot #', 'Expiry Date', 'Days Left', 'Location'] as const).map((label, i) => (
                    <th key={i} className="relative px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide select-none overflow-hidden whitespace-nowrap">
                      <span className="block overflow-hidden">{label}</span>
                      <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group/handle" onMouseDown={e => { e.preventDefault(); resizeRef.current = { col: i, startX: e.clientX, startWidth: colWidths[i] }; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none' }}>
                        <div className="w-px h-4 bg-slate-200 group-hover/handle:bg-blue-400 transition-colors" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {USE_MOCKS ? (
                  mockSorted.map(c => {
                    const { label, color, days } = getMockExpiryStatus(c)
                    const rowBg = days !== null && days < 0 ? 'bg-red-50/50' : days !== null && days <= 7 ? 'bg-orange-50/50' : ''
                    return (
                      <tr key={c.id} className={clsx('hover:bg-slate-50 transition-colors', rowBg)}>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                          <Link to={`/items/${c.id}`} className="font-mono text-blue-600 hover:text-blue-700 font-medium text-xs">{c.labIdNumber}</Link>
                        </td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-700">{c.consumableType}</td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                          <span className={clsx('font-medium', c.status === ItemStatus.DEPLETED ? 'text-slate-400 line-through' : 'text-slate-800')}>
                            {c.quantity}
                          </span>
                        </td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-500 text-xs">{c.unit}</td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-500 font-mono text-xs">{c.lotNumber ?? '—'}</td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-600">{c.expiryDate ? formatDate(c.expiryDate) : '—'}</td>
                        <td className={clsx('px-3 py-1 overflow-hidden whitespace-nowrap font-semibold', color)}>{label}</td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-500 text-xs font-mono">{c.locationLabel ?? '—'}</td>
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
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                          <Link to={`/items/${item.id}`} className="font-mono text-blue-600 hover:text-blue-700 font-medium text-xs">{item.labIdNumber}</Link>
                        </td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-700">{item.consumableType ?? '—'}</td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                          <span className={clsx('font-medium', item.status === ItemStatus.DEPLETED ? 'text-slate-400 line-through' : 'text-slate-800')}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-500 text-xs">{item.unit ?? '—'}</td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-500 font-mono text-xs">{item.lotNumber ?? '—'}</td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-600">{item.expiryDate ? formatDate(item.expiryDate) : '—'}</td>
                        <td className={clsx('px-3 py-1 overflow-hidden whitespace-nowrap font-semibold', getApiExpiryColor(days))}>
                          {days === null || days === undefined ? 'No expiry' : days < 0 ? 'Expired' : `${days}d`}
                        </td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-500 text-xs font-mono">{locLabel}</td>
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
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(!USE_MOCKS)
  const [error, setError] = useState('')
  const [apiRecords, setApiRecords] = useState<AuditReportRecord[]>([])
  const [total, setTotal] = useState(0)
  const [colWidths, setColWidths] = useState([130, 100, 90, 130, 280])
  const resizeRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizeRef.current) return
      const { col, startX, startWidth } = resizeRef.current
      setColWidths(prev => { const n = [...prev]; n[col] = Math.max(60, startWidth + (e.clientX - startX)); return n })
    }
    function onMouseUp() { if (!resizeRef.current) return; resizeRef.current = null; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp) }
  }, [])

  const fetchAudit = useCallback(async () => {
    if (USE_MOCKS) return
    setLoading(true)
    setError('')
    try {
      const res = await getReportAudit({
        ...(opTypeFilter ? { operationType: opTypeFilter } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        pageSize: 100,
      })
      setApiRecords(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [opTypeFilter, debouncedSearch])

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
        <button
          onClick={() => {
            const header = ['Date', 'Operation', 'Lab ID', 'Performed By', 'Details']
            const rows = USE_MOCKS
              ? mockFiltered.map(op => [formatDate(op.performedAt, true), op.operationType, op.itemLabId, op.performedByName, op.notes ?? ''])
              : (apiFiltered as AuditReportRecord[]).map(op => [formatDate(op.performedAt, true), op.operationType, op.item.labIdNumber, op.performedBy.displayName, op.notes ?? ''])
            downloadCsv([header, ...rows], `audit-log-${todayStr()}.csv`)
          }}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm px-3 py-2 rounded-lg transition-colors ml-auto"
        >
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
            <table className="text-sm" style={{ tableLayout: 'fixed', width: colWidths.reduce((s, w) => s + w, 0) }}>
              <colgroup>{colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {(['Date / Time', 'Operation', 'Item', 'Performed by', 'Details'] as const).map((label, i) => (
                    <th key={i} className="relative px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide select-none overflow-hidden whitespace-nowrap">
                      <span className="block overflow-hidden">{label}</span>
                      <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group/handle" onMouseDown={e => { e.preventDefault(); resizeRef.current = { col: i, startX: e.clientX, startWidth: colWidths[i] }; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none' }}>
                        <div className="w-px h-4 bg-slate-200 group-hover/handle:bg-blue-400 transition-colors" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {USE_MOCKS ? (
                  mockFiltered.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">No records match your filters.</td></tr>
                  ) : (
                    mockFiltered.map(op => (
                      <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-xs text-slate-500">{formatDate(op.performedAt, true)}</td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap"><OperationBadge type={op.operationType} /></td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                          <Link to={`/items/${op.itemId}`} className="font-mono text-blue-600 hover:text-blue-700 text-xs font-medium">{op.itemLabId}</Link>
                        </td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-600 text-xs">{op.performedByName}</td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-xs text-slate-500">
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
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">No records match your filters.</td></tr>
                  ) : (
                    (apiFiltered as AuditReportRecord[]).map(op => (
                      <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-xs text-slate-500">{formatDate(op.performedAt, true)}</td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap"><OperationBadge type={op.operationType as OperationType} /></td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                          <Link to={`/items/${op.item.id}`} className="font-mono text-blue-600 hover:text-blue-700 text-xs font-medium">{op.item.labIdNumber}</Link>
                        </td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-600 text-xs">{op.performedBy.displayName}</td>
                        <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-xs text-slate-500">
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
