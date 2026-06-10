import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Flame,
  Check,
  Loader2,
  ArrowRight,
  Sparkles,
  Mail,
  Lock,
  User,
  Store,
  Phone,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { fetchPublicPlans, signupRequest, verifySignup } from '../lib/api'
import { openRazorpayCheckout } from '../lib/razorpay'
import { useAuthStore } from '../store/useAuthStore'

const CONTACT_EMAIL = 'sales@masalastory.com'

export default function Signup() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selected, setSelected] = useState('yearly')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ orgName: '', name: '', email: '', phone: '', password: '' })

  useEffect(() => {
    fetchPublicPlans()
      .then((d) => setPlans(d.plans || []))
      .catch((e) => setError(e?.response?.data?.message || e.message))
      .finally(() => setLoadingPlans(false))
  }, [])

  const selectedPlan = useMemo(
    () => plans.find((p) => p.key === selected) || null,
    [plans, selected],
  )
  const isContact = selectedPlan?.contactSales
  const isPaid = Boolean(selectedPlan?.billable)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // Land the freshly-created admin straight in their dashboard.
  const enterDashboard = (session) => {
    setAuth({ token: session.token, user: session.user })
    toast.success('Welcome aboard! Your restaurant is ready.')
    navigate('/admin', { replace: true })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (isContact) return
    setError('')
    setSubmitting(true)
    try {
      const res = await signupRequest({
        plan: selected,
        org: { name: form.orgName },
        admin: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        },
      })

      // Paid plan with live Razorpay → collect payment, then verify & activate.
      if (res.requiresPayment) {
        const resp = await openRazorpayCheckout({
          keyId: res.keyId,
          rzpOrder: res.rzpOrder,
          customer: { name: form.name, email: form.email, contact: form.phone },
          description: `Masala Story — ${selectedPlan.label} plan`,
          onDismiss: () => toast.message('Payment cancelled — your spot is saved, try again anytime.'),
        })
        if (!resp) {
          setSubmitting(false)
          return // dismissed
        }
        const session = await verifySignup({
          orgId: res.orgId,
          razorpay_order_id: resp.razorpay_order_id,
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_signature: resp.razorpay_signature,
        })
        enterDashboard(session)
        return
      }

      // Trial (free) or paid-without-Razorpay fallback → already activated.
      enterDashboard(res)
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Could not complete signup'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-masala-900">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-cream/70 dark:bg-masala-900/60 border-b border-saffron-200/60 dark:border-masala-700/60">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-curry-gradient flex items-center justify-center shadow-warm">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl text-masala-900 dark:text-saffron-100">Masala Story</span>
          </Link>
          <Link to="/admin/login" className="text-sm font-semibold text-masala-700 dark:text-saffron-200 hover:text-masala-900">
            Already have an account? <span className="text-saffron-600">Sign in</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 md:px-8 py-10">
        <div className="text-center max-w-2xl mx-auto">
          <span className="eyebrow"><Sparkles className="h-3.5 w-3.5" /> Start your restaurant</span>
          <h1 className="font-display text-4xl md:text-5xl mt-3 text-masala-900 dark:text-saffron-100">
            Launch your ordering system in minutes
          </h1>
          <p className="mt-3 text-masala-700 dark:text-saffron-200/80">
            Pick a plan, create your account, and your branded ordering site, kitchen
            and cashier consoles go live instantly.
          </p>
        </div>

        {error && (
          <div className="mt-6 max-w-2xl mx-auto card p-3 text-chilli-700 dark:text-chilli-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Plan comparison */}
        {loadingPlans ? (
          <div className="mt-10 flex items-center justify-center text-masala-600">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading plans…
          </div>
        ) : (
          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {plans.map((p) => (
              <PlanCard
                key={p.key}
                plan={p}
                selected={selected === p.key}
                onSelect={() => {
                  if (p.contactSales) {
                    window.location.href = `mailto:${CONTACT_EMAIL}?subject=Enterprise plan enquiry`
                    return
                  }
                  setSelected(p.key)
                  setError('')
                }}
              />
            ))}
          </div>
        )}

        {/* Signup form */}
        {selectedPlan && !isContact && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 max-w-xl mx-auto card p-6 md:p-8"
          >
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h2 className="font-display text-2xl text-masala-900 dark:text-saffron-100">
                Create your {selectedPlan.label} account
              </h2>
              <div className="text-sm text-masala-600 dark:text-saffron-200/70">
                {selectedPlan.price === 0 || selectedPlan.price == null
                  ? selectedPlan.priceNote
                  : <>₹{selectedPlan.price.toLocaleString()} · {selectedPlan.priceNote}</>}
              </div>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <Field icon={<Store className="h-4 w-4" />} label="Restaurant name" value={form.orgName} onChange={set('orgName')} placeholder="e.g. Spice Garden" required />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field icon={<User className="h-4 w-4" />} label="Your name" value={form.name} onChange={set('name')} placeholder="Owner / manager" required />
                <Field icon={<Phone className="h-4 w-4" />} label="Phone (optional)" value={form.phone} onChange={set('phone')} placeholder="98765 43210" />
              </div>
              <Field icon={<Mail className="h-4 w-4" />} label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@restaurant.com" autoComplete="email" required />
              <Field
                icon={<Lock className="h-4 w-4" />}
                label="Password"
                type={show ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                required
                right={
                  <button type="button" onClick={() => setShow((v) => !v)} className="text-masala-500 hover:text-masala-800" aria-label="Toggle password">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <button type="submit" disabled={submitting} className="btn-primary w-full !py-3">
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Setting up…</>
                ) : isPaid ? (
                  <>Subscribe & create — ₹{(selectedPlan.price || 0).toLocaleString()} <ArrowRight className="h-4 w-4" /></>
                ) : (
                  <>Start free trial <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
              <p className="text-[11px] text-center text-masala-500 dark:text-saffron-200/60 inline-flex items-center justify-center gap-1.5 w-full">
                <ShieldCheck className="h-3.5 w-3.5" />
                {isPaid
                  ? 'Secure payment via Razorpay. Your organization activates the moment payment succeeds.'
                  : `Free for ${selectedPlan.durationDays} days. No card required.`}
              </p>
            </form>
          </motion.div>
        )}
      </main>
    </div>
  )
}

function PlanCard({ plan, selected, onSelect }) {
  const free = plan.price === 0 || plan.price == null
  return (
    <div
      className={clsx(
        'relative card p-5 flex flex-col text-left transition',
        selected ? 'ring-2 ring-saffron-500 shadow-plate' : 'hover:shadow-warm',
        plan.recommended && 'md:scale-[1.02]',
      )}
    >
      {plan.recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-curry-gradient text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 shadow-warm">
          Most popular
        </span>
      )}
      <div className="text-xs font-semibold uppercase tracking-widest text-saffron-700">{plan.label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        {plan.contactSales ? (
          <span className="font-display text-3xl text-masala-900 dark:text-saffron-100">Custom</span>
        ) : free ? (
          <span className="font-display text-3xl text-masala-900 dark:text-saffron-100">Free</span>
        ) : (
          <>
            <span className="font-display text-4xl text-masala-900 dark:text-saffron-100">₹{plan.price.toLocaleString()}</span>
          </>
        )}
      </div>
      <div className="text-xs text-masala-600 dark:text-saffron-200/70 mt-1">{plan.priceNote}</div>

      <ul className="mt-4 space-y-2 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-masala-700 dark:text-saffron-200/80">
            <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        className={clsx(
          'mt-5 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition',
          plan.contactSales
            ? 'border border-saffron-300 text-saffron-700 hover:bg-saffron-50'
            : selected
              ? 'bg-curry-gradient text-white shadow-warm'
              : 'border border-saffron-300 text-saffron-700 hover:bg-saffron-50',
        )}
      >
        {plan.contactSales ? 'Contact sales' : selected ? 'Selected' : 'Choose plan'}
      </button>
    </div>
  )
}

function Field({ icon, label, type = 'text', value, onChange, placeholder, right, autoComplete, required }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-masala-700 dark:text-saffron-200/80">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 bg-cream dark:bg-masala-800 rounded-2xl border border-saffron-200 dark:border-masala-700 px-3 py-2.5 focus-within:border-saffron-400">
        <span className="text-masala-500">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text)' }}
        />
        {right}
      </div>
    </label>
  )
}
