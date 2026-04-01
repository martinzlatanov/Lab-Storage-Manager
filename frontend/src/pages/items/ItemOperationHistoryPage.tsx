import { useParams, Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Download, ChevronDown, Loader2 } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { ItemStatusBadge, ItemTypeBadge, OperationBadge } from '../../components/ui/StatusBadge'
import { MOCK_ITEMS, MOCK_OPERATIONS } from '../../mock/data'
import { OperationType, OPERATION_TYPE_LABELS } from '../../types'
import type { OperationRecord, AnyItem } from '../../types'
import { getItem, getItemHistory } from '../../api'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

function formatDate(iso: string, includeTime = false) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(iso))
}

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function todayStr() { return new Date().toLocaleDateString('en-CA') }

function opDetailsText(op: OperationRecord): string {
  const parts: string[] = []
  if (op.toLocationLabel) parts.push(`→ ${op.toLocationLabel}`)
  if (op.toExternalLocationName) parts.push(`→ ${op.toExternalLocationName}`)
  if (op.quantityConsumed !== undefined && op.quantityConsumed !== null) parts.push(`Consumed ${op.quantityConsumed}`)
  if (op.expectedReturnDate) parts.push(`return: ${formatDate(op.expectedReturnDate)}`)
  if (op.notes) parts.push(op.notes)
  return parts.join(' — ')
}

export function ItemOperationHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<AnyItem | null>(null)
  const [ops, setOps] = useState<OperationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [opTypeFilter, setOpTypeFilter] = useState<OperationType | ''>('')
  const [colWidths, setColWidths] = useState([130, 100, 130, 280])
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
    if (!id) return

    if (USE_MOCKS) {
      const found = MOCK_ITEMS.find((i) => i.id === id)
      setItem(found ?? null)
      setOps(
        MOCK_OPERATIONS.filter((op) => op.itemId === id).sort(
          (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
        ),
      )
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [itemRes, historyRes] = await Promise.all([
          getItem(id),
          getItemHistory(id),
        ])
        setItem(itemRes.data)
        setOps(
          historyRes.data.map((op: any) => ({
            id: op.id,
            operationType: op.operationType,
            itemId: id,
            itemLabId: itemRes.data.labIdNumber,
            itemDescription: '',
            performedById: op.performedBy?.id ?? '',
            performedByName: op.performedBy?.displayName ?? '',
            performedAt: op.performedAt,
            fromLocationLabel: op.fromLocation?.label,
            toLocationLabel: op.toLocation?.label,
            fromContainerLabel: op.fromContainer?.label,
            toContainerLabel: op.toContainer?.label,
            fromExternalLocationName: op.fromExternalLocation?.name,
            toExternalLocationName: op.toExternalLocation?.name,
            expectedReturnDate: op.expectedReturnDate,
            quantityConsumed: op.quantityConsumed,
            notes: op.notes,
          })),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const filtered = ops.filter(op => !opTypeFilter || op.operationType === opTypeFilter)

  if (!USE_MOCKS && loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading history…</span>
      </div>
    )
  }

  if (!USE_MOCKS && error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <p className="text-lg font-medium text-red-600">{error}</p>
        <Link to={`/items/${id}`} className="mt-3 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Item
        </Link>
      </div>
    )
  }

  if (!USE_MOCKS && !item) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <p className="text-lg font-medium">Item not found</p>
        <Link to="/items" className="mt-3 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Items
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Back */}
      <Link to={`/items/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft size={15} />
        Back to Item Detail
      </Link>

      {/* Page header */}
      {item && (
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900 font-mono">{item.labIdNumber}</h1>
          <ItemTypeBadge type={item.itemType} />
          <ItemStatusBadge status={item.status} />
          <span className="text-sm text-slate-500">— Operation History</span>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
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
            const header = ['Date', 'Operation', 'Performed By', 'Details']
            const rows = filtered.map(op => [
              formatDate(op.performedAt, true),
              OPERATION_TYPE_LABELS[op.operationType] ?? op.operationType,
              op.performedByName,
              opDetailsText(op),
            ])
            downloadCsv([header, ...rows], `item-history-${item?.labIdNumber ?? id}-${todayStr()}.csv`)
          }}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm px-3 py-2 rounded-lg transition-colors ml-auto"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title="All Operations"
          subtitle={`${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
        />

        {USE_MOCKS && loading ? (
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
                  {(['Date / Time', 'Operation', 'Performed by', 'Details'] as const).map((label, i) => (
                    <th key={i} className="relative px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide select-none overflow-hidden whitespace-nowrap">
                      <span className="block overflow-hidden">{label}</span>
                      <div
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group/handle"
                        onMouseDown={e => {
                          e.preventDefault()
                          resizeRef.current = { col: i, startX: e.clientX, startWidth: colWidths[i] }
                          document.body.style.cursor = 'col-resize'
                          document.body.style.userSelect = 'none'
                        }}
                      >
                        <div className="w-px h-4 bg-slate-200 group-hover/handle:bg-blue-400 transition-colors" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400">No operations match your filter.</td></tr>
                ) : (
                  filtered.map(op => (
                    <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-xs text-slate-500">{formatDate(op.performedAt, true)}</td>
                      <td className="px-3 py-1 overflow-hidden whitespace-nowrap"><OperationBadge type={op.operationType} /></td>
                      <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-600 text-xs">{op.performedByName}</td>
                      <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-xs text-slate-500">
                        {op.toLocationLabel && <span>→ <span className="font-mono">{op.toLocationLabel}</span></span>}
                        {op.toExternalLocationName && <span className="text-yellow-600">→ {op.toExternalLocationName}</span>}
                        {op.quantityConsumed !== undefined && op.quantityConsumed !== null && <span className="text-orange-600">Consumed {op.quantityConsumed}</span>}
                        {op.expectedReturnDate && <span className="text-slate-400"> (return: {formatDate(op.expectedReturnDate)})</span>}
                        {op.notes && <span className="italic text-slate-400"> — {op.notes}</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
