import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Plus, ScanLine, ChevronDown } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { ItemStatusBadge, ItemTypeBadge } from '../../components/ui/StatusBadge'
import { MOCK_ITEMS } from '../../mock/data'
import { ItemType, ItemStatus, ITEM_TYPE_LABELS } from '../../types'
import clsx from 'clsx'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function getItemDisplayName(item: (typeof MOCK_ITEMS)[0]): string {
  switch (item.itemType) {
    case ItemType.ELECTRONICS_SAMPLE: return (item as { productName: string }).productName
    case ItemType.FIXTURE: return (item as { productName: string }).productName
    case ItemType.SPARE_PART: return `${(item as { manufacturer: string; model: string }).manufacturer} ${(item as { model: string }).model}`
    case ItemType.CONSUMABLE: return (item as { consumableType: string }).consumableType
    case ItemType.MISC: return (item as { name: string }).name
  }
}

export function ItemListPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ItemType | ''>('')
  const [statusFilter, setStatusFilter] = useState<ItemStatus | ''>('')
  const [showScrapped, setShowScrapped] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const filtered = useMemo(() => {
    return MOCK_ITEMS.filter((item) => {
      if (!showScrapped && item.status === ItemStatus.SCRAPPED) return false
      if (typeFilter && item.itemType !== typeFilter) return false
      if (statusFilter && item.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          item.labIdNumber.toLowerCase().includes(q) ||
          getItemDisplayName(item).toLowerCase().includes(q) ||
          (item.locationLabel ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [search, typeFilter, statusFilter, showScrapped])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48 relative">
          <ScanLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Lab ID, name, location…"
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ItemType | '')}
              className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-7 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
              onChange={(e) => {
                const val = e.target.value as ItemStatus | ''
                setStatusFilter(val)
                if (val === ItemStatus.SCRAPPED) setShowScrapped(true)
              }}
              className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-7 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value={ItemStatus.IN_STORAGE}>In Storage</option>
              <option value={ItemStatus.TEMP_EXIT}>Temp Exit</option>
              <option value={ItemStatus.DEPLETED}>Depleted</option>
              <option value={ItemStatus.SCRAPPED}>Scrapped</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
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
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
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

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lab ID</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name / Description</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No items match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className={clsx(
                      'hover:bg-slate-50 transition-colors',
                      item.status === ItemStatus.SCRAPPED && 'opacity-60',
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/items/${item.id}`}
                        className="font-mono text-blue-600 hover:text-blue-700 font-medium text-xs"
                      >
                        {item.labIdNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <ItemTypeBadge type={item.itemType} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">{getItemDisplayName(item)}</td>
                    <td className="px-5 py-3.5">
                      <ItemStatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs font-mono">
                      {item.externalLocationName
                        ? <span className="text-yellow-600">{item.externalLocationName}</span>
                        : item.locationLabel ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">{formatDate(item.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filtered.length} of {MOCK_ITEMS.filter(i => showScrapped || i.status !== ItemStatus.SCRAPPED).length} items</span>
          <span className="text-slate-400">Scrapped items {showScrapped ? 'shown' : 'hidden'}</span>
        </div>
      </Card>
    </div>
  )
}
