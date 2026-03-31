import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Plus, ScanLine, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { ItemStatusBadge, ItemTypeBadge } from '../../components/ui/StatusBadge'
import { MOCK_ITEMS } from '../../mock/data'
import { ItemType, ItemStatus, ITEM_TYPE_LABELS, type AnyItem } from '../../types'
import { getItems } from '../../api'
import clsx from 'clsx'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'
const PAGE_SIZE = 50

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function getItemDisplayName(item: AnyItem): string {
  switch (item.itemType) {
    case ItemType.ELECTRONICS_SAMPLE: return (item as { productName: string }).productName
    case ItemType.FIXTURE: return (item as { productName: string }).productName
    case ItemType.SPARE_PART: return `${(item as { manufacturer: string; model: string }).manufacturer} ${(item as { model: string }).model}`
    case ItemType.CONSUMABLE: return (item as { consumableType: string }).consumableType
    case ItemType.MISC: return (item as { name?: string; miscName?: string }).name ?? (item as { miscName?: string }).miscName ?? ''
  }
}

function getItemLocation(item: AnyItem): string {
  const asAny = item as Record<string, any>
  if (asAny.externalLocation?.name) return asAny.externalLocation.name
  if (asAny.externalLocationName) return asAny.externalLocationName
  if (asAny.location?.label) return asAny.location.label
  if (asAny.locationLabel) return asAny.locationLabel
  return ''
}

type SortField = 'labIdNumber' | 'itemType' | 'name' | 'status' | 'location' | 'updatedAt'

const COLUMNS: { field: SortField; label: string; defaultWidth: number }[] = [
  { field: 'labIdNumber',  label: 'Lab ID',             defaultWidth: 100 },
  { field: 'itemType',     label: 'Type',               defaultWidth: 120 },
  { field: 'name',         label: 'Name / Description', defaultWidth: 260 },
  { field: 'status',       label: 'Status',             defaultWidth: 110 },
  { field: 'location',     label: 'Location',           defaultWidth: 150 },
  { field: 'updatedAt',    label: 'Updated',            defaultWidth: 100 },
]

export function ItemListPage() {
  const [items, setItems] = useState<AnyItem[]>(USE_MOCKS ? MOCK_ITEMS : [])
  const [loading, setLoading] = useState(!USE_MOCKS)
  const [error, setError] = useState('')
  const [totalItems, setTotalItems] = useState(USE_MOCKS ? MOCK_ITEMS.length : 0)
  const [totalPages, setTotalPages] = useState(USE_MOCKS ? Math.ceil(MOCK_ITEMS.length / PAGE_SIZE) : 1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ItemType | ''>('')
  const [statusFilter, setStatusFilter] = useState<ItemStatus | ''>('')
  const [showScrapped, setShowScrapped] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [colWidths, setColWidths] = useState<number[]>(COLUMNS.map(c => c.defaultWidth))
  const dropdownRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null)

  // Column resize: attach document listeners once
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizeRef.current) return
      const { col, startX, startWidth } = resizeRef.current
      const newWidth = Math.max(60, startWidth + (e.clientX - startX))
      setColWidths(prev => {
        const next = [...prev]
        next[col] = newWidth
        return next
      })
    }
    function onMouseUp() {
      if (!resizeRef.current) return
      resizeRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const fetchItems = useCallback(async () => {
    if (USE_MOCKS) return
    setLoading(true)
    setError('')
    try {
      const res = await getItems({
        ...(typeFilter ? { itemType: typeFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
        page,
        pageSize: PAGE_SIZE,
      })
      setItems(res.data)
      setTotalItems(res.meta.total)
      setTotalPages(res.meta.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, search, page])

  useEffect(() => { fetchItems() }, [fetchItems])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const filteredAndSorted = useMemo(() => {
    let data = items
    if (USE_MOCKS) {
      data = data.filter((item) => {
        if (!showScrapped && item.status === ItemStatus.SCRAPPED) return false
        if (typeFilter && item.itemType !== typeFilter) return false
        if (statusFilter && item.status !== statusFilter) return false
        if (search) {
          const q = search.toLowerCase()
          return (
            item.labIdNumber.toLowerCase().includes(q) ||
            getItemDisplayName(item).toLowerCase().includes(q) ||
            getItemLocation(item).toLowerCase().includes(q)
          )
        }
        return true
      })
    } else {
      if (!showScrapped) data = data.filter((item) => item.status !== ItemStatus.SCRAPPED)
    }

    return [...data].sort((a, b) => {
      let valA: any = ''
      let valB: any = ''
      switch (sortField) {
        case 'labIdNumber': valA = a.labIdNumber; valB = b.labIdNumber; break
        case 'itemType':    valA = ITEM_TYPE_LABELS[a.itemType]; valB = ITEM_TYPE_LABELS[b.itemType]; break
        case 'name':        valA = getItemDisplayName(a).toLowerCase(); valB = getItemDisplayName(b).toLowerCase(); break
        case 'status':      valA = a.status; valB = b.status; break
        case 'location':    valA = getItemLocation(a).toLowerCase(); valB = getItemLocation(b).toLowerCase(); break
        case 'updatedAt':   valA = new Date(a.updatedAt).getTime(); valB = new Date(b.updatedAt).getTime(); break
      }
      const order = sortOrder === 'asc' ? 1 : -1
      if (valA < valB) return -1 * order
      if (valA > valB) return 1 * order
      return 0
    })
  }, [items, search, typeFilter, statusFilter, showScrapped, sortField, sortOrder])

  // For mock mode: update total counts when filters change, and paginate client-side
  useEffect(() => {
    if (USE_MOCKS) {
      setTotalItems(filteredAndSorted.length)
      setTotalPages(Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE)))
      setPage(1)
    }
  }, [filteredAndSorted])

  const pagedItems = useMemo(() => {
    if (USE_MOCKS) {
      return filteredAndSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    }
    return filteredAndSorted
  }, [filteredAndSorted, page])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder(field === 'updatedAt' ? 'desc' : 'asc')
    }
  }

  // Reset to page 1 when filters/search change (real API path)
  const handleSearch = (v: string) => { setSearch(v); setPage(1) }
  const handleTypeFilter = (v: ItemType | '') => { setTypeFilter(v); setPage(1) }
  const handleStatusFilter = (v: ItemStatus | '') => {
    setStatusFilter(v)
    setPage(1)
    if (v === ItemStatus.SCRAPPED) setShowScrapped(true)
  }

  function startResize(e: React.MouseEvent, colIndex: number) {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = { col: colIndex, startX: e.clientX, startWidth: colWidths[colIndex] }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const rangeStart = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, totalItems)

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-48 relative">
          <ScanLine size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by Lab ID, name, location…"
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400" />
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => handleTypeFilter(e.target.value as ItemType | '')}
              className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-7 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Types</option>
              {Object.entries(ITEM_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value as ItemStatus | '')}
              className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-7 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value={ItemStatus.IN_STORAGE}>In Storage</option>
              <option value={ItemStatus.TEMP_EXIT}>Temp Exit</option>
              <option value={ItemStatus.DEPLETED}>Depleted</option>
              <option value={ItemStatus.SCRAPPED}>Scrapped</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showScrapped}
              onChange={(e) => setShowScrapped(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Show scrapped
          </label>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(o => !o)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Add Item
            <ChevronDown size={12} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20">
              {[
                ['Electronics Sample', '/items/new/electronics'],
                ['Fixture', '/items/new/fixture'],
                ['Spare Part', '/items/new/sparepart'],
                ['Consumable', '/items/new/consumable'],
                ['Misc Item', '/items/new/misc'],
              ].map(([label, path]) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 flex items-center gap-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={fetchItems} className="ml-auto text-red-600 hover:text-red-700 text-xs font-medium">Retry</button>
        </div>
      )}

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading items…</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="text-sm" style={{ tableLayout: 'fixed', width: colWidths.reduce((s, w) => s + w, 0) }}>
                <colgroup>
                  {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    {COLUMNS.map((col, i) => {
                      const active = sortField === col.field
                      return (
                        <th
                          key={col.field}
                          className="relative px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer group hover:bg-slate-50 transition-colors select-none overflow-hidden"
                          onClick={() => handleSort(col.field)}
                        >
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="truncate">{col.label}</span>
                            {active
                              ? (sortOrder === 'asc' ? <ArrowUp size={12} className="shrink-0 text-blue-600" /> : <ArrowDown size={12} className="shrink-0 text-blue-600" />)
                              : <ArrowUpDown size={12} className="shrink-0 opacity-30 group-hover:opacity-100 transition-opacity" />
                            }
                          </div>
                          {/* Resize handle */}
                          <div
                            className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-10 flex items-center justify-center group/handle"
                            onMouseDown={(e) => startResize(e, i)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="w-px h-4 bg-slate-200 group-hover/handle:bg-blue-400 transition-colors" />
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pagedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        {error ? 'Failed to load items.' : 'No items match your search.'}
                      </td>
                    </tr>
                  ) : (
                    pagedItems.map((item) => {
                      const location = getItemLocation(item)
                      const isExternal = !!(item as any).externalLocationId || !!(item as any).externalLocationName
                      return (
                        <tr
                          key={item.id}
                          className={clsx(
                            'hover:bg-slate-50 transition-colors',
                            item.status === ItemStatus.SCRAPPED && 'opacity-60',
                          )}
                        >
                          <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                            <Link
                              to={`/items/${item.id}`}
                              className="font-mono text-blue-600 hover:text-blue-700 font-medium text-xs"
                            >
                              {item.labIdNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                            <ItemTypeBadge type={item.itemType} />
                          </td>
                          <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-700">
                            {getItemDisplayName(item)}
                          </td>
                          <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                            <ItemStatusBadge status={item.status} />
                          </td>
                          <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-500 text-xs font-mono">
                            {isExternal
                              ? <span className="text-yellow-600">{location}</span>
                              : location || '—'}
                          </td>
                          <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-400 text-xs">
                            {formatDate(item.updatedAt)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer: count + pagination */}
            <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                {totalItems === 0
                  ? 'No items'
                  : `Showing ${rangeStart}–${rangeEnd} of ${totalItems} items`}
                {!showScrapped && <span className="ml-2 text-slate-400">(scrapped hidden)</span>}
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-2 tabular-nums">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
