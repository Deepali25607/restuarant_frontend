import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChefHat,
  Clock,
  Flame,
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  LogOut,
  KeyRound,
  AlertTriangle,
  Soup,
  HandPlatter,
  Volume2,
  VolumeX,
} from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/useAuthStore'
import { fetchAdminOrders, setOrderStatus } from '../../lib/api'
import { getSocket } from '../../lib/socket'
import ThemeToggle from '../../components/ThemeToggle'
import ChangePasswordModal from '../../components/ChangePasswordModal'
import { locationLabel } from '../../lib/location'
import {
  getPrefs,
  setPrefs,
  subscribePrefs,
  notificationPermission,
  requestNotificationPermission,
  primeAudio,
  notifyNewOrder,
  bumpTabBadge,
  attachVisibilityClearer,
} from '../../lib/alerts'

const FILTERS = [
  { key: 'pending', label: 'New', statuses: ['received', 'queued'], icon: Bell },
  { key: 'preparing', label: 'Preparing', statuses: ['preparing', 'cooking'], icon: ChefHat },
  { key: 'ready', label: 'Ready', statuses: ['ready'], icon: Soup },
  { key: 'completed', label: 'Served', statuses: ['served'], icon: CheckCircle2 },
]

export default function KitchenDashboard() {
  const navigate = useNavigate()
  const { user, token, logout } = useAuthStore()

  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('pending')
  const [error, setError] = useState('')
  const [pwOpen, setPwOpen] = useState(false)
  const [prefs, setLocalPrefs] = useState(() => getPrefs())
  const [permission, setPermission] = useState(() => notificationPermission())

  useEffect(() => {
    const unsubPrefs = subscribePrefs(setLocalPrefs)
    const detachVis = attachVisibilityClearer()
    return () => {
      unsubPrefs()
      detachVis()
    }
  }, [])

  useEffect(() => {
    if (!token) return
    let alive = true
    fetchAdminOrders()
      .then((data) => alive && setOrders(data))
      .catch((e) => alive && setError(e?.response?.data?.message || e.message))

    const socket = getSocket()
    socket.emit('join:kitchen')
    const onNew = (order) => {
      setOrders((prev) => (prev.find((o) => o.id === order.id) ? prev : [order, ...prev]))
      toast.success(`New order · ${locationLabel(order)}`, {
        description: `${order.items.length} item${order.items.length > 1 ? 's' : ''} · ₹${order.amounts?.total}`,
      })
      notifyNewOrder(order)
      bumpTabBadge()
    }
    const onUpdate = (order) =>
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)))
    const onLowStock = (d) =>
      toast.warning(`"${d.name}" is running low`, {
        description: `Only ${d.stock} portions left`,
      })
    const onOutOfStock = (d) =>
      toast.error(`"${d.name}" sold out`, {
        description: 'Customers can no longer order this until restocked.',
      })
    socket.on('order:new', onNew)
    socket.on('order:updated', onUpdate)
    socket.on('dish:lowStock', onLowStock)
    socket.on('dish:outOfStock', onOutOfStock)
    return () => {
      alive = false
      socket.off('order:new', onNew)
      socket.off('order:updated', onUpdate)
      socket.off('dish:lowStock', onLowStock)
      socket.off('dish:outOfStock', onOutOfStock)
    }
  }, [token])

  const enableAlerts = async () => {
    const audioOk = await primeAudio()
    const perm = await requestNotificationPermission()
    setPermission(perm)
    setPrefs({ sound: audioOk, push: perm === 'granted' })
    if (perm === 'granted') {
      toast.success('Alerts enabled · sound + browser push')
    } else if (perm === 'denied') {
      toast.error("Browser blocked notifications — enable from site settings")
    } else if (audioOk) {
      toast.message('Sound alerts on (browser push not granted)')
    }
  }

  const toggleSound = async () => {
    if (!prefs.sound) await primeAudio()
    setPrefs({ sound: !prefs.sound })
  }

  const togglePush = async () => {
    if (!prefs.push) {
      const perm = await requestNotificationPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        toast.error('Browser push not allowed')
        return
      }
    }
    setPrefs({ push: !prefs.push })
  }

  if (!token || !user) {
    return <Navigate to="/admin/login" replace state={{ from: '/kitchen' }} />
  }

  const counts = useMemo(() => {
    const c = {}
    FILTERS.forEach((f) => {
      c[f.key] = orders.filter((o) => f.statuses.includes(o.status)).length
    })
    return c
  }, [orders])

  const filter = FILTERS.find((f) => f.key === tab)
  const visible = orders
    .filter((o) => filter.statuses.includes(o.status))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  const updateStatus = async (id, next) => {
    try {
      await setOrderStatus(id, next)
      toast.message(`Moved to "${next}"`)
    } catch (e) {
      const msg = e?.response?.data?.message || e.message
      toast.error(msg)
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-cream/80 dark:bg-masala-900/70 border-b border-saffron-200/60 dark:border-masala-700/60">
        <div className="px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-curry-gradient flex items-center justify-center shadow-warm">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg text-masala-900">Kitchen Console</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-saffron-700">
                {user.name} · {user.role}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertsControl
              prefs={prefs}
              permission={permission}
              onEnable={enableAlerts}
              onToggleSound={toggleSound}
              onTogglePush={togglePush}
            />
            <ThemeToggle />
            <button onClick={() => setPwOpen(true)} className="btn-ghost">
              <KeyRound className="h-4 w-4" /> Password
            </button>
            <button
              onClick={() => {
                logout()
                navigate('/admin/login')
              }}
              className="btn-ghost"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
        <div className="px-4 md:px-8 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => {
            const Icon = f.icon
            return (
              <button
                key={f.key}
                onClick={() => setTab(f.key)}
                className={clsx(
                  'whitespace-nowrap inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition border',
                  tab === f.key
                    ? 'bg-curry-gradient text-white border-transparent shadow-warm'
                    : 'bg-white text-masala-800 border-saffron-200 hover:bg-saffron-50',
                )}
              >
                <Icon className="h-4 w-4" />
                {f.label}
                <span
                  className={clsx(
                    'rounded-full px-1.5 text-[11px]',
                    tab === f.key ? 'bg-white/25' : 'bg-saffron-100 text-saffron-800',
                  )}
                >
                  {counts[f.key] || 0}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      <main className="px-4 md:px-8 py-6">
        {error && (
          <div className="card p-4 text-chilli-700 mb-4">
            <AlertTriangle className="inline mr-2 h-4 w-4" />
            {error}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="card p-10 text-center text-masala-700">
            All clear in {filter.label.toLowerCase()}. Enjoy a chai. ☕
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {visible.map((o) => (
                <KOTCard
                  key={o.id}
                  order={o}
                  onAdvance={(next) => updateStatus(o.id, next)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}

function AlertsControl({ prefs, permission, onEnable, onToggleSound, onTogglePush }) {
  // First-time state: no permission decision yet AND user hasn't enabled.
  const needsSetup = permission === 'default'

  if (needsSetup) {
    return (
      <button
        onClick={onEnable}
        className="btn-primary !py-2 !px-3 text-xs animate-pulse"
        title="Sound + browser notification when a new order arrives"
      >
        <BellRing className="h-4 w-4" /> Enable alerts
      </button>
    )
  }

  if (permission === 'unsupported') {
    return (
      <span className="chip" title="This browser doesn't support notifications">
        <BellOff className="h-3.5 w-3.5" /> No push
      </span>
    )
  }

  return (
    <div className="hidden sm:flex items-center gap-1 bg-white border border-saffron-200 rounded-full p-1">
      <button
        onClick={onToggleSound}
        title={prefs.sound ? 'Mute chime' : 'Unmute chime'}
        className={clsx(
          'h-8 w-8 rounded-full flex items-center justify-center transition',
          prefs.sound ? 'bg-curry-gradient text-white shadow-warm' : 'text-masala-600 hover:bg-saffron-100',
        )}
      >
        {prefs.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
      <button
        onClick={onTogglePush}
        disabled={permission === 'denied'}
        title={
          permission === 'denied'
            ? 'Browser blocked — change in site settings'
            : prefs.push
              ? 'Turn off browser push'
              : 'Turn on browser push'
        }
        className={clsx(
          'h-8 w-8 rounded-full flex items-center justify-center transition disabled:opacity-40',
          prefs.push && permission === 'granted'
            ? 'bg-curry-gradient text-white shadow-warm'
            : 'text-masala-600 hover:bg-saffron-100',
        )}
      >
        {prefs.push && permission === 'granted' ? (
          <BellRing className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}

const NEXT_FOR_KITCHEN = {
  received: { next: 'preparing', label: 'Start preparing' },
  queued: { next: 'preparing', label: 'Start preparing' },
  preparing: { next: 'cooking', label: 'On the fire' },
  cooking: { next: 'ready', label: 'Mark ready' },
  ready: { next: 'served', label: 'Mark served' },
  served: null,
}

function KOTCard({ order, onAdvance }) {
  const placedAt = new Date(order.createdAt)
  const ageMin = Math.floor((Date.now() - placedAt) / 60000)
  const urgent = ageMin > order.etaMinutes
  const action = NEXT_FOR_KITCHEN[order.status]

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={clsx(
        'card p-4 flex flex-col gap-3 border-l-4',
        urgent ? 'border-l-chilli-600 shadow-plate' : 'border-l-saffron-400',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-masala-600">
            {order.serviceType === 'room' ? 'Room' : 'Table'}
          </div>
          <div className="font-display text-3xl text-masala-900 leading-none">
            {locationLabel(order, { short: true })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-masala-500">
            #{order.id.slice(-6).toUpperCase()}
          </div>
          <div
            className={clsx(
              'inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded-full',
              urgent
                ? 'bg-chilli-100 text-chilli-800'
                : 'bg-saffron-100 text-saffron-800',
            )}
          >
            <Clock className="h-3 w-3" />
            {ageMin} min
          </div>
        </div>
      </div>

      <ul className="space-y-1.5">
        {order.items.map((it, i) => (
          <li key={i} className="text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-masala-900">
                {it.qty} × {it.name}
              </span>
            </div>
            {it.instructions && (
              <div className="mt-0.5 text-[11px] text-chilli-700 bg-chilli-50 border border-chilli-100 rounded-lg px-2 py-0.5 inline-block">
                ✎ {it.instructions}
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-2 border-t border-saffron-200/70 flex items-center justify-between">
        <span
          className={clsx(
            'text-[11px] font-bold uppercase tracking-widest',
            order.status === 'ready'
              ? 'text-emerald-700'
              : order.status === 'cooking'
                ? 'text-chilli-700'
                : 'text-saffron-700',
          )}
        >
          {order.status}
        </span>
        {action && (
          <button
            onClick={() => onAdvance(action.next)}
            className="btn-primary !py-1.5 !px-3 text-xs"
          >
            {action.next === 'served' ? <HandPlatter className="h-3.5 w-3.5" /> : <ChefHat className="h-3.5 w-3.5" />}
            {action.label}
          </button>
        )}
      </div>
    </motion.article>
  )
}
