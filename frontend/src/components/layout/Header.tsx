import { Bell, ScanLine, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/items': 'Items',
  '/items/new/electronics': 'Add Electronics Sample',
  '/items/new/fixture': 'Add Fixture',
  '/items/new/sparepart': 'Add Spare Part',
  '/items/new/consumable': 'Add Consumable',
  '/items/new/misc': 'Add Misc Item',
  '/operations/receipt': 'Receipt',
  '/operations/move': 'Move',
  '/operations/exit': 'Temp Exit',
  '/operations/return': 'Return (Scan-in)',
  '/operations/scrap': 'Scrap',
  '/operations/consume': 'Consume',
  '/storage/locations': 'Location Browser',
  '/storage/containers': 'Container Manager',
  '/storage/external': 'External Locations',
  '/labels': 'Labels',
  '/reports/by-location': 'Items by Location',
  '/reports/external': 'External / Overdue',
  '/reports/expiry': 'Consumables Expiry',
  '/reports/audit': 'Audit Log',
  '/admin/users': 'User Management',
  '/admin/locations': 'Location Configuration',
  '/admin/external-locations': 'External Location Management',
  '/admin/settings': 'System Settings',
}

function getTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  if (pathname.startsWith('/items/') && pathname.split('/').length === 3) return 'Item Detail'
  return 'Lab Storage Manager'
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation()
  const title = getTitle(location.pathname)

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center gap-4">
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>
      <h1 className="text-base font-semibold text-slate-800 flex-1">{title}</h1>

      {/* Quick scan / search */}
      <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 w-64 text-sm text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors">
        <ScanLine size={15} className="text-slate-400" />
        <span className="flex-1 select-none">Scan or search…</span>
        <kbd className="text-xs bg-white border border-slate-300 px-1.5 py-0.5 rounded text-slate-400 font-mono">⌘K</kbd>
      </div>

      {/* Alerts */}
      <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>
    </header>
  )
}
