import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useBlocker } from 'react-router-dom'
import { ArrowLeft, Save, Info, Loader2 } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { FixtureType, FIXTURE_TYPE_LABELS, DEV_PHASE_LABELS, ItemType } from '../../types'
import type { AnyItem, ElectronicsSample, Fixture, SparePart, Consumable, MiscItem } from '../../types'
import { createItem, getLocationsFlat, getContainers, getItem, updateItem } from '../../api'
import { MOCK_ITEMS, MOCK_SITES } from '../../mock/data'
import clsx from 'clsx'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

type ItemFormType = 'electronics' | 'fixture' | 'sparepart' | 'consumable' | 'misc'

const VALID_TYPES: ItemFormType[] = ['electronics', 'fixture', 'sparepart', 'consumable', 'misc']

const FORM_TITLES: Record<ItemFormType, string> = {
  electronics: 'Add Electronics Sample',
  fixture: 'Add Fixture',
  sparepart: 'Add Spare Part',
  consumable: 'Add Consumable',
  misc: 'Add Misc Item',
}

function FormField({
  label,
  required,
  children,
  hint,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Info size={11} />{hint}</p>}
    </div>
  )
}

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white'

// Compact inline field — renders as two direct grid children (label + content).
// Must be placed directly inside an INLINE_GRID container.
function InlineField({
  label,
  required,
  children,
  hint,
  wide,
  alignTop,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
  wide?: boolean      // spans remaining columns on desktop (for textareas etc.)
  alignTop?: boolean  // top-aligns the label (use with multi-row inputs)
}) {
  return (
    <>
      <label className={clsx(
        'text-xs font-medium text-slate-500 whitespace-nowrap text-right pr-1 leading-none',
        alignTop ? 'self-start pt-1.5' : 'self-center',
        wide && 'md:col-start-1',
      )}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className={clsx('min-w-0', wide && 'md:col-span-3')}>
        {children}
        {hint && <p className="text-xs text-slate-400 mt-0.5 leading-tight flex items-center gap-1"><Info size={10} />{hint}</p>}
      </div>
    </>
  )
}

// 4-col grid: [label auto][input 1fr][label auto][input 1fr]
// Falls back to 2-col [label auto][input 1fr] on mobile.
const INLINE_GRID = 'grid grid-cols-[max-content_1fr] md:grid-cols-[max-content_1fr_max-content_1fr] gap-x-3 gap-y-1.5 items-center'

function ElectronicsForm({ fields, setField }: {
  fields: Record<string, string>
  setField: (name: string, value: string) => void
}) {
  return (
    <div className={INLINE_GRID}>
      <InlineField label="OEM" required>
        <input type="text" name="oem" value={fields.oem ?? ''} onChange={e => setField('oem', e.target.value)} placeholder="BMW, RSA, MB, STLA…" className={inputClass} />
      </InlineField>
      <InlineField label="Product Type" required>
        <input type="text" name="productType" value={fields.productType ?? ''} onChange={e => setField('productType', e.target.value)} placeholder="Cluster, CID, HUD, BDC…" className={inputClass} />
      </InlineField>
      <InlineField label="Product Name" required>
        <input type="text" name="productName" value={fields.productName ?? ''} onChange={e => setField('productName', e.target.value)} placeholder="BR206 CID" className={inputClass} />
      </InlineField>
      <InlineField label="OEM Part Number" required>
        <input type="text" name="oemPartNumber" value={fields.oemPartNumber ?? ''} onChange={e => setField('oemPartNumber', e.target.value)} placeholder="A 01 01 205" className={clsx(inputClass, 'font-mono')} />
      </InlineField>
      <InlineField label="Test Request No." required>
        <input type="text" name="testRequestNumber" value={fields.testRequestNumber ?? ''} onChange={e => setField('testRequestNumber', e.target.value)} placeholder="TR.EL26.012345" className={clsx(inputClass, 'font-mono')} />
      </InlineField>
      <InlineField label="Lab ID Number" required hint="Auto-generated or enter manually">
        <input type="text" name="labIdNumber" value={fields.labIdNumber ?? ''} onChange={e => setField('labIdNumber', e.target.value)} placeholder="TR.EL26.012345.1.1" className={clsx(inputClass, 'font-mono')} />
      </InlineField>
      <InlineField label="Serial Number">
        <input type="text" name="serialNumber" value={fields.serialNumber ?? ''} onChange={e => setField('serialNumber', e.target.value)} placeholder="SN-2026-001" className={clsx(inputClass, 'font-mono')} />
      </InlineField>
      <InlineField label="Dev. Phase">
        <select name="developmentPhase" value={fields.developmentPhase ?? ''} onChange={e => setField('developmentPhase', e.target.value)} className={inputClass}>
          <option value="">— Select —</option>
          {Object.entries(DEV_PHASE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </InlineField>
      <InlineField label="Plant Location">
        <input type="text" name="plantLocation" value={fields.plantLocation ?? ''} onChange={e => setField('plantLocation', e.target.value)} placeholder="Regensburg, Palmela…" className={inputClass} />
      </InlineField>
      <InlineField label="Requester">
        <input type="text" name="requester" value={fields.requester ?? ''} onChange={e => setField('requester', e.target.value)} placeholder="Name or Company ID" className={inputClass} />
      </InlineField>
      <InlineField label="Comment" wide alignTop>
        <textarea name="comment" rows={2} value={fields.comment ?? ''} onChange={e => setField('comment', e.target.value)} placeholder="Optional notes…" className={clsx(inputClass, 'resize-none overflow-x-hidden')} />
      </InlineField>
    </div>
  )
}

function FixtureForm({ fields, setField, selectedTypes, setSelectedTypes }: {
  fields: Record<string, string>
  setField: (name: string, value: string) => void
  selectedTypes: FixtureType[]
  setSelectedTypes: (types: FixtureType[]) => void
}) {
  function toggleType(ft: FixtureType) {
    setSelectedTypes(
      selectedTypes.includes(ft) ? selectedTypes.filter((t) => t !== ft) : [...selectedTypes, ft],
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <FormField label="Product Name" required>
        <input type="text" name="productName" value={fields.productName ?? ''} onChange={e => setField('productName', e.target.value)} placeholder="BR206 CID Vib Fixture" className={inputClass} />
      </FormField>
      <FormField label="Lab ID Number" required>
        <input type="text" name="labIdNumber" value={fields.labIdNumber ?? ''} onChange={e => setField('labIdNumber', e.target.value)} placeholder="432, 1236, 3256…" className={clsx(inputClass, 'font-mono')} />
      </FormField>

      <div className="col-span-full">
        <FormField label="Fixture Type(s)" required>
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(FIXTURE_TYPE_LABELS).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => toggleType(v as FixtureType)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                  selectedTypes.includes(v as FixtureType)
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                {l}
              </button>
            ))}
          </div>
          {selectedTypes.length > 0 && (
            <p className="text-xs text-purple-600 mt-1">Selected: {selectedTypes.map(t => FIXTURE_TYPE_LABELS[t]).join(', ')}</p>
          )}
        </FormField>
      </div>

      <div className="col-span-full">
        <FormField label="Comment">
          <textarea name="comment" rows={2} value={fields.comment ?? ''} onChange={e => setField('comment', e.target.value)} placeholder="Optional notes…" className={clsx(inputClass, 'resize-none overflow-x-hidden')} />
        </FormField>
      </div>
    </div>
  )
}

function SparePartForm({ fields, setField }: {
  fields: Record<string, string>
  setField: (name: string, value: string) => void
}) {
  return (
    <div className={INLINE_GRID}>
      <InlineField label="Manufacturer" required>
        <input type="text" name="manufacturer" value={fields.manufacturer ?? ''} onChange={e => setField('manufacturer', e.target.value)} placeholder="ETS Solutions, Danfoss…" className={inputClass} />
      </InlineField>
      <InlineField label="Model" required>
        <input type="text" name="model" value={fields.model ?? ''} onChange={e => setField('model', e.target.value)} placeholder="OP-31, X-522…" className={clsx(inputClass, 'font-mono')} />
      </InlineField>
      <InlineField label="Type" required>
        <input type="text" name="partType" value={fields.partType ?? ''} onChange={e => setField('partType', e.target.value)} placeholder="Compressor, Valve, Fan…" className={inputClass} />
      </InlineField>
      <InlineField label="Variant">
        <input type="text" name="variant" value={fields.variant ?? ''} onChange={e => setField('variant', e.target.value)} placeholder="Single phase, 3-phase, 7 bar…" className={inputClass} />
      </InlineField>
      <InlineField label="Lab ID Number" required>
        <input type="text" name="labIdNumber" value={fields.labIdNumber ?? ''} onChange={e => setField('labIdNumber', e.target.value)} placeholder="SP-2025-0011" className={clsx(inputClass, 'font-mono')} />
      </InlineField>
      <InlineField label="For Machines" hint="Comma-separated machine IDs">
        <input type="text" name="forMachines" value={fields.forMachines ?? ''} onChange={e => setField('forMachines', e.target.value)} placeholder="TH710-W5, TS130" className={inputClass} />
      </InlineField>
      <InlineField label="Comment" wide alignTop>
        <textarea name="comment" rows={2} value={fields.comment ?? ''} onChange={e => setField('comment', e.target.value)} placeholder="Optional notes…" className={clsx(inputClass, 'resize-none overflow-x-hidden')} />
      </InlineField>
    </div>
  )
}

function ConsumableForm({ fields, setField }: {
  fields: Record<string, string>
  setField: (name: string, value: string) => void
}) {
  return (
    <div className={INLINE_GRID}>
      <InlineField label="Manufacturer" required>
        <input type="text" name="manufacturer" value={fields.manufacturer ?? ''} onChange={e => setField('manufacturer', e.target.value)} placeholder="Valerus, Hydratek…" className={inputClass} />
      </InlineField>
      <InlineField label="Model" required>
        <input type="text" name="model" value={fields.model ?? ''} onChange={e => setField('model', e.target.value)} placeholder="MBR-200, pH7-Solution…" className={inputClass} />
      </InlineField>
      <InlineField label="Type" required>
        <input type="text" name="consumableType" value={fields.consumableType ?? ''} onChange={e => setField('consumableType', e.target.value)} placeholder="Arizona A2 dust, NaCl…" className={inputClass} />
      </InlineField>
      <InlineField label="Lab ID Number" required>
        <input type="text" name="labIdNumber" value={fields.labIdNumber ?? ''} onChange={e => setField('labIdNumber', e.target.value)} placeholder="CON-2026-001" className={clsx(inputClass, 'font-mono')} />
      </InlineField>
      <InlineField label="Quantity" required>
        <input type="number" name="quantity" min="0.01" step="0.01" value={fields.quantity ?? ''} onChange={e => setField('quantity', e.target.value)} placeholder="0.00" className={inputClass} />
      </InlineField>
      <InlineField label="Unit" required>
        <input type="text" name="unit" value={fields.unit ?? ''} onChange={e => setField('unit', e.target.value)} placeholder="kg, L, pcs…" className={inputClass} />
      </InlineField>
      <InlineField label="Lot Number">
        <input type="text" name="lotNumber" value={fields.lotNumber ?? ''} onChange={e => setField('lotNumber', e.target.value)} placeholder="LOT-2026-0120" className={clsx(inputClass, 'font-mono')} />
      </InlineField>
      <InlineField label="Expiry Date">
        <input type="date" name="expiryDate" value={fields.expiryDate ?? ''} onChange={e => setField('expiryDate', e.target.value)} className={inputClass} />
      </InlineField>
      <InlineField label="Shelf Life (months)">
        <input type="number" name="shelfLife" min="1" value={fields.shelfLife ?? ''} onChange={e => setField('shelfLife', e.target.value)} placeholder="12" className={inputClass} />
      </InlineField>
      <InlineField label="Comment" wide alignTop>
        <textarea name="comment" rows={2} value={fields.comment ?? ''} onChange={e => setField('comment', e.target.value)} placeholder="Optional notes…" className={clsx(inputClass, 'resize-none overflow-x-hidden')} />
      </InlineField>
    </div>
  )
}

function MiscForm({ fields, setField }: {
  fields: Record<string, string>
  setField: (name: string, value: string) => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <FormField label="Name" required>
        <input type="text" name="miscName" value={fields.miscName ?? ''} onChange={e => setField('miscName', e.target.value)} placeholder="M5 Hex Bolt Set" className={inputClass} />
      </FormField>
      <FormField label="Lab ID Number" required>
        <input type="text" name="labIdNumber" value={fields.labIdNumber ?? ''} onChange={e => setField('labIdNumber', e.target.value)} placeholder="MISC-001" className={clsx(inputClass, 'font-mono')} />
      </FormField>
      <div className="col-span-full">
        <FormField label="Description">
          <textarea name="miscDescription" rows={3} value={fields.miscDescription ?? ''} onChange={e => setField('miscDescription', e.target.value)} placeholder="Pack of 100 M5 hex bolts, stainless steel…" className={clsx(inputClass, 'resize-none overflow-x-hidden')} />
        </FormField>
      </div>
      <div className="col-span-full">
        <FormField label="Comment">
          <textarea name="comment" rows={2} value={fields.comment ?? ''} onChange={e => setField('comment', e.target.value)} placeholder="Optional notes…" className={clsx(inputClass, 'resize-none overflow-x-hidden')} />
        </FormField>
      </div>
    </div>
  )
}

// ── Mock location/container options ─────────────────────────────────────────

// Generate location options dynamically from MOCK_SITES
function generateLocationOptions() {
  const options: Array<{ id: string; label: string; buildingName: string; siteName: string }> = []
  
  MOCK_SITES.forEach(site => {
    site.buildings.forEach(building => {
      building.storageAreas.forEach(area => {
        area.locations.forEach(location => {
          options.push({
            id: location.id,
            label: location.label,
            buildingName: building.name,
            siteName: site.name,
          })
        })
      })
    })
  })
  
  return options
}

const MOCK_LOCATION_OPTIONS = generateLocationOptions()

const MOCK_CONTAINER_OPTIONS = MOCK_ITEMS
  .filter(i => 'containerLabel' in i && i.containerLabel)
  .map(i => ({ id: i.id, label: (i as { containerLabel: string }).containerLabel }))

// ── Page ─────────────────────────────────────────────────────────────────────

const FORM_TYPE_FROM_ITEM: Record<string, ItemFormType> = {
  ELECTRONICS_SAMPLE: 'electronics',
  FIXTURE: 'fixture',
  SPARE_PART: 'sparepart',
  CONSUMABLE: 'consumable',
  MISC: 'misc',
}

export function EditItemPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<AnyItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [fixtureTypes, setFixtureTypes] = useState<FixtureType[]>([])
  const [isDirty, setIsDirty] = useState(false)

  function populateFields(loaded: AnyItem) {
    const base = { labIdNumber: loaded.labIdNumber, comment: loaded.comment ?? '' }
    switch (loaded.itemType) {
      case ItemType.ELECTRONICS_SAMPLE: {
        const el = loaded as ElectronicsSample
        setFields({ ...base, oem: el.oem, productType: el.productType ?? '', productName: el.productName, oemPartNumber: el.oemPartNumber, testRequestNumber: el.testRequestNumber, serialNumber: el.serialNumber ?? '', developmentPhase: el.developmentPhase ?? '', plantLocation: el.plantLocation ?? '', requester: el.requester ?? '' })
        break
      }
      case ItemType.FIXTURE: {
        const fx = loaded as Fixture
        setFields({ ...base, productName: fx.productName })
        setFixtureTypes(fx.fixtureCategories)
        break
      }
      case ItemType.SPARE_PART: {
        const sp = loaded as SparePart
        setFields({ ...base, manufacturer: sp.manufacturer, model: sp.model, partType: sp.partType, variant: sp.variant ?? '', forMachines: sp.forMachines?.join(', ') ?? '' })
        break
      }
      case ItemType.CONSUMABLE: {
        const con = loaded as Consumable
        setFields({ ...base, manufacturer: con.manufacturer, model: con.model, consumableType: con.consumableType, quantity: String(con.quantity), unit: con.unit, lotNumber: con.lotNumber ?? '', expiryDate: con.expiryDate ? con.expiryDate.substring(0, 10) : '', shelfLife: con.shelfLifeMonths ? String(con.shelfLifeMonths) : '' })
        break
      }
      case ItemType.MISC: {
        const misc = loaded as MiscItem
        setFields({ ...base, miscName: misc.miscName, miscDescription: misc.miscDescription ?? '' })
        break
      }
    }
  }

  useEffect(() => {
    if (!id) return
    if (USE_MOCKS) {
      const found = MOCK_ITEMS.find(i => i.id === id) ?? null
      if (found) populateFields(found)
      setItem(found)
      setLoading(false)
      return
    }
    getItem(id)
      .then(res => { setItem(res.data); populateFields(res.data) })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load item'))
      .finally(() => setLoading(false))
  }, [id])

  function setField(name: string, value: string) {
    setFields(prev => ({ ...prev, [name]: value }))
    setIsDirty(true)
  }

  function handleFixtureTypes(types: FixtureType[]) {
    setFixtureTypes(types)
    setIsDirty(true)
  }

  const blocker = useBlocker(isDirty && !saving && !loading)

  useEffect(() => {
    if (!isDirty || saving) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, saving])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!item || !id) return
    setError('')
    setSaving(true)

    if (USE_MOCKS) {
      setTimeout(() => { setSaving(false); navigate(`/items/${id}`) }, 800)
      return
    }

    try {
      let payload: Record<string, unknown> = {
        comment: fields.comment || undefined,
      }
      switch (item.itemType) {
        case ItemType.ELECTRONICS_SAMPLE:
          payload = { ...payload, oem: fields.oem, productType: fields.productType, productName: fields.productName, oemPartNumber: fields.oemPartNumber, testRequestNumber: fields.testRequestNumber, serialNumber: fields.serialNumber || undefined, developmentPhase: fields.developmentPhase || undefined, plantLocation: fields.plantLocation || undefined, requester: fields.requester || undefined }
          break
        case ItemType.FIXTURE:
          payload = { ...payload, productName: fields.productName, fixtureCategories: fixtureTypes }
          break
        case ItemType.SPARE_PART:
          payload = { ...payload, manufacturer: fields.manufacturer, model: fields.model, partType: fields.partType, variant: fields.variant || undefined, forMachines: fields.forMachines ? fields.forMachines.split(',').map(s => s.trim()).filter(Boolean) : undefined }
          break
        case ItemType.CONSUMABLE:
          payload = { ...payload, manufacturer: fields.manufacturer, model: fields.model, consumableType: fields.consumableType, quantity: parseFloat(fields.quantity), unit: fields.unit, lotNumber: fields.lotNumber || undefined, expiryDate: fields.expiryDate ? new Date(fields.expiryDate).toISOString() : undefined, shelfLifeMonths: fields.shelfLife ? parseInt(fields.shelfLife, 10) : undefined }
          break
        case ItemType.MISC:
          payload = { ...payload, miscName: fields.miscName, miscDescription: fields.miscDescription || undefined }
          break
      }
      await updateItem(id, payload)
      setIsDirty(false)
      navigate(`/items/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
      setSaving(false)
    }
  }

  const formType: ItemFormType = item ? (FORM_TYPE_FROM_ITEM[item.itemType] ?? 'electronics') : 'electronics'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading item…</span>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <p className="text-lg font-medium text-red-600">{error || 'Item not found'}</p>
        <Link to="/items" className="mt-3 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Items
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-3xl">
      <Link to={`/items/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft size={15} />
        Back to Item
      </Link>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Card>
          <CardHeader
            title={`Edit ${FORM_TITLES[formType].replace('Add ', '')}`}
            subtitle={item.labIdNumber}
          />
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lab ID Number</label>
              <input
                type="text"
                value={item.labIdNumber}
                readOnly
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-500 bg-slate-50 cursor-not-allowed font-mono"
              />
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Info size={11} />Lab ID cannot be changed after creation</p>
            </div>
            {formType === 'electronics' && <ElectronicsForm fields={fields} setField={setField} />}
            {formType === 'fixture' && <FixtureForm fields={fields} setField={setField} selectedTypes={fixtureTypes} setSelectedTypes={handleFixtureTypes} />}
            {formType === 'sparepart' && <SparePartForm fields={fields} setField={setField} />}
            {formType === 'consumable' && <ConsumableForm fields={fields} setField={setField} />}
            {formType === 'misc' && <MiscForm fields={fields} setField={setField} />}
          </div>
        </Card>

        <div className="flex items-center gap-3 justify-end">
          <Link
            to={`/items/${id}`}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><Save size={15} />Save Changes</>}
          </button>
        </div>
      </form>

      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <p className="text-sm font-semibold text-slate-800 mb-1">Leave page?</p>
            <p className="text-sm text-slate-600 mb-4">Your unsaved changes will be lost.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => blocker.reset?.()} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">Stay</button>
              <button onClick={() => blocker.proceed?.()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add Item Page ─────────────────────────────────────────────────────────────

export function AddItemPage() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [fixtureTypes, setFixtureTypes] = useState<FixtureType[]>([])
  const [locationId, setLocationId] = useState('')
  const [containerId, setContainerId] = useState('')

  type LocationOption = { id: string; label: string; buildingName: string; siteName: string }
  type ContainerOption = { id: string; label: string }

  const [locationOptions, setLocationOptions] = useState<LocationOption[]>(
    USE_MOCKS ? MOCK_LOCATION_OPTIONS : [],
  )
  const [containerOptions, setContainerOptions] = useState<ContainerOption[]>(
    USE_MOCKS ? MOCK_CONTAINER_OPTIONS : [],
  )

  const refreshLocations = async () => {
    try {
      const res = await getLocationsFlat()
      setLocationOptions(res.data || [])
    } catch {
      // Silently retry on next interval
    }
  }

  useEffect(() => {
    if (USE_MOCKS) return
    refreshLocations()
    // Refresh locations every 5 seconds to pick up changes from admin
    const interval = setInterval(refreshLocations, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (USE_MOCKS) return
    getContainers()
      .then(res => setContainerOptions(res.data.map(c => ({ id: c.id, label: c.label }))))
      .catch(() => {})
  }, [])

  const formType: ItemFormType = VALID_TYPES.includes(type as ItemFormType)
    ? (type as ItemFormType)
    : 'electronics'
  const title = FORM_TITLES[formType]

  const isDirty = Object.values(fields).some(Boolean) || fixtureTypes.length > 0 || Boolean(locationId)
  const blocker = useBlocker(isDirty && !saving)

  useEffect(() => {
    if (!isDirty || saving) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, saving])

  function setField(name: string, value: string) {
    setFields(prev => ({ ...prev, [name]: value }))
  }

  function handleFixtureTypesAdd(types: FixtureType[]) {
    setFixtureTypes(types)
  }

  function validate(): string[] {
    const missing: string[] = []
    switch (formType) {
      case 'electronics':
        if (!fields.oem?.trim()) missing.push('OEM')
        if (!fields.productType?.trim()) missing.push('Product Type')
        if (!fields.productName?.trim()) missing.push('Product Name')
        if (!fields.oemPartNumber?.trim()) missing.push('OEM Part Number')
        if (!fields.testRequestNumber?.trim()) missing.push('Test Request Number')
        if (!fields.labIdNumber?.trim()) missing.push('Lab ID Number')
        break
      case 'fixture':
        if (!fields.productName?.trim()) missing.push('Product Name')
        if (!fields.labIdNumber?.trim()) missing.push('Lab ID Number')
        if (fixtureTypes.length === 0) missing.push('Fixture Type (select at least one)')
        break
      case 'sparepart':
        if (!fields.manufacturer?.trim()) missing.push('Manufacturer')
        if (!fields.model?.trim()) missing.push('Model')
        if (!fields.partType?.trim()) missing.push('Type')
        if (!fields.labIdNumber?.trim()) missing.push('Lab ID Number')
        break
      case 'consumable':
        if (!fields.manufacturer?.trim()) missing.push('Manufacturer')
        if (!fields.model?.trim()) missing.push('Model')
        if (!fields.consumableType?.trim()) missing.push('Type')
        if (!fields.labIdNumber?.trim()) missing.push('Lab ID Number')
        if (!fields.quantity || parseFloat(fields.quantity) <= 0) missing.push('Quantity (must be > 0)')
        if (!fields.unit?.trim()) missing.push('Unit')
        break
      case 'misc':
        if (!fields.miscName?.trim()) missing.push('Name')
        if (!fields.labIdNumber?.trim()) missing.push('Lab ID Number')
        break
    }
    return missing
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const missing = validate()
    if (missing.length > 0) {
      setError(`Required fields missing: ${missing.join(', ')}`)
      return
    }

    setSaving(true)

    if (USE_MOCKS) {
      setTimeout(() => { setSaving(false); navigate('/items') }, 1000)
      return
    }

    try {
      // Build type-specific payload matching backend schema
      const base: Record<string, unknown> = {
        barcode: fields.labIdNumber, // use labIdNumber as barcode until scanner is implemented
        labIdNumber: fields.labIdNumber,
        comment: fields.comment || undefined,
        ...(locationId ? { locationId } : {}),
        ...(containerId ? { containerId } : {}),
      }

      let payload: Record<string, unknown>

      switch (formType) {
        case 'electronics':
          payload = {
            ...base,
            oem: fields.oem,
            productName: fields.productName,
            productType: fields.productType,
            oemPartNumber: fields.oemPartNumber,
            testRequestNumber: fields.testRequestNumber,
            serialNumber: fields.serialNumber || undefined,
            developmentPhase: fields.developmentPhase || undefined,
            plantLocation: fields.plantLocation || undefined,
            requester: fields.requester || undefined,
          }
          break
        case 'fixture':
          payload = {
            ...base,
            productName: fields.productName,
            fixtureCategories: fixtureTypes,
          }
          break
        case 'sparepart':
          payload = {
            ...base,
            manufacturer: fields.manufacturer,
            model: fields.model,
            partType: fields.partType,
            variant: fields.variant || undefined,
            forMachines: fields.forMachines
              ? fields.forMachines.split(',').map(s => s.trim()).filter(Boolean)
              : undefined,
          }
          break
        case 'consumable':
          payload = {
            ...base,
            manufacturer: fields.manufacturer,
            model: fields.model,
            consumableType: fields.consumableType,
            quantity: parseFloat(fields.quantity),
            unit: fields.unit,
            lotNumber: fields.lotNumber || undefined,
            expiryDate: fields.expiryDate ? new Date(fields.expiryDate).toISOString() : undefined,
            shelfLifeMonths: fields.shelfLife ? parseInt(fields.shelfLife, 10) : undefined,
          }
          break
        case 'misc':
          payload = {
            ...base,
            miscName: fields.miscName,
            miscDescription: fields.miscDescription || undefined,
          }
          break
      }

      // Map form type to API path segment
      const typeMap: Record<ItemFormType, string> = {
        electronics: 'electronics',
        fixture: 'fixture',
        sparepart: 'sparepart',
        consumable: 'consumable',
        misc: 'misc',
      }

      await createItem(typeMap[formType], payload)
      navigate('/items')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 max-w-3xl">
      <Link to="/items" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft size={15} />
        Back to Items
      </Link>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Item details */}
        <Card>
          <CardHeader title={title} subtitle="Fill in the item information below" />
          <div className="p-4">
            {formType === 'electronics' && <ElectronicsForm fields={fields} setField={setField} />}
            {formType === 'fixture' && <FixtureForm fields={fields} setField={setField} selectedTypes={fixtureTypes} setSelectedTypes={handleFixtureTypesAdd} />}
            {formType === 'sparepart' && <SparePartForm fields={fields} setField={setField} />}
            {formType === 'consumable' && <ConsumableForm fields={fields} setField={setField} />}
            {formType === 'misc' && <MiscForm fields={fields} setField={setField} />}
          </div>
        </Card>

        {/* Location assignment */}
        <Card>
          <CardHeader title="Storage Location" subtitle="Assign initial storage location" />
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Location">
              <select value={locationId} onChange={e => setLocationId(e.target.value)} className={inputClass}>
                <option value="">— Select location —</option>
                {locationOptions.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label} ({loc.siteName} / {loc.buildingName})
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Container (optional)">
              <select value={containerId} onChange={e => setContainerId(e.target.value)} className={inputClass}>
                <option value="">— No container —</option>
                {containerOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </FormField>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <Link
            to="/items"
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><Save size={15} />Save Item</>}
          </button>
        </div>
      </form>

      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <p className="text-sm font-semibold text-slate-800 mb-1">Leave page?</p>
            <p className="text-sm text-slate-600 mb-4">Your unsaved changes will be lost.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => blocker.reset?.()} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">Stay</button>
              <button onClick={() => blocker.proceed?.()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
