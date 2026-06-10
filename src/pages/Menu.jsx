import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FormattedMessage, useIntl } from 'react-intl'
import { Search, Plus, Leaf, AlertCircle, Pencil, X, ArrowRight, Loader2, Receipt, ClipboardList, ChefHat } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { fetchMenu, fetchCategories, fetchTable, fetchLocationTab } from '../lib/api'
import { locationLabel, orderLabel } from '../lib/location'
import { useSessionStore, selectCartCount, selectCartSubtotal } from '../store/useSessionStore'
import { useOrgStore } from '../store/useOrgStore'
import SpiceMeter from '../components/SpiceMeter'
import DishImage from '../components/DishImage'

// Stable category IDs from the DB map to translated labels.
function categoryLabel(intl, c) {
  const key = `category.${c.id}`
  const translated = intl.formatMessage({ id: key, defaultMessage: c.name })
  return translated
}

export default function Menu() {
  const intl = useIntl()
  const navigate = useNavigate()
  const tableNo = useSessionStore((s) => s.tableNo)
  const serviceType = useSessionStore((s) => s.serviceType)
  const setTable = useSessionStore((s) => s.setTable)
  const addItem = useSessionStore((s) => s.addItem)
  const cartCount = useSessionStore(selectCartCount)
  const cartTotal = useSessionStore(selectCartSubtotal)

  const [menu, setMenu] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCat, setActiveCat] = useState('all')
  const [query, setQuery] = useState('')
  const [vegOnly, setVegOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [changingTable, setChangingTable] = useState(false)
  const [tab, setTab] = useState(null)
  const [tabOpen, setTabOpen] = useState(false)

  const isTakeaway = serviceType === 'takeaway'

  useEffect(() => {
    // Takeaway has no tableNo; table/room must have one to be a valid session.
    if (!tableNo && !isTakeaway) {
      navigate('/')
      return
    }
    Promise.all([fetchMenu(), fetchCategories()])
      .then(([m, c]) => {
        setMenu(m)
        setCategories(c)
        setLoading(false)
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load menu')
        setLoading(false)
      })
  }, [navigate, tableNo, isTakeaway])

  // Keep the running tab fresh: on mount, when the tab is opened, and every
  // time the customer brings the tab back into focus (e.g. after placing an
  // order and tapping "back"). No realtime socket — polling on focus is enough.
  useEffect(() => {
    // Takeaway orders are independent — no shared running tab to poll.
    if (!tableNo || isTakeaway) return
    let alive = true
    const refresh = () => {
      fetchLocationTab(serviceType, tableNo)
        .then((t) => alive && setTab(t))
        .catch(() => {})
    }
    refresh()
    const onFocus = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', refresh)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', refresh)
    }
  }, [tableNo, serviceType, tabOpen, isTakeaway])

  const filtered = useMemo(() => {
    return menu.filter((d) => {
      if (activeCat !== 'all' && d.categoryId !== activeCat) return false
      if (vegOnly && !d.isVeg) return false
      if (
        query.trim() &&
        !`${d.name} ${d.description}`.toLowerCase().includes(query.toLowerCase())
      )
        return false
      return true
    })
  }, [menu, activeCat, vegOnly, query])

  const grouped = useMemo(() => {
    if (activeCat !== 'all') return [{ id: activeCat, items: filtered }]
    return categories.map((c) => ({
      ...c,
      items: filtered.filter((d) => d.categoryId === c.id),
    }))
  }, [filtered, activeCat, categories])

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6 pb-32">
      <section className="mb-6">
        <span className="eyebrow">
          <FormattedMessage id="menu.eyebrow" />
        </span>
        <h1 className="section-heading mt-2">
          <FormattedMessage id="menu.title" />
        </h1>
        <p className="mt-1 max-w-xl" style={{ color: 'var(--text-muted)' }}>
          <FormattedMessage
            id="menu.subtitle"
            values={{
              table:
                isTakeaway ? (
                  <span className="font-semibold text-saffron-600 dark:text-saffron-400">
                    <FormattedMessage id="common.takeaway" />
                  </span>
                ) : serviceType === 'room' ? (
                  <span className="font-semibold text-saffron-600 dark:text-saffron-400">
                    <FormattedMessage id="common.room" /> {tableNo}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setChangingTable(true)}
                    className="inline-flex items-center gap-1 font-semibold text-saffron-600 dark:text-saffron-400 hover:text-saffron-700 dark:hover:text-saffron-300 underline decoration-saffron-300/60 decoration-dotted underline-offset-4"
                    title={intl.formatMessage({ id: 'menu.changeTable' })}
                  >
                    <FormattedMessage id="common.table" /> {tableNo}
                    <Pencil className="h-3 w-3 opacity-70" />
                  </button>
                ),
            }}
          />
        </p>

        {tab && tab.orderCount > 0 && (
          <button
            type="button"
            onClick={() => setTabOpen(true)}
            className="mt-4 group inline-flex items-center gap-3 rounded-2xl bg-curry-gradient text-white px-4 py-3 shadow-warm hover:shadow-plate transition"
          >
            <div className="h-10 w-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="text-left leading-tight">
              <div className="text-[10px] uppercase tracking-[0.25em] opacity-80">
                <FormattedMessage id="menu.tab.eyebrow" />
              </div>
              <div className="font-display text-xl">
                ₹{tab.totals.total}
              </div>
              <div className="text-[11px] opacity-90">
                <FormattedMessage
                  id="menu.tab.summary"
                  values={{ count: tab.orderCount, items: tab.totals.items }}
                />
              </div>
            </div>
            <ArrowRight className="h-4 w-4 opacity-80 group-hover:translate-x-1 transition" />
          </button>
        )}
      </section>

      <div className="card p-3 md:p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div
          className="flex items-center gap-2 flex-1 px-3 py-2 rounded-full border"
          style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
        >
          <Search className="h-4 w-4 opacity-60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={intl.formatMessage({ id: 'menu.search' })}
            className="flex-1 bg-transparent outline-none text-sm py-1"
            style={{ color: 'var(--text)' }}
          />
        </div>
        <button
          onClick={() => setVegOnly((v) => !v)}
          className={clsx(
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition border',
            vegOnly
              ? 'bg-emerald-600 text-white border-transparent shadow-warm'
              : 'bg-white dark:bg-masala-800 text-masala-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-50 dark:hover:bg-masala-700',
          )}
        >
          <Leaf className="h-4 w-4" /> <FormattedMessage id="menu.pureVeg" />
        </button>
      </div>

      <div className="mt-5 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          <CategoryPill
            label={intl.formatMessage({ id: 'menu.all' })}
            active={activeCat === 'all'}
            onClick={() => setActiveCat('all')}
          />
          {categories.map((c) => (
            <CategoryPill
              key={c.id}
              label={categoryLabel(intl, c)}
              icon={c.emoji}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
            />
          ))}
        </div>
      </div>

      {loading && <SkeletonGrid />}

      {error && (
        <div className="mt-10 card p-6 text-center text-chilli-700 dark:text-chilli-300">
          <AlertCircle className="mx-auto mb-2" /> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="mt-8 space-y-10">
          {grouped.map((cat) => {
            if (!cat.items.length) return null
            const catInfo = categories.find((c) => c.id === cat.id)
            return (
              <section key={cat.id || cat.name}>
                {activeCat === 'all' && catInfo && (
                  <div className="flex items-end justify-between mb-4">
                    <h2 className="font-display text-2xl">
                      {catInfo.emoji} {categoryLabel(intl, catInfo)}
                    </h2>
                    <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      <FormattedMessage id="menu.dishesCount" values={{ count: cat.items.length }} />
                    </span>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {cat.items.map((d, idx) => (
                    <DishCard
                      key={d.id}
                      dish={d}
                      onAdd={() => {
                        addItem(d)
                        toast.success(intl.formatMessage({ id: 'menu.added' }, { name: d.name }))
                      }}
                      delay={idx * 0.04}
                    />
                  ))}
                </div>
              </section>
            )
          })}
          {grouped.every((g) => !g.items.length) && (
            <div className="card p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <FormattedMessage id="menu.noMatch" />
            </div>
          )}
        </div>
      )}

      {cartCount > 0 && (
        <motion.button
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => navigate('/cart')}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-curry-gradient text-white rounded-full shadow-plate px-6 py-3.5 flex items-center gap-3 font-semibold"
        >
          <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm">
            {cartCount}
          </span>
          <FormattedMessage id="menu.viewCart" />
          <span className="opacity-80">·</span>
          <span>₹{cartTotal}</span>
        </motion.button>
      )}

      <AnimatePresence>
        {changingTable && (
          <ChangeTableDialog
            currentTable={tableNo}
            onClose={() => setChangingTable(false)}
            onApply={(newNo) => {
              setTable(newNo)
              setChangingTable(false)
              toast.success(
                intl.formatMessage(
                  { id: 'menu.changeTableSuccess' },
                  { table: newNo },
                ),
              )
            }}
          />
        )}
        {tabOpen && tab && (
          <TableTabSheet
            tab={tab}
            tableNo={tableNo}
            serviceType={serviceType}
            onClose={() => setTabOpen(false)}
            onTrack={(orderId) => navigate(`/track/${orderId}`)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

const ORDER_STAGES = ['received', 'queued', 'preparing', 'cooking', 'ready', 'served']
const STAGE_LABEL_ID = {
  received: 'tracking.stage.received',
  queued: 'tracking.stage.queued',
  preparing: 'tracking.stage.preparing',
  cooking: 'tracking.stage.cooking',
  ready: 'tracking.stage.ready',
  served: 'tracking.stage.served',
}

function TableTabSheet({ tab, tableNo, serviceType, onClose, onTrack }) {
  const branding = useOrgStore((s) => s.branding)
  const gstRate = Number.isFinite(branding?.gstRate) ? branding.gstRate : 5
  const taxLabel = branding?.taxLabel || 'GST'
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-masala-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card !rounded-b-none md:!rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col"
      >
        <div className="p-6 pb-4 flex items-start justify-between gap-3 border-b border-saffron-200/70 dark:border-masala-700">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-saffron-600 dark:text-saffron-300">
              <FormattedMessage id="menu.tab.title" />
            </div>
            <h2 className="font-display text-3xl" style={{ color: 'var(--text)' }}>
              <FormattedMessage id={serviceType === 'room' ? 'common.room' : 'common.table'} /> {tableNo}
            </h2>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              <FormattedMessage
                id="menu.tab.summary"
                values={{ count: tab.orderCount, items: tab.totals.items }}
              />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
          {tab.orders.map((o) => (
            <TabOrderRow key={o.id} order={o} onTrack={() => onTrack(o.id)} />
          ))}
        </div>

        <div className="border-t border-saffron-200/70 dark:border-masala-700 px-6 py-5 space-y-2 bg-saffron-50/50 dark:bg-masala-800/40">
          <Row label={<FormattedMessage id="common.subtotal" />} value={tab.totals.subtotal} />
          <Row label={<FormattedMessage id="common.tax" values={{ label: taxLabel, rate: gstRate }} />} value={tab.totals.tax} />
          {tab.totals.discount > 0 && (
            <Row
              label={<FormattedMessage id="cart.loyalty.discount" />}
              value={-tab.totals.discount}
              accent
            />
          )}
          <Row label={<FormattedMessage id="common.total" />} value={tab.totals.total} bold />
          <p className="text-[11px] pt-1" style={{ color: 'var(--text-muted)' }}>
            <FormattedMessage id="menu.tab.unpaidHint" />
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

function TabOrderRow({ order, onTrack }) {
  const intl = useIntl()
  const stageIdx = ORDER_STAGES.indexOf(order.status)
  const stageLabel = intl.formatMessage({
    id: STAGE_LABEL_ID[order.status] || 'tracking.stage.received',
  })
  const placedAt = new Date(order.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <div className="rounded-2xl border border-saffron-200/80 dark:border-masala-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {orderLabel(order)} · {placedAt}
          </div>
          <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>
            <FormattedMessage
              id="menu.tab.itemCount"
              values={{ count: order.itemCount }}
            />
          </div>
        </div>
        <div className="font-display text-lg" style={{ color: 'var(--text)' }}>
          ₹{order.amounts?.total}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full bg-saffron-100 dark:bg-masala-700 text-saffron-800 dark:text-saffron-200">
          <ChefHat className="h-3 w-3" /> {stageLabel}
        </span>
        <div className="flex-1 h-1.5 bg-saffron-100 dark:bg-masala-700 rounded-full overflow-hidden min-w-[80px]">
          <div
            className="h-full bg-curry-gradient transition-all"
            style={{
              width: `${Math.max(0, Math.min(1, (stageIdx + 1) / ORDER_STAGES.length)) * 100}%`,
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onTrack}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border border-saffron-300 dark:border-masala-600 hover:bg-saffron-50 dark:hover:bg-masala-700"
        style={{ color: 'var(--text)' }}
      >
        <ClipboardList className="h-3.5 w-3.5" />
        <FormattedMessage id="menu.tab.track" />
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function Row({ label, value, bold, accent }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span
        className={clsx(
          bold && 'font-display text-xl',
          accent && 'text-emerald-700 dark:text-emerald-300',
        )}
        style={!bold && !accent ? { color: 'var(--text)' } : undefined}
      >
        ₹{value}
      </span>
    </div>
  )
}

function ChangeTableDialog({ currentTable, onClose, onApply }) {
  const intl = useIntl()
  const sessionId = useSessionStore((s) => s.sessionId)
  const [value, setValue] = useState(String(currentTable || ''))
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const trimmed = value.trim()
  const isSame = trimmed && trimmed === String(currentTable)

  const submit = async (e) => {
    e?.preventDefault()
    if (!trimmed || isSame) return
    setChecking(true)
    setError('')
    try {
      const table = await fetchTable(trimmed, sessionId || undefined)
      if (table.occupiedBy === 'other') {
        setError(intl.formatMessage({ id: 'menu.changeTableOccupied' }, { table: trimmed }))
        return
      }
      onApply(trimmed)
    } catch (err) {
      if (err?.response?.status === 404) {
        setError(intl.formatMessage({ id: 'menu.changeTableNotFound' }))
      } else {
        setError(err?.response?.data?.message || err.message)
      }
    } finally {
      setChecking(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-masala-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
    >
      <motion.form
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="card p-6 w-full max-w-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-saffron-600 dark:text-saffron-300">
              <FormattedMessage id="common.table" />
            </div>
            <h2 className="font-display text-2xl" style={{ color: 'var(--text)' }}>
              <FormattedMessage id="menu.changeTableTitle" />
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700"
            aria-label={intl.formatMessage({ id: 'common.close' })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
          <FormattedMessage id="menu.changeTableHint" />
        </p>

        <div
          className="mt-5 flex items-center gap-2 rounded-2xl border px-3 py-2.5"
          style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
        >
          <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>
            <FormattedMessage id="common.table" />
          </span>
          <input
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              if (error) setError('')
            }}
            inputMode="numeric"
            placeholder={intl.formatMessage({ id: 'menu.changeTablePlaceholder' })}
            className="flex-1 bg-transparent outline-none text-lg font-semibold"
            style={{ color: 'var(--text)' }}
          />
        </div>

        {error && (
          <div className="mt-3 text-xs text-chilli-700 dark:text-chilli-300 bg-chilli-50 dark:bg-chilli-900/20 border border-chilli-200 dark:border-chilli-800 rounded-xl px-3 py-2">
            <AlertCircle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
          >
            <FormattedMessage id="common.cancel" />
          </button>
          <button
            type="submit"
            disabled={!trimmed || isSame || checking}
            className="btn-primary"
          >
            {checking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            <FormattedMessage id="menu.changeTableSave" />
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}

function CategoryPill({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition border',
        active
          ? 'bg-curry-gradient text-white border-transparent shadow-warm'
          : 'bg-white dark:bg-masala-800 text-masala-800 dark:text-saffron-200 border-saffron-200 dark:border-masala-700 hover:bg-saffron-50 dark:hover:bg-masala-700',
      )}
    >
      {icon && <span className="mr-1.5">{icon}</span>}
      {label}
    </button>
  )
}

function DishCard({ dish, onAdd, delay }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className="card overflow-hidden flex flex-col group"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <DishImage
          src={dish.image}
          alt={dish.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
        <div className="absolute top-3 left-3">
          <span className={dish.isVeg ? 'veg-dot' : 'nonveg-dot'} />
        </div>
        {!dish.available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-sm font-semibold uppercase tracking-wider">
              <FormattedMessage id="common.soldOut" />
            </span>
          </div>
        )}
        {dish.tag && (
          <span className="absolute top-3 right-3 chip !bg-white/95 !text-chilli-700 border-chilli-200">
            {dish.tag}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight">{dish.name}</h3>
          <SpiceMeter level={dish.spice} />
        </div>
        <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
          {dish.description}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <div className="font-display text-xl">₹{dish.price}</div>
          <button
            onClick={onAdd}
            disabled={!dish.available}
            className="btn-primary !py-2 !px-4 text-sm"
          >
            <Plus className="h-4 w-4" /> <FormattedMessage id="menu.add" />
          </button>
        </div>
      </div>
    </motion.article>
  )
}

function SkeletonGrid() {
  return (
    <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="aspect-[4/3] rounded-2xl bg-saffron-100 dark:bg-masala-800" />
          <div className="h-4 bg-saffron-100 dark:bg-masala-800 rounded mt-4 w-2/3" />
          <div className="h-3 bg-saffron-100 dark:bg-masala-800 rounded mt-2 w-full" />
          <div className="h-3 bg-saffron-100 dark:bg-masala-800 rounded mt-2 w-1/2" />
        </div>
      ))}
    </div>
  )
}
