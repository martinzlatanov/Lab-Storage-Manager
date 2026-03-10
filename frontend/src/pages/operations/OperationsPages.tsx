/**
 * All Operations pages in one file:
 * ReceiptPage, MovePage, ExitPage, ReturnPage, ScrapPage, ConsumePage
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ScanLine, Search, Loader2, AlertTriangle } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { ItemStatusBadge, ItemTypeBadge } from '../../components/ui/StatusBadge'
import { MOCK_ITEMS } from '../../mock/data'
import { ItemType, ItemStatus } from '../../types'
import clsx from 'clsx'

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white'

function StepHeader({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div
            className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
              i + 1 < step
                ? 'bg-blue-600 text-white'
                : i + 1 === step
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-slate-100 text-slate-400',
            )}
          >
            {i + 1 < step ? <CheckCircle2 size={14} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={clsx('w-10 h-0.5', i + 1 < step ? 'bg-blue-600' : 'bg-slate-200')} />
          )}
        </div>
      ))}
      <span className="text-slate-600 text-sm ml-2">{title}</span>
    </div>
  )
}

function ItemSearchBox({ onSelect }: { onSelect?: (id: string) => void }) {
  const [query, setQuery] = useState('')

  const results = MOCK_ITEMS.filter((i) => {
    if (!query) return false
    const q = query.toLowerCase()
    return i.labIdNumber.toLowerCase().includes(q) || i.id.includes(q)
  }).slice(0, 5)

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <ScanLine size={16} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Scan barcode or type Lab ID…"
          className={inputClass}
        />
        <button className="shrink-0 p-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
          <Search size={16} />
        </button>
      </div>
      {results.length > 0 && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setQuery(item.labIdNumber); onSelect?.(item.id) }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-medium text-slate-800">{item.labIdNumber}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <ItemTypeBadge type={item.itemType} />
                  <ItemStatusBadge status={item.status} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Receipt ──────────────────────────────────────────────────────────────────

export function ReceiptPage() {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step < 3) { setStep(s => s + 1); return }
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); navigate('/items') }, 1200)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Dashboard
      </Link>

      <Card>
        <CardHeader title="Receipt" subtitle="Register item(s) entering the warehouse" />
        <div className="p-5">
          <StepHeader
            step={step}
            total={3}
            title={step === 1 ? 'Item Information' : step === 2 ? 'Assign Location' : 'Confirm & Print'}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <p className="text-sm text-slate-600 mb-4">Select existing item or create a new one:</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {(['electronics', 'fixture', 'sparepart', 'consumable', 'misc'] as const).map((t) => (
                    <Link key={t} to={`/items/new/${t}`}
                      className="text-sm text-center py-2.5 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors capitalize">
                      + {t === 'electronics' ? 'Electronics Sample' : t === 'sparepart' ? 'Spare Part' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </Link>
                  ))}
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400 text-center my-2">— or search existing —</p>
                    <ItemSearchBox />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Location <span className="text-red-500">*</span></label>
                  <select className={inputClass}>
                    <option value="">— Select location —</option>
                    <option value="l1">A-01-01-1 (Sofia / Main Building)</option>
                    <option value="l2">A-01-01-2 (Sofia / Main Building)</option>
                    <option value="l3">A-01-02-1 (Sofia / Main Building)</option>
                    <option value="l6">B-01-01-1 (Sofia / Main Building)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Container (optional)</label>
                  <select className={inputClass}>
                    <option value="">— No container / new box —</option>
                    <option value="c1">BOX-0001</option>
                    <option value="c2">BOX-0002</option>
                    <option value="c3">BOX-0003</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                  <textarea rows={2} placeholder="Received from supplier, delivery note #…" className={clsx(inputClass, 'resize-none')} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <p className="text-sm font-semibold text-green-800">Ready to confirm receipt</p>
                  </div>
                  <p className="text-sm text-green-700">Item will be marked as <strong>In Storage</strong> at the selected location.</p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300 text-blue-600" defaultChecked />
                  <span className="text-sm text-slate-700">Print item label after confirming</span>
                </label>
              </div>
            )}

            <div className="flex justify-between pt-2">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  Back
                </button>
              ) : <div />}
              <button type="submit" disabled={submitting}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : step < 3 ? 'Continue →' : 'Confirm Receipt'}
              </button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}

// ─── Move ─────────────────────────────────────────────────────────────────────

export function MovePage() {
  const [selectedItemId, setSelectedItemId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const selectedItem = MOCK_ITEMS.find(i => i.id === selectedItemId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); navigate('/items') }, 1000)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Dashboard
      </Link>
      <Card>
        <CardHeader title="Move Item" subtitle="Transfer item to a different location or container" />
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Item <span className="text-red-500">*</span></label>
            <ItemSearchBox onSelect={setSelectedItemId} />
          </div>

          {selectedItem && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Current location</p>
              <p className="font-mono text-sm text-slate-800">{selectedItem.locationLabel ?? selectedItem.externalLocationName ?? '—'}</p>
              {selectedItem.containerLabel && <p className="text-xs text-slate-500 mt-0.5">Container: {selectedItem.containerLabel}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Destination Location <span className="text-red-500">*</span></label>
            <select className={inputClass}>
              <option value="">— Select destination —</option>
              <option value="l1">A-01-01-1 (Sofia / Main Building)</option>
              <option value="l2">A-01-01-2 (Sofia / Main Building)</option>
              <option value="l3">A-01-02-1 (Sofia / Main Building)</option>
              <option value="l6">B-01-01-1 (Sofia / Main Building)</option>
              <option value="l9">C-01-01-1 (Sofia / Lab Building)</option>
              <option value="l11">A-01-01-1 (Munich / Tech Center)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Destination Container (optional)</label>
            <select className={inputClass}>
              <option value="">— No container —</option>
              <option>BOX-0001</option>
              <option>BOX-0002</option>
              <option>BOX-0006 (Munich)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea rows={2} className={clsx(inputClass, 'resize-none')} placeholder="Reason for move…" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link to="/" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Moving…</> : 'Confirm Move'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// ─── Temp Exit ────────────────────────────────────────────────────────────────

export function ExitPage() {
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); navigate('/items') }, 1000)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Dashboard
      </Link>
      <Card>
        <CardHeader title="Temporary Exit" subtitle="Send item to an external location" />
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Item <span className="text-red-500">*</span></label>
            <ItemSearchBox />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">External Location <span className="text-red-500">*</span></label>
            <select className={inputClass}>
              <option value="">— Select external location —</option>
              <option value="el1">BMW Test Center (Munich, Germany)</option>
              <option value="el2">IDIADA Testing Lab (Santa Oliva, Spain)</option>
              <option value="el3">TÜV Rheinland (Cologne, Germany)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Expected Return Date <span className="text-red-500">*</span></label>
            <input type="date" className={inputClass} min={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea rows={2} className={clsx(inputClass, 'resize-none')} placeholder="Purpose of exit, contact person…" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Link to="/" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : 'Confirm Exit'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// ─── Return ───────────────────────────────────────────────────────────────────

export function ReturnPage() {
  const [selectedItemId, setSelectedItemId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const selectedItem = MOCK_ITEMS.find(i => i.id === selectedItemId)
  const isOverdue = selectedItem?.id === 'item3' // mock

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); navigate('/items') }, 1000)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Dashboard
      </Link>
      <Card>
        <CardHeader title="Return (Scan-in)" subtitle="Scan item back into storage" />
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Scan Item <span className="text-red-500">*</span></label>
            <ItemSearchBox onSelect={setSelectedItemId} />
          </div>

          {selectedItem && isOverdue && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Overdue Return</p>
                <p className="text-sm text-red-700">This item's expected return date has passed. Please note the delay.</p>
              </div>
            </div>
          )}

          {selectedItem && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Assign to Location <span className="text-red-500">*</span></label>
                <select className={inputClass}>
                  <option value="">— Select storage location —</option>
                  <option value="l1">A-01-01-1 (Sofia / Main Building)</option>
                  <option value="l2">A-01-01-2 (Sofia / Main Building)</option>
                  <option value="l3">A-01-02-1 (Sofia / Main Building)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Container (optional)</label>
                <select className={inputClass}>
                  <option value="">— No container —</option>
                  <option>BOX-0001</option>
                  <option>BOX-0002</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                <textarea rows={2} className={clsx(inputClass, 'resize-none')} placeholder="Condition notes, delay reason…" />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Link to="/" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
            <button type="submit" disabled={submitting || !selectedItem}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : 'Confirm Return'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// ─── Scrap ────────────────────────────────────────────────────────────────────

export function ScrapPage() {
  const [selectedItemId, setSelectedItemId] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const selectedItem = MOCK_ITEMS.find(i => i.id === selectedItemId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmed) return
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); navigate('/items') }, 1000)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Dashboard
      </Link>
      <Card>
        <CardHeader title="Scrap Item" subtitle="Mark item as permanently scrapped — cannot be undone" />
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Item <span className="text-red-500">*</span></label>
            <ItemSearchBox onSelect={setSelectedItemId} />
          </div>

          {selectedItem && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ItemTypeBadge type={selectedItem.itemType} />
                <ItemStatusBadge status={selectedItem.status} />
              </div>
              <p className="font-mono text-sm font-medium text-slate-800">{selectedItem.labIdNumber}</p>
              <p className="text-xs text-slate-500 mt-1">{selectedItem.locationLabel ?? selectedItem.externalLocationName ?? 'Unknown location'}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for Scrap <span className="text-red-500">*</span></label>
            <textarea rows={3} className={clsx(inputClass, 'resize-none')} placeholder="Describe the reason for scrapping (damage, EOL, failed test…)" />
          </div>

          {selectedItem && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-500"
                />
                <div>
                  <p className="text-sm font-semibold text-red-800">I confirm this item should be scrapped</p>
                  <p className="text-xs text-red-600 mt-0.5">This action is permanent. The item will become read-only in the system. History is preserved.</p>
                </div>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Link to="/" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
            <button
              type="submit"
              disabled={!confirmed || !selectedItem || submitting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : 'Confirm Scrap'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// ─── Consume ──────────────────────────────────────────────────────────────────

export function ConsumePage() {
  const [selectedItemId, setSelectedItemId] = useState('')
  const [qty, setQty] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const consumables = MOCK_ITEMS.filter(i => i.itemType === ItemType.CONSUMABLE && i.status !== ItemStatus.DEPLETED)
  const selectedItem = consumables.find(i => i.id === selectedItemId) as { quantity: number; unit: string; labIdNumber: string; consumableType: string } | undefined

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); navigate('/items') }, 1000)
  }

  const qtyNum = parseFloat(qty)
  const newQty = selectedItem ? (selectedItem.quantity - (isNaN(qtyNum) ? 0 : qtyNum)) : null

  return (
    <div className="max-w-2xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Dashboard
      </Link>
      <Card>
        <CardHeader title="Consume" subtitle="Record consumable usage and update quantity" />
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Consumable <span className="text-red-500">*</span></label>
            <select className={inputClass} value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}>
              <option value="">— Select consumable —</option>
              {consumables.map(c => {
                const con = c as { labIdNumber: string; consumableType: string; quantity: number; unit: string }
                return (
                  <option key={c.id} value={c.id}>
                    {con.labIdNumber} — {con.consumableType} ({con.quantity} {con.unit} remaining)
                  </option>
                )
              })}
            </select>
          </div>

          {selectedItem && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Current stock</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{selectedItem.quantity} <span className="text-base font-normal text-slate-500">{selectedItem.unit}</span></p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity Consumed <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="0.00"
                className={inputClass}
                max={selectedItem?.quantity}
              />
            </div>
            {selectedItem && qty && !isNaN(qtyNum) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Remaining after</label>
                <div className={clsx(
                  'border rounded-lg px-3 py-2.5 text-sm font-semibold',
                  newQty !== null && newQty <= 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
                )}>
                  {newQty !== null && newQty <= 0 ? 'Will be depleted' : `${newQty?.toFixed(2)} ${selectedItem.unit}`}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea rows={2} className={clsx(inputClass, 'resize-none')} placeholder="Test batch number, usage purpose…" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link to="/" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
            <button
              type="submit"
              disabled={!selectedItem || !qty || isNaN(qtyNum) || qtyNum <= 0 || submitting}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : 'Confirm Consume'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
