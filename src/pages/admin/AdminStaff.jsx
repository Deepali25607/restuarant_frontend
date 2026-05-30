import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  Lock,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import clsx from 'clsx'
import {
  fetchStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  fetchPermissionCatalog,
  updateStaffPermissions,
} from '../../lib/api'
import { useAuthStore } from '../../store/useAuthStore'
import UsageGauge, { refreshUsage } from '../../components/admin/UsageGauge'

const ROLES = [
  { value: 'admin', label: 'Admin', tone: 'bg-chilli-100 text-chilli-800' },
  { value: 'manager', label: 'Manager', tone: 'bg-saffron-100 text-saffron-800' },
  { value: 'waiter', label: 'Waiter', tone: 'bg-amber-100 text-amber-800' },
  { value: 'kitchen', label: 'Kitchen', tone: 'bg-orange-100 text-orange-800' },
  { value: 'cashier', label: 'Cashier', tone: 'bg-emerald-100 text-emerald-800' },
]

const roleTone = (role) =>
  ROLES.find((r) => r.value === role)?.tone || 'bg-saffron-100 text-saffron-800'

const blank = { name: '', email: '', role: 'waiter', password: '' }

export default function AdminStaff() {
  const me = useAuthStore((s) => s.user)
  const canManageStaff = useAuthStore((s) => s.hasPerm('staff.manage'))
  const canGrantPerms = useAuthStore((s) => s.hasPerm('staff.permissions'))

  const [staff, setStaff] = useState([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [permTarget, setPermTarget] = useState(null)
  const [catalog, setCatalog] = useState(null)

  useEffect(() => {
    fetchStaff()
      .then(setStaff)
      .catch((e) => setError(e?.response?.data?.message || e.message))
  }, [])

  useEffect(() => {
    if (!canGrantPerms || catalog) return
    fetchPermissionCatalog()
      .then(setCatalog)
      .catch((e) => setError(e?.response?.data?.message || e.message))
  }, [canGrantPerms, catalog])

  const save = async () => {
    setError('')
    try {
      if (editing.id) {
        const patch = { name: editing.name, role: editing.role }
        if (editing.password) patch.password = editing.password
        const updated = await updateStaff(editing.id, patch)
        setStaff((s) => s.map((u) => (u.id === updated.id ? updated : u)))
      } else {
        if (!editing.password) {
          setError('Set a starter password for the new member.')
          return
        }
        const created = await createStaff(editing)
        setStaff((s) => [...s, created])
        refreshUsage()
      }
      setEditing(null)
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    }
  }

  const remove = async (u) => {
    if (u.id === me?.id) return
    if (!confirm(`Remove ${u.name}? They will lose access immediately.`)) return
    try {
      await deleteStaff(u.id)
      setStaff((s) => s.filter((x) => x.id !== u.id))
      refreshUsage()
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    }
  }

  const onPermsSaved = (updated) => {
    setStaff((s) => s.map((u) => (u.id === updated.id ? updated : u)))
    setPermTarget(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="eyebrow"><Users className="h-3.5 w-3.5" /> Roster</span>
          <h1 className="section-heading mt-1">Staff &amp; access</h1>
          <p className="text-masala-700 mt-1 text-sm">
            Onboard team members and fine-tune what each person can see and do.
          </p>
          <div className="mt-2"><UsageGauge resource="users" /></div>
        </div>
        {canManageStaff && (
          <button onClick={() => setEditing({ ...blank })} className="btn-primary">
            <Plus className="h-4 w-4" /> Add staff
          </button>
        )}
      </div>

      {error && (
        <div className="card p-3 text-chilli-700 text-sm">
          <AlertTriangle className="inline mr-1.5 h-4 w-4" />
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-saffron-50/60 dark:bg-masala-700/40">
              <tr className="text-left text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-saffron-100 dark:divide-masala-700">
              {staff.map((u) => (
                <tr key={u.id} className="hover:bg-saffron-50/40 dark:hover:bg-masala-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-curry-gradient text-white font-bold flex items-center justify-center">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold" style={{ color: 'var(--text)' }}>{u.name}</div>
                        {u.id === me?.id && (
                          <div className="text-[10px] text-saffron-700 dark:text-saffron-300 uppercase tracking-widest">
                            You
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-full',
                        roleTone(u.role),
                      )}
                    >
                      <ShieldCheck className="h-3 w-3" /> {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.hasCustomPermissions ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                        <Sparkles className="h-3 w-3" /> Custom · {u.permissions?.length || 0}
                      </span>
                    ) : (
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        Role defaults ({u.permissions?.length || 0})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1 flex-wrap justify-end">
                      {canGrantPerms && (
                        <button
                          onClick={() => setPermTarget(u)}
                          disabled={u.id === me?.id}
                          title={u.id === me?.id ? 'Cannot change your own permissions' : 'Edit permissions'}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border border-saffron-200 dark:border-masala-600 text-saffron-700 dark:text-saffron-300 hover:bg-saffron-50 dark:hover:bg-masala-700 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          <Lock className="h-3.5 w-3.5" /> Permissions
                        </button>
                      )}
                      {canManageStaff && (
                        <>
                          <button
                            onClick={() => setEditing({ ...u, password: '' })}
                            className="btn-ghost !py-1.5 !px-3"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => remove(u)}
                            disabled={u.id === me?.id}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border border-chilli-200 text-chilli-700 hover:bg-chilli-50 disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditing(null)}
            className="fixed inset-0 z-50 bg-masala-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-6 w-full max-w-lg"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl" style={{ color: 'var(--text)' }}>
                  {editing.id ? 'Edit staff' : 'New staff member'}
                </h2>
                <button onClick={() => setEditing(null)} className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <Field
                  label="Full name"
                  value={editing.name}
                  onChange={(v) => setEditing({ ...editing, name: v })}
                />
                <Field
                  label="Work email"
                  type="email"
                  value={editing.email}
                  onChange={(v) => setEditing({ ...editing, email: v })}
                  disabled={Boolean(editing.id)}
                />
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-masala-700 dark:text-saffron-300">
                    Role
                  </span>
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setEditing({ ...editing, role: r.value })}
                        className={clsx(
                          'rounded-full px-2 py-2 text-xs font-semibold transition border',
                          editing.role === r.value
                            ? 'bg-curry-gradient text-white border-transparent shadow-warm'
                            : 'bg-white dark:bg-masala-800 text-masala-700 dark:text-saffron-200 border-saffron-200 dark:border-masala-600 hover:bg-saffron-50',
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                    The role sets the baseline access. Fine-tune individual permissions from the
                    "Permissions" button on the roster row.
                  </p>
                </div>
                <Field
                  label={editing.id ? 'Reset password (leave blank to keep)' : 'Starter password'}
                  type="password"
                  value={editing.password}
                  onChange={(v) => setEditing({ ...editing, password: v })}
                  icon={<KeyRound className="h-4 w-4" />}
                />
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                <button onClick={() => setEditing(null)} className="btn-ghost">
                  Cancel
                </button>
                <button onClick={save} className="btn-primary">
                  <Save className="h-4 w-4" /> {editing.id ? 'Save changes' : 'Add member'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {permTarget && catalog && (
          <PermissionsDialog
            user={permTarget}
            catalog={catalog}
            onClose={() => setPermTarget(null)}
            onSaved={onPermsSaved}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PermissionsDialog({ user, catalog, onClose, onSaved }) {
  const defaults = useMemo(
    () => catalog.roleDefaults?.[user.role] || [],
    [catalog, user.role],
  )

  const startingSet = useMemo(() => new Set(user.permissions || []), [user])
  const [selected, setSelected] = useState(startingSet)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const groups = useMemo(() => {
    const map = new Map()
    for (const p of catalog.permissions) {
      if (!map.has(p.group)) map.set(p.group, [])
      map.get(p.group).push(p)
    }
    return Array.from(map.entries())
  }, [catalog])

  const toggle = (key) => {
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleGroup = (perms) => {
    const allOn = perms.every((p) => selected.has(p.key))
    setSelected((cur) => {
      const next = new Set(cur)
      perms.forEach((p) => (allOn ? next.delete(p.key) : next.add(p.key)))
      return next
    })
  }

  const matchesRoleDefaults = useMemo(() => {
    if (selected.size !== defaults.length) return false
    return defaults.every((p) => selected.has(p))
  }, [selected, defaults])

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      // If selection matches role defaults, send reset:true so the column goes back to null.
      const payload = matchesRoleDefaults
        ? { reset: true }
        : { permissions: Array.from(selected) }
      const updated = await updateStaffPermissions(user.id, payload)
      onSaved(updated)
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setSelected(new Set(defaults))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-masala-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card p-6 w-full max-w-2xl max-h-[88vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-saffron-600 dark:text-saffron-300">
              Permissions
            </div>
            <h2 className="font-display text-2xl" style={{ color: 'var(--text)' }}>
              {user.name}
            </h2>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {user.email} · role <span className="font-semibold">{user.role}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {selected.size} of {catalog.permissions.length} granted
            {matchesRoleDefaults && ' · matches role defaults'}
          </div>
          <button
            type="button"
            onClick={resetToDefaults}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-saffron-700 dark:text-saffron-300 hover:underline"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to {user.role} defaults
          </button>
        </div>

        {error && (
          <div className="mt-3 text-sm text-chilli-700 bg-chilli-50 dark:bg-chilli-900/20 border border-chilli-200 dark:border-chilli-800 rounded-2xl px-3 py-2">
            <AlertTriangle className="inline mr-1.5 h-4 w-4" />
            {error}
          </div>
        )}

        <div className="mt-4 overflow-y-auto pr-1 space-y-4">
          {groups.map(([group, perms]) => {
            const allOn = perms.every((p) => selected.has(p.key))
            const someOn = perms.some((p) => selected.has(p.key))
            return (
              <div key={group} className="rounded-2xl border border-saffron-200 dark:border-masala-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-saffron-50/70 dark:bg-masala-700/40">
                  <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text)' }}>
                    {group}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleGroup(perms)}
                    className={clsx(
                      'text-[11px] font-semibold rounded-full px-2.5 py-1 border',
                      allOn
                        ? 'bg-saffron-200 text-masala-900 border-transparent'
                        : someOn
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-white dark:bg-masala-800 text-masala-700 dark:text-saffron-200 border-saffron-200 dark:border-masala-600',
                    )}
                  >
                    {allOn ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="divide-y divide-saffron-100 dark:divide-masala-700">
                  {perms.map((p) => {
                    const checked = selected.has(p.key)
                    const isDefault = defaults.includes(p.key)
                    return (
                      <label
                        key={p.key}
                        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-saffron-50/40 dark:hover:bg-masala-700/30"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(p.key)}
                          className="mt-1 h-4 w-4 rounded accent-saffron-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                            {p.label}
                          </div>
                          <div className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                            {p.key}
                            {isDefault && (
                              <span className="ml-2 inline-flex items-center text-saffron-700 dark:text-saffron-300">
                                · default for {user.role}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>
            Cancel
          </button>
          <button onClick={save} className="btn-primary" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save permissions'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, value, onChange, type = 'text', disabled, icon }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-masala-700 dark:text-saffron-300">
        {label}
      </span>
      <div className={clsx(
        'mt-1.5 flex items-center gap-2 rounded-2xl border px-3 py-2.5',
        disabled && 'opacity-60'
      )} style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
        {icon && <span className="text-masala-500 dark:text-saffron-300">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text)' }}
        />
      </div>
    </label>
  )
}
