/**
 * Admin pages:
 * UserManagementPage, LocationConfigPage, ExternalLocationAdminPage, SystemSettingsPage
 */

import { useState, useEffect } from 'react'
import { Plus, Shield, User, Eye, CheckCircle2, XCircle, Pencil, Save, X, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { MOCK_USERS, MOCK_SITES, MOCK_EXTERNAL_LOCATIONS } from '../../mock/data'
import { UserRole, type Site, type User as AppUser } from '../../types'
import { getSitesTree, createSite, createBuilding, createArea, createLocation, getUsers, updateUser, deactivateUser } from '../../api'
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
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Site</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(user => (
                <tr key={user.id} className={clsx('hover:bg-slate-50 transition-colors', !user.isActive && 'opacity-60')}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                        {user.displayName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{user.displayName}</p>
                        <p className="text-xs text-slate-400 font-mono">{user.ldapUsername}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === user.id ? (
                      <select
                        value={editingRole}
                        onChange={e => setEditingRole(e.target.value as UserRole)}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={UserRole.VIEWER}>Viewer</option>
                        <option value={UserRole.USER}>User</option>
                        <option value={UserRole.ADMIN}>Admin</option>
                      </select>
                    ) : (
                      <RoleBadge role={user.role} />
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-sm">
                    {MOCK_SITES.find(s => s.id === user.siteId)?.name ?? <span className="text-slate-400">Global</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {user.isActive
                      ? <span className="flex items-center gap-1.5 text-xs text-green-600"><CheckCircle2 size={13} />Active</span>
                      : <span className="flex items-center gap-1.5 text-xs text-slate-400"><XCircle size={13} />Inactive</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      {editingId === user.id ? (
                        <>
                          <button
                            onClick={() => handleSaveRole(user.id)}
                            disabled={saving}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs transition-colors"
                          >
                            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition-colors"
                          >
                            <X size={11} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingId(user.id); setEditingRole(user.role) }}
                            className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition-colors"
                          >
                            <Pencil size={11} /> Edit
                          </button>
                          {user.isActive && (
                            <button
                              onClick={() => handleDeactivate(user.id)}
                              className="px-2.5 py-1 border border-slate-200 text-slate-500 rounded-lg text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
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

  // Load sites from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await getSitesTree()
        setSites(res.data as Site[])
        if (res.data.length > 0) {
          setExpandedSiteId(res.data[0].id)
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

  function saveEdit() {
    if (!editTarget || !editValue.trim()) return cancelEdit()
    setEditTarget(null)
    // Note: Edit functionality disabled until backend PUT endpoints are implemented
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

  async function doAddLocation(areaId: string, areaCode: string) {
    if (!addRow.trim() || !addShelf.trim() || !addLevel.trim()) return
    const row = addRow.trim().padStart(2, '0')
    const shelf = addShelf.trim().padStart(2, '0')
    const level = addLevel.trim()
    try {
      setSavingAction('location')
      console.log(`📍 Creating location in area ${areaId}: ${areaCode}-${row}-${shelf}-${level}`)
      const res = await createLocation(areaId, row, shelf, level)
      console.log('✅ Location created successfully:', res)
      console.log('🔄 Updating local state...')
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
      console.log('✅ Local state updated')
      cancelAdd()
    } catch (err) {
      console.error('❌ Location creation failed:', {
        error: err instanceof Error ? err.message : String(err),
        fullError: err
      })
      setError(err instanceof Error ? err.message : 'Failed to create location')
    } finally {
      setSavingAction(null)
    }
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
              ) : (
                <>
                  <button
                    onClick={() => openEdit({ kind: 'site', id: site.id }, site.name)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Pencil size={13} />
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
                          <button
                            onClick={() => openEdit({ kind: 'building', id: bldg.id }, bldg.name)}
                            className="p-1 text-slate-300 hover:text-blue-600 rounded transition-colors"
                          >
                            <Pencil size={11} />
                          </button>
                        </div>
                      )}
                      {!isEditing('building', bldg.id) && (
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
                              <span className="font-mono text-xs text-slate-700 bg-white border border-slate-200 rounded px-2 py-0.5">
                                {loc.label}
                              </span>
                              <span className="text-xs text-slate-400">
                                row {loc.row} · shelf {loc.shelf} · level {loc.level}
                              </span>
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
                                  onKeyDown={e => { if (e.key === 'Enter') doAddLocation(expandedArea.id, expandedArea.code); if (e.key === 'Escape') cancelAdd() }}
                                  className="w-16 border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Shelf</label>
                                <input
                                  type="number" min={1} placeholder="1"
                                  value={addShelf}
                                  onChange={e => setAddShelf(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') doAddLocation(expandedArea.id, expandedArea.code); if (e.key === 'Escape') cancelAdd() }}
                                  className="w-16 border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Level</label>
                                <input
                                  type="number" min={1} placeholder="1"
                                  value={addLevel}
                                  onChange={e => setAddLevel(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') doAddLocation(expandedArea.id, expandedArea.code); if (e.key === 'Escape') cancelAdd() }}
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
                                  onClick={() => doAddLocation(expandedArea.id, expandedArea.code)}
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

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
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
              <input type="text" placeholder="BMW Test Center" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Person <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Klaus Weber" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">City <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Munich" className={inputClass} />
            </div>
            <div className="col-span-full">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Address <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Petuelring 130" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
              <input type="text" placeholder="Germany" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input type="tel" placeholder="+49 89 382 0" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" placeholder="contact@example.com" className={inputClass} />
            </div>
            <div className="col-span-full">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
              <textarea rows={2} className={clsx(inputClass, 'resize-none')} />
            </div>
            <div className="col-span-full flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg">
                <Save size={14} /> Save
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {MOCK_EXTERNAL_LOCATIONS.map(ext => (
          <Card key={ext.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{ext.name}</p>
                <p className="text-sm text-slate-500">{ext.address}, {ext.city}, {ext.country}</p>
                <p className="text-sm text-slate-500 mt-0.5">Contact: {ext.contactPerson}</p>
                {ext.notes && <p className="text-xs text-slate-400 italic mt-1">{ext.notes}</p>}
              </div>
              <button className="flex items-center gap-1 text-xs text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <Pencil size={11} /> Edit
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── System Settings ──────────────────────────────────────────────────────────

export function SystemSettingsPage() {
  return (
    <div className="space-y-5 max-w-2xl">
      {/* LDAP */}
      <Card>
        <CardHeader title="LDAP Configuration" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">LDAP Server</label>
            <input type="text" defaultValue="ldap://ad.visteon.com:389" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Base DN</label>
            <input type="text" defaultValue="DC=visteon,DC=com" className={clsx(inputClass, 'font-mono')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bind User</label>
            <input type="text" defaultValue="CN=svc-labstorage,OU=ServiceAccounts,DC=visteon,DC=com" className={clsx(inputClass, 'font-mono text-xs')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bind Password</label>
            <input type="password" defaultValue="••••••••••••" className={inputClass} />
          </div>
          <div className="col-span-full flex justify-end">
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
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
            <select className={inputClass}>
              <option>Zebra ZD421</option>
              <option>Zebra ZT411</option>
              <option>Brother QL-1110NWB</option>
              <option>Citizen CL-E300</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Printer IP / Hostname</label>
            <input type="text" defaultValue="192.168.10.55" className={clsx(inputClass, 'font-mono')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Label Size</label>
            <select className={inputClass}>
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
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
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
              <input type="number" defaultValue={30} min={1} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Critical expiry (days)</label>
              <input type="number" defaultValue={7} min={1} className={inputClass} />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              <Save size={14} /> Save
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

