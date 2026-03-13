import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Printer, QrCode, Barcode, Package, MapPin } from 'lucide-react'
import { Card, CardHeader } from '../components/ui/Card'
import { MOCK_ITEMS, MOCK_CONTAINERS, MOCK_SITES } from '../mock/data'

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white'

function LabelPreview({ type, value, subtitle }: { type: 'item' | 'location' | 'container'; value: string; subtitle?: string }) {
  return (
    <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-white flex flex-col items-center gap-3 min-h-32">
      <div className="w-24 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
        {type === 'item' ? <QrCode size={32} /> : <Barcode size={32} />}
      </div>
      <div className="text-center">
        <p className="font-mono font-bold text-slate-900 text-sm">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

type TabType = 'item' | 'location' | 'container'

export function LabelsPage() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'item')
  const [selectedItem, setSelectedItem] = useState(searchParams.get('item') || '')
  const [selectedContainer, setSelectedContainer] = useState(searchParams.get('container') || '')
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || '')

  useEffect(() => {
    const itemParam = searchParams.get('item')
    const locParam = searchParams.get('location')
    const conParam = searchParams.get('container')
    const tabParam = searchParams.get('tab') as TabType

    if (itemParam) {
      setSelectedItem(itemParam)
      setTab('item')
    } else if (locParam) {
      setSelectedLocation(locParam)
      setTab('location')
    } else if (conParam) {
      setSelectedContainer(conParam)
      setTab('container')
    }

    if (tabParam && ['item', 'location', 'container'].includes(tabParam)) {
      setTab(tabParam)
    }
  }, [searchParams])

  const allLocations = MOCK_SITES.flatMap(s =>
    s.buildings.flatMap(b =>
      b.storageAreas.flatMap(a =>
        a.locations.map(l => ({ ...l, fullLabel: `${l.label} (${s.name} / ${b.name})` })),
      ),
    ),
  )

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'item', label: 'Item Label', icon: <Package size={14} /> },
    { id: 'location', label: 'Location Label', icon: <MapPin size={14} /> },
    { id: 'container', label: 'Container Label', icon: <QrCode size={14} /> },
  ]

  return (
    <div className="max-w-xl space-y-5">
      {/* Tabs */}
      <div role="tablist" className="flex bg-slate-100 rounded-xl p-1 gap-1">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`tabpanel-${t.id}`}
            id={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader
          title={tab === 'item' ? 'Print Item Label' : tab === 'location' ? 'Print Location Label' : 'Print Container Label'}
          subtitle="Preview and print a label"
        />
        <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`} className="p-5 space-y-4">
          {tab === 'item' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Item</label>
              <select className={inputClass} value={selectedItem} onChange={e => setSelectedItem(e.target.value)}>
                <option value="">— Select item —</option>
                {MOCK_ITEMS.map(i => (
                  <option key={i.id} value={i.id}>{i.labIdNumber}</option>
                ))}
              </select>
            </div>
          )}

          {tab === 'location' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Location</label>
              <select className={inputClass} value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
                <option value="">— Select location —</option>
                {allLocations.map(l => (
                  <option key={l.id} value={l.id}>{l.fullLabel}</option>
                ))}
              </select>
            </div>
          )}

          {tab === 'container' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Container</label>
              <select className={inputClass} value={selectedContainer} onChange={e => setSelectedContainer(e.target.value)}>
                <option value="">— Select container —</option>
                {MOCK_CONTAINERS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Preview */}
          {tab === 'item' && selectedItem && (
            <LabelPreview
              type="item"
              value={MOCK_ITEMS.find(i => i.id === selectedItem)?.labIdNumber ?? ''}
              subtitle="Lab Storage Manager"
            />
          )}
          {tab === 'location' && selectedLocation && (
            <LabelPreview
              type="location"
              value={allLocations.find(l => l.id === selectedLocation)?.label ?? ''}
              subtitle={allLocations.find(l => l.id === selectedLocation)?.fullLabel}
            />
          )}
          {tab === 'container' && selectedContainer && (
            <LabelPreview
              type="container"
              value={MOCK_CONTAINERS.find(c => c.id === selectedContainer)?.label ?? ''}
              subtitle={MOCK_CONTAINERS.find(c => c.id === selectedContainer)?.locationLabel}
            />
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Copies</label>
              <input type="number" min={1} defaultValue={1} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Printer</label>
              <select className={inputClass}>
                <option>Zebra ZD421 (192.168.10.55)</option>
                <option>Browser Print Dialog</option>
              </select>
            </div>
          </div>

          <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
            <Printer size={16} />
            Print Label
          </button>
        </div>
      </Card>
    </div>
  )
}
