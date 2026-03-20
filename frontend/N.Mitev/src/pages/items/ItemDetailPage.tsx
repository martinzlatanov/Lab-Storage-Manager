import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  MapPin,
  Box,
  Calendar,
  User,
  Tag,
  Printer,
  ArrowRightLeft,
  Trash2,
  FlaskConical,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { ItemStatusBadge, ItemTypeBadge, OperationBadge } from '../../components/ui/StatusBadge'
import { Badge } from '../../components/ui/Badge'
import { MOCK_ITEMS, MOCK_OPERATIONS } from '../../mock/data'
import { ItemType, ItemStatus, FIXTURE_TYPE_LABELS, DEV_PHASE_LABELS } from '../../types'
import type { AnyItem, ElectronicsSample, Fixture, SparePart, Consumable, MiscItem, OperationRecord } from '../../types'
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

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5">{value}</p>
    </div>
  )
}

function getLocation(item: AnyItem): { label: string; isExternal: boolean } {
  const a = item as Record<string, any>
  if (a.externalLocation?.name) return { label: a.externalLocation.name, isExternal: true }
  if (a.externalLocationName) return { label: a.externalLocationName, isExternal: true }
  if (a.location?.label) return { label: a.location.label, isExternal: false }
  if (a.locationLabel) return { label: a.locationLabel, isExternal: false }
  return { label: '', isExternal: false }
}

function getContainerLabel(item: AnyItem): string {
  const a = item as Record<string, any>
  return a.container?.label ?? a.containerLabel ?? ''
}

function getCreatedByName(item: AnyItem): string {
  const a = item as Record<string, any>
  return a.createdBy?.displayName ?? a.createdByName ?? ''
}

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<AnyItem | null>(null)
  const [itemOps, setItemOps] = useState<OperationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return

    if (USE_MOCKS) {
      const found = MOCK_ITEMS.find((i) => i.id === id)
      setItem(found ?? null)
      setItemOps(
        MOCK_OPERATIONS.filter((op) => op.itemId === id).sort(
          (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
        ),
      )
      setLoading(false)
      return
    }

    // Fetch from API
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [itemRes, historyRes] = await Promise.all([
          getItem(id),
          getItemHistory(id),
        ])
        setItem(itemRes.data)
        // Map API history to OperationRecord-compatible shape
        setItemOps(
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
        setError(err instanceof Error ? err.message : 'Failed to load item')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading item…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <p className="text-lg font-medium text-red-600">{error}</p>
        <Link to="/items" className="mt-3 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Items
        </Link>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <p className="text-lg font-medium">Item not found</p>
        <Link to="/items" className="mt-3 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Items
        </Link>
      </div>
    )
  }

  const isScrapped = item.status === ItemStatus.SCRAPPED
  const loc = getLocation(item)
  const containerLabel = getContainerLabel(item)
  const createdByName = getCreatedByName(item)

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back */}
      <Link to="/items" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft size={15} />
        Back to Items
      </Link>

      {/* Header card */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <ItemTypeBadge type={item.itemType} />
              <ItemStatusBadge status={item.status} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-mono">{item.labIdNumber}</h2>
            <p className="text-slate-500 text-sm mt-1">
              Added by {createdByName} · {formatDate(item.createdAt)}
            </p>
          </div>

          {!isScrapped && (
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/labels?item=${item.id}`}
                className="flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm px-3 py-1.5 rounded-lg transition-colors"
                title="Print label for this item"
              >
                <Printer size={14} />
                Print Label
              </Link>
              <Link
                to="/operations/move"
                className="flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                <ArrowRightLeft size={14} />
                Move
              </Link>
              <Link
                to="/operations/exit"
                className="flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                <ExternalLink size={14} />
                Temp Exit
              </Link>
              {item.itemType === ItemType.CONSUMABLE && (
                <Link
                  to="/operations/consume"
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                >
                  <FlaskConical size={14} />
                  Consume
                </Link>
              )}
              <Link
                to="/operations/scrap"
                className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                Scrap
              </Link>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 flex-wrap text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-slate-400" />
            {loc.isExternal ? (
              <span className="text-yellow-600 font-medium">{loc.label} (External)</span>
            ) : loc.label ? (
              <span className="font-mono">{loc.label}</span>
            ) : (
              <span className="text-slate-400">No location assigned</span>
            )}
          </div>
          {containerLabel && (
            <div className="flex items-center gap-2">
              <Box size={14} className="text-slate-400" />
              <span className="font-mono">{containerLabel}</span>
            </div>
          )}
          {item.comment && (
            <div className="flex items-start gap-2 w-full mt-1">
              <Tag size={14} className="text-slate-400 mt-0.5" />
              <span className="text-slate-600 italic text-xs">{item.comment}</span>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Item attributes */}
        <Card>
          <CardHeader title="Item Details" />
          <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-4">
            {item.itemType === ItemType.ELECTRONICS_SAMPLE && (() => {
              const el = item as ElectronicsSample
              return (
                <>
                  <Field label="OEM" value={el.oem} />
                  <Field label="Product Type" value={el.productType} />
                  <Field label="Product Name" value={el.productName} />
                  <Field label="OEM Part Number" value={<span className="font-mono">{el.oemPartNumber}</span>} />
                  <Field label="Serial Number" value={el.serialNumber ? <span className="font-mono">{el.serialNumber}</span> : undefined} />
                  <Field label="Test Request #" value={<span className="font-mono">{el.testRequestNumber}</span>} />
                  <Field label="Dev Phase" value={el.developmentPhase ? DEV_PHASE_LABELS[el.developmentPhase] : undefined} />
                  <Field label="Plant Location" value={el.plantLocation} />
                  <Field label="Requester" value={el.requester} />
                </>
              )
            })()}

            {item.itemType === ItemType.FIXTURE && (() => {
              const fx = item as Fixture
              return (
                <>
                  <Field label="Product Name" value={fx.productName} />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Fixture Types</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {fx.fixtureTypes.map((ft) => (
                        <Badge key={ft} variant="purple">{FIXTURE_TYPE_LABELS[ft]}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )
            })()}

            {item.itemType === ItemType.SPARE_PART && (() => {
              const sp = item as SparePart
              return (
                <>
                  <Field label="Manufacturer" value={sp.manufacturer} />
                  <Field label="Model" value={sp.model} />
                  <Field label="Type" value={sp.partType} />
                  <Field label="Variant" value={sp.variant} />
                  <Field label="For Machines" value={sp.forMachines?.join(', ')} />
                </>
              )
            })()}

            {item.itemType === ItemType.CONSUMABLE && (() => {
              const con = item as Consumable
              const daysToExpiry = con.expiryDate
                ? Math.ceil((new Date(con.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null
              return (
                <>
                  <Field label="Manufacturer" value={con.manufacturer} />
                  <Field label="Model" value={con.model} />
                  <Field label="Type" value={con.consumableType} />
                  <Field
                    label="Quantity"
                    value={<span className="font-semibold text-lg text-slate-900">{con.quantity} {con.unit}</span>}
                  />
                  <Field label="Lot Number" value={con.lotNumber ? <span className="font-mono">{con.lotNumber}</span> : undefined} />
                  <Field
                    label="Expiry Date"
                    value={
                      con.expiryDate ? (
                        <span className={daysToExpiry !== null && daysToExpiry <= 30 ? 'text-red-600 font-semibold' : undefined}>
                          {formatDate(con.expiryDate)}
                          {daysToExpiry !== null && daysToExpiry <= 30 && ` (${daysToExpiry} days)`}
                        </span>
                      ) : undefined
                    }
                  />
                  <Field label="Shelf Life" value={con.shelfLifeMonths ? `${con.shelfLifeMonths} months` : undefined} />
                </>
              )
            })()}

            {item.itemType === ItemType.MISC && (() => {
              const misc = item as MiscItem
              return (
                <>
                  <Field label="Name" value={misc.name} />
                  <Field label="Description" value={misc.description} />
                </>
              )
            })()}

            <div className="col-span-2 border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Created</p>
                  <p className="text-xs text-slate-700">{formatDate(item.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User size={13} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Added by</p>
                  <p className="text-xs text-slate-700">{createdByName}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Operation history */}
        <Card>
          <CardHeader
            title="Operation History"
            subtitle={`${itemOps.length} operation${itemOps.length !== 1 ? 's' : ''}`}
            actions={
              <Link to={`/items/${item.id}/history`} className="text-blue-600 hover:text-blue-700 text-xs">
                Full history
              </Link>
            }
          />
          <div className="p-5">
            {itemOps.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No operations recorded.</p>
            ) : (
              <ol className="relative border-l border-slate-200 space-y-4 ml-2">
                {itemOps.map((op) => (
                  <li key={op.id} className="pl-5 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-blue-400" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <OperationBadge type={op.operationType} />
                      <span className="text-xs text-slate-500">{formatDate(op.performedAt, true)}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{op.performedByName}</p>
                    {op.notes && <p className="text-xs text-slate-400 italic mt-0.5">{op.notes}</p>}
                    {op.toLocationLabel && (
                      <p className="text-xs text-slate-500 mt-0.5">→ <span className="font-mono">{op.toLocationLabel}</span></p>
                    )}
                    {op.toExternalLocationName && (
                      <p className="text-xs text-yellow-600 mt-0.5">→ {op.toExternalLocationName}</p>
                    )}
                    {op.expectedReturnDate && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Expected return: {formatDate(op.expectedReturnDate)}
                      </p>
                    )}
                    {op.quantityConsumed !== undefined && (
                      <p className="text-xs text-orange-600 mt-0.5">Consumed: {op.quantityConsumed}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
