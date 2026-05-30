import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FormattedMessage, useIntl } from 'react-intl'
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  ChefHat,
  Flame,
  Soup,
  Bell,
  HandPlatter,
  Star,
} from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { getOrder } from '../lib/api'
import { getSocket } from '../lib/socket'
import { useOrgStore } from '../store/useOrgStore'

const STAGES = [
  { key: 'received', icon: Bell },
  { key: 'queued', icon: Clock },
  { key: 'preparing', icon: ChefHat },
  { key: 'cooking', icon: Flame },
  { key: 'ready', icon: Soup },
  { key: 'served', icon: HandPlatter },
]

const TOAST_STAGES = new Set(['preparing', 'cooking', 'ready', 'served'])

const stageIndex = (status) => Math.max(0, STAGES.findIndex((s) => s.key === status))

export default function Tracking() {
  const intl = useIntl()
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const branding = useOrgStore((s) => s.branding)
  const gstRate = Number.isFinite(branding?.gstRate) ? branding.gstRate : 5
  const taxLabel = branding?.taxLabel || 'GST'

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const o = await getOrder(orderId)
        if (alive) setOrder(o)
      } catch (e) {
        if (alive) setError(e?.response?.data?.message || e.message)
      }
    }
    load()
    const socket = getSocket()
    socket.emit('join:order', orderId)
    const onUpdate = (o) => {
      if (o.id === orderId && alive) {
        setOrder((prev) => {
          if (prev && prev.status !== o.status && TOAST_STAGES.has(o.status)) {
            toast.success(intl.formatMessage({ id: `tracking.toast.${o.status}` }))
          }
          return o
        })
      }
    }
    socket.on('order:updated', onUpdate)
    const id = setInterval(load, 10000)
    return () => {
      alive = false
      clearInterval(id)
      socket.off('order:updated', onUpdate)
    }
  }, [orderId, intl])

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="card p-10 text-chilli-700 dark:text-chilli-300">{error}</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div
        className="max-w-xl mx-auto px-4 py-20 text-center"
        style={{ color: 'var(--text-muted)' }}
      >
        <FormattedMessage id="common.loading" />
      </div>
    )
  }

  const idx = stageIndex(order.status)
  const eta = Math.max(0, order.etaMinutes - Math.floor((Date.now() - new Date(order.createdAt)) / 60000))
  const served = order.status === 'served'

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 pt-6 pb-24">
      <div className="card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-saffron-200/50 dark:bg-saffron-500/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <span className="eyebrow">
              <FormattedMessage id="tracking.eyebrow" values={{ id: order.id.slice(-6).toUpperCase() }} />
            </span>
            <h1 className="section-heading mt-2">
              <FormattedMessage id={served ? 'tracking.title.served' : 'tracking.title.cooking'} />
            </h1>
            <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
              <FormattedMessage id="tracking.queue" />{' '}
              <span className="font-semibold text-saffron-600 dark:text-saffron-400">
                #{order.queuePosition || 1}
              </span>{' '}
              · <FormattedMessage id="common.table" /> {order.tableNo}
            </p>
          </div>
          <div
            className="rounded-3xl px-5 py-3 inline-flex items-center gap-3 self-start"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
          >
            <Clock className="h-5 w-5 text-saffron-600 dark:text-saffron-400" />
            <div>
              <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                <FormattedMessage id="tracking.estimated" />
              </div>
              <div className="font-display text-xl">
                {served ? (
                  <FormattedMessage id="tracking.served" />
                ) : (
                  <FormattedMessage id="tracking.eta" values={{ min: eta }} />
                )}
              </div>
            </div>
          </div>
        </div>

        <ol className="relative mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-6 gap-6">
          <span className="hidden md:block absolute top-6 left-[8%] right-[8%] h-1 bg-saffron-100 dark:bg-masala-700 rounded-full" />
          <motion.span
            className="hidden md:block absolute top-6 left-[8%] h-1 bg-curry-gradient rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(idx / (STAGES.length - 1)) * 84}%` }}
            transition={{ duration: 0.5 }}
          />
          {STAGES.map((s, i) => {
            const Icon = s.icon
            const done = i < idx
            const active = i === idx
            return (
              <li key={s.key} className="relative flex md:flex-col items-center md:items-center gap-3 md:gap-2 z-10">
                <div
                  className={clsx(
                    'h-12 w-12 rounded-full flex items-center justify-center border-2',
                    done && 'bg-emerald-500 text-white border-emerald-500',
                    active && 'bg-curry-gradient text-white border-saffron-300 shadow-warm animate-pulse',
                    !done && !active && 'bg-white dark:bg-masala-800 text-masala-400 dark:text-masala-500 border-saffron-200 dark:border-masala-700',
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : active ? (
                    <Icon className="h-5 w-5" />
                  ) : (
                    <CircleDashed className="h-5 w-5" />
                  )}
                </div>
                <div className="md:text-center">
                  <div
                    className={clsx(
                      'text-sm font-semibold',
                      !done && !active && 'opacity-60',
                    )}
                  >
                    <FormattedMessage id={`tracking.stage.${s.key}`} />
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="mt-8 grid md:grid-cols-[1fr_320px] gap-6">
        <div className="card p-6">
          <h2 className="font-display text-xl"><FormattedMessage id="tracking.yourDishes" /></h2>
          <ul className="mt-4 divide-y divide-saffron-100 dark:divide-masala-700">
            {order.items.map((it) => (
              <li key={`${it.dishId}-${it.instructions}`} className="py-3 flex justify-between gap-4">
                <div>
                  <div className="font-semibold">
                    {it.name} <span className="opacity-60">× {it.qty}</span>
                  </div>
                  {it.instructions && (
                    <div className="text-xs text-saffron-600 dark:text-saffron-400 mt-0.5">
                      <FormattedMessage id="tracking.note" values={{ note: it.instructions }} />
                    </div>
                  )}
                </div>
                <div className="font-display text-lg">₹{it.price * it.qty}</div>
              </li>
            ))}
          </ul>
        </div>

        <aside className="card p-6">
          <h3 className="font-display text-lg"><FormattedMessage id="tracking.bill" /></h3>
          <div className="mt-3 text-sm space-y-1.5">
            <div className="flex justify-between"><span><FormattedMessage id="common.subtotal" /></span><span>₹{order.amounts.subtotal}</span></div>
            <div className="flex justify-between"><span><FormattedMessage id="common.tax" values={{ label: taxLabel, rate: gstRate }} /></span><span>₹{order.amounts.tax}</span></div>
            <div className="flex justify-between font-semibold pt-2 border-t border-saffron-200 dark:border-masala-700 mt-2">
              <span><FormattedMessage id="common.total" /></span><span>₹{order.amounts.total}</span>
            </div>
          </div>
          <div className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            <FormattedMessage id="tracking.payment" />: {order.payment.method.toUpperCase()} · {order.payment.status}
          </div>

          {served && (
            <button onClick={() => navigate(`/rate/${order.id}`)} className="btn-primary w-full mt-5">
              <Star className="h-4 w-4" /> <FormattedMessage id="tracking.rate" />
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}
