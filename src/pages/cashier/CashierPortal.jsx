import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  BadgeIndianRupee,
  CreditCard,
  Coins,
  CheckCircle2,
  Receipt,
  X,
  Split,
  LogOut,
  Flame,
  Printer,
  Zap,
  Sparkles,
  Phone,
} from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/useAuthStore'
import {
  fetchBillingTables,
  markOrderPaid,
  splitBill,
  paymentStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
  loyaltyLookup,
} from '../../lib/api'
import { openRazorpayCheckout } from '../../lib/razorpay'
import { getSocket } from '../../lib/socket'
import ThemeToggle from '../../components/ThemeToggle'

export default function CashierPortal() {
  const { user, token, logout } = useAuthStore()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [active, setActive] = useState(null) // { tableNo, orders, total }
  const [paidToday, setPaidToday] = useState(0)
  const [error, setError] = useState('')
  const [rzpReady, setRzpReady] = useState(false)

  useEffect(() => {
    paymentStatus()
      .then((s) => setRzpReady(Boolean(s.configured)))
      .catch(() => {})
  }, [])

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
    socket.on('order:new', refresh)
    socket.on('order:updated', refresh)
    socket.on('order:paid', onPaid)
    return () => {
      alive = false
      socket.off('order:new', refresh)
      socket.off('order:updated', refresh)
      socket.off('order:paid', onPaid)
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
            onClose={() => setActive(null)}
            onPaid={(order) => {
              toast.success(`Table ${order.tableNo} paid · ₹${order.amounts.total}`)
              setActive(null)
            }}
            onError={(msg) => toast.error(msg)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TableBillCard({ group, onOpen }) {
  return (
    <motion.button
      layout
      onClick={onOpen}
      whileHover={{ y: -2 }}
      className="card p-4 text-left flex flex-col gap-3 relative overflow-hidden"
    >
      <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-saffron-200/40 blur-2xl pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-masala-600">Table</div>
          <div className="font-display text-3xl text-masala-900 leading-none">
            T{group.tableNo}
          </div>
        </div>
        <span className="chip">
          {group.orders.length} order{group.orders.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="relative font-display text-2xl text-masala-900">
        ₹{group.total.toLocaleString()}
      </div>
      <div className="relative text-xs text-saffron-700 font-semibold">
        Tap to settle →
      </div>
    </motion.button>
  )
}

function BillModal({ group, rzpReady, onClose, onPaid, onError }) {
  const [tip, setTip] = useState(0)
  const [splits, setSplits] = useState(null)
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

  const chargeOnline = async (orderId) => {
    try {
      if (tip > 0) await markOrderPaid(orderId, { tip }).catch(() => {})
      const rzpOrder = await createRazorpayOrder(orderId)
      const resp = await openRazorpayCheckout({
        keyId: rzpOrder.keyId,
        rzpOrder,
        description: `Table ${group.tableNo}`,
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
              <Receipt className="h-3.5 w-3.5" /> Bill · Table {group.tableNo}
            </span>
            <h2 className="font-display text-2xl text-masala-900 mt-1">
              Settle the table
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-saffron-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {group.orders.map((o) => (
          <div key={o.id} className="mt-5 rounded-2xl border border-saffron-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-masala-600">
                #{o.id.slice(-6).toUpperCase()} · {new Date(o.createdAt).toLocaleTimeString()}
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-saffron-700">
                {o.status}
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

            <div className="mt-4 flex flex-wrap gap-2">
              {rzpReady && (
                <PayBtn icon={<Zap className="h-4 w-4" />} onClick={() => chargeOnline(o.id)}>
                  Charge via Razorpay
                </PayBtn>
              )}
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
                onClick={() => printReceipt(o, group.tableNo, tip)}
                className="btn-ghost !py-2 !px-3"
              >
                <Printer className="h-4 w-4" /> Print
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

function PayBtn({ icon, onClick, children }) {
  return (
    <button onClick={onClick} className="btn-primary !py-2 !px-3 text-xs">
      {icon}
      {children}
    </button>
  )
}

function printReceipt(o, tableNo, tip) {
  const w = window.open('', '_blank')
  if (!w) return
  const rows = o.items
    .map(
      (it) =>
        `<tr><td>${it.qty} × ${escape(it.name)}</td><td style="text-align:right">₹${it.qty * it.price}</td></tr>`,
    )
    .join('')
  const total = o.amounts.total + (tip || 0)
  w.document.write(`<html><head><title>Receipt T${tableNo}</title><style>
    body{font-family:ui-monospace,Consolas,monospace;font-size:12px;width:280px;padding:14px;color:#111}
    h2{font-family:'Playfair Display',serif;color:#9a3412;margin:0}
    .sub{letter-spacing:.3em;font-size:9px;color:#7c2d12;text-transform:uppercase;text-align:center;margin-bottom:6px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    td{padding:3px 0;border-bottom:1px dashed #ddd}
    .total{font-weight:700;font-size:14px;margin-top:8px;border-top:2px solid #000;padding-top:6px;display:flex;justify-content:space-between}
    .meta{margin-top:6px;color:#555}
    </style></head><body>
    <div style="text-align:center">
      <h2>Masala Story</h2>
      <div class="sub">A taste of India</div>
    </div>
    <div class="meta">Table: <b>T${tableNo}</b><br/>Order: #${o.id.slice(-6).toUpperCase()}<br/>${new Date().toLocaleString()}</div>
    <table>${rows}</table>
    <div class="meta" style="margin-top:8px">Subtotal ₹${o.amounts.subtotal} · GST ₹${o.amounts.tax}${tip ? ` · Tip ₹${tip}` : ''}</div>
    <div class="total"><span>TOTAL</span><span>₹${total}</span></div>
    <div style="text-align:center;margin-top:16px;color:#888">Thank you · Phir milenge!</div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`)
  w.document.close()
}

function escape(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
}
