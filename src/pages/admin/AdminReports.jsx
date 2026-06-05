import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  IndianRupee,
  ShoppingBag,
  Receipt,
  Star,
  Download,
  TrendingUp,
  AlertTriangle,
  Flame,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import clsx from 'clsx'
import { fetchReportsSummary } from '../../lib/api'

const RANGES = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: 'today', label: 'Today', days: 1 },
]

// How a settled payment is labelled & coloured in the Settlements panel.
const SETTLE_METHODS = [
  { key: 'qr', label: 'QR (UPI scan)', color: 'bg-indigo-500' },
  { key: 'counter', label: 'Cash', color: 'bg-emerald-500' },
  { key: 'upi', label: 'UPI', color: 'bg-saffron-500' },
  { key: 'card', label: 'Card', color: 'bg-orange-500' },
  { key: 'razorpay', label: 'Online', color: 'bg-amber-500' },
]

const isoDate = (d) => d.toISOString().slice(0, 10)

export default function AdminReports() {
  const [range, setRange] = useState('7d')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const params = useMemo(() => {
    const def = RANGES.find((r) => r.key === range) || RANGES[0]
    const to = new Date()
    const from = new Date()
    from.setDate(to.getDate() - (def.days - 1))
    return { from: isoDate(from), to: to.toISOString() }
  }, [range])

  useEffect(() => {
    let alive = true
    fetchReportsSummary(params)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e?.response?.data?.message || e.message))
    return () => {
      alive = false
    }
  }, [params])

  const exportCsv = () => {
    if (!data) return
    const rows = [
      ['Metric', 'Value'],
      ['Revenue', data.totals.revenue],
      ['Orders', data.totals.orders],
      ['Completed orders', data.totals.completedOrders],
      ['Subtotal', data.totals.subtotal],
      ['GST collected', data.totals.tax],
      ['Avg ticket', data.totals.avgTicket],
      [],
      ['Date', 'Revenue', 'Orders'],
      ...data.daily.map((d) => [d.date, d.revenue, d.orders]),
      [],
      ['Settlement method', 'Payments', 'Amount'],
      ...SETTLE_METHODS.map((m) => {
        const v = (data.settlements?.byMethod || {})[m.key] || { count: 0, amount: 0 }
        return [m.label, v.count, v.amount]
      }),
      ['Total settled', data.settlements?.count || 0, data.settlements?.total || 0],
      [],
      ['Dish', 'Quantity', 'Revenue'],
      ...data.popular.map((p) => [p.name, p.qty, p.revenue]),
    ]
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `masala-story-report-${range}.csv`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div className="card p-6 text-chilli-700">
        <AlertTriangle className="inline mr-2 h-4 w-4" />
        {error}
      </div>
    )
  }

  if (!data) {
    return <div className="text-masala-700">Loading reports…</div>
  }

  const cards = [
    { label: 'Revenue', value: `₹${data.totals.revenue.toLocaleString()}`, icon: IndianRupee, accent: 'from-emerald-500 to-emerald-700' },
    { label: 'Expenses', value: `₹${(data.totals.expenses || 0).toLocaleString()}`, icon: Wallet, accent: 'from-chilli-500 to-chilli-700' },
    { label: 'Profit', value: `₹${(data.totals.profit || 0).toLocaleString()}`, icon: data.totals.profit >= 0 ? TrendingUp : TrendingDown, accent: data.totals.profit >= 0 ? 'from-emerald-500 to-emerald-700' : 'from-chilli-500 to-chilli-700' },
    { label: 'Margin', value: `${data.totals.margin || 0}%`, icon: BarChart3, accent: 'from-saffron-500 to-orange-600' },
  ]

  const secondaryCards = [
    { label: 'Orders', value: data.totals.orders, icon: ShoppingBag },
    { label: 'GST collected', value: `₹${data.totals.tax.toLocaleString()}`, icon: Receipt },
    { label: 'Avg ticket', value: `₹${data.totals.avgTicket}`, icon: TrendingUp },
  ]

  const max = Math.max(1, ...data.daily.map((d) => d.revenue))
  const settlements = data.settlements || { total: 0, count: 0, byMethod: {} }
  const settledRows = SETTLE_METHODS.map((m) => ({ ...m, ...(settlements.byMethod[m.key] || { count: 0, amount: 0 }) }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.amount - a.amount)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="eyebrow">
            <BarChart3 className="h-3.5 w-3.5" /> Insights
          </span>
          <h1 className="section-heading mt-1">Reports &amp; revenue</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-saffron-200 rounded-full p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={clsx(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  range === r.key ? 'bg-curry-gradient text-white shadow-warm' : 'text-masala-700',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={exportCsv} className="btn-secondary !py-2 !px-3 text-xs">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-5 relative overflow-hidden">
            <div className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${c.accent} opacity-20 blur-2xl`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-masala-700">
                  {c.label}
                </div>
                <c.icon className="h-4 w-4 text-saffron-700" />
              </div>
              <div className="font-display text-3xl text-masala-900 mt-2">{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {secondaryCards.map((c) => (
          <div key={c.label} className="card p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-masala-700">{c.label}</div>
              <div className="font-display text-xl text-masala-900 mt-1">{c.value}</div>
            </div>
            <c.icon className="h-5 w-5 text-saffron-700" />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-masala-900">Daily revenue</h2>
            <span className="text-xs text-masala-600">{data.daily.length} days</span>
          </div>
          <div className="mt-6">
            {data.daily.length === 0 ? (
              <div className="text-sm text-masala-600">No sales yet in this window.</div>
            ) : (
              <div className="flex items-end gap-2 h-48">
                {data.daily.map((d) => {
                  const pct = (d.revenue / max) * 100
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="text-[10px] font-semibold text-masala-700">
                        ₹{d.revenue}
                      </div>
                      <div className="w-full bg-saffron-100 rounded-t-lg overflow-hidden h-full flex items-end">
                        <div
                          className="w-full bg-curry-gradient rounded-t-lg transition-all"
                          style={{ height: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-masala-600">
                        {d.date.slice(5)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl text-masala-900">Settlements</h2>
            <span className="text-xs text-masala-600">{settlements.count} payment{settlements.count === 1 ? '' : 's'}</span>
          </div>
          <div className="font-display text-2xl text-masala-900 mt-1">
            ₹{settlements.total.toLocaleString()}
          </div>
          {settledRows.length === 0 ? (
            <div className="mt-4 text-sm text-masala-600">No settled payments in this window yet.</div>
          ) : (
            <ul className="mt-4 space-y-3">
              {settledRows.map((r) => {
                const pct = settlements.total ? Math.round((r.amount / settlements.total) * 100) : 0
                return (
                  <li key={r.key}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold inline-flex items-center gap-1.5">
                        <span className={clsx('h-2.5 w-2.5 rounded-full', r.color)} />
                        {r.label}
                      </span>
                      <span className="text-masala-700">
                        ₹{r.amount.toLocaleString()} · {r.count} · {pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-saffron-100 overflow-hidden">
                      <div className={clsx('h-full', r.color)} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {data.expensesByCategory && Object.keys(data.expensesByCategory).length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-chilli-600" />
            <h2 className="font-display text-xl text-masala-900">Expense breakdown</h2>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(data.expensesByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amt]) => {
                const pct = data.totals.expenses ? Math.round((amt / data.totals.expenses) * 100) : 0
                return (
                  <div key={cat} className="rounded-2xl bg-cream border border-saffron-200 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold capitalize">{cat}</span>
                      <span className="text-masala-700">₹{amt.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-saffron-100 overflow-hidden">
                      <div className="h-full bg-curry-gradient" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-masala-600">{pct}% of expenses</div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-chilli-500" />
            <h2 className="font-display text-xl text-masala-900">Top dishes</h2>
          </div>
          {data.popular.length === 0 ? (
            <div className="mt-3 text-sm text-masala-600">No completed orders yet.</div>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.popular.map((d, i) => (
                <li key={d.name} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-curry-gradient text-white text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-masala-900">{d.name}</div>
                    <div className="text-xs text-masala-600">
                      {d.qty} served · ₹{d.revenue.toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-turmeric-500 fill-turmeric-500" />
            <h2 className="font-display text-xl text-masala-900">Customer feedback</h2>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <RatingTile label="Food" value={data.ratings.food} />
            <RatingTile label="Service" value={data.ratings.service} />
            <RatingTile label="Overall" value={data.ratings.overall} />
          </div>
          {data.ratings.comments.length > 0 && (
            <div className="mt-5 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-masala-700">
                Recent comments
              </div>
              {data.ratings.comments.map((c, i) => (
                <div key={i} className="rounded-2xl bg-cream border border-saffron-200 px-3 py-2 text-sm text-masala-800">
                  <div className="flex justify-between items-center text-xs text-masala-600">
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 text-turmeric-400 fill-turmeric-400" /> {c.overall}
                    </span>
                  </div>
                  <p className="mt-1">{c.comments}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RatingTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-cream border border-saffron-200 p-3">
      <div className="font-display text-2xl text-masala-900">{value || '–'}</div>
      <div className="text-[11px] uppercase tracking-widest text-masala-600">{label}</div>
    </div>
  )
}
