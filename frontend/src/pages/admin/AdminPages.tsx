/**
 * Admin pages:
 * UserManagementPage, LocationConfigPage, ExternalLocationAdminPage, SystemSettingsPage
 */

import { useState, useEffect, useRef } from 'react'
import { Plus, Shield, User, Eye, CheckCircle2, XCircle, Pencil, Save, X, ChevronRight, AlertCircle, Loader2, Trash2, KeyRound } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { MOCK_USERS, MOCK_SITES } from '../../mock/data'
import { UserRole, type Site, type User as AppUser, type ExternalLocation } from '../../types'
import { getSitesTree, createSite, createBuilding, createArea, createLocation, deleteLocation, deleteArea, deleteBuilding, deleteSite, updateSite, updateBuilding, updateArea, getUsers, createUser, updateUser, deactivateUser, setUserPassword, createExternalLocation, getExternalLocations, updateExternalLocation } from '../../api'
import clsx from 'clsx'

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white'

function RoleBadge({ role }: { role: UserRole }) {
  const config = {
    [UserRole.ADMIN]: { label: 'Admin', variant: 'red' as const, Icon: Shield },
    [UserRole.USER]: { label: 'User', variant: 'blue' as const, Icon: User },
    [UserRole.VIEWER]: { label: 'Viewer', variant: 'gray' as const, Icon: Eye },
  }
  const { label, variant, Icon } = config[role]
  return (
    <Badge variant={variant}>
      <Icon size={10} />
      {label}
    </Badge>
  )
}

// ─── User Management ──────────────────────────────────────────────────────────

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export function UserManagementPage() {
  const [users, setUsers] = useState<AppUser[]>([...MOCK_USERS])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<UserRole>(UserRole.USER)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [colWidths, setColWidths] = useState([200, 100, 130, 90, 180])

  // Invite User modal state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteLdap, setInviteLdap] = useState('')
  const [inviteDisplay, setInviteDisplay] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.USER)
  const [inviteSaving, setInviteSaving] = useState(false)
  const [inviteError, setInviteError] = useState('')

  function openInvite() {
    setInviteLdap(''); setInviteDisplay(''); setInviteEmail('')
    setInviteRole(UserRole.USER); setInviteError('')
    setInviteOpen(true)
  }

  function closeInvite() { setInviteOpen(false) }

  async function handleInviteUser() {
    if (!inviteLdap.trim() || !inviteDisplay.trim() || !inviteEmail.trim()) {
      setInviteError('LDAP username, display name, and email are required.')
      return
    }
    setInviteError('')
    setInviteSaving(true)
    if (USE_MOCKS) {
      await new Promise(r => setTimeout(r, 400))
      setInviteSaving(false)
      closeInvite()
      return
    }
    try {
      const res = await createUser({ ldapUsername: inviteLdap.trim(), displayName: inviteDisplay.trim(), email: inviteEmail.trim(), role: inviteRole })
      setUsers(prev => [...prev, res.data])
      closeInvite()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setInviteSaving(false)
    }
  }

  // Set Password modal state
  const [pwdUserId, setPwdUserId] = useState<string | null>(null)
  const [pwdUser, setPwdUser] = useState<AppUser | null>(null)
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState(false)

  function openPwdModal(user: AppUser) {
    setPwdUserId(user.id)
    setPwdUser(user)
    setPwdNew('')
    setPwdConfirm('')
    setPwdError('')
    setPwdSuccess(false)
  }

  function closePwdModal() {
    setPwdUserId(null)
    setPwdUser(null)
    setPwdNew('')
    setPwdConfirm('')
    setPwdError('')
    setPwdSuccess(false)
  }

  async function handleSetPassword() {
    if (!pwdUserId) return
    if (pwdNew.length < 8) { setPwdError('Password must be at least 8 characters'); return }
    if (pwdNew !== pwdConfirm) { setPwdError('Passwords do not match'); return }
    setPwdError('')
    setPwdSaving(true)
    if (USE_MOCKS) {
      await new Promise(r => setTimeout(r, 400))
      setPwdSuccess(true)
      setPwdSaving(false)
      setTimeout(closePwdModal, 1200)
      return
    }
    try {
      await setUserPassword(pwdUserId, pwdNew)
      setPwdSuccess(true)
      setTimeout(closePwdModal, 1200)
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : 'Failed to set password')
    } finally {
      setPwdSaving(false)
    }
  }
  const resizeRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null)
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizeRef.current) return
      const { col, startX, startWidth } = resizeRef.current
      setColWidths(prev => { const n = [...prev]; n[col] = Math.max(60, startWidth + (e.clientX - startX)); return n })
    }
    function onMouseUp() { if (!resizeRef.current) return; resizeRef.current = null; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp) }
  }, [])

  useEffect(() => {
    if (USE_MOCKS) return
    getUsers(true).then(res => setUsers(res.data)).catch(() => {})
  }, [])

  async function handleSaveRole(userId: string) {
    setSaving(true)
    setActionError('')
    if (USE_MOCKS) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: editingRole } : u))
      setEditingId(null)
      setSaving(false)
      return
    }
    try {
      const res = await updateUser(userId, { role: editingRole })
      setUsers(prev => prev.map(u => u.id === userId ? res.data : u))
      setEditingId(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(userId: string) {
    setActionError('')
    if (USE_MOCKS) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: false } : u))
      return
    }
    try {
      await deactivateUser(userId)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: false } : u))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to deactivate')
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex justify-end">
        <button onClick={openInvite} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={15} />
          Invite User
        </button>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{actionError}</div>
      )}

      <Card>
        <CardHeader title="Users" subtitle={`${users.length} total · ${users.filter(u => u.isActive).length} active`} />
        <div className="overflow-x-auto">
          <table className="text-sm" style={{ tableLayout: 'fixed', width: colWidths.reduce((s, w) => s + w, 0) }}>
            <colgroup>{colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {(['User', 'Role', 'Site', 'Status', 'Actions'] as const).map((label, i) => (
                  <th key={i} className="relative px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide select-none overflow-hidden whitespace-nowrap">
                    <span className="block overflow-hidden">{label}</span>
                    <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group/handle" onMouseDown={e => { e.preventDefault(); resizeRef.current = { col: i, startX: e.clientX, startWidth: colWidths[i] }; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none' }}>
                      <div className="w-px h-4 bg-slate-200 group-hover/handle:bg-blue-400 transition-colors" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(user => (
                <tr key={user.id} className={clsx('hover:bg-slate-50 transition-colors', !user.isActive && 'opacity-60')}>
                  <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                        {user.displayName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="font-medium text-slate-800 truncate text-xs">{user.displayName}</p>
                        <p className="text-xs text-slate-400 font-mono truncate">{user.ldapUsername}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                    {editingId === user.id ? (
                      <select
                        value={editingRole}
                        onChange={e => setEditingRole(e.target.value as UserRole)}
                        className="border border-slate-200 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={UserRole.VIEWER}>Viewer</option>
                        <option value={UserRole.USER}>User</option>
                        <option value={UserRole.ADMIN}>Admin</option>
                      </select>
                    ) : (
                      <RoleBadge role={user.role} />
                    )}
                  </td>
                  <td className="px-3 py-1 overflow-hidden whitespace-nowrap text-slate-600 text-xs">
                    {MOCK_SITES.find(s => s.id === user.siteId)?.name ?? <span className="text-slate-400">Global</span>}
                  </td>
                  <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                    {user.isActive
                      ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 size={12} />Active</span>
                      : <span className="flex items-center gap-1 text-xs text-slate-400"><XCircle size={12} />Inactive</span>
                    }
                  </td>
                  <td className="px-3 py-1 overflow-hidden whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {editingId === user.id ? (
                        <>
                          <button
                            onClick={() => handleSaveRole(user.id)}
                            disabled={saving}
                            className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded text-xs transition-colors"
                          >
                            {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 px-2 py-0.5 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-50 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingId(user.id); setEditingRole(user.role) }}
                            className="flex items-center gap-1 px-2 py-0.5 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-50 transition-colors"
                          >
                            <Pencil size={10} /> Edit
                          </button>
                          <button
                            onClick={() => openPwdModal(user)}
                            className="flex items-center gap-1 px-2 py-0.5 border border-slate-200 text-slate-500 rounded text-xs hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-colors"
                            title="Set password"
                          >
                            <KeyRound size={10} /> Pwd
                          </button>
                          {user.isActive && (
                            <button
                              onClick={() => handleDeactivate(user.id)}
                              className="px-2 py-0.5 border border-slate-200 text-slate-500 rounded text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                            >
                              Deactivate
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite User Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeInvite}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center">
                  <Plus size={14} className="text-blue-700" />
                </div>
                <p className="text-sm font-semibold text-slate-800">Invite User</p>
              </div>
              <button onClick={closeInvite} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">LDAP Username <span className="text-red-500">*</span></label>
                <input autoFocus type="text" placeholder="john.doe" value={inviteLdap} onChange={e => setInviteLdap(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Display Name <span className="text-red-500">*</span></label>
                <input type="text" placeholder="John Doe" value={inviteDisplay} onChange={e => setInviteDisplay(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" placeholder="john.doe@visteon.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)} className={inputClass}>
                  <option value={UserRole.VIEWER}>Viewer</option>
                  <option value={UserRole.USER}>User</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>
              {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleInviteUser}
                  disabled={inviteSaving || !inviteLdap || !inviteDisplay || !inviteEmail}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {inviteSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {inviteSaving ? 'Creating…' : 'Create User'}
                </button>
                <button onClick={closeInvite} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Password Modal */}
      {pwdUserId && pwdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closePwdModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
                  <KeyRound size={14} className="text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Set Password</p>
                  <p className="text-xs text-slate-500">{pwdUser.displayName}</p>
                </div>
              </div>
              <button onClick={closePwdModal} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
                <X size={16} />
              </button>
            </div>

            {pwdSuccess ? (
              <div className="flex items-center gap-2 py-4 text-green-700 text-sm">
                <CheckCircle2 size={16} />
                Password set successfully
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
                  <input
                    autoFocus
                    type="password"
                    placeholder="Min. 8 characters"
                    value={pwdNew}
                    onChange={e => setPwdNew(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Repeat password"
                    value={pwdConfirm}
                    onChange={e => setPwdConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                    className={inputClass}
                  />
                </div>
                {pwdError && (
                  <p className="text-xs text-red-600">{pwdError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSetPassword}
                    disabled={pwdSaving || !pwdNew || !pwdConfirm}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    {pwdSaving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                    {pwdSaving ? 'Saving…' : 'Set Password'}
                  </button>
                  <button onClick={closePwdModal} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Location Config ──────────────────────────────────────────────────────────

type EditTarget =
  | { kind: 'site'; id: string }
  | { kind: 'building'; id: string }
  | { kind: 'area'; id: string }

type AddTarget =
  | { kind: 'site' }
  | { kind: 'building'; siteId: string }
  | { kind: 'area'; buildingId: string }
  | { kind: 'location'; areaId: string; areaCode: string }

export function LocationConfigPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingAction, setSavingAction] = useState<string | null>(null)
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null)
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null)

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [editValue, setEditValue] = useState('')

  const [addTarget, setAddTarget] = useState<AddTarget | null>(null)
  const [addName, setAddName] = useState('')
  const [addCode, setAddCode] = useState('')
  const [addRow, setAddRow] = useState('')
  const [addShelf, setAddShelf] = useState('')
  const [addLevel, setAddLevel] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState<{ kind: 'site' | 'location' | 'area' | 'building'; id: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function reloadSitesTree(): Promise<Site[]> {
    const res = await getSitesTree()
    const nextSites = res.data as Site[]
    setSites(nextSites)
    return nextSites
  }

  // Load sites from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const nextSites = await reloadSitesTree()
        if (nextSites.length > 0) {
          setExpandedSiteId(nextSites[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load locations')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function resetAdd() { setAddName(''); setAddCode(''); setAddRow(''); setAddShelf(''); setAddLevel('') }

  function openAdd(target: AddTarget) {
    setAddTarget(target)
    setEditTarget(null)
    resetAdd()
  }

  function cancelAdd() { setAddTarget(null); resetAdd() }

  function openEdit(target: EditTarget, current: string) {
    setEditTarget(target)
    setEditValue(current)
    setAddTarget(null)
  }

  function cancelEdit() { setEditTarget(null) }

  async function saveEdit() {
    if (!editTarget || !editValue.trim()) return cancelEdit()
    const target = editTarget
    const value = editValue.trim()
    cancelEdit()
    try {
      if (target.kind === 'site') {
        await updateSite(target.id, value)
        setSites(prev => prev.map(s => s.id === target.id ? { ...s, name: value } : s))
      } else if (target.kind === 'building') {
        await updateBuilding(target.id, value)
        setSites(prev => prev.map(s => ({
          ...s,
          buildings: s.buildings.map(b => b.id === target.id ? { ...b, name: value } : b),
        })))
      } else if (target.kind === 'area') {
        await updateArea(target.id, value.toUpperCase())
        setSites(prev => prev.map(s => ({
          ...s,
          buildings: s.buildings.map(b => ({
            ...b,
            storageAreas: b.storageAreas.map(a => a.id === target.id ? { ...a, code: value.toUpperCase() } : a),
          })),
        })))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    }
  }

  async function doAddSite() {
    if (!addName.trim()) return
    try {
      setSavingAction('site')
      const res = await createSite(addName.trim())
      setSites(prev => [...prev, { id: res.data.id, name: res.data.name, buildings: [] }])
      setExpandedSiteId(res.data.id)
      cancelAdd()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create site')
    } finally {
      setSavingAction(null)
    }
  }

  async function doAddBuilding(siteId: string) {
    if (!addName.trim()) return
    try {
      setSavingAction('building')
      const res = await createBuilding(siteId, addName.trim())
      setSites(prev => prev.map(s => s.id === siteId
        ? { ...s, buildings: [...s.buildings, { id: res.data.id, siteId, name: res.data.name, storageAreas: [] }] }
        : s
      ))
      cancelAdd()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create building')
    } finally {
      setSavingAction(null)
    }
  }

  async function doAddArea(buildingId: string) {
    if (!addCode.trim()) return
    try {
      setSavingAction('area')
      const res = await createArea(buildingId, addCode.trim().toUpperCase())
      setSites(prev => prev.map(s => ({
        ...s,
        buildings: s.buildings.map(b => b.id === buildingId
          ? { ...b, storageAreas: [...b.storageAreas, { id: res.data.id, buildingId, code: res.data.code, locations: [] }] }
          : b
        ),
      })))
      cancelAdd()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create storage area')
    } finally {
      setSavingAction(null)
    }
  }

  async function doAddLocation(areaId: string) {
    if (!addRow.trim() || !addShelf.trim() || !addLevel.trim()) return
    const row = addRow.trim().padStart(2, '0')
    const shelf = addShelf.trim().padStart(2, '0')
    const level = addLevel.trim()
    try {
      setSavingAction('location')
      const res = await createLocation(areaId, row, shelf, level)
      setSites(prev => prev.map(s => ({
        ...s,
        buildings: s.buildings.map(b => ({
          ...b,
          storageAreas: b.storageAreas.map(a => a.id === areaId
            ? { ...a, locations: [...a.locations, { id: res.data.id, storageAreaId: areaId, row, shelf, level, label: res.data.label }] }
            : a
          ),
        })),
      })))
      cancelAdd()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location')
    } finally {
      setSavingAction(null)
    }
  }

  async function handleDeleteLocation(locationId: string) {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteLocation(locationId)
      await reloadSitesTree()
      setDeleteConfirm(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete location')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteArea(areaId: string) {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteArea(areaId)
      await reloadSitesTree()
      if (expandedAreaId === areaId) setExpandedAreaId(null)
      setDeleteConfirm(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete area')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteBuilding(buildingId: string) {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteBuilding(buildingId)
      await reloadSitesTree()
      setDeleteConfirm(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete building')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteSite(siteId: string) {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteSite(siteId)
      await reloadSitesTree()
      if (expandedSiteId === siteId) setExpandedSiteId(null)
      setDeleteConfirm(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete site')
    } finally {
      setDeleting(false)
    }
  }

  function confirmDelete(kind: 'site' | 'location' | 'area' | 'building', id: string) {
    setDeleteConfirm({ kind, id })
    setDeleteError(null)
    setAddTarget(null)
    setEditTarget(null)
  }

  function cancelDelete() {
    setDeleteConfirm(null)
    setDeleteError(null)
  }

  const isEditing = (kind: EditTarget['kind'], id: string) =>
    editTarget?.kind === kind && editTarget.id === id

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading locations…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top action */}
      <div className="flex justify-end">
        <button
          onClick={() => openAdd({ kind: 'site' })}
          disabled={savingAction !== null}
          className={clsx('flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors', savingAction ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700')}
        >
          {savingAction ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Plus size={15} />
              Add Site
            </>
          )}
        </button>
      </div>

      {/* Add Site form */}
      {addTarget?.kind === 'site' && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">New Site</p>
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Site name (e.g. Berlin)"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !savingAction) doAddSite(); if (e.key === 'Escape') cancelAdd() }}
              disabled={savingAction !== null}
              className={clsx(inputClass, 'flex-1', savingAction && 'opacity-60 cursor-not-allowed')}
            />
            <button onClick={doAddSite} disabled={savingAction !== null} className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors', savingAction ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white')}>
              {savingAction === 'site' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {savingAction === 'site' ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancelAdd} disabled={savingAction !== null} className={clsx('px-3 py-2 border border-slate-200 rounded-lg text-sm transition-colors', savingAction ? 'opacity-50 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50')}>
              <X size={13} />
            </button>
          </div>
        </Card>
      )}

      {/* Sites */}
      {sites.map(site => (
        <Card key={site.id}>
          {/* Site header */}
          <div
            className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-t-xl select-none"
            onClick={() => !isEditing('site', site.id) && setExpandedSiteId(expandedSiteId === site.id ? null : site.id)}
          >
            <ChevronRight
              size={15}
              className={clsx('text-slate-400 transition-transform shrink-0', expandedSiteId === site.id && 'rotate-90')}
            />
            <div className="flex-1 min-w-0">
              {isEditing('site', site.id) ? (
                <input
                  autoFocus
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                  onClick={e => e.stopPropagation()}
                  className="border border-blue-300 rounded-lg px-2 py-1 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <>
                  <p className="font-semibold text-slate-800">{site.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {site.buildings.length} building{site.buildings.length !== 1 ? 's' : ''}
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
              {isEditing('site', site.id) ? (
                <>
                  <button onClick={saveEdit} className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors">
                    <Save size={11} /> Save
                  </button>
                  <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <X size={13} />
                  </button>
                </>
              ) : deleteConfirm?.kind === 'site' && deleteConfirm.id === site.id ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600 font-medium">Delete {site.name}?</span>
                  <button
                    onClick={() => handleDeleteSite(site.id)}
                    disabled={deleting}
                    className="flex items-center gap-1 px-2 py-0.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded text-xs transition-colors"
                  >
                    {deleting ? <Loader2 size={10} className="animate-spin" /> : null}
                    Delete
                  </button>
                  <button onClick={cancelDelete} disabled={deleting} className="px-2 py-0.5 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  {deleteError && deleteConfirm.id === site.id && (
                    <span className="text-xs text-red-600 max-w-xs">{deleteError}</span>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => openEdit({ kind: 'site', id: site.id }, site.name)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => confirmDelete('site', site.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete site"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={() => { openAdd({ kind: 'building', siteId: site.id }); setExpandedSiteId(site.id) }}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2.5 py-1 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Plus size={11} /> Building
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Buildings */}
          {expandedSiteId === site.id && (
            <div className="border-t border-slate-100 px-5 pb-4 space-y-4">
              {site.buildings.length === 0 && addTarget?.kind !== 'building' && (
                <p className="text-sm text-slate-400 italic pt-3">No buildings yet.</p>
              )}

              {site.buildings.map(bldg => {
                const expandedArea = bldg.storageAreas.find(a => a.id === expandedAreaId)
                return (
                  <div key={bldg.id} className="mt-3">
                    {/* Building header */}
                    <div className="flex items-center justify-between mb-2">
                      {isEditing('building', bldg.id) ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            type="text"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                            className="border border-blue-300 rounded-lg px-2 py-1 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button onClick={saveEdit} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors">
                            <Save size={10} /> Save
                          </button>
                          <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-slate-700">{bldg.name}</p>
                          {deleteConfirm?.kind === 'building' && deleteConfirm.id === bldg.id ? (
                            <div className="flex items-center gap-1.5 ml-1">
                              <span className="text-xs text-red-600 font-medium">Delete building?</span>
                              <button
                                onClick={() => handleDeleteBuilding(bldg.id)}
                                disabled={deleting}
                                className="flex items-center gap-1 px-2 py-0.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded text-xs transition-colors"
                              >
                                {deleting ? <Loader2 size={10} className="animate-spin" /> : null}
                                Delete
                              </button>
                              <button onClick={cancelDelete} disabled={deleting} className="px-2 py-0.5 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-50 transition-colors">
                                Cancel
                              </button>
                              {deleteError && deleteConfirm.id === bldg.id && (
                                <span className="text-xs text-red-600 max-w-xs">{deleteError}</span>
                              )}
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => openEdit({ kind: 'building', id: bldg.id }, bldg.name)}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                onClick={() => confirmDelete('building', bldg.id)}
                                className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                title="Delete building"
                              >
                                <Trash2 size={11} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {!isEditing('building', bldg.id) && deleteConfirm?.id !== bldg.id && (
                        <button
                          onClick={() => openAdd({ kind: 'area', buildingId: bldg.id })}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Plus size={11} /> Area
                        </button>
                      )}
                    </div>

                    {/* Area chips */}
                    <div className="ml-4 flex flex-wrap gap-2">
                      {bldg.storageAreas.map(area => (
                        isEditing('area', area.id) ? (
                          <div key={area.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
                            <span className="text-xs text-slate-500">Area</span>
                            <input
                              autoFocus
                              type="text"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value.toUpperCase())}
                              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                              className="w-10 border border-blue-300 rounded px-1.5 py-0.5 text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button onClick={saveEdit} className="text-blue-600 hover:text-blue-700"><Save size={11} /></button>
                            <button onClick={cancelEdit} className="text-slate-400 hover:text-red-500"><X size={11} /></button>
                          </div>
                        ) : deleteConfirm?.kind === 'area' && deleteConfirm.id === area.id ? (
                          <div key={area.id} className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                            <span className="text-xs text-red-600 font-medium">Delete Area {area.code}?</span>
                            <button
                              onClick={() => handleDeleteArea(area.id)}
                              disabled={deleting}
                              className="flex items-center gap-1 px-2 py-0.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded text-xs transition-colors"
                            >
                              {deleting ? <Loader2 size={10} className="animate-spin" /> : null}
                              Delete
                            </button>
                            <button onClick={cancelDelete} disabled={deleting} className="px-2 py-0.5 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-50 transition-colors">
                              Cancel
                            </button>
                            {deleteError && deleteConfirm.id === area.id && (
                              <span className="text-xs text-red-600 max-w-xs">{deleteError}</span>
                            )}
                          </div>
                        ) : (
                          <div
                            key={area.id}
                            onClick={() => setExpandedAreaId(expandedAreaId === area.id ? null : area.id)}
                            className={clsx(
                              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-medium transition-colors cursor-pointer',
                              expandedAreaId === area.id
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                            )}
                          >
                            Area {area.code}
                            <span className="text-slate-400 font-sans font-normal">({area.locations.length})</span>
                            <button
                              onClick={e => { e.stopPropagation(); openEdit({ kind: 'area', id: area.id }, area.code) }}
                              className="text-slate-400 hover:text-blue-600 ml-0.5"
                            >
                              <Pencil size={10} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); confirmDelete('area', area.id) }}
                              className="text-slate-400 hover:text-red-500 ml-0.5"
                              title="Delete area"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        )
                      ))}

                      {/* Add Area inline form */}
                      {addTarget?.kind === 'area' && addTarget.buildingId === bldg.id && (
                        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
                          <span className="text-xs text-slate-500">Area</span>
                          <input
                            autoFocus
                            type="text"
                            placeholder="D"
                            value={addCode}
                            onChange={e => setAddCode(e.target.value.toUpperCase())}
                            onKeyDown={e => { if (e.key === 'Enter') doAddArea(bldg.id); if (e.key === 'Escape') cancelAdd() }}
                            className="w-10 border border-blue-300 rounded px-1.5 py-0.5 text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button onClick={() => doAddArea(bldg.id)} className="text-blue-600 hover:text-blue-700"><Save size={11} /></button>
                          <button onClick={cancelAdd} className="text-slate-400 hover:text-red-500"><X size={11} /></button>
                        </div>
                      )}
                    </div>

                    {/* Expanded area — locations panel */}
                    {expandedArea && !isEditing('area', expandedArea.id) && (
                      <div className="mt-3 ml-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Area {expandedArea.code} — Locations
                          </p>
                          <button
                            onClick={() => openAdd({ kind: 'location', areaId: expandedArea.id, areaCode: expandedArea.code })}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
                          >
                            <Plus size={10} /> Add Location
                          </button>
                        </div>

                        {expandedArea.locations.length === 0 && !(addTarget?.kind === 'location' && addTarget.areaId === expandedArea.id) && (
                          <p className="text-xs text-slate-400 italic">No locations yet.</p>
                        )}

                        <div className="space-y-1">
                          {expandedArea.locations.map(loc => (
                            <div key={loc.id} className="flex items-center gap-2">
                              {deleteConfirm?.kind === 'location' && deleteConfirm.id === loc.id ? (
                                <div className="flex items-center gap-1.5 flex-1">
                                  <span className="text-xs text-red-600 font-medium">Delete {loc.label}?</span>
                                  <button
                                    onClick={() => handleDeleteLocation(loc.id)}
                                    disabled={deleting}
                                    className="flex items-center gap-1 px-2 py-0.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded text-xs transition-colors"
                                  >
                                    {deleting ? <Loader2 size={10} className="animate-spin" /> : null}
                                    Delete
                                  </button>
                                  <button onClick={cancelDelete} disabled={deleting} className="px-2 py-0.5 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-50 transition-colors">
                                    Cancel
                                  </button>
                                  {deleteError && deleteConfirm.id === loc.id && (
                                    <span className="text-xs text-red-600">{deleteError}</span>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <span className="font-mono text-xs text-slate-700 bg-white border border-slate-200 rounded px-2 py-0.5">
                                    {loc.label}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    row {loc.row} · shelf {loc.shelf} · level {loc.level}
                                  </span>
                                  <button
                                    onClick={() => confirmDelete('location', loc.id)}
                                    className="p-0.5 text-slate-300 hover:text-red-500 rounded transition-colors ml-auto"
                                    title="Delete location"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add Location form */}
                        {addTarget?.kind === 'location' && addTarget.areaId === expandedArea.id && (
                          <div className={clsx('pt-3 mt-2', expandedArea.locations.length > 0 && 'border-t border-slate-200')}>
                            <p className="text-xs font-medium text-slate-600 mb-2">New location</p>
                            <div className="flex flex-wrap gap-2 items-end">
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Row</label>
                                <input
                                  autoFocus
                                  type="number" min={1} placeholder="1"
                                  value={addRow}
                                  onChange={e => setAddRow(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') doAddLocation(expandedArea.id); if (e.key === 'Escape') cancelAdd() }}
                                  className="w-16 border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Shelf</label>
                                <input
                                  type="number" min={1} placeholder="1"
                                  value={addShelf}
                                  onChange={e => setAddShelf(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') doAddLocation(expandedArea.id); if (e.key === 'Escape') cancelAdd() }}
                                  className="w-16 border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Level</label>
                                <input
                                  type="number" min={1} placeholder="1"
                                  value={addLevel}
                                  onChange={e => setAddLevel(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') doAddLocation(expandedArea.id); if (e.key === 'Escape') cancelAdd() }}
                                  className="w-16 border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              {(addRow || addShelf || addLevel) && (
                                <div className="flex items-end pb-1">
                                  <span className="text-xs text-slate-400 font-mono">
                                    → {expandedArea.code}-{(addRow || '?').padStart(2, '0')}-{(addShelf || '?').padStart(2, '0')}-{addLevel || '?'}
                                  </span>
                                </div>
                              )}
                              <div className="flex gap-1 items-end ml-auto">
                                <button
                                  onClick={() => doAddLocation(expandedArea.id)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                                >
                                  <Save size={10} /> Add
                                </button>
                                <button onClick={cancelAdd} className="px-2.5 py-1 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-50 transition-colors">
                                  <X size={10} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add Building form */}
              {addTarget?.kind === 'building' && addTarget.siteId === site.id && (
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">New Building</p>
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Building name"
                      value={addName}
                      onChange={e => setAddName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') doAddBuilding(site.id); if (e.key === 'Escape') cancelAdd() }}
                      className={clsx(inputClass, 'flex-1')}
                    />
                    <button onClick={() => doAddBuilding(site.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors">
                      <Save size={11} /> Save
                    </button>
                    <button onClick={cancelAdd} className="px-2.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

// ─── External Location Admin ──────────────────────────────────────────────────

export function ExternalLocationAdminPage() {
  const [showForm, setShowForm] = useState(false)
  const [extName, setExtName] = useState('')
  const [extContact, setExtContact] = useState('')
  const [extCity, setExtCity] = useState('')
  const [extAddress, setExtAddress] = useState('')
  const [extCountry, setExtCountry] = useState('')
  const [extPhone, setExtPhone] = useState('')
  const [extEmail, setExtEmail] = useState('')
  const [extNotes, setExtNotes] = useState('')
  const [extSaving, setExtSaving] = useState(false)
  const [extError, setExtError] = useState('')
  const [extLocations, setExtLocations] = useState<ExternalLocation[]>([])

  // Edit modal state
  const [editingExt, setEditingExt] = useState<ExternalLocation | null>(null)
  const [editExtName, setEditExtName] = useState('')
  const [editExtContact, setEditExtContact] = useState('')
  const [editExtCity, setEditExtCity] = useState('')
  const [editExtAddress, setEditExtAddress] = useState('')
  const [editExtCountry, setEditExtCountry] = useState('')
  const [editExtPhone, setEditExtPhone] = useState('')
  const [editExtEmail, setEditExtEmail] = useState('')
  const [editExtNotes, setEditExtNotes] = useState('')
  const [editExtSaving, setEditExtSaving] = useState(false)
  const [editExtError, setEditExtError] = useState('')

  useEffect(() => {
    if (USE_MOCKS) return
    getExternalLocations().then(res => setExtLocations(res.data)).catch(() => {})
  }, [])

  function openEditExt(loc: ExternalLocation) {
    setEditingExt(loc)
    setEditExtName(loc.name)
    setEditExtContact(loc.contactPerson)
    setEditExtCity(loc.city)
    setEditExtAddress(loc.address)
    setEditExtCountry(loc.country ?? '')
    setEditExtPhone(loc.phone ?? '')
    setEditExtEmail(loc.email ?? '')
    setEditExtNotes(loc.notes ?? '')
    setEditExtError('')
  }

  function closeEditExt() { setEditingExt(null); setEditExtError('') }

  async function handleUpdateExtLocation() {
    if (!editingExt) return
    if (!editExtName.trim() || !editExtContact.trim() || !editExtCity.trim() || !editExtAddress.trim()) {
      setEditExtError('Name, contact person, city, and address are required.')
      return
    }
    setEditExtError('')
    setEditExtSaving(true)
    try {
      const res = await updateExternalLocation(editingExt.id, {
        name: editExtName.trim(), contactPerson: editExtContact.trim(), city: editExtCity.trim(),
        address: editExtAddress.trim(), country: editExtCountry.trim() || undefined,
        phone: editExtPhone.trim() || undefined, email: editExtEmail.trim() || undefined,
        notes: editExtNotes.trim() || undefined,
      })
      setExtLocations(prev => prev.map(l => l.id === editingExt.id ? res.data : l))
      closeEditExt()
    } catch (err) {
      setEditExtError(err instanceof Error ? err.message : 'Failed to update location')
    } finally {
      setEditExtSaving(false)
    }
  }

  function resetExtForm() {
    setExtName(''); setExtContact(''); setExtCity(''); setExtAddress('')
    setExtCountry(''); setExtPhone(''); setExtEmail(''); setExtNotes('')
    setExtError('')
  }

  async function handleSaveExtLocation() {
    if (!extName.trim() || !extContact.trim() || !extCity.trim() || !extAddress.trim()) {
      setExtError('Name, contact person, city, and address are required.')
      return
    }
    setExtError('')
    setExtSaving(true)
    if (USE_MOCKS) {
      await new Promise(r => setTimeout(r, 400))
      setExtLocations(prev => [...prev, {
        id: `ext-${Date.now()}`, name: extName.trim(), contactPerson: extContact.trim(),
        city: extCity.trim(), address: extAddress.trim(), country: extCountry.trim() || undefined,
        phone: extPhone.trim() || undefined, email: extEmail.trim() || undefined,
        notes: extNotes.trim() || undefined,
      }])
      setExtSaving(false)
      setShowForm(false)
      resetExtForm()
      return
    }
    try {
      const res = await createExternalLocation({
        name: extName.trim(), contactPerson: extContact.trim(), city: extCity.trim(),
        address: extAddress.trim(), country: extCountry.trim() || undefined,
        phone: extPhone.trim() || undefined, email: extEmail.trim() || undefined,
        notes: extNotes.trim() || undefined,
      })
      setExtLocations(prev => [...prev, res.data])
      setShowForm(false)
      resetExtForm()
    } catch (err) {
      setExtError(err instanceof Error ? err.message : 'Failed to save location')
    } finally {
      setExtSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(!showForm); resetExtForm() }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Add External Location
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader title="New External Location" />
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-full">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
              <input type="text" placeholder="BMW Test Center" value={extName} onChange={e => setExtName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Person <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Klaus Weber" value={extContact} onChange={e => setExtContact(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">City <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Munich" value={extCity} onChange={e => setExtCity(e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-full">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Address <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Petuelring 130" value={extAddress} onChange={e => setExtAddress(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
              <input type="text" placeholder="Germany" value={extCountry} onChange={e => setExtCountry(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input type="tel" placeholder="+49 89 382 0" value={extPhone} onChange={e => setExtPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" placeholder="contact@example.com" value={extEmail} onChange={e => setExtEmail(e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-full">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
              <textarea rows={2} value={extNotes} onChange={e => setExtNotes(e.target.value)} className={clsx(inputClass, 'resize-none')} />
            </div>
            {extError && <p className="col-span-full text-sm text-red-600">{extError}</p>}
            <div className="col-span-full flex justify-end gap-3">
              <button onClick={() => { setShowForm(false); resetExtForm() }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleSaveExtLocation}
                disabled={extSaving || !extName || !extContact || !extCity || !extAddress}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg"
              >
                {extSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {extSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {extLocations.map(ext => (
          <Card key={ext.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{ext.name}</p>
                <p className="text-sm text-slate-500">{ext.address}, {ext.city}{ext.country ? `, ${ext.country}` : ''}</p>
                <p className="text-sm text-slate-500 mt-0.5">Contact: {ext.contactPerson}</p>
                {ext.notes && <p className="text-xs text-slate-400 italic mt-1">{ext.notes}</p>}
              </div>
              <button onClick={() => openEditExt(ext)} className="flex items-center gap-1 text-xs text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <Pencil size={11} /> Edit
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit External Location Modal */}
      {editingExt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeEditExt}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-800">Edit External Location</p>
              <button onClick={closeEditExt} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="col-span-full">
                <label className="block text-xs font-medium text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input autoFocus type="text" value={editExtName} onChange={e => setEditExtName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Contact Person <span className="text-red-500">*</span></label>
                <input type="text" value={editExtContact} onChange={e => setEditExtContact(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">City <span className="text-red-500">*</span></label>
                <input type="text" value={editExtCity} onChange={e => setEditExtCity(e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-full">
                <label className="block text-xs font-medium text-slate-700 mb-1">Address <span className="text-red-500">*</span></label>
                <input type="text" value={editExtAddress} onChange={e => setEditExtAddress(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
                <input type="text" value={editExtCountry} onChange={e => setEditExtCountry(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                <input type="tel" value={editExtPhone} onChange={e => setEditExtPhone(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={editExtEmail} onChange={e => setEditExtEmail(e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-full">
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea rows={2} value={editExtNotes} onChange={e => setEditExtNotes(e.target.value)} className={clsx(inputClass, 'resize-none')} />
              </div>
              {editExtError && <p className="col-span-full text-xs text-red-600">{editExtError}</p>}
              <div className="col-span-full flex gap-2 pt-1">
                <button
                  onClick={handleUpdateExtLocation}
                  disabled={editExtSaving || !editExtName || !editExtContact || !editExtCity || !editExtAddress}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {editExtSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editExtSaving ? 'Saving…' : 'Save Changes'}
                </button>
                <button onClick={closeEditExt} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── System Settings ──────────────────────────────────────────────────────────

export function SystemSettingsPage() {
  const [ldapServer, setLdapServer] = useState('ldap://ad.visteon.com:389')
  const [ldapBaseDn, setLdapBaseDn] = useState('DC=visteon,DC=com')
  const [ldapBindUser, setLdapBindUser] = useState('CN=svc-labstorage,OU=ServiceAccounts,DC=visteon,DC=com')
  const [ldapBindPwd, setLdapBindPwd] = useState('')

  const [printerModel, setPrinterModel] = useState('Zebra ZD421')
  const [printerIp, setPrinterIp] = useState('192.168.10.55')
  const [labelSize, setLabelSize] = useState('57mm × 32mm')

  const [expiryWarn, setExpiryWarn] = useState('30')
  const [expiryCritical, setExpiryCritical] = useState('7')

  const [savedSection, setSavedSection] = useState<string | null>(null)

  function showSaved(section: string) {
    setSavedSection(section)
    setTimeout(() => setSavedSection(null), 2500)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {savedSection && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-800 flex items-center gap-2">
          <CheckCircle2 size={15} className="text-green-600" />
          {savedSection} settings saved.
        </div>
      )}

      {/* LDAP */}
      <Card>
        <CardHeader title="LDAP Configuration" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">LDAP Server</label>
            <input type="text" value={ldapServer} onChange={e => setLdapServer(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Base DN</label>
            <input type="text" value={ldapBaseDn} onChange={e => setLdapBaseDn(e.target.value)} className={clsx(inputClass, 'font-mono')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bind User</label>
            <input type="text" value={ldapBindUser} onChange={e => setLdapBindUser(e.target.value)} className={clsx(inputClass, 'font-mono text-xs')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bind Password</label>
            <input type="password" value={ldapBindPwd} onChange={e => setLdapBindPwd(e.target.value)} placeholder="Enter new password to update" className={inputClass} />
          </div>
          <div className="col-span-full flex justify-end">
            <button onClick={() => showSaved('LDAP')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              <Save size={14} /> Save LDAP Config
            </button>
          </div>
        </div>
      </Card>

      {/* Label Printer */}
      <Card>
        <CardHeader title="Label Printer" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Printer Model</label>
            <select value={printerModel} onChange={e => setPrinterModel(e.target.value)} className={inputClass}>
              <option>Zebra ZD421</option>
              <option>Zebra ZT411</option>
              <option>Brother QL-1110NWB</option>
              <option>Citizen CL-E300</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Printer IP / Hostname</label>
            <input type="text" value={printerIp} onChange={e => setPrinterIp(e.target.value)} className={clsx(inputClass, 'font-mono')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Label Size</label>
            <select value={labelSize} onChange={e => setLabelSize(e.target.value)} className={inputClass}>
              <option>57mm × 32mm</option>
              <option>62mm × 29mm</option>
              <option>102mm × 25mm</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm px-4 py-2.5 rounded-lg transition-colors w-full">
              Test Print
            </button>
          </div>
          <div className="col-span-full flex justify-end">
            <button onClick={() => showSaved('Printer')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              <Save size={14} /> Save Printer Config
            </button>
          </div>
        </div>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader title="Alert Thresholds" />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry warning (days)</label>
              <input type="number" value={expiryWarn} onChange={e => setExpiryWarn(e.target.value)} min={1} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Critical expiry (days)</label>
              <input type="number" value={expiryCritical} onChange={e => setExpiryCritical(e.target.value)} min={1} className={inputClass} />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => showSaved('Alert thresholds')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              <Save size={14} /> Save
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

