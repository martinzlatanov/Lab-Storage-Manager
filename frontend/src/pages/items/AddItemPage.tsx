import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Info, Loader2 } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { FixtureType, FIXTURE_TYPE_LABELS, DEV_PHASE_LABELS } from '../../types'
import { createItem, getLocationsFlat, getContainers } from '../../api'
import { MOCK_ITEMS } from '../../mock/data'
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
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Info size={11} />{hint}</p>}
    </div>
  )
}

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white'

function ElectronicsForm({ fields, setField }: {
  fields: Record<string, string>
  setField: (name: string, value: string) => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormField label="OEM" required>
        <input type="text" name="oem" value={fields.oem ?? ''} onChange={e => setField('oem', e.target.value)} placeholder="BMW, RSA, MB, STLA…" className={inputClass} />
      </FormField>
      <FormField label="Product Type" required>
        <input type="text" name="productType" value={fields.productType ?? ''} onChange={e => setField('productType', e.target.value)} placeholder="Cluster, CID, HUD, BDC…" className={inputClass} />
      </FormField>
      <FormField label="Product Name" required>
        <input type="text" name="productName" value={fields.productName ?? ''} onChange={e => setField('productName', e.target.value)} placeholder="BR206 CID" className={inputClass} />
      </FormField>
      <FormField label="OEM Part Number" required>
        <input type="text" name="oemPartNumber" value={fields.oemPartNumber ?? ''} onChange={e => setField('oemPartNumber', e.target.value)} placeholder="A 01 01 205" className={clsx(inputClass, 'font-mono')} />
      </FormField>
      <FormField label="Test Request Number" required>
        <input type="text" name="testRequestNumber" value={fields.testRequestNumber ?? ''} onChange={e => setField('testRequestNumber', e.target.value)} placeholder="TR.EL26.012345" className={clsx(inputClass, 'font-mono')} />
      </FormField>
      <FormField label="Lab ID Number" required hint="Auto-generated or enter manually">
        <input type="text" name="labIdNumber" value={fields.labIdNumber ?? ''} onChange={e => setField('labIdNumber', e.target.value)} placeholder="TR.EL26.012345.1.1" className={clsx(inputClass, 'font-mono')} />
      </FormField>
      <FormField label="Serial Number">
        <input type="text" name="serialNumber" value={fields.serialNumber ?? ''} onChange={e => setField('serialNumber', e.target.value)} placeholder="SN-2026-001" className={clsx(inputClass, 'font-mono')} />
      </FormField>
      <FormField label="Development Phase">
        <select name="developmentPhase" value={fields.developmentPhase ?? ''} onChange={e => setField('developmentPhase', e.target.value)} className={inputClass}>
          <option value="">— Select —</option>
          {Object.entries(DEV_PHASE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Plant Location">
        <input type="text" name="plantLocation" value={fields.plantLocation ?? ''} onChange={e => setField('plantLocation', e.target.value)} placeholder="Regensburg, Palmela, Namestovo…" className={inputClass} />
      </FormField>
      <FormField label="Requester">
        <input type="text" name="requester" value={fields.requester ?? ''} onChange={e => setField('requester', e.target.value)} placeholder="Name or Company ID" className={inputClass} />
      </FormField>
      <div className="col-span-full">
        <FormField label="Comment">
          <textarea name="comment" rows={2} value={fields.comment ?? ''} onChange={e => setField('comment', e.target.value)} placeholder="Optional notes…" className={clsx(inputClass, 'resize-none')} />
        </FormField>
      </div>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
        <FormField label="Picture" hint="Optional photo for visual identification">
          <input type="file" accept="image/*" className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
        </FormField>
      </div>

      <div className="col-span-full">
        <FormField label="Comment">
          <textarea name="comment" rows={2} value={fields.comment ?? ''} onChange={e => setField('comment', e.target.value)} placeholder="Optional notes…" className={clsx(inputClass, 'resize-none')} />
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormField label="Manufacturer" required>
        <input type="text" name="manufacturer" value={fields.manufacturer ?? ''} onChange={e => setField('manufacturer', e.target.value)} placeholder="ETS Solutions, Danfoss…" className={inputClass} />
      </FormField>
      <FormField label="Model" required>
        <input type="text" name="model" value={fields.model ?? ''} onChange={e => setField('model', e.target.value)} placeholder="OP-31, X-522…" className={clsx(inputClass, 'font-mono')} />
      </FormField>
      <FormField label="Type" required>
        <input type="text" name="partType" value={fields.partType ?? ''} onChange={e => setField('partType', e.target.value)} placeholder="Compressor, Valve, Fan…" className={inputClass} />
      </FormField>
      <FormField label="Variant">
        <input type="text" name="variant" value={fields.variant ?? ''} onChange={e => setField('variant', e.target.value)} placeholder="Single phase, 3-phase, 7 bar…" className={inputClass} />
      </FormField>
      <FormField label="Lab ID Number" required>
        <input type="text" name="labIdNumber" value={fields.labIdNumber ?? ''} onChange={e => setField('labIdNumber', e.target.value)} placeholder="SP-2025-0011" className={clsx(inputClass, 'font-mono')} />
      </FormField>
      <FormField label="For Machines" hint="Comma-separated machine IDs">
        <input type="text" name="forMachines" value={fields.forMachines ?? ''} onChange={e => setField('forMachines', e.target.value)} placeholder="TH710-W5, TS130" className={inputClass} />
      </FormField>
      <div className="col-span-full">
        <FormField label="Comment">
          <textarea name="comment" rows={2} value={fields.comment ?? ''} onChange={e => setField('comment', e.target.value)} placeholder="Optional notes…" className={clsx(inputClass, 'resize-none')} />
        </FormField>
      </div>
    </div>
  )
}

function ConsumableForm({ fields, setField }: {
  fields: Record<string, string>
  setField: (name: string, value: string) => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormField label="Manufacturer" required>
        <input type="text" name="manufacturer" value={fields.manufacturer ?? ''} onChange={e => setField('manufacturer', e.target.value)} placeholder="Valerus, Hydratek…" className={inputClass} />
      </FormField>
      <FormField label="Model" required>
        <input type="text" name="model" value={fields.model ?? ''} onChange={e => setField('model', e.target.value)} placeholder="MBR-200, pH7-Solution…" className={inputClass} />
      </FormField>
      <FormField label="Type" required>
        <input type="text" name="consumableType" value={fields.consumableType ?? ''} onChange={e => setField('consumableType', e.target.value)} placeholder="Arizona A2 dust, NaCl…" className={inputClass} />
      </FormField>
      <FormField label="Lab ID Number" required>
        <input type="text" name="labIdNumber" value={fields.labIdNumber ?? ''} onChange={e => setField('labIdNumber', e.target.value)} placeholder="CON-2026-001" className={clsx(inputClass, 'font-mono')} />
      </FormField>
      <FormField label="Quantity" required>
        <input type="number" name="quantity" min="0" step="0.01" value={fields.quantity ?? ''} onChange={e => setField('quantity', e.target.value)} placeholder="0.00" className={inputClass} />
      </FormField>
      <FormField label="Unit" required>
        <input type="text" name="unit" value={fields.unit ?? ''} onChange={e => setField('unit', e.target.value)} placeholder="kg, L, pcs…" className={inputClass} />
      </FormField>
      <FormField label="Lot Number">
        <input type="text" name="lotNumber" value={fields.lotNumber ?? ''} onChange={e => setField('lotNumber', e.target.value)} placeholder="LOT-2026-0120" className={clsx(inputClass, 'font-mono')} />
      </FormField>
      <FormField label="Expiry Date">
        <input type="date" name="expiryDate" value={fields.expiryDate ?? ''} onChange={e => setField('expiryDate', e.target.value)} className={inputClass} />
      </FormField>
      <FormField label="Shelf Life (months)">
        <input type="number" name="shelfLife" min="1" value={fields.shelfLife ?? ''} onChange={e => setField('shelfLife', e.target.value)} placeholder="12" className={inputClass} />
      </FormField>
      <div className="col-span-full">
        <FormField label="Comment">
          <textarea name="comment" rows={2} value={fields.comment ?? ''} onChange={e => setField('comment', e.target.value)} placeholder="Optional notes…" className={clsx(inputClass, 'resize-none')} />
        </FormField>
      </div>
    </div>
  )
}

function MiscForm({ fields, setField }: {
  fields: Record<string, string>
  setField: (name: string, value: string) => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormField label="Name" required>
        <input type="text" name="miscName" value={fields.miscName ?? ''} onChange={e => setField('miscName', e.target.value)} placeholder="M5 Hex Bolt Set" className={inputClass} />
      </FormField>
      <FormField label="Lab ID Number" required>
        <input type="text" name="labIdNumber" value={fields.labIdNumber ?? ''} onChange={e => setField('labIdNumber', e.target.value)} placeholder="MISC-001" className={clsx(inputClass, 'font-mono')} />
      </FormField>
      <div className="col-span-full">
        <FormField label="Description">
          <textarea name="miscDescription" rows={3} value={fields.miscDescription ?? ''} onChange={e => setField('miscDescription', e.target.value)} placeholder="Pack of 100 M5 hex bolts, stainless steel…" className={clsx(inputClass, 'resize-none')} />
        </FormField>
      </div>
      <div className="col-span-full">
        <FormField label="Comment">
          <textarea name="comment" rows={2} value={fields.comment ?? ''} onChange={e => setField('comment', e.target.value)} placeholder="Optional notes…" className={clsx(inputClass, 'resize-none')} />
        </FormField>
      </div>
    </div>
  )
}

// ── Mock location/container options ─────────────────────────────────────────

const MOCK_LOCATION_OPTIONS = [
  { id: 'l1', label: 'A-01-01-1', buildingName: 'Main Building', siteName: 'Sofia' },
  { id: 'l2', label: 'A-01-01-2', buildingName: 'Main Building', siteName: 'Sofia' },
  { id: 'l3', label: 'A-01-02-1', buildingName: 'Main Building', siteName: 'Sofia' },
  { id: 'l5', label: 'A-02-01-1', buildingName: 'Main Building', siteName: 'Sofia' },
  { id: 'l6', label: 'B-01-01-1', buildingName: 'Main Building', siteName: 'Sofia' },
  { id: 'l9', label: 'C-01-01-1', buildingName: 'Lab Building', siteName: 'Sofia' },
]

const MOCK_CONTAINER_OPTIONS = MOCK_ITEMS
  .filter(i => 'containerLabel' in i && i.containerLabel)
  .map(i => ({ id: i.id, label: (i as { containerLabel: string }).containerLabel }))

// ── Page ─────────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (USE_MOCKS) return
    getLocationsFlat()
      .then(res => setLocationOptions(res.data))
      .catch(() => {/* silent — dropdowns will be empty */})
    getContainers()
      .then(res => setContainerOptions(res.data.map(c => ({ id: c.id, label: c.label }))))
      .catch(() => {/* silent */})
  }, [])

  const formType: ItemFormType = VALID_TYPES.includes(type as ItemFormType)
    ? (type as ItemFormType)
    : 'electronics'
  const title = FORM_TITLES[formType]

  function setField(name: string, value: string) {
    setFields(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    if (USE_MOCKS) {
      console.log('AddItem payload (mock):', { itemType: formType, ...fields, fixtureTypes, locationId, containerId })
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
    <div className="space-y-5 max-w-3xl">
      <Link to="/items" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft size={15} />
        Back to Items
      </Link>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Item details */}
        <Card>
          <CardHeader title={title} subtitle="Fill in the item information below" />
          <div className="p-5">
            {formType === 'electronics' && <ElectronicsForm fields={fields} setField={setField} />}
            {formType === 'fixture' && <FixtureForm fields={fields} setField={setField} selectedTypes={fixtureTypes} setSelectedTypes={setFixtureTypes} />}
            {formType === 'sparepart' && <SparePartForm fields={fields} setField={setField} />}
            {formType === 'consumable' && <ConsumableForm fields={fields} setField={setField} />}
            {formType === 'misc' && <MiscForm fields={fields} setField={setField} />}
          </div>
        </Card>

        {/* Location assignment */}
        <Card>
          <CardHeader title="Storage Location" subtitle="Assign initial storage location" />
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
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
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><Save size={15} />Save Item</>}
          </button>
        </div>
      </form>
    </div>
  )
}
