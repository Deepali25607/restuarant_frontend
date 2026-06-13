import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  BadgeIndianRupee,
  CreditCard,
  QrCode,
  Banknote,
  Coins,
  CheckCircle2,
  Receipt,
  X,
  Split,
  LogOut,
  LayoutGrid,
  KeyRound,
  Flame,
  Printer,
  Zap,
  Sparkles,
  Phone,
  Clock,
} from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/useAuthStore'
import {
  fetchBillingTables,
  markOrderPaid,
  markOrderPayLater,
  splitBill,
  paymentStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
  loyaltyLookup,
  fetchOrgBranding,
} from '../../lib/api'
import { openRazorpayCheckout } from '../../lib/razorpay'
import { getSocket } from '../../lib/socket'
import ThemeToggle from '../../components/ThemeToggle'
import ChangePasswordModal from '../../components/ChangePasswordModal'
import { locationLabel, orderLabel, orderNo } from '../../lib/location'

export default function CashierPortal() {
  const { user, token, logout } = useAuthStore()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [active, setActive] = useState(null) // { tableNo, orders, total }
  const [paidToday, setPaidToday] = useState(0)
  const [error, setError] = useState('')
  const [rzpReady, setRzpReady] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [pwOpen, setPwOpen] = useState(false)

  useEffect(() => {
    paymentStatus()
      .then((s) => setRzpReady(Boolean(s.configured)))
      .catch(() => {})
  }, [])

  // Pull the restaurant's payment QR (public branding) so we can print it on
  // receipts for customers who'd rather scan-and-pay at the table.
  useEffect(() => {
    const key = user?.organization?.slug || user?.organization?.id
    if (!key) return
    fetchOrgBranding(key)
      .then((b) => setQrUrl(b.paymentQrUrl || ''))
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!token) return
    let alive = true
    const load = async () => {
      try {
        const data = await fetchBillingTables()
        if (alive) setGroups(data)
      } catch (e) {
        if (alive) setError(e?.response?.data?.message || e.message)
      }
    }
    load()

    const socket = getSocket()
    socket.emit('join:admin')
    const refresh = () => load()
    const onPaid = (order) => {
      setPaidToday((v) => v + (order.amounts?.total || 0))
      load()
    }
    const onClaim = (order) => {
      toast.info(`${locationLabel(order)} reports a QR payment`, {
        description: `${orderLabel(order)} · ₹${order.amounts?.total} — verify & confirm to settle`,
        duration: 10000,
      })
      load()
    }
    socket.on('order:new', refresh)
    socket.on('order:updated', refresh)
    socket.on('order:paid', onPaid)
    socket.on('order:paymentClaimed', onClaim)
    return () => {
      alive = false
      socket.off('order:new', refresh)
      socket.off('order:updated', refresh)
      socket.off('order:paid', onPaid)
      socket.off('order:paymentClaimed', onClaim)
    }
  }, [token])

  if (!token || !user) {
    return <Navigate to="/admin/login" replace state={{ from: '/cashier' }} />
  }

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => Number(a.tableNo) - Number(b.tableNo)),
    [groups],
  )

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-cream/80 dark:bg-masala-900/70 border-b border-saffron-200/60 dark:border-masala-700/60">
        <div className="px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-curry-gradient flex items-center justify-center shadow-warm">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg text-masala-900">Cashier Desk</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-saffron-700">
                {user.name} · {user.role}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="card !shadow-none !bg-cream px-3 py-1.5 flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-700" />
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-widest text-masala-600">
                  Drawer today
                </div>
                <div className="font-display text-base text-masala-900 leading-none">
                  ₹{paidToday.toLocaleString()}
                </div>
              </div>
            </div>
            <ThemeToggle />
            {(user.permissions || []).includes('dashboard.view') && (
              <button onClick={() => navigate('/admin')} className="btn-ghost">
                <LayoutGrid className="h-4 w-4" /> Console
              </button>
            )}
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
      </header>

      <main className="px-4 md:px-8 py-6">
        <div className="mb-4">
          <span className="eyebrow">
            <Wallet className="h-3.5 w-3.5" /> Open bills
          </span>
          <h1 className="section-heading mt-1">Tables awaiting payment</h1>
        </div>

        {error && (
          <div className="card p-3 text-chilli-700 mb-4">{error}</div>
        )}

        {sortedGroups.length === 0 ? (
          <div className="card p-10 text-center text-masala-700">
            No pending bills. The kitchen is humming smoothly. 🌶️
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedGroups.map((g) => (
              <TableBillCard key={g.tableNo} group={g} onOpen={() => setActive(g)} />
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {active && (
          <BillModal
            group={active}
            rzpReady={rzpReady}
            qrUrl={qrUrl}
            onClose={() => setActive(null)}
            onPaid={(order) => {
              toast.success(`${locationLabel(order)} paid · ₹${order.amounts.total}`)
              setActive(null)
            }}
            onPayLater={(order) => {
              toast.success(`${locationLabel(order)} sent to kitchen · bill kept open (₹${order.amounts.total})`)
              setActive(null)
            }}
            onError={(msg) => toast.error(msg)}
          />
        )}
      </AnimatePresence>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}

function TableBillCard({ group, onOpen }) {
  const hasClaim = group.orders.some((o) => o.payment?.claimedAt && o.payment?.status !== 'paid')
  return (
    <motion.button
      layout
      onClick={onOpen}
      whileHover={{ y: -2 }}
      className={clsx(
        'card p-4 text-left flex flex-col gap-3 relative overflow-hidden',
        hasClaim && 'ring-2 ring-indigo-400',
      )}
    >
      <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-saffron-200/40 blur-2xl pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-masala-600">{group.serviceType === 'room' ? 'Room' : 'Table'}</div>
          <div className="font-display text-3xl text-masala-900 leading-none">
            {locationLabel(group, { short: true })}
          </div>
        </div>
        <span className="chip">
          {group.orders.length} order{group.orders.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="relative font-display text-2xl text-masala-900">
        ₹{group.total.toLocaleString()}
      </div>
      {hasClaim ? (
        <div className="relative inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
          <QrCode className="h-3.5 w-3.5" /> QR payment reported · confirm →
        </div>
      ) : (
        <div className="relative text-xs text-saffron-700 font-semibold">
          Tap to settle →
        </div>
      )}
    </motion.button>
  )
}

// Thermal roll geometry. `pageW` is the physical roll width (mm) fed to CSS
// @page; `width` is the printable content area (a little narrower than the
// roll); `scale` bumps font/QR sizes on wider paper. The page *height* is not
// fixed here — it's measured from the rendered content at print time so the
// slip is exactly as long as the order needs (no blank tail, no overflow).
const PAPER = {
  '3in': { label: 'Thermal 3-Inch', pageW: 80, width: '72mm', scale: 1 },
  '4in': { label: 'Thermal 4-Inch', pageW: 112, width: '104mm', scale: 1.3 },
}

// Print script injected into the popup: once everything (incl. the QR image)
// has loaded, measure the content height, set an exact-fit @page, then print.
// Converting px → mm (96px = 25.4mm) and adding a small feed margin keeps the
// last line off the cut edge.
function fitAndPrintScript(pageW) {
  return `<script>window.onload=function(){
    var h=document.documentElement.scrollHeight;
    var mm=Math.ceil(h*25.4/96)+4;
    var s=document.createElement('style');
    s.appendChild(document.createTextNode('@page{size:${pageW}mm '+mm+'mm;margin:0}'));
    document.head.appendChild(s);
    window.print();
  };<\/script>`
}

function BillModal({ group, rzpReady, qrUrl, onClose, onPaid, onPayLater, onError }) {
  const [tip, setTip] = useState(0)
  const [splits, setSplits] = useState(null)
  // Which thermal paper the cashier's printer uses. Set once, remembered.
  const [paper, setPaper] = useState(
    () => (typeof localStorage !== 'undefined' && localStorage.getItem('printPaper')) || '3in',
  )
  const choosePaper = (p) => {
    setPaper(p)
    try {
      localStorage.setItem('printPaper', p)
    } catch {
      /* private mode — keep the in-memory choice */
    }
  }
  const [loyaltyPhone, setLoyaltyPhone] = useState('')
  const [loyaltyMember, setLoyaltyMember] = useState(null)

  // Pre-fill the phone from the first order if customer already gave it at the table.
  useEffect(() => {
    const existing = group.orders.find((o) => o.loyalty?.phone)?.loyalty?.phone
    if (existing) setLoyaltyPhone(existing)
  }, [group])

  const lookup = async () => {
    const digits = loyaltyPhone.replace(/\D+/g, '').slice(-10)
    if (digits.length !== 10) return onError('Enter a 10-digit number')
    try {
      const res = await loyaltyLookup(digits)
      setLoyaltyMember(res)
    } catch (e) {
      onError(e?.response?.data?.message || e.message)
    }
  }

  const doSplit = async (parts, orderId) => {
    try {
      const res = await splitBill(orderId, parts)
      setSplits({ orderId, ...res })
    } catch (e) {
      onError(e?.response?.data?.message || e.message)
    }
  }

  const pay = async (orderId, method) => {
    try {
      const updated = await markOrderPaid(orderId, {
        method,
        tip,
        loyaltyPhone: loyaltyPhone ? loyaltyPhone.replace(/\D+/g, '').slice(-10) : undefined,
      })
      onPaid(updated)
    } catch (e) {
      onError(e?.response?.data?.message || e.message)
    }
  }

  // Defer payment: send the order to the kitchen now, leave the bill open.
  const sendToKitchen = async (orderId) => {
    try {
      const updated = await markOrderPayLater(orderId)
      onPayLater(updated)
    } catch (e) {
      onError(e?.response?.data?.message || e.message)
    }
  }

  const chargeOnline = async (orderId) => {
    try {
      if (tip > 0) await markOrderPaid(orderId, { tip }).catch(() => {})
      const rzpOrder = await createRazorpayOrder(orderId)
      const resp = await openRazorpayCheckout({
        keyId: rzpOrder.keyId,
        rzpOrder,
        description: `${locationLabel(group)}`,
        onDismiss: () => onError('Customer cancelled the payment'),
      })
      if (!resp) return
      const updated = await verifyRazorpayPayment(orderId, {
        razorpay_order_id: resp.razorpay_order_id,
        razorpay_payment_id: resp.razorpay_payment_id,
        razorpay_signature: resp.razorpay_signature,
      })
      onPaid(updated)
    } catch (e) {
      onError(e?.response?.data?.message || e.message)
    }
  }

  const grandTotal = group.total + tip

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
        className="card p-6 w-full max-w-xl max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="eyebrow">
              <Receipt className="h-3.5 w-3.5" /> Bill · {locationLabel(group)}
            </span>
            <h2 className="font-display text-2xl text-masala-900 mt-1">
              Settle the table
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-saffron-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-masala-600">
            <Printer className="h-3.5 w-3.5" /> Printer paper
          </span>
          <div className="inline-flex rounded-full border border-saffron-200 p-0.5">
            {Object.entries(PAPER).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => choosePaper(key)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-semibold transition',
                  paper === key
                    ? 'bg-saffron-500 text-white'
                    : 'text-masala-600 hover:bg-saffron-100',
                )}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {group.orders.map((o) => (
          <div key={o.id} className="mt-5 rounded-2xl border border-saffron-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-masala-600">
                {orderLabel(o)} · {new Date(o.createdAt).toLocaleTimeString()}
              </div>
              <div className="flex items-center gap-2">
                {o.payment?.payLater && o.payment?.status !== 'paid' && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    <Clock className="h-3 w-3" /> Pay later
                  </span>
                )}
                <PaymentMethodBadge method={o.payment?.method} />
                <div className="text-xs font-bold uppercase tracking-widest text-saffron-700">
                  {o.status}
                </div>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {o.items.map((it, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {it.qty} × {it.name}
                    {it.instructions && (
                      <span className="ml-2 text-[10px] text-chilli-700">
                        ✎ {it.instructions}
                      </span>
                    )}
                  </span>
                  <span className="text-masala-700">₹{it.qty * it.price}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-saffron-100 text-sm space-y-1">
              <div className="flex justify-between text-masala-700">
                <span>Subtotal</span>
                <span>₹{o.amounts?.subtotal}</span>
              </div>
              <div className="flex justify-between text-masala-700">
                <span>GST</span>
                <span>₹{o.amounts?.tax}</span>
              </div>
              <div className="flex justify-between font-semibold text-masala-900">
                <span>Order total</span>
                <span>₹{o.amounts?.total}</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => doSplit(2, o.id)} className="btn-secondary !py-1.5 !px-3 text-xs">
                <Split className="h-3.5 w-3.5" /> Split / 2
              </button>
              <button onClick={() => doSplit(3, o.id)} className="btn-secondary !py-1.5 !px-3 text-xs">
                <Split className="h-3.5 w-3.5" /> Split / 3
              </button>
              <button onClick={() => doSplit(4, o.id)} className="btn-secondary !py-1.5 !px-3 text-xs">
                <Split className="h-3.5 w-3.5" /> Split / 4
              </button>
            </div>

            {splits?.orderId === o.id && (
              <div className="mt-3 rounded-2xl bg-saffron-50 border border-saffron-200 px-3 py-2 text-sm">
                Each person pays{' '}
                <span className="font-display text-lg text-saffron-800">
                  ₹{splits.perPersonTotal}
                </span>{' '}
                ({splits.parts} ways)
              </div>
            )}

            {o.payment?.claimedAt && o.payment?.status !== 'paid' && (
              <div className="mt-3 rounded-2xl border border-indigo-300 bg-indigo-50 px-3 py-2.5 flex items-center gap-2 text-sm text-indigo-800">
                <QrCode className="h-4 w-4 shrink-0" />
                <span>
                  Customer reported a <b>QR payment</b> at{' '}
                  {new Date(o.payment.claimedAt).toLocaleTimeString()}. Verify it landed,
                  then confirm with <b>Mark QR paid</b>.
                </span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {rzpReady && (
                <PayBtn icon={<Zap className="h-4 w-4" />} onClick={() => chargeOnline(o.id)}>
                  Charge via Razorpay
                </PayBtn>
              )}
              <button
                onClick={() => pay(o.id, 'qr')}
                className={clsx(
                  'btn-primary !py-2 !px-3 text-xs',
                  o.payment?.claimedAt && o.payment?.status !== 'paid' && 'ring-2 ring-indigo-400 ring-offset-1',
                )}
              >
                <QrCode className="h-4 w-4" />
                Mark QR paid
              </button>
              <PayBtn icon={<BadgeIndianRupee className="h-4 w-4" />} onClick={() => pay(o.id, 'upi')}>
                Mark UPI paid
              </PayBtn>
              <PayBtn icon={<CreditCard className="h-4 w-4" />} onClick={() => pay(o.id, 'card')}>
                Mark card paid
              </PayBtn>
              <PayBtn icon={<Wallet className="h-4 w-4" />} onClick={() => pay(o.id, 'counter')}>
                Mark cash paid
              </PayBtn>
              <button
                onClick={() => !o.payment?.payLater && sendToKitchen(o.id)}
                disabled={o.payment?.payLater}
                title={
                  o.payment?.payLater
                    ? 'Already sent to the kitchen — bill stays open until paid'
                    : 'Send to the kitchen now, settle the bill later'
                }
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full border border-amber-300 !py-2 !px-3 text-xs font-semibold transition',
                  o.payment?.payLater
                    ? 'bg-amber-100 text-amber-700 cursor-default'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
                )}
              >
                <Clock className="h-4 w-4" /> {o.payment?.payLater ? 'Sent to kitchen' : 'Pay Later'}
              </button>
              <button
                onClick={() => printReceipt(o, group.tableNo, tip, qrUrl, paper)}
                className="btn-ghost !py-2 !px-3"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                onClick={() => printKOT(o, group.tableNo, paper)}
                className="btn-ghost !py-2 !px-3"
              >
                <Printer className="h-4 w-4" /> Print KOT
              </button>
            </div>
          </div>
        ))}

        <div className="mt-6 rounded-2xl border border-saffron-200 dark:border-masala-700 p-4 bg-saffron-50/60 dark:bg-masala-800/40">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-saffron-600" />
            Loyalty (optional)
          </div>
          <div className="mt-2 flex gap-2">
            <div
              className="flex items-center gap-2 flex-1 rounded-full border px-3 py-1.5"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
            >
              <Phone className="h-4 w-4 opacity-60" />
              <input
                value={loyaltyPhone}
                onChange={(e) => setLoyaltyPhone(e.target.value)}
                placeholder="Mobile number"
                inputMode="numeric"
                maxLength={15}
                className="flex-1 bg-transparent outline-none text-sm py-1"
                style={{ color: 'var(--text)' }}
              />
            </div>
            <button onClick={lookup} className="btn-secondary !py-1.5 !px-3 text-xs">
              Check
            </button>
          </div>
          {loyaltyMember && (
            <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              {loyaltyMember.exists
                ? `${loyaltyMember.name || 'Member'} · ${loyaltyMember.points} points`
                : 'New member — points start accruing after this payment.'}
            </div>
          )}
        </div>

        <div className="mt-3 rounded-2xl border border-saffron-200 dark:border-masala-700 p-4 bg-cream/60 dark:bg-masala-800/40">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Tip (optional)</span>
            <div className="inline-flex items-center gap-1">
              <span className="text-masala-700">₹</span>
              <input
                type="number"
                min="0"
                value={tip}
                onChange={(e) => setTip(Math.max(0, Number(e.target.value) || 0))}
                className="w-24 bg-white border border-saffron-200 rounded-xl px-2 py-1 outline-none text-right"
              />
            </div>
          </label>
          <div className="mt-3 flex items-center justify-between font-display text-xl text-masala-900">
            <span>Grand total</span>
            <span>₹{grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// The method the customer picked in the post-order popup (QR vs cash) so the
// cashier knows what to expect before confirming. Razorpay/UPI/card orders are
// settled inline, so we only surface the two self-service intents prominently.
function PaymentMethodBadge({ method }) {
  const map = {
    qr: { label: 'QR', icon: QrCode, cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    counter: { label: 'Cash', icon: Banknote, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    upi: { label: 'UPI', icon: BadgeIndianRupee, cls: 'bg-saffron-100 text-saffron-700 border-saffron-200' },
    card: { label: 'Card', icon: CreditCard, cls: 'bg-saffron-100 text-saffron-700 border-saffron-200' },
    razorpay: { label: 'Online', icon: Zap, cls: 'bg-saffron-100 text-saffron-700 border-saffron-200' },
  }
  const m = map[method]
  if (!m) return null
  const Icon = m.icon
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', m.cls)}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  )
}

function PayBtn({ icon, onClick, children }) {
  return (
    <button onClick={onClick} className="btn-primary !py-2 !px-3 text-xs">
      {icon}
      {children}
    </button>
  )
}

function printReceipt(o, tableNo, tip, qrUrl, paper = '3in') {
  const cfg = PAPER[paper] || PAPER['3in']
  const f = (px) => Math.round(px * cfg.scale) // scale a px value for the paper
  const qrPx = f(150)
  const w = window.open('', '_blank')
  if (!w) return
  const rows = o.items
    .map(
      (it) =>
        `<tr><td>${it.qty} × ${escape(it.name)}</td><td style="text-align:right">₹${it.qty * it.price}</td></tr>`,
    )
    .join('')
  const total = o.amounts.total + (tip || 0)
  // Print a "scan to pay" QR only while the bill is still open — a paid receipt
  // shouldn't invite another payment.
  const showQr = qrUrl && o.payment?.status !== 'paid'
  const qrBlock = showQr
    ? `<div class="qr">
         <div class="qrlabel">SCAN TO PAY · ₹${total}</div>
         <img src="${escape(qrUrl)}" alt="Payment QR" />
         <div class="qrhint">UPI · show this to the cashier once paid</div>
       </div>`
    : ''
  w.document.write(`<html><head><title>Receipt T${tableNo}</title><style>
    @page{size:${cfg.pageW}mm auto;margin:0}
    html,body{margin:0}
    body{font-family:ui-monospace,Consolas,monospace;font-size:${f(12)}px;width:${cfg.width};margin:0 auto;padding:${f(12)}px ${f(8)}px;color:#111}
    h2{font-family:'Playfair Display',serif;color:#9a3412;margin:0;font-size:${f(20)}px}
    .sub{letter-spacing:.3em;font-size:${f(9)}px;color:#7c2d12;text-transform:uppercase;text-align:center;margin-bottom:6px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    td{padding:3px 0;border-bottom:1px dashed #ddd}
    .total{font-weight:700;font-size:${f(14)}px;margin-top:8px;border-top:2px solid #000;padding-top:6px;display:flex;justify-content:space-between}
    .meta{margin-top:6px;color:#555}
    .qr{margin-top:14px;padding-top:10px;border-top:1px dashed #999;text-align:center}
    .qrlabel{font-weight:700;font-size:${f(11)}px;letter-spacing:.15em;color:#3730a3}
    .qr img{width:${qrPx}px;height:${qrPx}px;object-fit:contain;margin:8px auto;display:block}
    .qrhint{font-size:${f(9)}px;color:#777}
    </style></head><body>
    <div style="text-align:center">
      <h2>Masala Story</h2>
      <div class="sub">A taste of India</div>
    </div>
    <div class="meta">${o.serviceType === 'room' ? 'Room' : 'Table'}: <b>${locationLabel({ serviceType: o.serviceType, tableNo })}</b><br/>Order: #${escape(orderNo(o))}<br/>${new Date().toLocaleString()}</div>
    <table>${rows}</table>
    <div class="meta" style="margin-top:8px">Subtotal ₹${o.amounts.subtotal} · GST ₹${o.amounts.tax}${tip ? ` · Tip ₹${tip}` : ''}</div>
    <div class="total"><span>TOTAL</span><span>₹${total}</span></div>
    ${qrBlock}
    <div style="text-align:center;margin-top:16px;color:#888">Thank you · Phir milenge!</div>
    ${fitAndPrintScript(cfg.pageW)}
    </body></html>`)
  w.document.close()
}

// Kitchen Order Ticket — a price-free copy for the kitchen. Shows only the
// serial number, item name and quantity (plus any cooking instructions), so
// the line cooks see what to make without any billing noise.
function printKOT(o, tableNo, paper = '3in') {
  const cfg = PAPER[paper] || PAPER['3in']
  const f = (px) => Math.round(px * cfg.scale) // scale a px value for the paper
  const w = window.open('', '_blank')
  if (!w) return
  const rows = o.items
    .map(
      (it, i) =>
        `<tr><td class="sno">${i + 1}</td><td class="item">${escape(it.name)}${
          it.instructions
            ? `<div class="note">✎ ${escape(it.instructions)}</div>`
            : ''
        }</td><td class="qty">${it.qty}</td></tr>`,
    )
    .join('')
  const loc = locationLabel({ serviceType: o.serviceType, tableNo })
  w.document.write(`<html><head><title>KOT ${escape(loc)}</title><style>
    @page{size:${cfg.pageW}mm auto;margin:0}
    html,body{margin:0}
    body{font-family:ui-monospace,Consolas,monospace;font-size:${f(13)}px;width:${cfg.width};margin:0 auto;padding:${f(12)}px ${f(8)}px;color:#111}
    h2{font-family:'Playfair Display',serif;color:#9a3412;margin:0;text-align:center;font-size:${f(22)}px}
    .sub{letter-spacing:.3em;font-size:${f(10)}px;color:#7c2d12;text-transform:uppercase;text-align:center;margin:4px 0 8px;font-weight:700}
    .meta{margin-top:6px;color:#333;font-size:${f(12)}px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th{text-align:left;font-size:${f(10)}px;letter-spacing:.1em;text-transform:uppercase;border-bottom:2px solid #000;padding:4px 0}
    td{padding:6px 0;border-bottom:1px dashed #ccc;vertical-align:top}
    .sno{width:${f(28)}px;font-weight:700}
    .qty{text-align:right;width:${f(36)}px;font-weight:700;font-size:${f(15)}px}
    .item{font-weight:600}
    .note{font-weight:400;font-size:${f(11)}px;color:#b91c1c;margin-top:2px}
    th.qty{text-align:right}
    </style></head><body>
    <h2>K.O.T</h2>
    <div class="sub">Kitchen Order Ticket</div>
    <div class="meta">${o.serviceType === 'room' ? 'Room' : o.serviceType === 'takeaway' ? 'Takeaway' : 'Table'}: <b>${escape(loc)}</b><br/>Order: #${escape(orderNo(o))}<br/>${new Date().toLocaleString()}</div>
    <table>
      <thead><tr><th class="sno">#</th><th>Item</th><th class="qty">Qty</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${fitAndPrintScript(cfg.pageW)}
    </body></html>`)
  w.document.close()
}

function escape(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
}
