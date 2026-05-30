import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ScrollText,
  Search,
  Download,
  Filter,
  AlertTriangle,
  UtensilsCrossed,
  Table2,
  Users,
  Receipt,
  ShoppingBag,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'
import { fetchAuditLog } from '../../lib/api'

const ENTITIES = [
  { key: '', label: 'All', icon: Filter },
  { key: 'dish', label: 'Menu', icon: UtensilsCrossed },
  { key: 'table', label: 'Tables', icon: Table2 },
  { key: 'staff', label: 'Staff', icon: Users },
  { key: 'order', label: 'Orders', icon: ShoppingBag },
  { key: 'expense', label: 'Expenses', icon: Receipt },
  { key: 'auth', label: 'Sign-in', icon: ShieldCheck },
]

const ACTION_TONE = {
  create: 'bg-emerald-100 text-emerald-800',
  update: 'bg-amber-100 text-amber-800',
  delete: 'bg-chilli-100 text-chilli-800',
  pay: 'bg-saffron-100 text-saffron-800',
  status_change: 'bg-orange-100 text-orange-800',
  login: 'bg-masala-100 text-masala-800',
}

const ROLE_TONE = {
  admin: 'bg-chilli-100 text-chilli-800',
  manager: 'bg-saffron-100 text-saffron-800',
  kitchen: 'bg-orange-100 text-orange-800',
  cashier: 'bg-emerald-100 text-emerald-800',
  waiter: 'bg-amber-100 text-amber-800',
}

const PAGE_SIZE = 25

export default function AdminAudit() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [error, setError] = useState('')
  const [entity, setEntity] = useState('')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    setPage(0)
  }, [entity, debouncedQ])

  useEffect(() => {
    let alive = true
    fetchAuditLog({
      entity: entity || undefined,
      q: debouncedQ || undefined,
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
    })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e?.response?.data?.message || e.message))
    return () => {
      alive = false
    }
  }, [entity, debouncedQ, page])

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))

  const exportCsv = async () => {
    try {
      const full = await fetchAuditLog({
        entity: entity || undefined,
        q: debouncedQ || undefined,
        take: 500,
      })
      const rows = [
        ['When', 'Who', 'Role', 'Action', 'Entity', 'Entity ID', 'Summary'],
        ...full.items.map((a) => [
          a.createdAt,
          a.actorName,
          a.actorRole,
          a.action,
          a.entity,
          a.entityId || '',
          a.summary,
        ]),
      ]
      const csv = rows
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `masala-story-audit-${new Date().toISOString().slice(0, 10)}.csv`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="eyebrow">
            <ScrollText className="h-3.5 w-3.5" /> Audit
          </span>
          <h1 className="section-heading mt-1">Activity history</h1>
          <p className="text-masala-700 mt-1 text-sm">
            Every change in the console is recorded here. Read-only.
          </p>
        </div>
        <button onClick={exportCsv} className="btn-secondary !py-2 !px-3 text-xs">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="card !shadow-none !bg-white p-2 flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-masala-500 ml-2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by person, summary, or ID…"
            className="flex-1 bg-transparent outline-none text-sm py-1"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {ENTITIES.map((e) => (
            <button
              key={e.label}
              onClick={() => setEntity(e.key)}
              className={clsx(
                'whitespace-nowrap inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition border',
                entity === e.key
                  ? 'bg-curry-gradient text-white border-transparent shadow-warm'
                  : 'bg-white text-masala-800 border-saffron-200 hover:bg-saffron-50',
              )}
            >
              <e.icon className="h-3.5 w-3.5" />
              {e.label}
            </button>
          ))}
        </div>
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
            <thead className="bg-saffron-50/60">
              <tr className="text-left text-xs uppercase tracking-widest text-masala-700">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">What</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-saffron-100">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-masala-600">
                    No audit entries match.
                  </td>
                </tr>
              ) : (
                data.items.map((a) => (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-saffron-50/40"
                  >
                    <td className="px-4 py-3 text-xs text-masala-600 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-curry-gradient text-white text-xs font-bold flex items-center justify-center">
                          {a.actorName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="leading-tight">
                          <div className="font-semibold text-masala-900">{a.actorName}</div>
                          <span
                            className={clsx(
                              'inline-block text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full mt-0.5',
                              ROLE_TONE[a.actorRole] || 'bg-masala-100 text-masala-800',
                            )}
                          >
                            {a.actorRole}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-block text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-full',
                          ACTION_TONE[a.action] || 'bg-saffron-100 text-saffron-800',
                        )}
                      >
                        {a.action.replace('_', ' ')}
                      </span>
                      <div className="text-[10px] text-masala-600 mt-1">{a.entity}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-masala-900">{a.summary}</div>
                      {a.entityId && (
                        <div className="text-[10px] font-mono text-masala-500 mt-0.5">
                          {a.entityId}
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data.total > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-saffron-100 flex items-center justify-between text-xs text-masala-700">
            <div>
              Showing <span className="font-semibold">{page * PAGE_SIZE + 1}</span>–
              <span className="font-semibold">
                {Math.min(data.total, (page + 1) * PAGE_SIZE)}
              </span>{' '}
              of <span className="font-semibold">{data.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center justify-center rounded-full border border-saffron-200 h-8 w-8 disabled:opacity-40 hover:bg-saffron-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-masala-900">
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center justify-center rounded-full border border-saffron-200 h-8 w-8 disabled:opacity-40 hover:bg-saffron-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
