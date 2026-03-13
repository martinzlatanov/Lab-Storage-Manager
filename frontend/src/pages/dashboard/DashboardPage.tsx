import { Link } from 'react-router-dom'
import {
  Cpu,
  Wrench,
  Cog,
  FlaskConical,
  Box,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  PackageOpen,
  ArrowRightLeft,
} from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { OperationBadge } from '../../components/ui/StatusBadge'
import { MOCK_STATS, MOCK_ITEMS, MOCK_OPERATIONS } from '../../mock/data'
import { ItemType, ItemStatus, ITEM_TYPE_LABELS } from '../../types'

const TYPE_CONFIG = [
  { type: ItemType.ELECTRONICS_SAMPLE, icon: Cpu, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  { type: ItemType.FIXTURE, icon: Wrench, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  { type: ItemType.SPARE_PART, icon: Cog, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  { type: ItemType.CONSUMABLE, icon: FlaskConical, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  { type: ItemType.MISC, icon: Box, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
]

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function DashboardPage() {
  const externalItems = MOCK_ITEMS.filter((i) => i.status === ItemStatus.TEMP_EXIT)
  const expiringItems = MOCK_ITEMS.filter((i) => {
    if (i.itemType !== ItemType.CONSUMABLE) return false
    const c = i as { expiryDate?: string }
    if (!c.expiryDate) return false
    const days = (new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return days <= 30 && days >= 0
  })

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {(MOCK_STATS.overdueReturns > 0 || expiringItems.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <p className="text-red-700 text-sm">
            <strong>{MOCK_STATS.overdueReturns} overdue return</strong>{' '}
            {MOCK_STATS.overdueReturns === 1 ? 'requires' : 'require'} attention
            {expiringItems.length > 0 && (
              <>
                {' '}·{' '}
                <strong>{expiringItems.length} consumable{expiringItems.length > 1 ? 's' : ''}</strong> expiring within 30 days
              </>
            )}
          </p>
          <Link to="/reports/external" className="ml-auto text-red-600 hover:text-red-700 text-xs font-medium flex items-center gap-1">
            View <ArrowUpRight size={12} />
          </Link>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Total Items</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{MOCK_STATS.totalItems}</p>
          <p className="text-slate-400 text-xs mt-1">across all sites</p>
        </Card>

        <Card className="p-5">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">At External</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{MOCK_STATS.atExternalLocations}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            <p className="text-red-500 text-xs">{MOCK_STATS.overdueReturns} overdue</p>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Expiring Soon</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{expiringItems.length}</p>
          <p className="text-slate-400 text-xs mt-1">within 30 days</p>
        </Card>

        <Card className="p-5">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Recent Ops</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{MOCK_OPERATIONS.length}</p>
          <p className="text-slate-400 text-xs mt-1">this week</p>
        </Card>
      </div>

      {/* Items by type */}
      <Card>
        <CardHeader
          title="Items by Type"
          subtitle="Sofia site — all statuses"
          actions={
            <Link to="/items" className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1">
              View all <ArrowUpRight size={12} />
            </Link>
          }
        />
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {TYPE_CONFIG.map(({ type, icon: Icon, color, bg, border }) => (
            <Link
              key={type}
              to={`/items?type=${type}`}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${bg} ${border} hover:shadow-md transition-shadow group`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon size={20} className={`${color} group-hover:scale-110 transition-transform`} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{MOCK_STATS.byType[type]}</p>
              <p className="text-xs text-slate-500 text-center leading-tight">{ITEM_TYPE_LABELS[type]}</p>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* At external locations */}
        <Card>
          <CardHeader
            title="Items at External Locations"
            actions={
              <Link to="/reports/external" className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1">
                Full report <ArrowUpRight size={12} />
              </Link>
            }
          />
          <div className="divide-y divide-slate-50">
            {externalItems.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No items currently at external locations</p>
            ) : (
              externalItems.map((item) => {
                const isOverdue =
                  item.status === ItemStatus.TEMP_EXIT &&
                  item.expectedReturnDate != null &&
                  new Date(item.expectedReturnDate) < new Date()
                return (
                  <Link
                    key={item.id}
                    to={`/items/${item.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOverdue ? 'bg-red-100' : 'bg-yellow-100'}`}>
                      {isOverdue ? (
                        <AlertTriangle size={14} className="text-red-500" />
                      ) : (
                        <Clock size={14} className="text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.labIdNumber}</p>
                      <p className="text-xs text-slate-500 truncate">{item.externalLocationName}</p>
                    </div>
                    {isOverdue && (
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Overdue</span>
                    )}
                    <ArrowUpRight size={14} className="text-slate-400 shrink-0" />
                  </Link>
                )
              })
            )}
          </div>
        </Card>

        {/* Recent operations */}
        <Card>
          <CardHeader
            title="Recent Operations"
            actions={
              <Link to="/reports/audit" className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1">
                Audit log <ArrowUpRight size={12} />
              </Link>
            }
          />
          <div className="divide-y divide-slate-50">
            {MOCK_OPERATIONS.slice(0, 6).map((op) => (
              <div key={op.id} className="flex items-start gap-3 px-5 py-3.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <ArrowRightLeft size={14} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <OperationBadge type={op.operationType} />
                    <p className="text-sm font-medium text-slate-700 truncate">{op.itemLabId}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {op.performedByName} · {formatDate(op.performedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader title="Quick Actions" />
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Receipt', path: '/operations/receipt', icon: PackageOpen, color: 'text-green-600 bg-green-50 hover:bg-green-100' },
            { label: 'Move', path: '/operations/move', icon: ArrowRightLeft, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
            { label: 'Temp Exit', path: '/operations/exit', icon: ArrowUpRight, color: 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' },
            { label: 'Return', path: '/operations/return', icon: Clock, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
            { label: 'Consume', path: '/operations/consume', icon: FlaskConical, color: 'text-orange-600 bg-orange-50 hover:bg-orange-100' },
            { label: 'All Items', path: '/items', icon: Box, color: 'text-slate-600 bg-slate-50 hover:bg-slate-100' },
          ].map(({ label, path, icon: Icon, color }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${color}`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
