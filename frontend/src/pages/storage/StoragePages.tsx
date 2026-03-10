/**
 * Storage section pages:
 * LocationBrowserPage, ContainerManagerPage, ExternalLocationsPage
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
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
} from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { ItemStatusBadge, ItemTypeBadge } from '../../components/ui/StatusBadge'
import { MOCK_SITES, MOCK_CONTAINERS, MOCK_EXTERNAL_LOCATIONS, MOCK_ITEMS } from '../../mock/data'
import { ItemStatus } from '../../types'
import clsx from 'clsx'

// ─── Location Browser ─────────────────────────────────────────────────────────

export function LocationBrowserPage() {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  const selectedSite = MOCK_SITES.find(s => s.id === selectedSiteId)
  const selectedBuilding = selectedSite?.buildings.find(b => b.id === selectedBuildingId)
  const selectedArea = selectedBuilding?.storageAreas.find(a => a.id === selectedAreaId)
  const selectedLocation = selectedArea?.locations.find(l => l.id === selectedLocationId)

  const itemsAtLocation = selectedLocationId
    ? MOCK_ITEMS.filter(i => i.locationId === selectedLocationId)
    : []

  return (
    <div className="space-y-5">
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
              {MOCK_SITES.map(site => (
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
                  const count = MOCK_ITEMS.filter(i => i.locationId === loc.id).length
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
                  <button className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50">
                    <Printer size={12} />
                    Print Label
                  </button>
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

// ─── Container Manager ────────────────────────────────────────────────────────

export function ContainerManagerPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{MOCK_CONTAINERS.length} containers</p>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={15} />
          New Container
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MOCK_CONTAINERS.map(container => {
          const items = MOCK_ITEMS.filter(i => i.containerId === container.id)
          const isExternal = !!container.externalLocationId

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
                        : container.locationLabel}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                    <Printer size={14} />
                  </button>
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
  const externalItems = MOCK_ITEMS.filter(i => i.status === ItemStatus.TEMP_EXIT)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {MOCK_EXTERNAL_LOCATIONS.map(ext => {
          const itemsHere = externalItems.filter(i => i.externalLocationId === ext.id)
          const overdueCount = itemsHere.filter(i => i.id === 'item3').length // mock

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
                      const isOverdue = item.id === 'item3'
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
