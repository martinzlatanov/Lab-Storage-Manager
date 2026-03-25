/**
 * Storage section pages:
 * LocationBrowserPage, ContainerManagerPage, ExternalLocationsPage
 */

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { UserRole } from '../../types'
import {
  ChevronRight,
  MapPin,
  Package,
  Box,
  ExternalLink as ExtLink,
  Plus,
  Printer,
  ArrowRightLeft,
  Phone,
  Mail,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { ItemStatusBadge, ItemTypeBadge } from '../../components/ui/StatusBadge'
import { MOCK_SITES, MOCK_CONTAINERS, MOCK_EXTERNAL_LOCATIONS, MOCK_ITEMS } from '../../mock/data'
import { ItemStatus, type AnyItem, type Site, type Container, type ExternalLocation } from '../../types'
import { getSitesTree as apiGetSitesTree, getExternalLocations as apiGetExtLocs, getItems as apiGetItems, getContainers as apiGetContainers, createContainer as apiCreateContainer } from '../../api'
import clsx from 'clsx'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

// ─── Location Browser ─────────────────────────────────────────────────────────

export function LocationBrowserPage() {
  const { user } = useAuth()
  const [sites, setSites] = useState<Site[]>(USE_MOCKS ? MOCK_SITES : [])
  const [allItems, setAllItems] = useState<AnyItem[]>(USE_MOCKS ? MOCK_ITEMS : [])
  const [loading, setLoading] = useState(!USE_MOCKS)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  useEffect(() => {
    if (USE_MOCKS) return
    const load = async () => {
      setLoading(true)
      try {
        const [sitesRes, itemsRes] = await Promise.allSettled([
          apiGetSitesTree(),
          apiGetItems({ pageSize: 500 }),
        ])
        if (sitesRes.status === 'fulfilled') setSites(sitesRes.value.data as Site[])
        if (itemsRes.status === 'fulfilled') setAllItems(itemsRes.value.data)
      } catch { /* fallback empty */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const selectedSite = sites.find(s => s.id === selectedSiteId)
  const selectedBuilding = selectedSite?.buildings.find(b => b.id === selectedBuildingId)
  const selectedArea = selectedBuilding?.storageAreas.find(a => a.id === selectedAreaId)
  const selectedLocation = selectedArea?.locations.find(l => l.id === selectedLocationId)

  const itemsAtLocation = selectedLocationId
    ? allItems.filter(i => i.locationId === selectedLocationId)
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading storage…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Admin-only location hierarchy management */}
      {user?.role === UserRole.ADMIN && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 mb-2">
            <span className="font-semibold">Admin:</span> Need to add or edit sites, buildings, or areas?
          </p>
          <Link
            to="/admin/locations"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Manage Location Hierarchy
          </Link>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <span className="hover:text-slate-700 cursor-pointer" onClick={() => { setSelectedSiteId(null); setSelectedBuildingId(null); setSelectedAreaId(null); setSelectedLocationId(null) }}>
          All Sites
        </span>
        {selectedSite && (
          <>
            <ChevronRight size={14} />
            <span className="hover:text-slate-700 cursor-pointer" onClick={() => { setSelectedBuildingId(null); setSelectedAreaId(null); setSelectedLocationId(null) }}>
              {selectedSite.name}
            </span>
          </>
        )}
        {selectedBuilding && (
          <>
            <ChevronRight size={14} />
            <span className="hover:text-slate-700 cursor-pointer" onClick={() => { setSelectedAreaId(null); setSelectedLocationId(null) }}>
              {selectedBuilding.name}
            </span>
          </>
        )}
        {selectedArea && (
          <>
            <ChevronRight size={14} />
            <span className="hover:text-slate-700 cursor-pointer" onClick={() => setSelectedLocationId(null)}>
              Area {selectedArea.code}
            </span>
          </>
        )}
        {selectedLocation && (
          <>
            <ChevronRight size={14} />
            <span className="text-slate-800 font-mono font-medium">{selectedLocation.label}</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tree panel */}
        <div className="lg:col-span-1 space-y-3">
          {/* Sites */}
          <Card>
            <CardHeader title="Sites" />
            <div className="divide-y divide-slate-50">
              {sites.map(site => (
                <button
                  key={site.id}
                  onClick={() => { setSelectedSiteId(site.id); setSelectedBuildingId(null); setSelectedAreaId(null); setSelectedLocationId(null) }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    selectedSiteId === site.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700',
                  )}
                >
                  <MapPin size={14} className={selectedSiteId === site.id ? 'text-blue-500' : 'text-slate-400'} />
                  <span className="text-sm font-medium flex-1">{site.name}</span>
                  <span className="text-xs text-slate-400">{site.buildings.length} bldg</span>
                  <ChevronRight size={12} className="text-slate-300" />
                </button>
              ))}
            </div>
          </Card>

          {/* Buildings */}
          {selectedSite && (
            <Card>
              <CardHeader title={`Buildings — ${selectedSite.name}`} />
              <div className="divide-y divide-slate-50">
                {selectedSite.buildings.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setSelectedBuildingId(b.id); setSelectedAreaId(null); setSelectedLocationId(null) }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                      selectedBuildingId === b.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700',
                    )}
                  >
                    <span className="text-sm flex-1">{b.name}</span>
                    <span className="text-xs text-slate-400">{b.storageAreas.length} areas</span>
                    <ChevronRight size={12} className="text-slate-300" />
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Areas */}
          {selectedBuilding && (
            <Card>
              <CardHeader title={`Areas — ${selectedBuilding.name}`} />
              <div className="divide-y divide-slate-50">
                {selectedBuilding.storageAreas.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedAreaId(a.id); setSelectedLocationId(null) }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                      selectedAreaId === a.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700',
                    )}
                  >
                    <span className="text-sm font-mono font-medium flex-1">Area {a.code}</span>
                    <span className="text-xs text-slate-400">{a.locations.length} locations</span>
                    <ChevronRight size={12} className="text-slate-300" />
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Location details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedArea && !selectedLocation && (
            <Card>
              <CardHeader
                title={`Locations — Area ${selectedArea.code}`}
                subtitle={`${selectedBuilding?.name} · ${selectedSite?.name}`}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                {selectedArea.locations.map(loc => {
                  const count = allItems.filter(i => i.locationId === loc.id).length
                  return (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedLocationId(loc.id)}
                      className="flex flex-col items-center gap-1 p-4 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                    >
                      <MapPin size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      <span className="font-mono text-sm font-semibold text-slate-800">{loc.label}</span>
                      <span className="text-xs text-slate-400">{count} item{count !== 1 ? 's' : ''}</span>
                    </button>
                  )
                })}
              </div>
            </Card>
          )}

          {selectedLocation && (
            <Card>
              <CardHeader
                title={`Location ${selectedLocation.label}`}
                subtitle={`${selectedArea?.code} · ${selectedBuilding?.name} · ${selectedSite?.name}`}
                actions={
                  <Link
                    to={`/labels?tab=location&location=${selectedLocation.id}`}
                    className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
                  >
                    <Printer size={12} />
                    Print Label
                  </Link>
                }
              />
              <div className="p-4">
                {itemsAtLocation.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No items at this location.</p>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {itemsAtLocation.map(item => (
                      <Link
                        key={item.id}
                        to={`/items/${item.id}`}
                        className="flex items-center gap-3 py-3 hover:bg-slate-50 rounded-lg px-2 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono font-medium text-blue-600">{item.labIdNumber}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <ItemTypeBadge type={item.itemType} />
                            <ItemStatusBadge status={item.status} />
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {!selectedSite && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <MapPin size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Select a site to browse storage locations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Add Container Modal ──────────────────────────────────────────────────────

interface AddContainerModalProps {
  onClose: () => void
  onCreated: (container: Container) => void
}

function AddContainerModal({ onClose, onCreated }: AddContainerModalProps) {
  const [label, setLabel] = useState('')
  const [barcode, setBarcode] = useState('')
  const [notes, setNotes] = useState('')
  const [barcodeManual, setBarcodeManual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const labelRef = useRef<HTMLInputElement>(null)

  useEffect(() => { labelRef.current?.focus() }, [])

  // Auto-fill barcode from label unless user has manually edited it
  useEffect(() => {
    if (!barcodeManual) setBarcode(label.trim())
  }, [label, barcodeManual])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) { setError('Label is required.'); return }
    if (!barcode.trim()) { setError('Barcode is required.'); return }

    setSaving(true)
    setError(null)

    if (USE_MOCKS) {
      const now = new Date().toISOString()
      const mockId = `c${Date.now()}`
      const newContainer: Container = {
        id: mockId,
        barcode: barcode.trim(),
        label: label.trim(),
        notes: notes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        createdById: 'u1',
      }
      onCreated(newContainer)
      return
    }

    try {
      const res = await apiCreateContainer({
        barcode: barcode.trim(),
        label: label.trim(),
        notes: notes.trim() || undefined,
      })
      onCreated(res.data as unknown as Container)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create container.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">New Container</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              ref={labelRef}
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. BOX-0007"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            />
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Barcode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={barcode}
              onChange={e => { setBarcodeManual(true); setBarcode(e.target.value) }}
              placeholder="Auto-filled from label"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            />
            {!barcodeManual && (
              <p className="text-xs text-slate-400 mt-1">Auto-filled from label. Edit to override.</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes about this container"
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Create Container
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Container Manager ────────────────────────────────────────────────────────

export function ContainerManagerPage() {
  const [containers, setContainers] = useState<Container[]>(USE_MOCKS ? MOCK_CONTAINERS : [])
  const [allItems, setAllItems] = useState<AnyItem[]>(USE_MOCKS ? MOCK_ITEMS : [])
  const [loading, setLoading] = useState(!USE_MOCKS)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (USE_MOCKS) return
    const load = async () => {
      setLoading(true)
      try {
        const [ctRes, itemsRes] = await Promise.allSettled([
          apiGetContainers(),
          apiGetItems({ pageSize: 500 }),
        ])
        if (ctRes.status === 'fulfilled') setContainers(ctRes.value.data as any)
        if (itemsRes.status === 'fulfilled') setAllItems(itemsRes.value.data)
      } catch { /* fallback empty */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const handleContainerCreated = (container: Container) => {
    setContainers(prev => [container, ...prev])
    setShowAddModal(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading containers…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {showAddModal && (
        <AddContainerModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleContainerCreated}
        />
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{containers.length} containers</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          New Container
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {containers.map(container => {
          const items = allItems.filter(i => i.containerId === container.id)
          const isExternal = !!container.externalLocationId
          const locLabel = (container as any).location?.label ?? container.locationLabel ?? ''

          return (
            <Card key={container.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={clsx(
                    'w-9 h-9 rounded-lg flex items-center justify-center',
                    isExternal ? 'bg-yellow-100' : 'bg-blue-100',
                  )}>
                    <Box size={18} className={isExternal ? 'text-yellow-600' : 'text-blue-600'} />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-slate-800">{container.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isExternal
                        ? <span className="text-yellow-600 flex items-center gap-1"><ExtLink size={10} /> External</span>
                        : locLabel}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Link
                    to={`/labels?tab=container&container=${container.id}`}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Print container label"
                  >
                    <Printer size={14} />
                  </Link>
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                    <ArrowRightLeft size={14} />
                  </button>
                </div>
              </div>

              {container.notes && (
                <p className="text-xs text-slate-400 italic mt-2">{container.notes}</p>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                <div className="space-y-1">
                  {items.slice(0, 3).map(item => (
                    <Link
                      key={item.id}
                      to={`/items/${item.id}`}
                      className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Package size={10} className="shrink-0" />
                      <span className="font-mono truncate">{item.labIdNumber}</span>
                    </Link>
                  ))}
                  {items.length > 3 && (
                    <p className="text-xs text-slate-400">+{items.length - 3} more</p>
                  )}
                  {items.length === 0 && (
                    <p className="text-xs text-slate-300 italic">Empty container</p>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── External Locations ───────────────────────────────────────────────────────

export function ExternalLocationsPage() {
  const [extLocs, setExtLocs] = useState<ExternalLocation[]>(USE_MOCKS ? MOCK_EXTERNAL_LOCATIONS : [])
  const [externalItems, setExternalItems] = useState<AnyItem[]>(
    USE_MOCKS ? MOCK_ITEMS.filter(i => i.status === ItemStatus.TEMP_EXIT) : [],
  )
  const [loading, setLoading] = useState(!USE_MOCKS)

  useEffect(() => {
    if (USE_MOCKS) return
    const load = async () => {
      setLoading(true)
      try {
        const [extRes, itemsRes] = await Promise.allSettled([
          apiGetExtLocs(),
          apiGetItems({ status: ItemStatus.TEMP_EXIT, pageSize: 200 }),
        ])
        if (extRes.status === 'fulfilled') setExtLocs(extRes.value.data)
        if (itemsRes.status === 'fulfilled') setExternalItems(itemsRes.value.data)
      } catch { /* fallback empty */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading external locations…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {extLocs.map(ext => {
          const itemsHere = externalItems.filter(i => i.externalLocationId === ext.id)
          const overdueCount = itemsHere.filter(i =>
            i.expectedReturnDate != null && new Date(i.expectedReturnDate) < new Date()
          ).length

          return (
            <Card key={ext.id}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-800">{ext.name}</h3>
                      {overdueCount > 0 && (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} />
                          {overdueCount} overdue
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{ext.city}, {ext.country}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <ExtLink size={14} className="text-slate-500" />
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2">
                    <MapPin size={11} className="text-slate-400" />
                    {ext.address}
                  </p>
                  <p className="flex items-center gap-2">
                    <Package size={11} className="text-slate-400" />
                    {ext.contactPerson}
                  </p>
                  {ext.phone && (
                    <p className="flex items-center gap-2">
                      <Phone size={11} className="text-slate-400" />
                      {ext.phone}
                    </p>
                  )}
                  {ext.email && (
                    <p className="flex items-center gap-2">
                      <Mail size={11} className="text-slate-400" />
                      {ext.email}
                    </p>
                  )}
                </div>

                {ext.notes && (
                  <p className="text-xs text-slate-400 italic mt-2">{ext.notes}</p>
                )}
              </div>

              <div className="border-t border-slate-100 p-4">
                <p className="text-xs font-medium text-slate-500 mb-2">{itemsHere.length} item{itemsHere.length !== 1 ? 's' : ''} currently here</p>
                {itemsHere.length === 0 ? (
                  <p className="text-xs text-slate-300 italic">No items at this location</p>
                ) : (
                  <div className="space-y-1.5">
                    {itemsHere.map(item => {
                      const isOverdue = item.expectedReturnDate != null && new Date(item.expectedReturnDate) < new Date()
                      return (
                        <Link
                          key={item.id}
                          to={`/items/${item.id}`}
                          className="flex items-center gap-2 text-xs hover:bg-slate-50 rounded px-1 py-1 transition-colors"
                        >
                          {isOverdue
                            ? <AlertTriangle size={11} className="text-red-500 shrink-0" />
                            : <Package size={11} className="text-slate-400 shrink-0" />
                          }
                          <span className={clsx('font-mono', isOverdue ? 'text-red-600' : 'text-blue-600')}>{item.labIdNumber}</span>
                          <ItemTypeBadge type={item.itemType} />
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
