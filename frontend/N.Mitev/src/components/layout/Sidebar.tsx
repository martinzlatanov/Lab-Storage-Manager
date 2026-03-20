import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  Warehouse,
  Tag,
  BarChart3,
  Settings,
  FlaskConical,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { UserRole } from '../../types'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  children?: { label: string; path: string }[]
}

const NAV: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: <LayoutDashboard size={18} />,
  },
  {
    label: 'Items',
    path: '/items',
    icon: <Package size={18} />,
    children: [
      { label: 'Item List', path: '/items' },
      { label: 'Add Electronics', path: '/items/new/electronics' },
      { label: 'Add Fixture', path: '/items/new/fixture' },
      { label: 'Add Spare Part', path: '/items/new/sparepart' },
      { label: 'Add Consumable', path: '/items/new/consumable' },
      { label: 'Add Misc Item', path: '/items/new/misc' },
    ],
  },
  {
    label: 'Operations',
    path: '/operations',
    icon: <ArrowRightLeft size={18} />,
    children: [
      { label: 'Receipt', path: '/operations/receipt' },
      { label: 'Move', path: '/operations/move' },
      { label: 'Temp Exit', path: '/operations/exit' },
      { label: 'Return (Scan-in)', path: '/operations/return' },
      { label: 'Scrap', path: '/operations/scrap' },
      { label: 'Consume', path: '/operations/consume' },
    ],
  },
  {
    label: 'Storage',
    path: '/storage',
    icon: <Warehouse size={18} />,
    children: [
      { label: 'Location Browser', path: '/storage/locations' },
      { label: 'Containers', path: '/storage/containers' },
      { label: 'External Locations', path: '/storage/external' },
    ],
  },
  {
    label: 'Labels',
    path: '/labels',
    icon: <Tag size={18} />,
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: <BarChart3 size={18} />,
    children: [
      { label: 'By Location', path: '/reports/by-location' },
      { label: 'External / Overdue', path: '/reports/external' },
      { label: 'Consumables Expiry', path: '/reports/expiry' },
      { label: 'Audit Log', path: '/reports/audit' },
    ],
  },
]

const ADMIN_NAV: NavItem[] = [
  {
    label: 'Admin',
    path: '/admin',
    icon: <Settings size={18} />,
    children: [
      { label: 'Users', path: '/admin/users' },
      { label: 'Locations Config', path: '/admin/locations' },
      { label: 'External Locations', path: '/admin/external-locations' },
      { label: 'System Settings', path: '/admin/settings' },
    ],
  },
]

function NavGroup({ item, open, onToggle, onNavigate }: { item: NavItem; open: boolean; onToggle: () => void; onNavigate?: () => void }) {
  const location = useLocation()
  const isActive =
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path)

  if (!item.children) {
    return (
      <NavLink
        to={item.path}
        end={item.path === '/'}
        onClick={onNavigate}
        className={({ isActive }) =>
          clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isActive
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:bg-slate-700/60 hover:text-white',
          )
        }
      >
        {item.icon}
        {item.label}
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
          isActive ? 'text-white hover:bg-slate-700/40' : 'text-slate-400 hover:bg-slate-700/60 hover:text-white',
        )}
      >
        {item.icon}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronRight
          size={14}
          className={clsx('transition-transform duration-200', open && 'rotate-90')}
        />
      </button>
      {open && (
        <div className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l border-slate-700 pl-3">
          {item.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              end={child.path === item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'block px-2 py-1.5 rounded text-sm transition-colors',
                  isActive
                    ? 'text-blue-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200',
                )
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === UserRole.ADMIN
  const location = useLocation()

  function defaultOpen(item: NavItem) {
    return !!item.children && location.pathname.startsWith(item.path)
  }

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    ;[...NAV, ...ADMIN_NAV].forEach((item) => {
      if (item.children) init[item.path] = defaultOpen(item)
    })
    return init
  })

  function toggle(path: string) {
    setOpenGroups((prev) => ({ ...prev, [path]: !prev[path] }))
  }

  return (
    <aside className="w-60 shrink-0 bg-slate-900 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <FlaskConical size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Lab Storage</p>
            <p className="text-slate-500 text-xs leading-tight">Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 flex flex-col gap-1">
        {NAV.map((item) => (
          <NavGroup key={item.path} item={item} open={!!openGroups[item.path]} onToggle={() => toggle(item.path)} onNavigate={onNavigate} />
        ))}

        {isAdmin && (
          <>
            <div className="my-2 border-t border-slate-800" />
            {ADMIN_NAV.map((item) => (
              <NavGroup key={item.path} item={item} open={!!openGroups[item.path]} onToggle={() => toggle(item.path)} onNavigate={onNavigate} />
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-slate-800">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">
            {user?.displayName
              ? user.displayName.split(' ').map((n) => n[0]).join('')
              : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs font-medium truncate">{user?.displayName ?? '—'}</p>
            <p className="text-slate-500 text-xs truncate capitalize">{user?.role.toLowerCase() ?? ''}</p>
          </div>
          <button onClick={() => void logout()} className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
