import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  Wallet,
  Table2,
  BedDouble,
  Users,
  Clock,
  Sparkles,
  SlidersHorizontal,
  X,
  Printer,
  Share2,
  Mail,
  ChefHat,
  PackageOpen,
  Timer,
  MessageSquareText,
  Lightbulb,
  CalendarRange,
} from 'lucide-react'
import clsx from 'clsx'
import { fetchReportsAnalytics } from '../../lib/api'
import {
  TrendChart,
  ColumnChart,
  DonutChart,
  BarList,
  HourHeatmap,
  Sparkline,
  DeltaBadge,
  EmptyNote,
} from '../../components/admin/reports/charts'
import { useChartTheme, fmtNum, fmtMoney, fmtCompact } from '../../components/admin/reports/chartkit'

// ── Filters ───────────────────────────────────────────────────────────
const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
  { key: 'custom', label: 'Custom' },
]

const SERVICE_OPTIONS = [
  { key: '', label: 'All channels' },
  { key: 'table', label: 'Dine-in' },
  { key: 'room', label: 'Room service' },
  { key: 'takeaway', label: 'Takeaway' },
]

// Colour follows the ENTITY (fixed slot per method) — filters never repaint.
const METHOD_META = {
  upi: { label: 'UPI', slot: 0 },
  qr: { label: 'QR scan', slot: 1 },
  counter: { label: 'Cash', slot: 2 },
  cash: { label: 'Cash', slot: 2 },
  card: { label: 'Card', slot: 3 },
  later: { label: 'Pay later', slot: 4 },
  razorpay: { label: 'Online', slot: 5 },
}
const PAYMENT_OPTIONS = [
  { key: '', label: 'All payments' },
  { key: 'counter', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'qr', label: 'QR scan' },
  { key: 'card', label: 'Card' },
  { key: 'razorpay', label: 'Online' },
  { key: 'later', label: 'Pay later' },
]

const STATUS_LABELS = {
  received: 'Received',
  queued: 'Queued',
  preparing: 'Preparing',
  cooking: 'Cooking',
  ready: 'Ready',
  served: 'Served',
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'sales', label: 'Sales', icon: TrendingUp },
  { key: 'dishes', label: 'Dishes', icon: ChefHat },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'operations', label: 'Operations', icon: Table2 },
  { key: 'payments', label: 'Payments & tax', icon: Receipt },
  { key: 'feedback', label: 'Feedback', icon: Star },
]

const isoDate = (d) => {
  const x = new Date(d)
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset())
  return x.toISOString().slice(0, 10)
}

function presetRange(preset, customFrom, customTo) {
  const now = new Date()
  const startToday = new Date(now)
  startToday.setHours(0, 0, 0, 0)
  const endOf = (d) => {
    const x = new Date(d)
    x.setHours(23, 59, 59, 999)
    return x
  }
  switch (preset) {
    case 'today':
      return { from: isoDate(startToday), to: now.toISOString() }
    case 'yesterday': {
      const y = new Date(startToday.getTime() - 86400000)
      return { from: isoDate(y), to: endOf(y).toISOString() }
    }
    case '7d':
      return { from: isoDate(new Date(startToday.getTime() - 6 * 86400000)), to: now.toISOString() }
    case '30d':
      return { from: isoDate(new Date(startToday.getTime() - 29 * 86400000)), to: now.toISOString() }
    case 'month':
      return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: now.toISOString() }
    case 'lastMonth': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: isoDate(first), to: endOf(last).toISOString() }
    }
    case 'quarter': {
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      return { from: isoDate(qStart), to: now.toISOString() }
    }
    case 'year':
      return { from: isoDate(new Date(now.getFullYear(), 0, 1)), to: now.toISOString() }
    case 'custom': {
      const from = customFrom || isoDate(new Date(startToday.getTime() - 6 * 86400000))
      const to = customTo ? endOf(customTo).toISOString() : now.toISOString()
      return { from, to }
    }
    default:
      return { from: isoDate(new Date(startToday.getTime() - 6 * 86400000)), to: now.toISOString() }
  }
}

// ── Page ──────────────────────────────────────────────────────────────
export default function AdminReports() {
  const [preset, setPreset] = useState('7d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [tab, setTab] = useState('overview')
  // { params, data } — `loading` is derived by comparing against the current
  // params, so the effect never has to set state synchronously.
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  const params = useMemo(() => {
    const range = presetRange(preset, customFrom, customTo)
    return {
      ...range,
      ...(serviceType ? { serviceType } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
    }
  }, [preset, customFrom, customTo, serviceType, paymentMethod])

  useEffect(() => {
    let alive = true
    fetchReportsAnalytics(params)
      .then((d) => {
        if (!alive) return
        setResult({ params, data: d })
        setError('')
      })
      .catch((e) => alive && setError(e?.response?.data?.message || e.message))
    return () => {
      alive = false
    }
  }, [params])

  const data = result?.data
  const loading = result?.params !== params

  const sym = data?.org?.currencySymbol || '₹'
  const taxLabel = data?.org?.taxLabel || 'GST'

  // ── Export & share ──
  const exportCsv = () => {
    if (!data) return
    const { totals, daily, dishes, categories, payments, customers, tables, rooms, ratings, gst } = data
    const rows = [
      ['Masala Story — analytics export'],
      ['Range', data.range.from.slice(0, 10), data.range.to.slice(0, 10)],
      [],
      ['Metric', 'Value'],
      ['Revenue', totals.revenue],
      ['COGS (dish costs)', totals.cogs],
      ['Gross profit', totals.grossProfit],
      ['Food cost %', totals.foodCostPct],
      ['Cost coverage %', totals.costCoverage],
      ['Expenses', totals.expenses],
      ['Net profit', totals.profit],
      ['Margin %', totals.margin],
      [`${taxLabel} collected`, totals.tax],
      ['Orders', totals.orders],
      ['Completed orders', totals.completedOrders],
      ['Active orders', totals.activeOrders],
      ['Pending-payment orders', totals.pendingPaymentOrders],
      ['Avg order value', totals.avgTicket],
      ['Items sold', totals.itemsSold],
      ['Tips', totals.tips],
      ['Discounts', totals.discounts],
      ['Customers (known)', totals.customers],
      [],
      ['Date', 'Revenue', 'Orders', 'Customers'],
      ...daily.map((d) => [d.date, d.revenue, d.orders, d.customers]),
      [],
      ['Payment method', 'Payments', 'Amount'],
      ...Object.entries(payments.byMethod).map(([m, v]) => [METHOD_META[m]?.label || m, v.count, v.amount]),
      [],
      ['Category', 'Qty', 'Revenue', taxLabel],
      ...categories.map((c) => [c.name, c.qty, c.revenue, c.gst]),
      [],
      ['Top dishes', 'Qty', 'Revenue'],
      ...dishes.top.map((d) => [d.name, d.qty, d.revenue]),
      [],
      ['Dish profitability', 'Sold', 'Revenue', 'Cost', 'Profit', 'Margin %'],
      ...dishes.profitability.map((d) => [d.name, d.qty, d.revenue, d.cost, d.profit, d.margin]),
      [],
      ['Top customers', 'Visits', 'Total spent', 'Avg bill'],
      ...customers.topSpenders.map((c) => [c.name, c.visits, c.totalSpent, c.avgBill]),
      [],
      ['Table', 'Orders', 'Revenue'],
      ...tables.list.map((r) => [`Table ${r.number}`, r.orders, r.revenue]),
      [],
      ['Room', 'Orders', 'Revenue'],
      ...rooms.list.map((r) => [`Room ${r.number}`, r.orders, r.revenue]),
      [],
      [`${taxLabel} by dish`, 'Amount'],
      ...gst.byDish.map((d) => [d.name, d.gst]),
      [],
      ['Ratings', ratings.count],
      ['Food', ratings.food],
      ['Service', ratings.service],
      ['Overall', ratings.overall],
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `report-${params.from}-to-${params.to.slice(0, 10)}.csv`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  const shareText = () => {
    if (!data) return ''
    const { totals } = data
    return [
      `📊 Restaurant report ${data.range.from.slice(0, 10)} → ${data.range.to.slice(0, 10)}`,
      `Revenue: ${sym}${fmtNum(totals.revenue)}`,
      `Net profit: ${sym}${fmtNum(totals.profit)} (${totals.margin}%)`,
      `Orders: ${fmtNum(totals.completedOrders)} completed / ${fmtNum(totals.orders)} total`,
      `Avg order value: ${sym}${fmtNum(totals.avgTicket)}`,
      `${taxLabel} collected: ${sym}${fmtNum(totals.tax)}`,
    ].join('\n')
  }
  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, '_blank')
  const shareEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent('Restaurant report')}&body=${encodeURIComponent(shareText())}`
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
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 rounded-full bg-saffron-100 dark:bg-masala-800 animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card h-28 animate-pulse" />
          ))}
        </div>
        <div className="card h-72 animate-pulse" />
      </div>
    )
  }

  const filterControls = (
    <FilterControls
      preset={preset}
      setPreset={setPreset}
      customFrom={customFrom}
      setCustomFrom={setCustomFrom}
      customTo={customTo}
      setCustomTo={setCustomTo}
      serviceType={serviceType}
      setServiceType={setServiceType}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
    />
  )

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap print:hidden">
        <div>
          <span className="eyebrow">
            <BarChart3 className="h-3.5 w-3.5" /> Business intelligence
          </span>
          <h1 className="section-heading mt-1">Reports &amp; analytics</h1>
          <p className="text-xs mt-1 text-masala-600 dark:text-masala-300">
            {data.range.from.slice(0, 10)} → {data.range.to.slice(0, 10)} · {data.range.days} day{data.range.days === 1 ? '' : 's'}
            {serviceType && ` · ${SERVICE_OPTIONS.find((s) => s.key === serviceType)?.label}`}
            {paymentMethod && ` · ${PAYMENT_OPTIONS.find((p) => p.key === paymentMethod)?.label}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="btn-secondary !py-2 !px-3 text-xs" title="Export CSV">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={() => window.print()} className="btn-secondary !py-2 !px-3 text-xs" title="Print / save as PDF">
            <Printer className="h-3.5 w-3.5" /> PDF
          </button>
          <button onClick={shareWhatsApp} className="btn-secondary !py-2 !px-3 text-xs" title="Share on WhatsApp">
            <Share2 className="h-3.5 w-3.5" /> WhatsApp
          </button>
          <button onClick={shareEmail} className="btn-secondary !py-2 !px-3 text-xs hidden sm:inline-flex" title="Share by email">
            <Mail className="h-3.5 w-3.5" /> Email
          </button>
        </div>
      </div>

      {/* Filters — inline on desktop, bottom sheet on mobile */}
      <div className="hidden md:block card p-3 print:hidden">{filterControls}</div>
      <button
        onClick={() => setSheetOpen(true)}
        className="md:hidden fixed bottom-5 right-4 z-40 btn-primary !px-4 !py-3 text-sm shadow-plate print:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" /> Filters
      </button>
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSheetOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 rounded-t-3xl bg-white dark:bg-masala-800 p-5 max-h-[80vh] overflow-y-auto animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg text-masala-900 dark:text-cream">Filters</h3>
              <button onClick={() => setSheetOpen(false)} className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            {filterControls}
            <button onClick={() => setSheetOpen(false)} className="btn-primary w-full mt-4 !py-2.5 text-sm">
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <nav className="-mx-1 px-1 flex gap-1.5 overflow-x-auto scrollbar-hide print:hidden">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={clsx(
              'whitespace-nowrap inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition border',
              tab === tb.key
                ? 'bg-curry-gradient text-white border-transparent shadow-warm'
                : 'bg-white dark:bg-masala-800 text-masala-800 dark:text-saffron-100 border-saffron-200 dark:border-masala-700',
            )}
          >
            <tb.icon className="h-3.5 w-3.5" />
            {tb.label}
          </button>
        ))}
      </nav>

      <div className={clsx('space-y-5 transition-opacity', loading && 'opacity-60 pointer-events-none')}>
        {tab === 'overview' && <OverviewTab data={data} sym={sym} taxLabel={taxLabel} setTab={setTab} />}
        {tab === 'sales' && <SalesTab data={data} sym={sym} />}
        {tab === 'dishes' && <DishesTab data={data} sym={sym} />}
        {tab === 'customers' && <CustomersTab data={data} sym={sym} />}
        {tab === 'operations' && <OperationsTab data={data} sym={sym} />}
        {tab === 'payments' && <PaymentsTab data={data} sym={sym} taxLabel={taxLabel} />}
        {tab === 'feedback' && <FeedbackTab data={data} />}
      </div>
    </div>
  )
}

// ── Filter controls (shared desktop bar / mobile sheet) ───────────────
function FilterControls({
  preset,
  setPreset,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  serviceType,
  setServiceType,
  paymentMethod,
  setPaymentMethod,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <CalendarRange className="h-4 w-4 text-saffron-600 mr-1 hidden md:block" />
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={clsx(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition border',
              preset === p.key
                ? 'bg-curry-gradient text-white border-transparent shadow-warm'
                : 'bg-white dark:bg-masala-800 text-masala-700 dark:text-saffron-100 border-saffron-200 dark:border-masala-700',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-xl border border-saffron-200 dark:border-masala-700 bg-white dark:bg-masala-800 px-2.5 py-1.5 text-xs text-masala-800 dark:text-cream"
            />
            <span className="text-xs text-masala-500">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-xl border border-saffron-200 dark:border-masala-700 bg-white dark:bg-masala-800 px-2.5 py-1.5 text-xs text-masala-800 dark:text-cream"
            />
          </div>
        )}
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          className="rounded-xl border border-saffron-200 dark:border-masala-700 bg-white dark:bg-masala-800 px-2.5 py-1.5 text-xs font-semibold text-masala-800 dark:text-cream"
        >
          {SERVICE_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="rounded-xl border border-saffron-200 dark:border-masala-700 bg-white dark:bg-masala-800 px-2.5 py-1.5 text-xs font-semibold text-masala-800 dark:text-cream"
        >
          {PAYMENT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ── Shared bits ───────────────────────────────────────────────────────
function Panel({ title, icon: Icon, right, children, className }) {
  return (
    <div className={clsx('card p-5 md:p-6', className)}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="font-display text-lg md:text-xl text-masala-900 dark:text-cream flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-saffron-600" />}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, delta, spark, onClick, accent = 'from-saffron-500 to-orange-600', sub }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'card p-4 relative overflow-hidden text-left w-full snap-start shrink-0 min-w-[180px] sm:min-w-0 transition',
        onClick && 'hover:-translate-y-0.5 hover:shadow-plate cursor-pointer',
      )}
    >
      <div className={`absolute -top-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-15 blur-2xl pointer-events-none`} />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-masala-600 dark:text-masala-300">{label}</div>
          {Icon && <Icon className="h-4 w-4 text-saffron-600 shrink-0" />}
        </div>
        <div className="mt-1.5 text-2xl font-bold text-masala-900 dark:text-cream leading-tight">{value}</div>
        <div className="mt-1 flex items-end justify-between gap-2 min-h-[18px]">
          <div className="flex flex-col">
            {delta}
            {sub && <span className="text-[10px] text-masala-500 dark:text-masala-400">{sub}</span>}
          </div>
          {spark}
        </div>
      </div>
    </button>
  )
}

function DataTable({ head, rows, empty = 'Nothing here yet.' }) {
  if (!rows.length) return <EmptyNote text={empty} />
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-masala-500 dark:text-masala-400">
            {head.map((h, i) => (
              <th key={h} className={clsx('py-2 pr-3 font-semibold', i > 0 && 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-saffron-100 dark:border-masala-700/60">
              {r.map((c, ci) => (
                <td
                  key={ci}
                  className={clsx(
                    'py-2 pr-3 text-masala-800 dark:text-saffron-100',
                    ci > 0 && 'text-right tabular-nums text-masala-700 dark:text-masala-200',
                    ci === 0 && 'font-semibold',
                  )}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────────────
function OverviewTab({ data, sym, taxLabel, setTab }) {
  const { totals, prevTotals, daily, statusCounts, expensesByCategory } = data
  const revSpark = daily.map((d) => d.revenue)
  const orderSpark = daily.map((d) => d.orders)

  const kpis = [
    {
      label: 'Revenue',
      value: fmtMoney(totals.revenue, sym),
      icon: IndianRupee,
      delta: <DeltaBadge current={totals.revenue} prev={prevTotals.revenue} />,
      spark: <Sparkline points={revSpark} />,
      onClick: () => setTab('sales'),
      accent: 'from-emerald-500 to-emerald-700',
    },
    {
      label: 'Gross profit',
      value: fmtMoney(totals.grossProfit, sym),
      icon: TrendingUp,
      delta: <DeltaBadge current={totals.grossProfit} prev={prevTotals.grossProfit} />,
      sub: totals.costCoverage > 0 ? `${totals.foodCostPct}% food cost` : 'set dish costs in Menu',
      onClick: () => setTab('dishes'),
      accent: 'from-emerald-500 to-emerald-700',
    },
    {
      label: 'Net profit',
      value: fmtMoney(totals.profit, sym),
      icon: TrendingUp,
      delta: <DeltaBadge current={totals.profit} prev={prevTotals.profit} />,
      sub: `${totals.margin}% margin · after COGS + expenses`,
      accent: totals.profit >= 0 ? 'from-emerald-500 to-emerald-700' : 'from-chilli-500 to-chilli-700',
    },
    {
      label: 'Expenses',
      value: fmtMoney(totals.expenses, sym),
      icon: Wallet,
      delta: <DeltaBadge current={totals.expenses} prev={prevTotals.expenses} invert />,
      sub: totals.cogs > 0 ? `+ ${fmtMoney(totals.cogs, sym)} COGS` : undefined,
      accent: 'from-chilli-500 to-chilli-700',
    },
    {
      label: `${taxLabel} collected`,
      value: fmtMoney(totals.tax, sym),
      icon: Receipt,
      delta: <DeltaBadge current={totals.tax} prev={prevTotals.tax} />,
      onClick: () => setTab('payments'),
    },
    {
      label: 'Orders',
      value: fmtNum(totals.completedOrders),
      icon: ShoppingBag,
      delta: <DeltaBadge current={totals.completedOrders} prev={prevTotals.completedOrders} />,
      spark: <Sparkline points={orderSpark} />,
      sub: `${fmtNum(totals.orders)} placed`,
      onClick: () => setTab('sales'),
    },
    {
      label: 'Avg order value',
      value: fmtMoney(totals.avgTicket, sym),
      icon: BarChart3,
      delta: <DeltaBadge current={totals.avgTicket} prev={prevTotals.avgTicket} />,
      onClick: () => setTab('sales'),
    },
    {
      label: 'Customers',
      value: fmtNum(totals.customers),
      icon: Users,
      delta: <DeltaBadge current={totals.customers} prev={prevTotals.customers} />,
      sub: 'known (loyalty)',
      onClick: () => setTab('customers'),
    },
  ]

  const chips = [
    { label: 'Active orders', value: totals.activeOrders, to: '/admin/orders' },
    { label: 'Pending payment', value: `${fmtNum(totals.pendingPaymentOrders)} · ${fmtMoney(totals.pendingPaymentAmount, sym)}` },
    { label: 'Items sold', value: fmtNum(totals.itemsSold) },
    { label: 'COGS', value: fmtMoney(totals.cogs, sym) },
    { label: 'Tips', value: fmtMoney(totals.tips, sym) },
    { label: 'Discounts', value: fmtMoney(totals.discounts, sym) },
    ...(totals.costCoverage < 100
      ? [{ label: 'Cost data', value: `${totals.costCoverage}% of sales costed — add dish costs`, to: '/admin/menu', warn: true }]
      : []),
  ]

  return (
    <>
      {/* KPI cards — swipeable row on phones, grid from sm up */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {kpis.map((k) => (
          <StatCard key={k.label} {...k} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((c) =>
          c.to ? (
            <Link
              key={c.label}
              to={c.to}
              className={clsx(
                'chip !text-xs hover:shadow-warm transition',
                c.warn && '!bg-chilli-50 dark:!bg-chilli-900/30 !text-chilli-700 dark:!text-chilli-300',
              )}
            >
              <span className="font-semibold">{c.label}:</span> {c.value}
            </Link>
          ) : (
            <span key={c.label} className="chip !text-xs">
              <span className="font-semibold">{c.label}:</span> {c.value}
            </span>
          ),
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        <Panel title="Revenue trend" icon={TrendingUp} right={<span className="text-xs text-masala-500">{daily.length} days</span>}>
          <TrendChart
            data={daily}
            sym={sym}
            tooltipExtras={(d) => (
              <div className="opacity-80">
                {d.orders} orders · {d.customers} customers
              </div>
            )}
          />
        </Panel>
        <SmartHighlights data={data} sym={sym} taxLabel={taxLabel} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Order pipeline" icon={PackageOpen}>
          <OrderPipeline statusCounts={statusCounts} />
        </Panel>
        <Panel title="Expense breakdown" icon={Wallet} right={<Link to="/admin/expenses" className="text-xs font-semibold text-saffron-700 hover:underline">Manage →</Link>}>
          <BarList
            items={Object.entries(expensesByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amt]) => ({ label: cat, value: amt }))}
            valueFmt={(v) => fmtMoney(v, sym)}
          />
        </Panel>
      </div>
    </>
  )
}

// Ordinal saffron ramp over the kitchen flow — order carried by lightness.
function OrderPipeline({ statusCounts }) {
  const t = useChartTheme()
  const flow = ['received', 'queued', 'preparing', 'cooking', 'ready', 'served']
  // Ordinal saffron ramp — stage order carried by depth of colour; the final
  // "served" stage wears the good-status green.
  const ramp = ['#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#059669']
  const rows = flow.map((s, i) => ({ label: STATUS_LABELS[s], value: statusCounts[s] || 0, color: ramp[i] }))
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs font-semibold text-masala-700 dark:text-masala-200">{r.label}</span>
          <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: t.grid }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(r.value ? 3 : 0, (r.value / max) * 100)}%`, background: r.color }} />
          </div>
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-masala-700 dark:text-masala-200">{fmtNum(r.value)}</span>
        </li>
      ))}
    </ul>
  )
}

// Deterministic, data-grounded highlights + a bridge to the AI analyst page.
function SmartHighlights({ data, sym, taxLabel }) {
  const { totals, prevTotals, heatmap, weekdays, hourly, dishes, payments, rooms, ratings, inventory, fulfilment, org } = data
  const items = []

  if (prevTotals.revenue) {
    const pct = Math.round(((totals.revenue - prevTotals.revenue) / prevTotals.revenue) * 100)
    if (pct !== 0)
      items.push({
        tone: pct > 0 ? 'good' : 'bad',
        text: `Revenue is ${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}% vs the previous period.`,
      })
  }
  const daySums = heatmap.map((row) => row.reduce((s, v) => s + v, 0))
  const bestDay = daySums.indexOf(Math.max(...daySums))
  if (daySums[bestDay] > 0) items.push({ tone: 'info', text: `${weekdays[bestDay]} is your busiest day (${daySums[bestDay]} orders).` })
  const peak = hourly.reduce((a, b) => (b.orders > a.orders ? b : a), hourly[0])
  if (peak?.orders > 0) {
    const h = peak.hour
    const label = `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`
    items.push({ tone: 'info', text: `Orders peak around ${label} — staff up before then.` })
  }
  if (dishes.top[0] && totals.itemsSold) {
    const share = Math.round((dishes.top[0].qty / totals.itemsSold) * 100)
    items.push({ tone: 'good', text: `${dishes.top[0].name} is your best seller — ${share}% of all items sold.` })
  }
  if (dishes.profitability?.length) {
    const best = [...dishes.profitability].sort((a, b) => b.margin - a.margin)[0]
    items.push({ tone: 'good', text: `${best.name} has your highest margin (${best.margin}% — ${sym}${fmtNum(best.profit)} profit).` })
  } else if (totals.costCoverage === 0 && totals.itemsSold > 0) {
    items.push({ tone: 'bad', text: 'No dish costs set — add cost prices in the Menu to unlock real profit tracking.' })
  }
  const methods = Object.entries(payments.byMethod).sort((a, b) => b[1].amount - a[1].amount)
  if (methods[0] && payments.total) {
    const [m, v] = methods[0]
    items.push({ tone: 'info', text: `${METHOD_META[m]?.label || m} leads payments at ${Math.round((v.amount / payments.total) * 100)}% of collections.` })
  }
  if (org.roomServiceEnabled && totals.revenue > 0) {
    items.push({ tone: 'info', text: `Room service contributes ${Math.round((rooms.revenue / totals.revenue) * 100)}% of revenue.` })
  }
  if (ratings.count >= 3) {
    items.push({ tone: ratings.overall >= 4 ? 'good' : 'bad', text: `Guests rate you ${ratings.overall}/5 overall across ${ratings.count} reviews.` })
  }
  if (fulfilment.delayedOrders > 0) {
    items.push({ tone: 'bad', text: `${fulfilment.delayedOrders} orders took noticeably longer than their ETA.` })
  }
  if (inventory.lowStock.length + inventory.outOfStock.length > 0) {
    items.push({ tone: 'bad', text: `${inventory.outOfStock.length} dishes out of stock, ${inventory.lowStock.length} running low.` })
  }
  if (totals.tax > 0) items.push({ tone: 'info', text: `${sym}${fmtNum(totals.tax)} ${taxLabel} collected in this window.` })

  return (
    <Panel title="Smart highlights" icon={Lightbulb}>
      {items.length === 0 ? (
        <EmptyNote text="Not enough data yet — highlights appear as orders come in." />
      ) : (
        <ul className="space-y-2.5">
          {items.slice(0, 6).map((it, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-masala-800 dark:text-saffron-100">
              <span
                className={clsx(
                  'mt-1 h-2 w-2 rounded-full shrink-0',
                  it.tone === 'good' && 'bg-emerald-500',
                  it.tone === 'bad' && 'bg-chilli-500',
                  it.tone === 'info' && 'bg-saffron-500',
                )}
              />
              {it.text}
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/admin/insights"
        className="mt-4 flex items-center gap-2 rounded-2xl border border-saffron-200 dark:border-masala-700 bg-cream dark:bg-masala-800/60 px-3 py-2.5 text-sm font-semibold text-masala-800 dark:text-saffron-100 hover:shadow-warm transition"
      >
        <MessageSquareText className="h-4 w-4 text-saffron-600" />
        Ask the AI business analyst
        <Sparkles className="h-3.5 w-3.5 ml-auto text-saffron-500" />
      </Link>
    </Panel>
  )
}

// ── Sales ─────────────────────────────────────────────────────────────
function SalesTab({ data, sym }) {
  const t = useChartTheme()
  const { daily, hourly, heatmap, weekdays, serviceMix, totals, prevTotals } = data
  const hourData = hourly.map((h) => ({ ...h, label: `${((h.hour + 11) % 12) + 1}${h.hour < 12 ? 'am' : 'pm'}`, value: h.orders }))
  const growth = prevTotals.revenue ? Math.round(((totals.revenue - prevTotals.revenue) / prevTotals.revenue) * 100) : null

  const serviceItems = [
    { label: 'Dine-in', value: serviceMix.table.revenue, color: t.slots[0], sub: `${serviceMix.table.orders} orders` },
    { label: 'Room service', value: serviceMix.room.revenue, color: t.slots[1], sub: `${serviceMix.room.orders} orders` },
    { label: 'Takeaway', value: serviceMix.takeaway.revenue, color: t.slots[2], sub: `${serviceMix.takeaway.orders} orders` },
  ]

  return (
    <>
      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard label="Revenue" value={fmtMoney(totals.revenue, sym)} icon={IndianRupee} delta={<DeltaBadge current={totals.revenue} prev={prevTotals.revenue} />} />
        <StatCard
          label="Sales growth"
          value={growth == null ? '—' : `${growth > 0 ? '+' : ''}${growth}%`}
          icon={TrendingUp}
          sub={`prev: ${fmtMoney(prevTotals.revenue, sym)}`}
        />
        <StatCard label="Avg order value" value={fmtMoney(totals.avgTicket, sym)} icon={BarChart3} delta={<DeltaBadge current={totals.avgTicket} prev={prevTotals.avgTicket} />} />
      </div>

      <Panel title="Revenue trend" icon={TrendingUp}>
        <TrendChart data={daily} sym={sym} tooltipExtras={(d) => <div className="opacity-80">{d.orders} orders</div>} />
      </Panel>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Orders by hour" icon={Clock}>
          <ColumnChart data={hourData} xKey="label" yKey="value" sym={sym} />
        </Panel>
        <Panel title="Revenue by channel" icon={BedDouble}>
          <DonutChart items={serviceItems} centerLabel="Revenue" centerValue={fmtCompact(totals.revenue, sym)} />
        </Panel>
      </div>

      <Panel title="Rush-hour heatmap" icon={Flame} right={<span className="text-xs text-masala-500">orders per hour, by weekday</span>}>
        <HourHeatmap matrix={heatmap} weekdays={weekdays} />
      </Panel>

      <Panel title="Daily breakdown" icon={CalendarRange}>
        <DataTable
          head={['Date', 'Orders', 'Customers', 'Revenue']}
          rows={[...daily].reverse().map((d) => [d.date, fmtNum(d.orders), fmtNum(d.customers), fmtMoney(d.revenue, sym)])}
          empty="No sales in this window yet."
        />
      </Panel>
    </>
  )
}

// ── Dishes ────────────────────────────────────────────────────────────
function DishesTab({ data, sym }) {
  const { dishes, categories, inventory, totals } = data
  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Items sold" value={fmtNum(totals.itemsSold)} icon={ChefHat} />
        <StatCard label="Dishes ordered" value={fmtNum(dishes.distinctSold)} icon={PackageOpen} sub={`${dishes.zeroSales.length} had zero sales`} />
        <StatCard
          label="Food cost"
          value={totals.costCoverage > 0 ? `${totals.foodCostPct}%` : '—'}
          icon={Wallet}
          sub={totals.costCoverage > 0 ? `gross profit ${fmtMoney(totals.grossProfit, sym)}` : 'no dish costs set yet'}
        />
        <StatCard label="Stock value" value={fmtMoney(inventory.stockValue, sym)} icon={Wallet} sub={`${inventory.tracked} dishes tracked`} />
      </div>

      <Panel
        title="Dish profitability"
        icon={TrendingUp}
        right={<Link to="/admin/menu" className="text-xs font-semibold text-saffron-700 hover:underline">Edit costs →</Link>}
      >
        {dishes.profitability.length === 0 ? (
          <EmptyNote text="No dish has a cost price yet — add cost prices in the Menu editor to unlock margins." />
        ) : (
          <>
            <DataTable
              head={['Dish', 'Sold', 'Revenue', 'Cost', 'Profit', 'Margin']}
              rows={dishes.profitability.map((d) => [
                d.name,
                fmtNum(d.qty),
                fmtMoney(d.revenue, sym),
                fmtMoney(d.cost, sym),
                fmtMoney(d.profit, sym),
                `${d.margin}%`,
              ])}
            />
            {dishes.uncostedCount > 0 && (
              <p className="mt-3 text-xs text-masala-500 dark:text-masala-400">
                {dishes.uncostedCount} sold dish{dishes.uncostedCount === 1 ? ' has' : 'es have'} no cost price yet
                {dishes.uncostedSold.length > 0 && <> ({dishes.uncostedSold.slice(0, 5).join(', ')}{dishes.uncostedCount > 5 ? '…' : ''})</>}
                {' '}— they're excluded above instead of being shown as 100% margin.
              </p>
            )}
          </>
        )}
      </Panel>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Top sellers · by quantity" icon={Flame}>
          <BarList items={dishes.top.map((d) => ({ label: d.name, value: d.qty, sub: fmtMoney(d.revenue, sym) }))} />
        </Panel>
        <Panel title="Top earners · by revenue" icon={IndianRupee}>
          <BarList items={dishes.byRevenue.map((d) => ({ label: d.name, value: d.revenue, sub: `${d.qty} sold` }))} valueFmt={(v) => fmtMoney(v, sym)} />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Category-wise sales" icon={BarChart3}>
          <BarList
            items={categories.map((c) => ({ label: `${c.emoji} ${c.name}`, value: c.revenue, sub: `${c.qty} items` }))}
            valueFmt={(v) => fmtMoney(v, sym)}
          />
        </Panel>
        <Panel title="Slow movers" icon={AlertTriangle}>
          {dishes.slow.length === 0 && dishes.zeroSales.length === 0 ? (
            <EmptyNote text="No slow movers — everything on the menu sold." />
          ) : (
            <div className="space-y-4">
              {dishes.slow.length > 0 && (
                <BarList items={dishes.slow.map((d) => ({ label: d.name, value: d.qty, sub: fmtMoney(d.revenue, sym) }))} maxBars={5} />
              )}
              {dishes.zeroSales.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-masala-500 mb-2">No sales this period</div>
                  <div className="flex flex-wrap gap-1.5">
                    {dishes.zeroSales.map((d) => (
                      <span key={d.name} className="chip !text-xs">
                        {d.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>

      {(inventory.lowStock.length > 0 || inventory.outOfStock.length > 0) && (
        <Panel title="Inventory alerts" icon={AlertTriangle} right={<Link to="/admin/menu" className="text-xs font-semibold text-saffron-700 hover:underline">Restock →</Link>}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-chilli-600 mb-2">Out of stock ({inventory.outOfStock.length})</div>
              {inventory.outOfStock.length === 0 ? (
                <div className="text-sm text-masala-600 dark:text-masala-300">None 🎉</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {inventory.outOfStock.map((d) => (
                    <span key={d.name} className="chip !text-xs !bg-chilli-50 dark:!bg-chilli-900/30 !text-chilli-700 dark:!text-chilli-300">
                      {d.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-saffron-700 mb-2">Running low ({inventory.lowStock.length})</div>
              {inventory.lowStock.length === 0 ? (
                <div className="text-sm text-masala-600 dark:text-masala-300">None</div>
              ) : (
                <ul className="space-y-1 text-sm text-masala-800 dark:text-saffron-100">
                  {inventory.lowStock.map((d) => (
                    <li key={d.name} className="flex justify-between">
                      <span className="font-semibold">{d.name}</span>
                      <span className="tabular-nums text-masala-600 dark:text-masala-300">{d.stock} left</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Panel>
      )}
    </>
  )
}

// ── Customers ─────────────────────────────────────────────────────────
function CustomersTab({ data, sym }) {
  const { customers } = data
  const counts = [
    { label: 'Today', value: customers.today },
    { label: 'This week', value: customers.week },
    { label: 'This month', value: customers.month },
    { label: 'This year', value: customers.year },
    { label: 'Lifetime', value: customers.lifetime },
  ]
  const freq = [
    { label: 'First visit', value: customers.frequency.once, sub: '1 visit' },
    { label: 'Casual', value: customers.frequency.casual, sub: '2–4 visits' },
    { label: 'Regular', value: customers.frequency.regular, sub: '5–9 visits' },
    { label: 'Loyal', value: customers.frequency.loyal, sub: '10+ visits' },
  ]
  const nvr = customers.newInWindow + customers.returningInWindow

  return (
    <>
      <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {counts.map((c) => (
          <StatCard key={c.label} label={c.label} value={fmtNum(c.value)} icon={Users} />
        ))}
      </div>
      <p className="text-xs text-masala-500 dark:text-masala-400 -mt-2">
        Counts reflect loyalty-linked customers. {fmtNum(customers.guestOrders)} orders in this window had no phone attached.
      </p>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="New vs returning (this period)" icon={Users}>
          {nvr === 0 ? (
            <EmptyNote text="No loyalty-linked orders in this window yet." />
          ) : (
            <NewVsReturning newC={customers.newInWindow} returning={customers.returningInWindow} />
          )}
        </Panel>
        <Panel title="Visit frequency" icon={Sparkles}>
          <BarList items={freq} />
        </Panel>
      </div>

      <Panel
        title="Top spending customers"
        icon={Star}
        right={<Link to="/admin/loyalty" className="text-xs font-semibold text-saffron-700 hover:underline">Loyalty desk →</Link>}
      >
        <DataTable
          head={['Customer', 'Visits', 'Total spend', 'Avg bill', 'Points']}
          rows={customers.topSpenders.map((c) => [c.name, fmtNum(c.visits), fmtMoney(c.totalSpent, sym), fmtMoney(c.avgBill, sym), fmtNum(c.points)])}
          empty="No loyalty members yet — they appear once guests share a phone number."
        />
      </Panel>
    </>
  )
}

function NewVsReturning({ newC, returning }) {
  const t = useChartTheme()
  const total = newC + returning
  const newPct = Math.round((newC / total) * 100)
  return (
    <div>
      {/* one stacked bar, 2px surface gap between segments */}
      <div className="flex h-4 rounded-full overflow-hidden" style={{ background: t.grid }}>
        <div style={{ width: `${newPct}%`, background: t.slots[0] }} />
        <div style={{ width: '2px', background: t.surface }} />
        <div style={{ flex: 1, background: t.slots[1] }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold text-masala-800 dark:text-saffron-100">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.slots[0] }} />
          New · {fmtNum(newC)} ({newPct}%)
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-masala-800 dark:text-saffron-100">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.slots[1] }} />
          Returning · {fmtNum(returning)} ({100 - newPct}%)
        </span>
      </div>
    </div>
  )
}

// ── Operations (tables · rooms · kitchen speed) ───────────────────────
function OperationsTab({ data, sym }) {
  const { tables, rooms, fulfilment, org } = data
  const topTables = tables.list.slice(0, 8)
  const leastTables = [...tables.list].sort((a, b) => a.orders - b.orders).slice(0, 5)

  return (
    <>
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <StatCard label="Table occupancy" value={`${tables.occupancyRate}%`} icon={Table2} sub={`${tables.active}/${tables.total} tables saw orders`} />
        <StatCard label="Table turnover" value={tables.turnoverPerDay} icon={TrendingUp} sub="orders per table per day" />
        <StatCard label="Avg fulfilment" value={fulfilment.avgMinutes ? `${fulfilment.avgMinutes} min` : '—'} icon={Timer} sub={`quoted avg ETA ${fulfilment.avgEta} min`} />
        <StatCard label="Ran late" value={fmtNum(fulfilment.delayedOrders)} icon={AlertTriangle} sub="well past their ETA" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Most used tables" icon={Table2}>
          <BarList
            items={topTables.map((r) => ({ label: `Table ${r.number}`, value: r.revenue, sub: `${r.orders} orders` }))}
            valueFmt={(v) => fmtMoney(v, sym)}
          />
        </Panel>
        <Panel title="Least used tables" icon={Table2}>
          <BarList
            items={leastTables.map((r) => ({ label: `Table ${r.number}`, value: r.orders, sub: fmtMoney(r.revenue, sym) }))}
            valueFmt={(v) => `${fmtNum(v)} orders`}
          />
        </Panel>
      </div>

      {org.roomServiceEnabled && (
        <>
          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <StatCard label="Rooms ordering" value={`${rooms.active}/${rooms.total}`} icon={BedDouble} sub="rooms placed orders" />
            <StatCard label="Room revenue" value={fmtMoney(rooms.revenue, sym)} icon={IndianRupee} />
            <StatCard label="Room orders" value={fmtNum(rooms.orders)} icon={ShoppingBag} />
            <StatCard label="Avg room bill" value={fmtMoney(rooms.avgBill, sym)} icon={Receipt} />
          </div>
          <Panel title="Room service revenue" icon={BedDouble}>
            <BarList
              items={rooms.list.map((r) => ({ label: `Room ${r.number}`, value: r.revenue, sub: `${r.orders} orders` }))}
              valueFmt={(v) => fmtMoney(v, sym)}
              maxBars={12}
            />
          </Panel>
        </>
      )}
    </>
  )
}

// ── Payments & tax ────────────────────────────────────────────────────
function PaymentsTab({ data, sym, taxLabel }) {
  const t = useChartTheme()
  const { payments, totals, gst } = data
  const items = Object.entries(payments.byMethod)
    .map(([m, v]) => ({
      key: m,
      label: METHOD_META[m]?.label || m,
      value: v.amount,
      sub: `${fmtNum(v.count)} · ${fmtMoney(v.amount, sym)}`,
      color: t.slots[METHOD_META[m]?.slot ?? 0],
    }))
    .sort((a, b) => b.value - a.value)

  return (
    <>
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <StatCard label="Collected" value={fmtMoney(payments.total, sym)} icon={IndianRupee} sub={`${fmtNum(payments.count)} settlements`} />
        <StatCard label="Outstanding" value={fmtMoney(totals.pendingPaymentAmount, sym)} icon={Clock} sub={`${fmtNum(totals.pendingPaymentOrders)} unpaid orders`} />
        <StatCard label={`${taxLabel} collected`} value={fmtMoney(totals.tax, sym)} icon={Receipt} sub={`on ${fmtMoney(totals.subtotal, sym)} subtotal`} />
        <StatCard label="Tips" value={fmtMoney(totals.tips, sym)} icon={Star} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Payment split" icon={Wallet}>
          <DonutChart items={items} centerLabel="Collected" centerValue={fmtCompact(payments.total, sym)} />
        </Panel>
        <Panel title={`${taxLabel} by category`} icon={Receipt} right={<span className="text-[10px] text-masala-500">apportioned by item value</span>}>
          <BarList
            items={gst.byCategory.filter((c) => c.gst > 0).map((c) => ({ label: c.name, value: c.gst }))}
            valueFmt={(v) => fmtMoney(v, sym)}
          />
        </Panel>
      </div>

      <Panel title={`${taxLabel} summary`} icon={Receipt}>
        <DataTable
          head={['Dish', `${taxLabel} (est.)`]}
          rows={gst.byDish.filter((d) => d.gst > 0).map((d) => [d.name, fmtMoney(d.gst, sym)])}
          empty={`No ${taxLabel} recorded in this window.`}
        />
      </Panel>
    </>
  )
}

// ── Feedback ──────────────────────────────────────────────────────────
function FeedbackTab({ data }) {
  const t = useChartTheme()
  const { ratings } = data
  const sentimentTotal = ratings.positive + ratings.neutral + ratings.negative

  return (
    <>
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <StatCard label="Overall rating" value={ratings.overall ? `${ratings.overall} ★` : '—'} icon={Star} sub={`${fmtNum(ratings.count)} reviews`} />
        <StatCard label="Food" value={ratings.food ? `${ratings.food} ★` : '—'} icon={ChefHat} />
        <StatCard label="Service" value={ratings.service ? `${ratings.service} ★` : '—'} icon={Users} />
        <StatCard
          label="Sentiment"
          value={sentimentTotal ? `${Math.round((ratings.positive / sentimentTotal) * 100)}% 😊` : '—'}
          icon={Sparkles}
          sub={sentimentTotal ? `${ratings.negative} unhappy` : 'no reviews yet'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Star distribution" icon={Star}>
          <BarList
            items={[...ratings.distribution].reverse().map((d) => ({
              label: `${d.star} star${d.star === 1 ? '' : 's'}`,
              value: d.count,
              color: d.star >= 4 ? '#059669' : d.star === 3 ? t.slots[4] : '#dc2626',
            }))}
            valueFmt={fmtNum}
          />
        </Panel>
        <Panel title="Recent comments" icon={MessageSquareText}>
          {ratings.comments.length === 0 ? (
            <EmptyNote text="No written feedback in this window." />
          ) : (
            <div className="space-y-2">
              {ratings.comments.map((c, i) => (
                <div key={i} className="rounded-2xl bg-cream dark:bg-masala-800/60 border border-saffron-200 dark:border-masala-700 px-3 py-2 text-sm text-masala-800 dark:text-saffron-100">
                  <div className="flex justify-between items-center text-xs text-masala-500 dark:text-masala-300">
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
        </Panel>
      </div>
    </>
  )
}
