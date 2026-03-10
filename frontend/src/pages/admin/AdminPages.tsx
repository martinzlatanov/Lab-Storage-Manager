/**
 * Admin pages:
 * UserManagementPage, LocationConfigPage, ExternalLocationAdminPage, SystemSettingsPage
 */

import { useState } from 'react'
import { Plus, Shield, User, Eye, CheckCircle2, XCircle, Pencil, Save, X } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { MOCK_USERS, MOCK_SITES, MOCK_EXTERNAL_LOCATIONS } from '../../mock/data'
import { UserRole } from '../../types'
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

export function UserManagementPage() {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={15} />
          Invite User
        </button>
      </div>

      <Card>
        <CardHeader title="Users" subtitle={`${MOCK_USERS.length} total · ${MOCK_USERS.filter(u => u.isActive).length} active`} />
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
              {MOCK_USERS.map(user => (
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
                      <select className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value={UserRole.VIEWER}>Viewer</option>
                        <option value={UserRole.USER} selected={user.role === UserRole.USER}>User</option>
                        <option value={UserRole.ADMIN} selected={user.role === UserRole.ADMIN}>Admin</option>
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
                          <button onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors">
                            <Save size={11} /> Save
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition-colors">
                            <X size={11} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditingId(user.id)}
                            className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition-colors">
                            <Pencil size={11} /> Edit
                          </button>
                          {user.isActive && (
                            <button className="px-2.5 py-1 border border-slate-200 text-slate-500 rounded-lg text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
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

export function LocationConfigPage() {
  const [expandedSite, setExpandedSite] = useState<string | null>(MOCK_SITES[0]?.id ?? null)

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={15} />
          Add Site
        </button>
      </div>

      {MOCK_SITES.map(site => (
        <Card key={site.id}>
          <button
            className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors rounded-xl"
            onClick={() => setExpandedSite(expandedSite === site.id ? null : site.id)}
          >
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{site.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{site.buildings.length} buildings</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <Pencil size={13} />
              </button>
              <button
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2.5 py-1 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <Plus size={11} /> Building
              </button>
            </div>
          </button>

          {expandedSite === site.id && (
            <div className="border-t border-slate-100 px-5 pb-4">
              {site.buildings.map(bldg => (
                <div key={bldg.id} className="mt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">{bldg.name}</p>
                    <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                      <Plus size={11} /> Area
                    </button>
                  </div>
                  <div className="mt-2 ml-4 flex flex-wrap gap-2">
                    {bldg.storageAreas.map(area => (
                      <div key={area.id} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono font-medium">
                        Area {area.code}
                        <span className="text-slate-400">({area.locations.length} locs)</span>
                        <button className="text-slate-400 hover:text-blue-600 ml-1">
                          <Pencil size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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

