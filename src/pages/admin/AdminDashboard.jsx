import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { IndianRupee, ShoppingBag, Table2, Activity, TrendingUp, Flame, Package, AlertTriangle, Sparkles, Star, ThumbsUp, Wrench } from 'lucide-react'
import { adminOverview, fetchLowStock, aiReviewSummary } from '../../lib/api'
import { getSocket } from '../../lib/socket'
import { orderLabel } from '../../lib/location'

const STATUS_LABEL = {
  received: 'Received',
  queued: 'In queue',
  preparing: 'Preparing',
  cooking: 'Cooking',
  ready: 'Ready',
  served: 'Served',
}

const STATUS_COLOR = {
  received: 'bg-saffron-100 text-saffron-800',
  queued: 'bg-amber-100 text-amber-800',
  preparing: 'bg-orange-100 text-orange-800',
  cooking: 'bg-chilli-100 text-chilli-800',
  ready: 'bg-emerald-100 text-emerald-800',
  served: 'bg-masala-100 text-masala-800',
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [lowStock, setLowStock] = useState([])
  const [error, setError] = useState('')
  const [reviewAi, setReviewAi] = useState(null)

  // Fetched once, outside the 5s refresh loop — the backend caches the
  // Gemini summary for 10 minutes anyway.
  useEffect(() => {
    let alive = true
    aiReviewSummary()
      .then((d) => alive && setReviewAi(d))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const load = () => {
      adminOverview()
        .then((d) => alive && setData(d))
        .catch((e) => alive && setError(e?.response?.data?.message || e.message))
      fetchLowStock()
        .then((d) => alive && setLowStock(d))
        .catch(() => {})
    }
    load()
    const id = setInterval(load, 5000)

    const socket = getSocket()
    socket.emit('join:admin')
    const refreshStock = () => fetchLowStock().then((d) => alive && setLowStock(d)).catch(() => {})
    socket.on('dish:lowStock', refreshStock)
    socket.on('dish:outOfStock', refreshStock)
    socket.on('dish:restocked', refreshStock)
    return () => {
      alive = false
      clearInterval(id)
      socket.off('dish:lowStock', refreshStock)
      socket.off('dish:outOfStock', refreshStock)
      socket.off('dish:restocked', refreshStock)
    }
  }, [])

  if (error) {
    return <div className="card p-6 text-chilli-700">{error}</div>
  }

  if (!data) {
    return <div className="text-masala-700">Loading dashboard…</div>
  }

  const cards = [
    { label: "Today's revenue", value: `₹${data.totals.revenue}`, icon: IndianRupee, accent: 'from-emerald-500 to-emerald-700' },
    { label: 'Total orders', value: data.totals.orders, icon: ShoppingBag, accent: 'from-saffron-500 to-chilli-600' },
    { label: 'Active orders', value: data.totals.activeOrders, icon: Activity, accent: 'from-amber-500 to-orange-600' },
    { label: 'Tables', value: data.totals.tables, icon: Table2, accent: 'from-masala-600 to-masala-800' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <span className="eyebrow">Today</span>
        <h1 className="section-heading mt-1">Restaurant pulse</h1>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-5 relative overflow-hidden"
          >
            <div className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${c.accent} opacity-20 blur-2xl`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-masala-700">
                  {c.label}
                </div>
                <c.icon className="h-4 w-4 text-saffron-700" />
              </div>
              <div className="font-display text-3xl text-masala-900 mt-2">
                {c.value}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-masala-900">Recent orders</h2>
            <span className="text-xs text-masala-600">Auto-refreshing</span>
          </div>
          {data.recent.length === 0 ? (
            <div className="mt-6 text-sm text-masala-600">
              No orders placed yet. They&apos;ll appear here in real-time.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-masala-600">
                    <th className="py-2 pr-4">Order</th>
                    <th className="py-2 pr-4">Table</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2 pr-4">Placed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-saffron-100">
                  {data.recent.map((o) => (
                    <tr key={o.id}>
                      <td className="py-3 pr-4 font-mono text-xs text-masala-700">
                        {orderLabel(o)}
                      </td>
                      <td className="py-3 pr-4 font-semibold">T{o.tableNo}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[o.status] || 'bg-saffron-100 text-saffron-800'}`}>
                          {STATUS_LABEL[o.status] || o.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-semibold">₹{o.total}</td>
                      <td className="py-3 pr-4 text-masala-600 text-xs">
                        {new Date(o.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-saffron-700" />
            <h2 className="font-display text-xl text-masala-900">Top dishes</h2>
          </div>
          {data.popular.length === 0 ? (
            <div className="mt-6 text-sm text-masala-600">
              Once orders complete, your top sellers show up here.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.popular.map((d, i) => (
                <li key={d.name} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-curry-gradient text-white text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-masala-900">{d.name}</div>
                    <div className="text-xs text-masala-600">{d.qty} servings</div>
                  </div>
                  <Flame className="h-4 w-4 text-chilli-500" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {reviewAi?.enabled && reviewAi?.summary && (
        <ReviewSummaryCard data={reviewAi} />
      )}

      {lowStock.length > 0 && (
        <div className="card p-6 border-l-4 border-l-chilli-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-chilli-600" />
              <h2 className="font-display text-xl">Low stock alert</h2>
            </div>
            <Link to="/admin/menu" className="text-xs font-semibold text-saffron-700 dark:text-saffron-400 hover:underline">
              Manage menu →
            </Link>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            These dishes are running low — restock before service slows down.
          </p>
          <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStock.map((d) => {
              const out = d.stock === 0
              return (
                <li
                  key={d.id}
                  className={clsx(
                    'rounded-2xl p-3 flex items-center gap-3 border',
                    out
                      ? 'bg-chilli-50 dark:bg-chilli-900/20 border-chilli-200 dark:border-chilli-900'
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900',
                  )}
                >
                  <div
                    className={clsx(
                      'h-10 w-10 rounded-full flex items-center justify-center',
                      out
                        ? 'bg-chilli-200 dark:bg-chilli-900/50 text-chilli-800 dark:text-chilli-100'
                        : 'bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-100',
                    )}
                  >
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{d.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {out ? 'Out of stock' : `${d.stock} left · alert ≤ ${d.lowStockAt}`}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

const SENTIMENT_TONE = {
  positive: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  mixed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  negative: 'bg-chilli-100 text-chilli-800 dark:bg-chilli-900/40 dark:text-chilli-200',
}

// Gemini-written digest of the latest customer reviews. Rendered only when the
// backend has an API key and at least a few reviews to work with.
function ReviewSummaryCard({ data }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-saffron-700" />
          <h2 className="font-display text-xl text-masala-900">What customers are saying</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${SENTIMENT_TONE[data.sentiment] || SENTIMENT_TONE.mixed}`}>
            {data.sentiment}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-masala-600">
            <Star className="h-3.5 w-3.5 text-saffron-500 fill-saffron-400" />
            {data.averages?.overall}/5 · {data.count} reviews
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
        {data.summary}
      </p>

      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        {data.highlights?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              <ThumbsUp className="h-3.5 w-3.5" /> Loved
            </div>
            <ul className="mt-2 space-y-1.5">
              {data.highlights.map((h) => (
                <li key={h} className="text-sm flex gap-2">
                  <span className="text-emerald-500">•</span>
                  <span style={{ color: 'var(--text)' }}>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.improvements?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
              <Wrench className="h-3.5 w-3.5" /> Could improve
            </div>
            <ul className="mt-2 space-y-1.5">
              {data.improvements.map((h) => (
                <li key={h} className="text-sm flex gap-2">
                  <span className="text-amber-500">•</span>
                  <span style={{ color: 'var(--text)' }}>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="mt-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <Sparkles className="inline h-3 w-3 mr-1 -mt-0.5" />
        AI-generated from your latest reviews · refreshes every 10 minutes
      </p>
    </div>
  )
}
