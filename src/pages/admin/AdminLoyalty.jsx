import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Search,
  IndianRupee,
  Users as UsersIcon,
  Star,
  Phone,
  AlertTriangle,
  X,
} from 'lucide-react'
import { fetchLoyaltyMembers, fetchLoyaltyHistory } from '../../lib/api'

export default function AdminLoyalty() {
  const [data, setData] = useState({ items: [], total: 0, summary: null })
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [history, setHistory] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    let alive = true
    fetchLoyaltyMembers({ q: debouncedQ || undefined, take: 200 })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e?.response?.data?.message || e.message))
    return () => {
      alive = false
    }
  }, [debouncedQ])

  const openHistory = async (m) => {
    try {
      const res = await fetchLoyaltyHistory(m.phone)
      setHistory(res)
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">
          <Sparkles className="h-3.5 w-3.5" /> Loyalty
        </span>
        <h1 className="section-heading mt-1">Masala Rewards members</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Repeat customers, points balance, and lifetime spend.
        </p>
      </div>

      {data.summary && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Members" value={data.summary.members} icon={UsersIcon} accent="from-saffron-500 to-chilli-600" />
          <Stat label="Points outstanding" value={data.summary.points.toLocaleString()} icon={Star} accent="from-amber-500 to-orange-600" />
          <Stat label="Lifetime visits" value={data.summary.visits.toLocaleString()} icon={Sparkles} accent="from-emerald-500 to-emerald-700" />
          <Stat label="Lifetime spend" value={`₹${data.summary.spent.toLocaleString()}`} icon={IndianRupee} accent="from-masala-600 to-masala-800" />
        </div>
      )}

      <div className="card !shadow-none !bg-white dark:!bg-masala-800/60 p-2 flex items-center gap-2">
        <Search className="h-4 w-4 ml-2 opacity-60" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by phone or name…"
          className="flex-1 bg-transparent outline-none text-sm py-1.5"
          style={{ color: 'var(--text)' }}
        />
      </div>

      {error && (
        <div className="card p-3 text-chilli-700 dark:text-chilli-300 text-sm">
          <AlertTriangle className="inline mr-1.5 h-4 w-4" />
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-saffron-50/60 dark:bg-masala-700/40">
              <tr className="text-left text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Points</th>
                <th className="px-4 py-3">Visits</th>
                <th className="px-4 py-3">Lifetime spend</th>
                <th className="px-4 py-3">Last visit</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-saffron-100 dark:divide-masala-700">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No members yet. They&apos;ll appear here after their first paid order.
                  </td>
                </tr>
              ) : (
                data.items.map((m) => (
                  <tr key={m.phone} className="hover:bg-saffron-50/40 dark:hover:bg-masala-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-curry-gradient text-white text-sm font-bold flex items-center justify-center">
                          {(m.name?.[0] || m.phone[0]).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">{m.name || 'Guest'}</div>
                          <div className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <Phone className="h-3 w-3" /> {m.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-saffron-700 dark:text-saffron-300 font-semibold">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {m.points}
                      </span>
                    </td>
                    <td className="px-4 py-3">{m.visits}</td>
                    <td className="px-4 py-3 font-display">₹{m.totalSpent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(m.lastVisitAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openHistory(m)} className="btn-ghost !py-1.5 !px-3 text-xs">
                        History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {history && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setHistory(null)}
            className="fixed inset-0 z-50 bg-masala-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-saffron-600">
                    Member history
                  </div>
                  <h2 className="font-display text-2xl">{history.member.name || history.member.phone}</h2>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {history.member.phone} · joined {new Date(history.member.joinedAt).toLocaleDateString()}
                  </div>
                </div>
                <button onClick={() => setHistory(null)} className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Tile label="Points" value={history.member.points} />
                <Tile label="Visits" value={history.member.visits} />
                <Tile label="Spent" value={`₹${history.member.totalSpent.toLocaleString()}`} />
              </div>

              <h3 className="font-display text-lg mt-5">Recent orders</h3>
              {history.orders.length === 0 ? (
                <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                  No orders yet.
                </div>
              ) : (
                <ul className="mt-2 divide-y divide-saffron-100 dark:divide-masala-700 text-sm">
                  {history.orders.map((o) => (
                    <li key={o.id} className="py-3 flex justify-between gap-3">
                      <div>
                        <div className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                          #{o.id.slice(-6).toUpperCase()} · T{o.tableNo}
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(o.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display">₹{o.total}</div>
                        <div className="text-[11px] text-saffron-700 dark:text-saffron-300">
                          +{o.pointsEarned} pts
                          {o.pointsRedeemed > 0 ? ` · −${o.pointsRedeemed}` : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({ label, value, icon: Icon, accent }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className={`absolute -top-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {label}
          </div>
          <Icon className="h-4 w-4 text-saffron-700 dark:text-saffron-300" />
        </div>
        <div className="font-display text-2xl mt-2">{value}</div>
      </div>
    </div>
  )
}

function Tile({ label, value }) {
  return (
    <div className="rounded-2xl border p-3" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
      <div className="font-display text-xl">{value}</div>
      <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}
