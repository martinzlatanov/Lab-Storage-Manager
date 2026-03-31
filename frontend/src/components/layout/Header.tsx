import { useState, useRef, useEffect } from 'react'
import { Bell, ScanLine, Menu, KeyRound, LogOut, ChevronDown, CheckCircle2, X, Loader2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { UserRole } from '../../types'
import { changeMyPassword } from '../../api'

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

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white'

function ChangePasswordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    if (next.length < 8) { setError('Password must be at least 8 characters'); return }
    if (next !== confirm) { setError('Passwords do not match'); return }
    setError('')
    setSaving(true)
    try {
      await changeMyPassword(userId, current, next)
      setSuccess(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center">
              <KeyRound size={14} className="text-blue-700" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Change Password</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="flex items-center gap-2 py-4 text-green-700 text-sm">
            <CheckCircle2 size={16} />
            Password changed successfully
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Current Password</label>
              <input
                autoFocus
                type="password"
                placeholder="Your current password"
                value={current}
                onChange={e => setCurrent(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                placeholder="Min. 8 characters"
                value={next}
                onChange={e => setNext(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                placeholder="Repeat new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className={inputClass}
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSubmit}
                disabled={saving || !current || !next || !confirm}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                {saving ? 'Saving…' : 'Change Password'}
              </button>
              <button onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation()
  const title = getTitle(location.pathname)
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showChangePwd, setShowChangePwd] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const roleLabel = user?.role === UserRole.ADMIN ? 'Admin' : user?.role === UserRole.USER ? 'User' : 'Viewer'
  const initials = user?.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  return (
    <>
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

        {/* User menu */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-slate-700 leading-none">{user.displayName}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-none">{roleLabel}</p>
              </div>
              <ChevronDown size={12} className="text-slate-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-700 truncate">{user.displayName}</p>
                  <p className="text-xs text-slate-400 truncate">{user.username}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); setShowChangePwd(true) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <KeyRound size={14} className="text-slate-400" />
                  Change Password
                </button>
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={() => { setMenuOpen(false); logout() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {showChangePwd && user && (
        <ChangePasswordModal userId={user.id} onClose={() => setShowChangePwd(false)} />
      )}
    </>
  )
}
