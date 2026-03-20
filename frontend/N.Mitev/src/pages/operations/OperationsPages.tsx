/**
 * All Operations pages in one file:
 * ReceiptPage, MovePage, ExitPage, ReturnPage, ScrapPage, ConsumePage
 */

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ScanLine, Search, Loader2, AlertTriangle } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { ItemStatusBadge, ItemTypeBadge } from '../../components/ui/StatusBadge'
import { MOCK_ITEMS, MOCK_EXTERNAL_LOCATIONS } from '../../mock/data'
import { ItemType, ItemStatus } from '../../types'
import type { AnyItem } from '../../types'
import {
  getItems, getLocationsFlat, getContainers, getExternalLocations,
  recordReceipt, recordMove, recordExit, recordReturn, recordScrap, recordConsume,
} from '../../api'
import clsx from 'clsx'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white'

// ── Shared types ─────────────────────────────────────────────────────────────

type LocationOption = { id: string; label: string; buildingName: string; siteName: string }
type ContainerOption = { id: string; label: string }
type ExternalLocationOption = { id: string; name: string; city: string; country: string }

// ── Mock data fallbacks ───────────────────────────────────────────────────────

const MOCK_LOCATION_OPTIONS: LocationOption[] = [
  { id: 'l1', label: 'A-01-01-1', buildingName: 'Main Building', siteName: 'Sofia' },
  { id: 'l2', label: 'A-01-01-2', buildingName: 'Main Building', siteName: 'Sofia' },
  { id: 'l3', label: 'A-01-02-1', buildingName: 'Main Building', siteName: 'Sofia' },
  { id: 'l6', label: 'B-01-01-1', buildingName: 'Main Building', siteName: 'Sofia' },
  { id: 'l9', label: 'C-01-01-1', buildingName: 'Lab Building', siteName: 'Sofia' },
  { id: 'l11', label: 'A-01-01-1', buildingName: 'Tech Center', siteName: 'Munich' },
]

const MOCK_CONTAINER_OPTIONS: ContainerOption[] = [
  { id: 'c1', label: 'BOX-0001' },
  { id: 'c2', label: 'BOX-0002' },
  { id: 'c3', label: 'BOX-0003' },
  { id: 'c4', label: 'BOX-0004' },
]

const MOCK_EXTERNAL_OPTS: ExternalLocationOption[] = MOCK_EXTERNAL_LOCATIONS.map(el => ({
  id: el.id,
  name: el.name,
  city: el.city,
  country: el.country,
}))

// ── Shared hooks ──────────────────────────────────────────────────────────────

function useLocations() {
  const [options, setOptions] = useState<LocationOption[]>(USE_MOCKS ? MOCK_LOCATION_OPTIONS : [])
  useEffect(() => {
    if (USE_MOCKS) return
    getLocationsFlat().then(r => setOptions(r.data)).catch(() => {})
  }, [])
  return options
}

function useContainers() {
  const [options, setOptions] = useState<ContainerOption[]>(USE_MOCKS ? MOCK_CONTAINER_OPTIONS : [])
  useEffect(() => {
    if (USE_MOCKS) return
    getContainers().then(r => setOptions(r.data.map(c => ({ id: c.id, label: c.label })))).catch(() => {})
  }, [])
  return options
}

function useExternalLocations() {
  const [options, setOptions] = useState<ExternalLocationOption[]>(USE_MOCKS ? MOCK_EXTERNAL_OPTS : [])
  useEffect(() => {
    if (USE_MOCKS) return
    getExternalLocations().then(r => setOptions(r.data.map(el => ({
      id: el.id,
      name: el.name,
      city: el.city,
      country: el.country,
    })))).catch(() => {})
  }, [])
  return options
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getItemLocation(item: Record<string, unknown>): string {
  if (item.location) return (item.location as { label: string }).label
  if (item.locationLabel) return String(item.locationLabel)
  if (item.externalLocation) return (item.externalLocation as { name: string }).name
  if (item.externalLocationName) return String(item.externalLocationName)
  return '—'
}

function getItemContainer(item: Record<string, unknown>): string {
  if (item.container) return (item.container as { label: string }).label
  if (item.containerLabel) return String(item.containerLabel)
  return ''
}

// ── Step indicator ────────────────────────────────────────────────────────────

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

// ── Item search ───────────────────────────────────────────────────────────────

function ItemSearchBox({ onSelect }: { onSelect?: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AnyItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query) { setResults([]); return }

    if (USE_MOCKS) {
      const q = query.toLowerCase()
      setResults(
        MOCK_ITEMS.filter(i =>
          i.labIdNumber.toLowerCase().includes(q) || i.id.includes(q)
        ).slice(0, 5)
      )
      return
    }

    setLoading(true)
    getItems({ search: query, pageSize: 5 })
      .then(r => setResults(r.data))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [query])

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
        <button type="button" className="shrink-0 p-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </button>
      </div>
      {results.length > 0 && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setQuery(item.labIdNumber); setResults([]); onSelect?.(item.id) }}
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
  const [error, setError] = useState('')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [containerId, setContainerId] = useState('')
  const [notes, setNotes] = useState('')
  const navigate = useNavigate()
  const locationOptions = useLocations()
  const containerOptions = useContainers()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step < 3) { setStep(s => s + 1); return }
    setSubmitting(true)
    setError('')

    if (USE_MOCKS) {
      console.log('Receipt payload (mock):', { selectedItemId, locationId, containerId, notes })
      setTimeout(() => { setSubmitting(false); navigate('/items') }, 1200)
      return
    }

    try {
      await recordReceipt({
        itemId: selectedItemId,
        locationId: locationId || undefined,
        containerId: containerId || undefined,
        notes: notes || undefined,
      })
      navigate('/items')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record receipt')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Dashboard
      </Link>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{error}</div>
      )}

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
                    <ItemSearchBox onSelect={setSelectedItemId} />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Location <span className="text-red-500">*</span></label>
                  <select value={locationId} onChange={e => setLocationId(e.target.value)} className={inputClass}>
                    <option value="">— Select location —</option>
                    {locationOptions.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.label} ({loc.siteName} / {loc.buildingName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Container (optional)</label>
                  <select value={containerId} onChange={e => setContainerId(e.target.value)} className={inputClass}>
                    <option value="">— No container / new box —</option>
                    {containerOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                  <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Received from supplier, delivery note #…" className={clsx(inputClass, 'resize-none')} />
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
  const [selectedItem, setSelectedItem] = useState<AnyItem | null>(null)
  const [destLocationId, setDestLocationId] = useState('')
  const [destContainerId, setDestContainerId] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const locationOptions = useLocations()
  const containerOptions = useContainers()

  function handleSelectItem(id: string) {
    setSelectedItemId(id)
    if (USE_MOCKS) {
      setSelectedItem(MOCK_ITEMS.find(i => i.id === id) ?? null)
      return
    }
    import('../../api').then(api => {
      api.getItem(id).then(r => setSelectedItem(r.data)).catch(() => {})
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (USE_MOCKS) {
      console.log('Move payload (mock):', { selectedItemId, destLocationId, destContainerId, notes })
      setTimeout(() => { setSubmitting(false); navigate('/items') }, 1000)
      return
    }

    try {
      await recordMove({
        itemId: selectedItemId,
        toLocationId: destLocationId || undefined,
        toContainerId: destContainerId || undefined,
        notes: notes || undefined,
      })
      navigate('/items')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record move')
      setSubmitting(false)
    }
  }

  const asAny = selectedItem as Record<string, unknown> | null

  return (
    <div className="max-w-2xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Dashboard
      </Link>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader title="Move Item" subtitle="Transfer item to a different location or container" />
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Item <span className="text-red-500">*</span></label>
            <ItemSearchBox onSelect={handleSelectItem} />
          </div>

          {selectedItem && asAny && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Current location</p>
              <p className="font-mono text-sm text-slate-800">{getItemLocation(asAny)}</p>
              {getItemContainer(asAny) && (
                <p className="text-xs text-slate-500 mt-0.5">Container: {getItemContainer(asAny)}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Destination Location <span className="text-red-500">*</span></label>
            <select value={destLocationId} onChange={e => setDestLocationId(e.target.value)} className={inputClass}>
              <option value="">— Select destination —</option>
              {locationOptions.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.label} ({loc.siteName} / {loc.buildingName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Destination Container (optional)</label>
            <select value={destContainerId} onChange={e => setDestContainerId(e.target.value)} className={inputClass}>
              <option value="">— No container —</option>
              {containerOptions.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={clsx(inputClass, 'resize-none')} placeholder="Reason for move…" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link to="/" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
            <button type="submit" disabled={submitting || !selectedItemId}
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
  const [selectedItemId, setSelectedItemId] = useState('')
  const [externalLocationId, setExternalLocationId] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const externalOptions = useExternalLocations()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (USE_MOCKS) {
      console.log('Exit payload (mock):', { selectedItemId, externalLocationId, expectedReturnDate, notes })
      setTimeout(() => { setSubmitting(false); navigate('/items') }, 1000)
      return
    }

    try {
      await recordExit({
        itemId: selectedItemId,
        toExternalLocationId: externalLocationId,
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined,
        notes: notes || undefined,
      })
      navigate('/items')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record exit')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Dashboard
      </Link>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader title="Temporary Exit" subtitle="Send item to an external location" />
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Item <span className="text-red-500">*</span></label>
            <ItemSearchBox onSelect={setSelectedItemId} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">External Location <span className="text-red-500">*</span></label>
            <select value={externalLocationId} onChange={e => setExternalLocationId(e.target.value)} className={inputClass}>
              <option value="">— Select external location —</option>
              {externalOptions.map(el => (
                <option key={el.id} value={el.id}>{el.name} ({el.city}, {el.country})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Expected Return Date <span className="text-red-500">*</span></label>
            <input type="date" value={expectedReturnDate} onChange={e => setExpectedReturnDate(e.target.value)} className={inputClass} min={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={clsx(inputClass, 'resize-none')} placeholder="Purpose of exit, contact person…" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Link to="/" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
            <button type="submit" disabled={submitting || !selectedItemId || !externalLocationId}
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
  const [selectedItem, setSelectedItem] = useState<AnyItem | null>(null)
  const [returnLocationId, setReturnLocationId] = useState('')
  const [returnContainerId, setReturnContainerId] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const locationOptions = useLocations()
  const containerOptions = useContainers()

  function handleSelectItem(id: string) {
    setSelectedItemId(id)
    if (USE_MOCKS) {
      setSelectedItem(MOCK_ITEMS.find(i => i.id === id) ?? null)
      return
    }
    import('../../api').then(api => {
      api.getItem(id).then(r => setSelectedItem(r.data)).catch(() => {})
    })
  }

  const isOverdue =
    selectedItem?.status === ItemStatus.TEMP_EXIT &&
    selectedItem?.expectedReturnDate != null &&
    new Date(selectedItem.expectedReturnDate) < new Date()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (USE_MOCKS) {
      console.log('Return payload (mock):', { selectedItemId, returnLocationId, returnContainerId, notes })
      setTimeout(() => { setSubmitting(false); navigate('/items') }, 1000)
      return
    }

    try {
      await recordReturn({
        itemId: selectedItemId,
        toLocationId: returnLocationId || undefined,
        toContainerId: returnContainerId || undefined,
        notes: notes || undefined,
      })
      navigate('/items')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record return')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Dashboard
      </Link>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader title="Return (Scan-in)" subtitle="Scan item back into storage" />
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Scan Item <span className="text-red-500">*</span></label>
            <ItemSearchBox onSelect={handleSelectItem} />
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
                <select value={returnLocationId} onChange={e => setReturnLocationId(e.target.value)} className={inputClass}>
                  <option value="">— Select storage location —</option>
                  {locationOptions.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.label} ({loc.siteName} / {loc.buildingName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Container (optional)</label>
                <select value={returnContainerId} onChange={e => setReturnContainerId(e.target.value)} className={inputClass}>
                  <option value="">— No container —</option>
                  {containerOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={clsx(inputClass, 'resize-none')} placeholder="Condition notes, delay reason…" />
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
  const [selectedItem, setSelectedItem] = useState<AnyItem | null>(null)
  const [scrapReason, setScrapReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function handleSelectItem(id: string) {
    setSelectedItemId(id)
    if (USE_MOCKS) {
      setSelectedItem(MOCK_ITEMS.find(i => i.id === id) ?? null)
      return
    }
    import('../../api').then(api => {
      api.getItem(id).then(r => setSelectedItem(r.data)).catch(() => {})
    })
  }

  const asAny = selectedItem as Record<string, unknown> | null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmed) return
    setSubmitting(true)
    setError('')

    if (USE_MOCKS) {
      console.log('Scrap payload (mock):', { selectedItemId, scrapReason })
      setTimeout(() => { setSubmitting(false); navigate('/items') }, 1000)
      return
    }

    try {
      await recordScrap({ itemId: selectedItemId, notes: scrapReason || undefined })
      navigate('/items')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scrap item')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Dashboard
      </Link>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader title="Scrap Item" subtitle="Mark item as permanently scrapped — cannot be undone" />
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Item <span className="text-red-500">*</span></label>
            <ItemSearchBox onSelect={handleSelectItem} />
          </div>

          {selectedItem && asAny && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ItemTypeBadge type={selectedItem.itemType} />
                <ItemStatusBadge status={selectedItem.status} />
              </div>
              <p className="font-mono text-sm font-medium text-slate-800">{selectedItem.labIdNumber}</p>
              <p className="text-xs text-slate-500 mt-1">{getItemLocation(asAny)}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for Scrap <span className="text-red-500">*</span></label>
            <textarea rows={3} value={scrapReason} onChange={e => setScrapReason(e.target.value)} className={clsx(inputClass, 'resize-none')} placeholder="Describe the reason for scrapping (damage, EOL, failed test…)" />
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
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [consumables, setConsumables] = useState<AnyItem[]>(
    USE_MOCKS
      ? MOCK_ITEMS.filter(i => i.itemType === ItemType.CONSUMABLE && i.status !== ItemStatus.DEPLETED)
      : [],
  )
  const navigate = useNavigate()

  useEffect(() => {
    if (USE_MOCKS) return
    getItems({ itemType: ItemType.CONSUMABLE, pageSize: 100 })
      .then(r => setConsumables(r.data.filter(i => i.status !== ItemStatus.DEPLETED)))
      .catch(() => {})
  }, [])

  type ConsumableView = { quantity: number; unit: string; labIdNumber: string; consumableType: string }
  const selectedItem = consumables.find(i => i.id === selectedItemId) as (AnyItem & ConsumableView) | undefined

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (USE_MOCKS) {
      console.log('Consume payload (mock):', { selectedItemId, qty })
      setTimeout(() => { setSubmitting(false); navigate('/items') }, 1000)
      return
    }

    try {
      await recordConsume({
        itemId: selectedItemId,
        quantityConsumed: parseFloat(qty),
        notes: notes || undefined,
      })
      navigate('/items')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record consumption')
      setSubmitting(false)
    }
  }

  const qtyNum = parseFloat(qty)
  const newQty = selectedItem ? (selectedItem.quantity - (isNaN(qtyNum) ? 0 : qtyNum)) : null

  return (
    <div className="max-w-2xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Dashboard
      </Link>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader title="Consume" subtitle="Record consumable usage and update quantity" />
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Consumable <span className="text-red-500">*</span></label>
            <select className={inputClass} value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}>
              <option value="">— Select consumable —</option>
              {consumables.map(c => {
                const con = c as AnyItem & ConsumableView
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
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={clsx(inputClass, 'resize-none')} placeholder="Test batch number, usage purpose…" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link to="/" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
            <button
              type="submit"
              disabled={!selectedItem || !qty || isNaN(qtyNum) || qtyNum <= 0 || qtyNum > (selectedItem?.quantity ?? 0) || submitting}
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
