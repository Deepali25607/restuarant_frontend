import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FormattedMessage, useIntl } from 'react-intl'
import { Minus, Plus, Trash2, MessageSquare, ShoppingBag, Wallet, CreditCard, BadgeIndianRupee, Zap, Sparkles, Phone, Check, QrCode, Banknote, X, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useSessionStore,
  selectCartCount,
  selectCartSubtotal,
} from '../store/useSessionStore'
import {
  placeOrder,
  setOrderPaymentMethod,
  paymentStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
  loyaltyLookup,
  loyaltyJoin,
  fetchOrgBranding,
} from '../lib/api'
import { openRazorpayCheckout } from '../lib/razorpay'
import DishImage from '../components/DishImage'
import clsx from 'clsx'
import { useOrgStore } from '../store/useOrgStore'

export default function Cart() {
  const intl = useIntl()
  const navigate = useNavigate()
  const { cart, tableNo, sessionId, incrementItem, decrementItem, removeItem, setInstructions, clearCart } = useSessionStore()
  const count = useSessionStore(selectCartCount)
  const subtotal = useSessionStore(selectCartSubtotal)
  const branding = useOrgStore((s) => s.branding)
  const orgKey = useOrgStore((s) => s.orgKey)
  const setOrg = useOrgStore((s) => s.setOrg)
  const gstRate = Number.isFinite(branding?.gstRate) ? branding.gstRate : 5
  const taxLabel = branding?.taxLabel || 'GST'
  const tax = Math.round(subtotal * (gstRate / 100))
  const total = subtotal + tax

  const [payment, setPayment] = useState('upi')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [rzpReady, setRzpReady] = useState(false)
  // Order that's been placed and is now awaiting the customer's QR-vs-cash
  // choice in the post-order popup. null when the popup is closed.
  const [pendingOrder, setPendingOrder] = useState(null)
  const paymentQrUrl = branding?.paymentQrUrl || ''

  // Loyalty
  const [loyaltyPhone, setLoyaltyPhone] = useState('')
  const [loyaltyMember, setLoyaltyMember] = useState(null) // { exists, points, name }
  const [loyaltyChecked, setLoyaltyChecked] = useState(false)
  const [redeemUsing, setRedeemUsing] = useState(false)

  useEffect(() => {
    paymentStatus()
      .then((s) => setRzpReady(Boolean(s.configured)))
      .catch(() => setRzpReady(false))
  }, [])

  // Refresh branding so the payment QR (uploaded by the admin) is current — the
  // persisted copy may predate the upload, which would hide the QR option.
  useEffect(() => {
    if (!orgKey) return
    fetchOrgBranding(orgKey)
      .then((b) => setOrg(b.slug || orgKey, b))
      .catch(() => {})
  }, [orgKey, setOrg])

  const maxRedeemable = Math.min(
    loyaltyMember?.points || 0,
    subtotal + tax,
  )
  const loyaltyDiscount = redeemUsing && loyaltyMember?.exists ? maxRedeemable : 0
  const finalTotal = Math.max(0, subtotal + tax - loyaltyDiscount)
  const willEarn = loyaltyPhone && loyaltyChecked ? Math.floor((subtotal + tax - loyaltyDiscount) / 100) : 0

  const checkLoyalty = async () => {
    const digits = loyaltyPhone.replace(/\D+/g, '').slice(-10)
    if (digits.length !== 10) {
      toast.error('Please enter a 10-digit number')
      return
    }
    try {
      const res = await loyaltyLookup(digits)
      setLoyaltyMember(res)
      setLoyaltyChecked(true)
      setRedeemUsing(false)
      if (!res.exists) toast.message('New member', { description: 'You\'ll earn points after this meal.' })
      else toast.success(`Welcome back${res.name ? ', ' + res.name : ''}!`, { description: `${res.points} points available` })
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message)
    }
  }

  const joinLoyalty = async () => {
    try {
      const member = await loyaltyJoin({ phone: loyaltyPhone })
      setLoyaltyMember({ exists: true, ...member })
      toast.success('Joined Masala Rewards!')
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message)
    }
  }

  const placeOrderNow = async () => {
    return placeOrder({
      tableNo,
      sessionId,
      items: cart.map((c) => ({
        dishId: c.id,
        name: c.name,
        price: c.price,
        qty: c.qty,
        instructions: c.instructions || '',
      })),
      payment: { method: payment },
      amounts: { subtotal, tax, total: finalTotal },
      loyalty:
        loyaltyPhone && loyaltyChecked
          ? { phone: loyaltyPhone.replace(/\D+/g, '').slice(-10), redeem: loyaltyDiscount }
          : undefined,
    })
  }

  const finishOrder = (order) => {
    toast.success(intl.formatMessage({ id: 'cart.orderSent' }), {
      description: `#${order.id.slice(-6).toUpperCase()} · ₹${order.amounts.total}`,
    })
    navigate(`/track/${order.id}`)
  }

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const order = await placeOrderNow()

      // Razorpay handles UPI/Card inline when it's configured — unchanged.
      if ((payment === 'upi' || payment === 'card') && rzpReady) {
        const rzpOrder = await createRazorpayOrder(order.id)
        const resp = await openRazorpayCheckout({
          keyId: rzpOrder.keyId,
          rzpOrder,
          description: `Table ${tableNo} · ${cart.length} items`,
          onDismiss: () => toast.message(intl.formatMessage({ id: 'cart.cancelled' })),
        })
        if (resp) {
          await verifyRazorpayPayment(order.id, {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          })
          toast.success(intl.formatMessage({ id: 'cart.paid' }))
        }
        clearCart()
        finishOrder(order)
        return
      }

      // Everyone else (Counter, or UPI/Card when Razorpay isn't set up) gets the
      // QR-vs-cash popup. The order is already placed; the cashier confirms the
      // payment from their desk afterwards.
      clearCart()
      setPendingOrder(order)
    } catch (e) {
      // Table-busy errors get a dedicated treatment: bounce the customer
      // back to the menu, where the "Change table" pill is one tap away.
      if (e?.response?.data?.code === 'table_occupied') {
        const msg = e.response.data.message
        toast.error(msg, {
          duration: 6000,
          description: intl.formatMessage({ id: 'cart.tableOccupiedHint' }),
        })
        setError(msg)
        navigate('/menu')
      } else {
        const msg = e?.response?.data?.message || e?.message || 'Could not place order'
        toast.error(msg)
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Rendered above both the empty-cart and full-cart views so it survives the
  // clearCart() that fires the moment an order is placed.
  const paymentModal = (
    <AnimatePresence>
      {pendingOrder && (
        <PaymentChoiceModal
          order={pendingOrder}
          qrUrl={paymentQrUrl}
          tableNo={tableNo}
          onClose={() => finishOrder(pendingOrder)}
          onChoose={async (method) => {
            // Recording the choice is best-effort — the order is already placed
            // and the cashier confirms payment regardless.
            try {
              await setOrderPaymentMethod(pendingOrder.id, method)
            } catch {
              /* non-fatal */
            }
            finishOrder(pendingOrder)
          }}
        />
      )}
    </AnimatePresence>
  )

  if (count === 0) {
    return (
      <>
        {paymentModal}
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="card p-10">
          <ShoppingBag className="mx-auto h-12 w-12 text-saffron-500" />
          <h2 className="font-display text-2xl mt-4">
            <FormattedMessage id="cart.empty.title" />
          </h2>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
            <FormattedMessage id="cart.empty.subtitle" />
          </p>
          <button onClick={() => navigate('/menu')} className="btn-primary mt-6">
            <FormattedMessage id="cart.empty.cta" />
          </button>
        </div>
        </div>
      </>
    )
  }

  return (
    <>
    {paymentModal}
    <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-32">
      <span className="eyebrow"><FormattedMessage id="cart.eyebrow" /></span>
      <h1 className="section-heading mt-2"><FormattedMessage id="cart.title" /></h1>

      <div className="mt-8 grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {cart.map((item) => (
              <motion.li
                key={`${item.id}|${item.instructions || ''}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card p-4 flex gap-4"
              >
                <DishImage
                  src={item.image}
                  alt={item.name}
                  className="h-24 w-24 rounded-2xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={item.isVeg ? 'veg-dot' : 'nonveg-dot'} />
                        <h3 className="font-display text-lg leading-tight">
                          {item.name}
                        </h3>
                      </div>
                      <div className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        <FormattedMessage id="cart.itemEach" values={{ price: item.price }} />
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id, item.instructions || '')}
                      className="text-masala-500 hover:text-chilli-600 p-1"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <InstructionsField
                    value={item.instructions || ''}
                    onChange={(val) =>
                      setInstructions(item.id, item.instructions || '', val)
                    }
                  />

                  <div className="mt-3 flex items-center justify-between">
                    <div
                      className="inline-flex items-center rounded-full border p-1"
                      style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
                    >
                      <button
                        onClick={() => decrementItem(item.id, item.instructions || '')}
                        className="h-8 w-8 rounded-full hover:bg-white dark:hover:bg-masala-700 flex items-center justify-center"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.qty}</span>
                      <button
                        onClick={() => incrementItem(item.id, item.instructions || '')}
                        className="h-8 w-8 rounded-full hover:bg-white dark:hover:bg-masala-700 flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="font-display text-lg">₹{item.price * item.qty}</div>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <aside className="card p-5 lg:sticky lg:top-20 space-y-5">
          <LoyaltyPanel
            phone={loyaltyPhone}
            setPhone={setLoyaltyPhone}
            member={loyaltyMember}
            checked={loyaltyChecked}
            redeemUsing={redeemUsing}
            setRedeemUsing={setRedeemUsing}
            maxRedeemable={maxRedeemable}
            willEarn={willEarn}
            onLookup={checkLoyalty}
            onJoin={joinLoyalty}
          />

          <div>
          <h2 className="font-display text-xl"><FormattedMessage id="cart.billSummary" /></h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label={<FormattedMessage id="common.subtotal" />} value={`₹${subtotal}`} />
            <Row label={<FormattedMessage id="common.tax" values={{ label: taxLabel, rate: gstRate }} />} value={`₹${tax}`} />
            {loyaltyDiscount > 0 && (
              <Row
                label={
                  <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    <FormattedMessage id="cart.loyalty.discount" />
                  </span>
                }
                value={<span className="text-emerald-600 dark:text-emerald-400">−₹{loyaltyDiscount}</span>}
              />
            )}
            <div className="border-t border-saffron-200/70 dark:border-masala-700/70 pt-3 mt-2">
              <Row label={<FormattedMessage id="common.total" />} value={`₹${finalTotal}`} bold />
            </div>
          </dl>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              <FormattedMessage id="cart.payment" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <PayOption
                active={payment === 'upi'}
                onClick={() => setPayment('upi')}
                icon={<BadgeIndianRupee className="h-4 w-4" />}
                label={<FormattedMessage id="cart.payment.upi" />}
              />
              <PayOption
                active={payment === 'card'}
                onClick={() => setPayment('card')}
                icon={<CreditCard className="h-4 w-4" />}
                label={<FormattedMessage id="cart.payment.card" />}
              />
              <PayOption
                active={payment === 'counter'}
                onClick={() => setPayment('counter')}
                icon={<Wallet className="h-4 w-4" />}
                label={<FormattedMessage id="cart.payment.counter" />}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 text-sm text-chilli-700 dark:text-chilli-300 bg-chilli-50 dark:bg-chilli-900/30 border border-chilli-200 dark:border-chilli-900 rounded-2xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            disabled={submitting}
            onClick={submit}
            className="btn-primary w-full mt-6"
          >
            {submitting ? (
              <FormattedMessage id="cart.sending" />
            ) : (
              <FormattedMessage id="cart.placeOrder" values={{ total: finalTotal }} />
            )}
          </button>
          {rzpReady && (payment === 'upi' || payment === 'card') && (
            <p className="text-[11px] text-saffron-600 dark:text-saffron-400 mt-2 text-center inline-flex items-center justify-center gap-1 w-full">
              <Zap className="h-3 w-3" /> <FormattedMessage id="cart.razorpayHint" />
            </p>
          )}
          <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
            <FormattedMessage id="cart.confirmSeat" values={{ table: tableNo }} />
          </p>
        </aside>
      </div>
    </div>
    </>
  )
}

function Row({ label, value, bold }) {
  return (
    <div className={clsx('flex items-center justify-between', bold && 'font-semibold text-base')}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function PayOption({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-semibold transition border',
        active
          ? 'bg-curry-gradient text-white border-transparent shadow-warm'
          : 'bg-white dark:bg-masala-800 text-masala-700 dark:text-saffron-200 border-saffron-200 dark:border-masala-700 hover:bg-saffron-50 dark:hover:bg-masala-700',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function PaymentChoiceModal({ order, qrUrl, tableNo, onChoose, onClose }) {
  const [busy, setBusy] = useState('')
  const choose = async (method) => {
    if (busy) return
    setBusy(method)
    await onChoose(method)
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-masala-900/50 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card p-6 w-full max-w-md max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="eyebrow">
              <CheckCircle2 className="h-3.5 w-3.5" /> <FormattedMessage id="cart.payNow.placed" />
            </span>
            <h2 className="font-display text-2xl mt-1">
              <FormattedMessage id="cart.payNow.title" />
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              <FormattedMessage
                id="cart.payNow.subtitle"
                values={{
                  table: tableNo,
                  id: `#${order.id.slice(-6).toUpperCase()}`,
                  total: order.amounts.total,
                }}
              />
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {qrUrl && (
          <div className="mt-5 rounded-2xl border border-saffron-200 dark:border-masala-700 p-4 bg-saffron-50/60 dark:bg-masala-800/40 text-center">
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <QrCode className="h-4 w-4 text-saffron-600" />
              <FormattedMessage id="cart.payNow.scanTitle" />
            </div>
            <div className="mt-3 mx-auto w-48 h-48 rounded-2xl bg-white border border-saffron-200 overflow-hidden flex items-center justify-center">
              <img src={qrUrl} alt="Payment QR" className="w-full h-full object-contain p-1.5" />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              <FormattedMessage id="cart.payNow.scanHint" />
            </p>
            <button
              onClick={() => choose('qr')}
              disabled={Boolean(busy)}
              className="btn-primary w-full mt-3 disabled:opacity-60"
            >
              <QrCode className="h-4 w-4" />
              <FormattedMessage id="cart.payNow.paidByQr" />
            </button>
          </div>
        )}

        <button
          onClick={() => choose('counter')}
          disabled={Boolean(busy)}
          className={clsx(
            'mt-3 w-full rounded-2xl border p-4 text-left flex items-center gap-3 transition disabled:opacity-60',
            'bg-white dark:bg-masala-800 border-saffron-200 dark:border-masala-700 hover:bg-saffron-50 dark:hover:bg-masala-700',
          )}
        >
          <div className="h-10 w-10 rounded-full bg-curry-gradient flex items-center justify-center shadow-warm shrink-0">
            <Banknote className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg">
              <FormattedMessage id="cart.payNow.cash" />
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <FormattedMessage id="cart.payNow.cashHint" />
            </div>
          </div>
        </button>

        <p className="text-[11px] mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
          <FormattedMessage id="cart.payNow.cashierNote" />
        </p>
      </motion.div>
    </motion.div>
  )
}

function LoyaltyPanel({
  phone,
  setPhone,
  member,
  checked,
  redeemUsing,
  setRedeemUsing,
  maxRedeemable,
  willEarn,
  onLookup,
  onJoin,
}) {
  const intl = useIntl()
  return (
    <div className="rounded-2xl p-4 border bg-saffron-50/60 dark:bg-masala-800/40 border-saffron-200 dark:border-masala-700">
      <div className="flex items-start gap-2">
        <div className="h-9 w-9 rounded-full bg-curry-gradient flex items-center justify-center shadow-warm shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-lg">
            <FormattedMessage id="cart.loyalty.title" />
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <FormattedMessage id="cart.loyalty.subtitle" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <div
          className="flex items-center gap-2 flex-1 rounded-full border px-3 py-1.5"
          style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
        >
          <Phone className="h-4 w-4 opacity-60" />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={intl.formatMessage({ id: 'cart.loyalty.phone' })}
            inputMode="numeric"
            maxLength={15}
            className="flex-1 bg-transparent outline-none text-sm py-1"
            style={{ color: 'var(--text)' }}
          />
        </div>
        <button onClick={onLookup} className="btn-secondary !py-1.5 !px-3 text-xs">
          <FormattedMessage id="cart.loyalty.lookup" />
        </button>
      </div>

      {checked && member && (
        <div className="mt-3 text-sm space-y-2">
          {member.exists ? (
            <>
              <div>
                <FormattedMessage
                  id="cart.loyalty.greeting"
                  values={{
                    name: member.name || 'friend',
                    points: (
                      <span className="font-semibold text-saffron-700 dark:text-saffron-300">
                        {member.points}
                      </span>
                    ),
                  }}
                />
              </div>
              {maxRedeemable > 0 && (
                <label className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-masala-900/50 border border-saffron-200 dark:border-masala-700 px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={redeemUsing}
                      onChange={(e) => setRedeemUsing(e.target.checked)}
                      className="accent-saffron-600 h-4 w-4"
                    />
                    <FormattedMessage
                      id="cart.loyalty.use"
                      values={{ points: <span className="font-semibold">{maxRedeemable}</span> }}
                    />
                  </span>
                  <span className="font-display text-emerald-600 dark:text-emerald-400">
                    −₹{maxRedeemable}
                  </span>
                </label>
              )}
              {willEarn > 0 && (
                <div className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <FormattedMessage id="cart.loyalty.willEarn" values={{ points: willEarn }} />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <div style={{ color: 'var(--text-muted)' }}>
                <FormattedMessage id="cart.loyalty.notMember" />
              </div>
              <button onClick={onJoin} className="btn-primary !py-2 !px-3 text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                <FormattedMessage id="cart.loyalty.join" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InstructionsField({ value, onChange }) {
  const intl = useIntl()
  const [open, setOpen] = useState(Boolean(value))
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-saffron-600 hover:text-saffron-700 dark:text-saffron-400 dark:hover:text-saffron-300"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <FormattedMessage id="cart.addInstructions" />
      </button>
    )
  }
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={intl.formatMessage({ id: 'cart.instructionsPlaceholder' })}
      className="mt-2 w-full rounded-2xl px-3 py-2 text-sm outline-none border focus:border-saffron-400"
      style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
    />
  )
}
