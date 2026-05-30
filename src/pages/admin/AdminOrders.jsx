import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Filter, ChefHat, Bell, CheckCircle2, Clock, Flame, HandPlatter, Soup, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { fetchAdminOrders, setOrderStatus } from '../../lib/api'
import { getSocket } from '../../lib/socket'

const STATUSES = [
  { key: 'received', label: 'Received', icon: Bell, tone: 'bg-saffron-100 text-saffron-800' },
  { key: 'queued', label: 'Queued', icon: Clock, tone: 'bg-amber-100 text-amber-800' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, tone: 'bg-orange-100 text-orange-800' },
  { key: 'cooking', label: 'Cooking', icon: Flame, tone: 'bg-chilli-100 text-chilli-800' },
  { key: 'ready', label: 'Ready', icon: Soup, tone: 'bg-emerald-100 text-emerald-800' },
  { key: 'served', label: 'Served', icon: HandPlatter, tone: 'bg-masala-100 text-masala-800' },
]

const nextStatusOf = (current) => {
  const i = STATUSES.findIndex((s) => s.key === current)
  if (i < 0 || i >= STATUSES.length - 1) return null
  return STATUSES[i + 1]
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('active')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetchAdminOrders()
      .then((d) => alive && setOrders(d))
      .catch((e) => alive && setError(e?.response?.data?.message || e.message))
    const socket = getSocket()
    socket.emit('join:admin')
    const onNew = (o) => {
      setOrders((prev) => (prev.find((x) => x.id === o.id) ? prev : [o, ...prev]))
      toast.success(`Table ${o.tableNo} · new order`, { description: `₹${o.amounts?.total}` })
    }
    const onUpdate = (o) =>
      setOrders((prev) => prev.map((x) => (x.id === o.id ? o : x)))
    const onPaid = (o) => {
      setOrders((prev) => prev.map((x) => (x.id === o.id ? o : x)))
      toast.success(`Table ${o.tableNo} · payment received`, { description: `${o.payment.method.toUpperCase()} · ₹${o.amounts.total}` })
    }
    socket.on('order:new', onNew)
    socket.on('order:updated', onUpdate)
    socket.on('order:paid', onPaid)
    return () => {
      alive = false
      socket.off('order:new', onNew)
      socket.off('order:updated', onUpdate)
      socket.off('order:paid', onPaid)
    }
  }, [])

  const visible = orders.filter((o) =>
    filter === 'all' ? true : filter === 'active' ? o.status !== 'served' : o.status === filter,
  )

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="eyebrow"><Activity className="h-3.5 w-3.5" /> Real-time</span>
          <h1 className="section-heading mt-1">Live orders</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Push each order to the next stage as the kitchen makes progress.
          </p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          <FilterPill active={filter === 'active'} onClick={() => setFilter('active')} icon={<Filter className="h-3.5 w-3.5" />} label="Active" />
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
          {STATUSES.map((s) => (
            <FilterPill
              key={s.key}
              active={filter === s.key}
              onClick={() => setFilter(s.key)}
              icon={<s.icon className="h-3.5 w-3.5" />}
              label={s.label}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="card p-4 text-chilli-700">
          <AlertTriangle className="inline mr-2 h-4 w-4" />
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="card p-10 text-center text-masala-700">
          No orders match this filter.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onSetStatus={async (next) => {
                try {
                  await setOrderStatus(o.id, next)
                  const target = STATUSES.find((s) => s.key === next)
                  toast.success(`T${o.tableNo} → ${target?.label || next}`)
                } catch (e) {
                  setError(e?.response?.data?.message || e.message)
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterPill({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'whitespace-nowrap inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition border',
        active
          ? 'bg-curry-gradient text-white border-transparent shadow-warm'
          : 'bg-white text-masala-800 border-saffron-200 hover:bg-saffron-50',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function OrderCard({ order, onSetStatus }) {
  const status = STATUSES.find((s) => s.key === order.status) || STATUSES[0]
  const next = nextStatusOf(order.status)
  const ageMin = Math.floor((Date.now() - new Date(order.createdAt)) / 60000)
  const [pushing, setPushing] = useState(false)

  const push = async (target) => {
    setPushing(true)
    try {
      await onSetStatus(target)
    } finally {
      setPushing(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-masala-600 dark:text-saffron-300">
            Table
          </div>
          <div className="font-display text-2xl leading-none" style={{ color: 'var(--text)' }}>
            T{order.tableNo}
          </div>
          <div className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
            #{order.id.slice(-6).toUpperCase()}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', status.tone)}>
            <status.icon className="h-3 w-3" />
            {status.label}
          </span>
          <span className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Clock className="h-3 w-3" /> {ageMin} min
          </span>
        </div>
      </div>

      <ul className="text-sm space-y-1">
        {order.items.map((it, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span>
              {it.qty} × <span className="font-medium">{it.name}</span>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>₹{it.qty * it.price}</span>
          </li>
        ))}
      </ul>

      <div className="pt-2 border-t border-saffron-200/70 dark:border-masala-700 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg" style={{ color: 'var(--text)' }}>
            ₹{order.amounts?.total}
          </span>
          <select
            value={order.status}
            onChange={(e) => push(e.target.value)}
            disabled={pushing}
            title="Jump to any stage"
            className="text-xs font-semibold rounded-full border border-saffron-300 dark:border-masala-600 bg-white dark:bg-masala-800 px-3 py-1.5 outline-none focus:border-saffron-500"
            style={{ color: 'var(--text)' }}
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                Jump to: {s.label}
              </option>
            ))}
          </select>
        </div>

        {next ? (
          <button
            type="button"
            onClick={() => push(next.key)}
            disabled={pushing}
            className="btn-primary w-full justify-center !py-2 text-sm"
          >
            {pushing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Push to {next.label}
          </button>
        ) : (
          <div className="text-xs flex items-center justify-center gap-1.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Order served — nothing more to do
          </div>
        )}
      </div>
    </motion.div>
  )
}
