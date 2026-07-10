import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Plus,
  Pencil,
  X,
  Save,
  Power,
  AlertTriangle,
  Flame,
  TrendingUp,
  LogOut,
  Users,
  Receipt,
  IndianRupee,
  Activity,
  Palette,
  ExternalLink,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CalendarPlus,
  FileText,
  Copy,
  Check,
  Link2,
  QrCode,
  Package,
  Ticket,
  Trash2,
  Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import {
  fetchPlatformOverview,
  fetchOrganizations,
  createOrganization,
  updateOrganization,
  extendSubscription,
  cancelSubscription,
  reactivateSubscription,
  fetchInvoices,
  createInvoice,
  updateInvoice,
  updatePlatformBranding,
  fetchAdminPlans,
  createPlan,
  updatePlan,
  deletePlan,
  fetchCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../../lib/api'
import { useAuthStore } from '../../store/useAuthStore'
import { usePlatformStore, loadPlatformBranding } from '../../store/usePlatformStore'

// The customer-facing landing for a restaurant is `/order/<slug>`. We build
// it from the current origin so the link is copy-paste ready on whatever host
// the console is served from (localhost, staging, prod). The slug is derived
// from the org's name at creation time, so this URL always routes to the
// right restaurant.
const customerUrlFor = (slug) =>
  `${typeof window !== 'undefined' ? window.location.origin : ''}/order/${slug}`

const blank = {
  name: '',
  slug: '',
  themeColor: '#ea580c',
  logoUrl: '',
  address: '',
  gstNumber: '',
  contactPhone: '',
  contactEmail: '',
  subscriptionPlan: 'trial',
  timezone: 'Asia/Kolkata',
  locale: 'en',
  currency: 'INR',
  currencySymbol: '₹',
  gstRate: 5,
  taxLabel: 'GST',
  businessHours: [],
  admin: { name: '', email: '', password: '' },
}

export default function SuperAdmin() {
  const navigate = useNavigate()
  const { user, token, logout } = useAuthStore()
  const platform = usePlatformStore((s) => s.platform)
  const [overview, setOverview] = useState(null)
  const [orgs, setOrgs] = useState([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [managing, setManaging] = useState(null) // org currently in Manage Subscription dialog
  const [editingPlatform, setEditingPlatform] = useState(false)
  const [created, setCreated] = useState(null) // freshly onboarded org → show its URL
  const [view, setView] = useState('orgs') // 'orgs' | 'plans' | 'coupons'

  useEffect(() => {
    if (!token || user?.role !== 'super_admin') return
    refresh().catch((e) => setError(e?.response?.data?.message || e.message))
  }, [token, user])

  const refresh = async () => {
    const [o, list] = await Promise.all([
      fetchPlatformOverview(),
      fetchOrganizations(),
    ])
    setOverview(o)
    setOrgs(list)
  }

  if (!token || !user) {
    return <Navigate to="/admin/login" replace state={{ from: '/super-admin' }} />
  }
  if (user.role !== 'super_admin') {
    // Tenant admin trying to reach super-admin → bounce them to their own console.
    return <Navigate to="/admin" replace />
  }

  const saveOrg = async () => {
    setError('')
    try {
      if (editing.id) {
        const updated = await updateOrganization(editing.id, editing)
        setOrgs((s) => s.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
        toast.success(`"${updated.name}" updated`)
      } else {
        const slug = (editing.slug || editing.name).toLowerCase().replace(/[^a-z0-9-]+/g, '-')
        const payload = { ...editing, slug }
        const createdOrg = await createOrganization(payload)
        setOrgs((s) => [...s, { ...createdOrg, stats: createdOrg.stats || { users: 1, dishes: 0, tables: 0, orders: 0, revenue: 0 } }])
        toast.success(`"${createdOrg.name}" created`, {
          description: createdOrg.admin
            ? `Admin login: ${createdOrg.admin.email}`
            : undefined,
        })
        setCreated(createdOrg)
      }
      setEditing(null)
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    }
  }

  const toggleActive = async (org) => {
    const verb = org.active ? 'Deactivate' : 'Activate'
    if (!confirm(`${verb} "${org.name}"? ${org.active ? 'Staff will be blocked from signing in.' : 'Staff can sign in again immediately.'}`)) return
    try {
      const updated = await updateOrganization(org.id, { active: !org.active })
      setOrgs((s) => s.map((o) => (o.id === org.id ? { ...o, ...updated } : o)))
      toast.success(`"${org.name}" ${updated.active ? 'activated' : 'deactivated'}`)
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <header className="border-b border-saffron-200/60 dark:border-masala-700 backdrop-blur-xl bg-cream/80 dark:bg-masala-900/60 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shadow-warm overflow-hidden"
              style={{
                background: platform?.themeColor
                  ? `linear-gradient(135deg, ${platform.themeColor}, ${platform.themeColor}cc)`
                  : undefined,
              }}
            >
              {platform?.logoUrl ? (
                <img src={platform.logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Flame className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg">{platform?.name || 'Masala Story'}</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-saffron-700 dark:text-saffron-300">
                Platform Console
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditingPlatform(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-saffron-300 dark:border-masala-600 px-3 py-1.5 text-xs font-semibold text-saffron-700 dark:text-saffron-300 hover:bg-saffron-50 dark:hover:bg-masala-700"
              title="Edit platform name, logo, tagline"
            >
              <Palette className="h-3.5 w-3.5" /> Brand
            </button>
            <div className="text-sm hidden sm:block">
              <div className="font-semibold">{user.name}</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Super Admin
              </div>
            </div>
            <button
              onClick={() => {
                logout()
                navigate('/admin/login', { replace: true })
              }}
              className="p-2 rounded-full hover:bg-chilli-50 dark:hover:bg-chilli-900/30 text-chilli-600"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex bg-white dark:bg-masala-800 border border-saffron-200 dark:border-masala-700 rounded-full p-1 w-fit">
          {[
            { key: 'orgs', label: 'Organizations', icon: Building2 },
            { key: 'plans', label: 'Plans', icon: Package },
            { key: 'coupons', label: 'Coupons', icon: Ticket },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition',
                view === t.key ? 'bg-curry-gradient text-white shadow-warm' : 'text-masala-700 dark:text-saffron-200',
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {view === 'plans' && <PlansManager onError={setError} />}
        {view === 'coupons' && <CouponsManager onError={setError} />}

        {view === 'orgs' && (<>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <span className="eyebrow">
              <Building2 className="h-3.5 w-3.5" /> Organizations
            </span>
            <h1 className="section-heading mt-1">Tenants on the platform</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Each row is one restaurant. Their data — staff, menus, orders, billing — is fully isolated.
            </p>
          </div>
          <button onClick={() => setEditing({ ...blank })} className="btn-primary">
            <Plus className="h-4 w-4" /> Onboard organization
          </button>
        </div>

        {error && (
          <div className="card p-3 text-chilli-700 dark:text-chilli-300 text-sm">
            <AlertTriangle className="inline mr-1.5 h-4 w-4" />
            {error}
          </div>
        )}

        {overview && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Active orgs" value={`${overview.activeOrganizations}/${overview.organizations}`} icon={Building2} accent="from-saffron-500 to-chilli-600" />
              <Stat label="Total users" value={overview.totalUsers} icon={Users} accent="from-amber-500 to-orange-600" />
              <Stat label="Orders processed" value={overview.totalOrders} icon={Receipt} accent="from-emerald-500 to-emerald-700" />
              <Stat label="Platform revenue" value={`₹${overview.totalRevenue.toLocaleString()}`} icon={IndianRupee} accent="from-masala-600 to-masala-800" />
            </div>
            {overview.billing && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="MRR" value={`₹${overview.billing.mrr.toLocaleString()}`} icon={TrendingUp} accent="from-emerald-500 to-emerald-700" />
                <Stat label="Active trials" value={overview.billing.trials} icon={Clock} accent="from-amber-500 to-saffron-600" />
                <Stat
                  label="Overdue invoices"
                  value={overview.billing.overdueCount}
                  hint={overview.billing.overdueAmount ? `₹${overview.billing.overdueAmount.toLocaleString()}` : null}
                  icon={AlertTriangle}
                  accent="from-chilli-500 to-chilli-700"
                />
                <Stat
                  label="Pending invoices"
                  value={overview.billing.pendingCount}
                  hint={overview.billing.pendingAmount ? `₹${overview.billing.pendingAmount.toLocaleString()}` : null}
                  icon={FileText}
                  accent="from-masala-500 to-masala-700"
                />
              </div>
            )}
          </>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {orgs.map((org) => (
            <OrgCard
              key={org.id}
              org={org}
              onEdit={() => setEditing({ ...org })}
              onToggleActive={() => toggleActive(org)}
              onManage={() => setManaging(org)}
            />
          ))}
          {orgs.length === 0 && (
            <div className="card p-10 text-center col-span-full" style={{ color: 'var(--text-muted)' }}>
              No organizations yet. Onboard your first restaurant above.
            </div>
          )}
        </div>
        </>)}
      </main>

      <AnimatePresence>
        {editing && (
          <OrgDialog
            initial={editing}
            onClose={() => setEditing(null)}
            onSave={saveOrg}
            onChange={(patch) => setEditing((e) => ({ ...e, ...patch }))}
          />
        )}
        {managing && (
          <SubscriptionDialog
            org={managing}
            onClose={() => setManaging(null)}
            onOrgChanged={(updated) => {
              setOrgs((s) =>
                s.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)),
              )
              setManaging((m) => (m && m.id === updated.id ? { ...m, ...updated } : m))
              refresh().catch(() => {})
            }}
          />
        )}
        {editingPlatform && (
          <PlatformBrandDialog
            initial={platform}
            onClose={() => setEditingPlatform(false)}
            onSaved={() => loadPlatformBranding()}
          />
        )}
        {created && (
          <NewOrgDialog org={created} onClose={() => setCreated(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({ label, value, icon: Icon, accent, hint }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className={`absolute -top-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {label}
          </div>
          <Icon className="h-4 w-4 text-saffron-700 dark:text-saffron-300" />
        </div>
        <div className="font-display text-2xl mt-2">{value}</div>
        {hint && (
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </div>
        )}
      </div>
    </div>
  )
}

const STATUS_BADGE = {
  trial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  expiring: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  past_due: 'bg-chilli-100 text-chilli-800 dark:bg-chilli-900/30 dark:text-chilli-200',
  expired: 'bg-chilli-200 text-chilli-900 dark:bg-chilli-900/50 dark:text-chilli-100',
  cancelled: 'bg-masala-200 text-masala-900 dark:bg-masala-700 dark:text-masala-100',
}
const STATUS_LABEL = {
  trial: 'Trial',
  active: 'Active',
  expiring: 'Renewing soon',
  past_due: 'Past due',
  expired: 'Expired',
  cancelled: 'Cancelled',
}

function SubscriptionBadge({ subscription }) {
  if (!subscription) return null
  const cls = STATUS_BADGE[subscription.status] || STATUS_BADGE.active
  const label = STATUS_LABEL[subscription.status] || subscription.status
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${cls}`}>
      <CreditCard className="h-3 w-3" />
      {label}
      {Number.isFinite(subscription.daysUntilRenewal) && subscription.daysUntilRenewal != null && (
        <span className="opacity-80 normal-case font-medium ml-1">
          · {subscription.daysUntilRenewal}d
        </span>
      )}
    </span>
  )
}

function OrgCard({ org, onEdit, onToggleActive, onManage }) {
  // No table number — OrderEntry sets the org and bounces to the welcome
  // page where the diner picks a table. Hard-coding `/1` breaks the demo
  // whenever Table 1 happens to be held by an open order.
  const customerUrl = `/order/${org.slug}`
  const fullUrl = customerUrlFor(org.slug)
  return (
    <div
      className={clsx(
        'card p-5 relative overflow-hidden',
        !org.active && 'opacity-60',
      )}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: org.themeColor }}
      />
      <div className="flex items-start gap-3">
        <div
          className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-warm"
          style={{ background: `linear-gradient(135deg, ${org.themeColor}, ${org.themeColor}cc)` }}
        >
          {org.logoUrl ? (
            <img src={org.logoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
          ) : (
            org.name.slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl truncate" style={{ color: 'var(--text)' }}>
              {org.name}
            </h2>
            <span
              className={clsx(
                'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
                org.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-chilli-100 text-chilli-800',
              )}
            >
              {org.active ? 'Active' : 'Inactive'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-saffron-100 text-saffron-800 dark:bg-masala-700 dark:text-saffron-200">
              {org.subscriptionPlan}
            </span>
            <SubscriptionBadge subscription={org.subscription} />
          </div>
          <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {org.id} · /{org.slug}
          </div>
          {org.address && (
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {org.address}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <UsageMini label="Tables" usage={org.usage?.tables} fallback={org.stats.tables} />
        <UsageMini label="Users" usage={org.usage?.users} fallback={org.stats.users} />
        <UsageMini label="Dishes" usage={org.usage?.dishes} fallback={org.stats.dishes} />
        <Stat2 label="Orders" value={org.stats.orders} />
      </div>

      {/* Customer landing URL — derived from the org slug, always routes here. */}
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
          <Link2 className="inline h-3 w-3 mr-1" /> Customer link
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-saffron-200/70 dark:border-masala-700 px-3 py-1.5" style={{ background: 'var(--input-bg)' }}>
          <span className="flex-1 truncate text-xs font-mono" style={{ color: 'var(--text)' }} title={fullUrl}>
            {fullUrl}
          </span>
          <CopyButton text={fullUrl} />
          <Link
            to={customerUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700 text-saffron-700 dark:text-saffron-300"
            title="Open customer flow"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Lifetime revenue
          </div>
          <div className="font-display text-lg">
            ₹{(org.stats.revenue || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2 pt-3 border-t border-saffron-200/70 dark:border-masala-700">
        <button onClick={onEdit} className="btn-ghost flex-1 justify-center !py-2">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button
          onClick={onManage}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold border border-saffron-300 text-saffron-700 hover:bg-saffron-50 dark:border-saffron-800 dark:text-saffron-300 dark:hover:bg-saffron-900/20"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Subscription
        </button>
        <button
          onClick={onToggleActive}
          className={clsx(
            'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold border',
            org.active
              ? 'border-chilli-200 text-chilli-700 hover:bg-chilli-50 dark:hover:bg-chilli-900/30'
              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30',
          )}
          aria-label={org.active ? 'Deactivate' : 'Activate'}
          title={org.active ? 'Deactivate' : 'Activate'}
        >
          <Power className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function CopyButton({ text, className }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API can be unavailable on insecure origins — fall back to a
      // hidden textarea + execCommand so copy still works on plain http.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* give up silently */ }
      document.body.removeChild(ta)
    }
    setCopied(true)
    toast.success('Link copied')
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className={clsx(
        'p-1.5 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700 text-saffron-700 dark:text-saffron-300',
        className,
      )}
      title="Copy link"
      aria-label="Copy link"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function NewOrgDialog({ org, onClose }) {
  const url = customerUrlFor(org.slug)
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
        className="card p-6 w-full max-w-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-600">Ready</div>
              <h2 className="font-display text-xl leading-tight" style={{ color: 'var(--text)' }}>
                {org.name} is live
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          Share this link with the restaurant. It always routes diners to{' '}
          <span className="font-semibold">{org.name}</span> — print it as a QR or
          append a table number (<span className="font-mono">{url}/5</span>).
        </p>

        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            <QrCode className="inline h-3 w-3 mr-1" /> Customer link
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-saffron-200/70 dark:border-masala-700 px-3 py-2" style={{ background: 'var(--input-bg)' }}>
            <span className="flex-1 truncate text-sm font-mono" style={{ color: 'var(--text)' }} title={url}>
              {url}
            </span>
            <CopyButton text={url} />
          </div>
        </div>

        {org.admin?.email && (
          <div className="mt-4 rounded-2xl border border-saffron-200/70 dark:border-masala-700 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Admin login
            </div>
            <div className="text-sm font-mono mt-0.5" style={{ color: 'var(--text)' }}>
              {org.admin.email}
            </div>
            <div className="text-[10px] mt-0.5 opacity-70">
              Signs in at /admin/login with the password you set.
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2 justify-end">
          <a href={url} target="_blank" rel="noreferrer" className="btn-ghost">
            <ExternalLink className="h-4 w-4" /> Preview
          </a>
          <button onClick={onClose} className="btn-primary">
            <Check className="h-4 w-4" /> Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Stat2({ label, value }) {
  return (
    <div className="rounded-2xl border p-2" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
      <div className="font-display text-lg">{value}</div>
      <div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

function UsageMini({ label, usage, fallback }) {
  const used = usage?.used ?? fallback ?? 0
  const limit = usage?.limit
  const atLimit = Number.isFinite(limit) && used >= limit
  const nearLimit = Number.isFinite(limit) && used >= Math.max(1, Math.floor(limit * 0.8))
  const tone = atLimit ? 'border-chilli-300 dark:border-chilli-700' : nearLimit ? 'border-saffron-300 dark:border-saffron-700' : ''
  return (
    <div
      className={`rounded-2xl border p-2 ${tone}`}
      style={{ background: 'var(--input-bg)', borderColor: tone ? undefined : 'var(--input-border)' }}
      title={limit == null ? 'Unlimited' : `${used} of ${limit} used`}
    >
      <div className="font-display text-lg leading-none">
        {used}
        {limit != null && (
          <span className="text-xs opacity-60"> / {limit}</span>
        )}
      </div>
      <div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

function OrgDialog({ initial, onClose, onSave, onChange }) {
  const isNew = !initial.id
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
        className="card p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl" style={{ color: 'var(--text)' }}>
            {isNew ? 'Onboard organization' : `Edit "${initial.name}"`}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          <Field label="Restaurant name" value={initial.name} onChange={(v) => onChange({ name: v })} />
          <Field
            label="Slug (URL)"
            value={initial.slug}
            onChange={(v) => onChange({ slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            help="Customer URL: /order/<slug> · QR target: /order/<slug>/<table>"
          />
          <Field label="Logo URL" value={initial.logoUrl} onChange={(v) => onChange({ logoUrl: v })} />
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-masala-700 dark:text-saffron-300">
              <Palette className="inline h-3 w-3 mr-1" /> Theme color
            </span>
            <div className="mt-1.5 flex gap-2 items-center">
              <input
                type="color"
                value={initial.themeColor}
                onChange={(e) => onChange({ themeColor: e.target.value })}
                className="h-10 w-12 rounded-lg border border-saffron-200 dark:border-masala-700 bg-transparent"
              />
              <input
                value={initial.themeColor}
                onChange={(e) => onChange({ themeColor: e.target.value })}
                className="flex-1 rounded-2xl border px-3 py-2 text-sm font-mono"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Field label="Address" value={initial.address} onChange={(v) => onChange({ address: v })} />
          </div>
          <Field label="GST number" value={initial.gstNumber} onChange={(v) => onChange({ gstNumber: v })} />
          <Field label="Subscription plan" value={initial.subscriptionPlan} onChange={(v) => onChange({ subscriptionPlan: v })} help="trial · monthly · yearly · enterprise" />
          <Field label="Contact phone" value={initial.contactPhone} onChange={(v) => onChange({ contactPhone: v })} />
          <Field label="Contact email" value={initial.contactEmail} onChange={(v) => onChange({ contactEmail: v })} />
        </div>

        <div className="mt-6 pt-4 border-t border-saffron-200/70 dark:border-masala-700">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Operational settings
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Timezone" value={initial.timezone} onChange={(v) => onChange({ timezone: v })} help="IANA name, e.g. Asia/Kolkata" />
            <Field label="Default locale" value={initial.locale} onChange={(v) => onChange({ locale: v })} help="en · hi · bn" />
            <Field label="Currency code" value={initial.currency} onChange={(v) => onChange({ currency: v.toUpperCase() })} help="ISO 4217, e.g. INR · USD" />
            <Field label="Currency symbol" value={initial.currencySymbol} onChange={(v) => onChange({ currencySymbol: v })} help="Shown in totals, e.g. ₹ · $" />
            <Field label="Tax label" value={initial.taxLabel} onChange={(v) => onChange({ taxLabel: v })} help="Shown on receipts, e.g. GST · VAT" />
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-masala-700 dark:text-saffron-300">
                Tax rate %
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={initial.gstRate ?? 0}
                onChange={(e) => onChange({ gstRate: Number(e.target.value) || 0 })}
                className="mt-1.5 w-full rounded-2xl border px-3 py-2.5 text-sm font-mono outline-none"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
              />
              <div className="text-[10px] mt-1 opacity-70">
                Applied to every order's subtotal. Defaults to 5%.
              </div>
            </label>
          </div>
          <div className="mt-4">
            <BusinessHoursEditor
              value={initial.businessHours || []}
              onChange={(next) => onChange({ businessHours: next })}
            />
          </div>
        </div>

        {isNew && (
          <div className="mt-6 pt-4 border-t border-saffron-200/70 dark:border-masala-700">
            <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
              First admin
            </div>
            <p className="text-[11px] mb-3 opacity-70">
              Required. They'll sign in at <span className="font-mono">/admin/login</span> with this email and password and can invite the rest of the team from there.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Admin name"
                value={initial.admin?.name || ''}
                onChange={(v) => onChange({ admin: { ...(initial.admin || {}), name: v } })}
              />
              <Field
                label="Admin email"
                value={initial.admin?.email || ''}
                onChange={(v) => onChange({ admin: { ...(initial.admin || {}), email: v } })}
                help="Used to log in"
              />
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-masala-700 dark:text-saffron-300">
                  Starter password
                </span>
                <input
                  type="text"
                  value={initial.admin?.password || ''}
                  onChange={(e) => onChange({ admin: { ...(initial.admin || {}), password: e.target.value } })}
                  placeholder="Share this with the admin — they can change it later"
                  className="mt-1.5 w-full rounded-2xl border px-3 py-2.5 text-sm font-mono outline-none"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
                />
                <div className="text-[10px] mt-1 opacity-70">At least 6 characters.</div>
              </label>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={onSave} className="btn-primary">
            <Save className="h-4 w-4" /> {isNew ? 'Onboard' : 'Save changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, value, onChange, help }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-masala-700 dark:text-saffron-300">
        {label}
      </span>
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-2xl border px-3 py-2.5 text-sm outline-none"
        style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
      />
      {help && (
        <div className="text-[10px] mt-1 opacity-70">{help}</div>
      )}
    </label>
  )
}

const PLAN_OPTIONS = [
  { key: 'trial', label: 'Trial (14 days)', price: 0 },
  { key: 'monthly', label: 'Monthly', price: 2999 },
  { key: 'yearly', label: 'Yearly', price: 2499 },
  { key: 'enterprise', label: 'Enterprise', price: 0 },
]

function SubscriptionDialog({ org, onClose, onOrgChanged }) {
  const sub = org.subscription || {}
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [invoices, setInvoices] = useState([])
  const [recordOnExtend, setRecordOnExtend] = useState(true)
  const [planDraft, setPlanDraft] = useState(org.subscriptionPlan)
  const [priceDraft, setPriceDraft] = useState(org.monthlyPrice || 0)
  // Override drafts. Empty string means "no override → use plan default";
  // a numeric string is the custom cap. We send `null` to clear or a number
  // to set.
  const [maxTablesDraft, setMaxTablesDraft] = useState(
    org.maxTables == null ? '' : String(org.maxTables),
  )
  const [maxRoomsDraft, setMaxRoomsDraft] = useState(
    org.maxRooms == null ? '' : String(org.maxRooms),
  )
  const [maxUsersDraft, setMaxUsersDraft] = useState(
    org.maxUsers == null ? '' : String(org.maxUsers),
  )
  const [maxDishesDraft, setMaxDishesDraft] = useState(
    org.maxDishes == null ? '' : String(org.maxDishes),
  )
  // Channel entitlements the platform admin grants/revokes for this tenant.
  // Initial values come from the effective allowed state (per-tenant override
  // ?? plan default) the API returns as org.allowedChannels.
  const allowedNow = org.allowedChannels || { table: true, room: false, takeaway: false }
  const [tableAllowedDraft, setTableAllowedDraft] = useState(Boolean(allowedNow.table))
  const [roomAllowedDraft, setRoomAllowedDraft] = useState(Boolean(allowedNow.room))
  const [takeawayAllowedDraft, setTakeawayAllowedDraft] = useState(Boolean(allowedNow.takeaway))
  // Premium AI entitlement — effective value (org override ?? plan default).
  const [aiAllowedDraft, setAiAllowedDraft] = useState(Boolean(org.aiEntitled))

  useEffect(() => {
    let alive = true
    fetchInvoices(org.id)
      .then((list) => { if (alive) setInvoices(list) })
      .catch(() => {})
    return () => { alive = false }
  }, [org.id])

  const guard = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    } finally {
      setBusy(false)
    }
  }

  const planChanged = planDraft !== org.subscriptionPlan
  const priceChanged = Number(priceDraft) !== Number(org.monthlyPrice || 0)

  const savePlan = () => guard(async () => {
    const patch = {}
    if (planChanged) patch.subscriptionPlan = planDraft
    if (priceChanged) patch.monthlyPrice = Number(priceDraft) || 0
    if (!Object.keys(patch).length) return
    const updated = await updateOrganization(org.id, patch)
    onOrgChanged(updated)
    toast.success('Plan updated')
  })

  const parseOverride = (raw) => {
    const t = String(raw).trim()
    if (t === '') return null
    const n = Number(t)
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined
  }
  const overrides = {
    maxTables: parseOverride(maxTablesDraft),
    maxRooms: parseOverride(maxRoomsDraft),
    maxUsers: parseOverride(maxUsersDraft),
    maxDishes: parseOverride(maxDishesDraft),
  }
  const overridesValid = Object.values(overrides).every((v) => v !== undefined)
  const overridesChanged =
    overrides.maxTables !== (org.maxTables ?? null) ||
    overrides.maxRooms !== (org.maxRooms ?? null) ||
    overrides.maxUsers !== (org.maxUsers ?? null) ||
    overrides.maxDishes !== (org.maxDishes ?? null)

  const saveLimits = () => guard(async () => {
    if (!overridesValid) {
      setError('Limit overrides must be whole numbers (or empty to use the plan default).')
      return
    }
    const updated = await updateOrganization(org.id, overrides)
    onOrgChanged(updated)
    toast.success('Quotas updated')
  })

  const channelsChanged =
    tableAllowedDraft !== Boolean(allowedNow.table) ||
    roomAllowedDraft !== Boolean(allowedNow.room) ||
    takeawayAllowedDraft !== Boolean(allowedNow.takeaway) ||
    aiAllowedDraft !== Boolean(org.aiEntitled)

  const saveChannels = () => guard(async () => {
    const updated = await updateOrganization(org.id, {
      tableOrderingAllowed: tableAllowedDraft,
      roomOrderingAllowed: roomAllowedDraft,
      takeawayOrderingAllowed: takeawayAllowedDraft,
      aiAllowed: aiAllowedDraft,
    })
    onOrgChanged(updated)
    toast.success('Feature access updated')
  })

  const extend = ({ markPaid, recordInvoice }) => guard(async () => {
    const { organization: updated, invoice } = await extendSubscription(org.id, {
      recordInvoice,
      markPaid,
      amount: org.monthlyPrice || PLAN_OPTIONS.find((p) => p.key === org.subscriptionPlan)?.price || 0,
      paymentMethod: markPaid ? 'bank-transfer' : '',
    })
    onOrgChanged(updated)
    if (invoice) setInvoices((s) => [invoice, ...s])
    toast.success(markPaid ? 'Renewed and marked paid' : 'Period extended')
  })

  const markInvoicePaid = (inv) => guard(async () => {
    const updated = await updateInvoice(inv.id, { status: 'paid', paymentMethod: inv.paymentMethod || 'bank-transfer' })
    setInvoices((s) => s.map((i) => (i.id === updated.id ? updated : i)))
    toast.success(`${updated.number} marked paid`)
  })

  const voidInvoice = (inv) => guard(async () => {
    if (!confirm(`Void invoice ${inv.number}?`)) return
    const updated = await updateInvoice(inv.id, { status: 'void' })
    setInvoices((s) => s.map((i) => (i.id === updated.id ? updated : i)))
    toast.success(`${updated.number} voided`)
  })

  const cancelNow = () => guard(async () => {
    if (!confirm(`Cancel "${org.name}" immediately? Staff will be signed out.`)) return
    const updated = await cancelSubscription(org.id, { immediate: true })
    onOrgChanged(updated)
    toast.success('Cancelled immediately')
  })

  const cancelAtEnd = () => guard(async () => {
    const updated = await cancelSubscription(org.id)
    onOrgChanged(updated)
    toast.success('Will cancel at end of current cycle')
  })

  const reactivate = () => guard(async () => {
    const updated = await reactivateSubscription(org.id)
    onOrgChanged(updated)
    toast.success('Subscription reactivated')
  })

  const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-masala-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card !rounded-b-none md:!rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="p-6 pb-4 flex items-start justify-between gap-3 sticky top-0 z-10 bg-white dark:bg-masala-800 border-b border-saffron-200/70 dark:border-masala-700">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-saffron-600 dark:text-saffron-300">
              Subscription
            </div>
            <h2 className="font-display text-2xl" style={{ color: 'var(--text)' }}>{org.name}</h2>
            <div className="mt-2 flex items-center gap-2">
              <SubscriptionBadge subscription={sub} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {sub.daysUntilRenewal != null
                  ? `${sub.daysUntilRenewal}d until ${sub.status === 'trial' ? 'trial ends' : 'renewal'}`
                  : sub.status === 'active' ? 'No fixed cycle' : ''}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 text-xs bg-chilli-50 dark:bg-chilli-900/20 border border-chilli-200 dark:border-chilli-800 rounded-xl px-3 py-2 text-chilli-700 dark:text-chilli-300">
            <AlertTriangle className="inline mr-1 h-3.5 w-3.5" /> {error}
          </div>
        )}

        <div className="px-6 py-5 grid sm:grid-cols-2 gap-3 text-sm">
          <Info label="Plan" value={`${sub.planLabel || org.subscriptionPlan} · ₹${(sub.monthlyPrice || org.monthlyPrice || 0).toLocaleString()}/mo`} />
          <Info
            label={org.subscriptionPlan === 'trial' ? 'Trial ends' : 'Current period ends'}
            value={fmt(org.subscriptionPlan === 'trial' ? sub.trialEndsAt : sub.currentPeriodEnd)}
          />
          <Info label="Status" value={STATUS_LABEL[sub.status] || sub.status} />
          <Info label="Auto-cancel at period end" value={sub.cancelAtPeriodEnd ? 'Yes' : 'No'} />
        </div>

        <div className="px-6 pb-4">
          <div className="rounded-2xl border border-saffron-200/70 dark:border-masala-700 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Change plan
            </div>
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest opacity-70">Plan</span>
                <select
                  value={planDraft}
                  onChange={(e) => {
                    setPlanDraft(e.target.value)
                    const preset = PLAN_OPTIONS.find((p) => p.key === e.target.value)
                    if (preset) setPriceDraft(preset.price)
                  }}
                  className="mt-1 w-full rounded-2xl border px-3 py-2.5 text-sm"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest opacity-70">Monthly price (INR)</span>
                <input
                  type="number"
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  className="mt-1 w-full rounded-2xl border px-3 py-2.5 text-sm font-mono"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                disabled={busy || (!planChanged && !priceChanged)}
                onClick={savePlan}
                className="btn-primary !py-2"
              >
                <Save className="h-3.5 w-3.5" /> Save plan
              </button>
            </div>
            <div className="text-[10px] mt-2 opacity-70">
              Changing the plan resets the billing dates: a fresh trial / cycle starts now.
            </div>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="rounded-2xl border border-saffron-200/70 dark:border-masala-700 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Quotas (overrides plan defaults)
            </div>
            <div className="text-[10px] mt-0.5 opacity-70">
              Leave a field empty to use the plan default. Set a number to cap or expand for this tenant only.
            </div>
            <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <QuotaField
                label="Tables"
                value={maxTablesDraft}
                onChange={setMaxTablesDraft}
                usage={org.usage?.tables}
              />
              <QuotaField
                label="Rooms"
                value={maxRoomsDraft}
                onChange={setMaxRoomsDraft}
                usage={org.usage?.rooms}
              />
              <QuotaField
                label="Staff"
                value={maxUsersDraft}
                onChange={setMaxUsersDraft}
                usage={org.usage?.users}
              />
              <QuotaField
                label="Dishes"
                value={maxDishesDraft}
                onChange={setMaxDishesDraft}
                usage={org.usage?.dishes}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                disabled={busy || !overridesValid || !overridesChanged}
                onClick={saveLimits}
                className="btn-primary !py-2"
              >
                <Save className="h-3.5 w-3.5" /> Save quotas
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="rounded-2xl border border-saffron-200/70 dark:border-masala-700 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Channel access (plan entitlements)
            </div>
            <div className="text-[10px] mt-0.5 opacity-70">
              Which ordering channels this restaurant is allowed to offer. A channel turned
              off here is hidden from the restaurant's own settings and can't be used.
            </div>
            <div className="mt-3 space-y-2">
              <ChannelToggle
                label="Dine-in (tables)"
                desc="Allow the restaurant to offer table ordering."
                checked={tableAllowedDraft}
                onChange={setTableAllowedDraft}
              />
              <ChannelToggle
                label="Room service (rooms)"
                desc="Allow the restaurant to offer room-service ordering."
                checked={roomAllowedDraft}
                onChange={setRoomAllowedDraft}
              />
              <ChannelToggle
                label="Takeaway"
                desc="Allow the restaurant to offer takeaway ordering."
                checked={takeawayAllowedDraft}
                onChange={setTakeawayAllowedDraft}
              />
              <ChannelToggle
                label="✨ AI features (premium)"
                desc="AI waiter chatbot, business insights, review summaries & menu descriptions."
                checked={aiAllowedDraft}
                onChange={setAiAllowedDraft}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                disabled={busy || !channelsChanged}
                onClick={saveChannels}
                className="btn-primary !py-2"
              >
                <Save className="h-3.5 w-3.5" /> Save access
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="rounded-2xl border border-saffron-200/70 dark:border-masala-700 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Lifecycle actions
                </div>
                <div className="text-[10px] mt-0.5 opacity-70">
                  Extend bumps the cycle end forward by one period.
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={recordOnExtend}
                  onChange={(e) => setRecordOnExtend(e.target.checked)}
                />
                Record invoice
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                disabled={busy || org.subscriptionPlan === 'enterprise'}
                onClick={() => extend({ recordInvoice: recordOnExtend, markPaid: false })}
                className="btn-primary !py-2 !px-3"
              >
                <CalendarPlus className="h-3.5 w-3.5" /> Extend cycle
              </button>
              <button
                disabled={busy || org.subscriptionPlan === 'enterprise' || org.subscriptionPlan === 'trial'}
                onClick={() => extend({ recordInvoice: true, markPaid: true })}
                className="btn-primary !py-2 !px-3 !bg-emerald-600 hover:!bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Renew & mark paid
              </button>
              {sub.status === 'cancelled' || sub.status === 'expired' ? (
                <button disabled={busy} onClick={reactivate} className="btn-primary !py-2 !px-3 !bg-emerald-600 hover:!bg-emerald-700">
                  <RotateCcw className="h-3.5 w-3.5" /> Reactivate
                </button>
              ) : (
                <>
                  <button disabled={busy} onClick={cancelAtEnd} className="btn-ghost !py-2 !px-3">
                    <Clock className="h-3.5 w-3.5" /> Cancel at period end
                  </button>
                  <button disabled={busy} onClick={cancelNow} className="!py-2 !px-3 inline-flex items-center gap-1.5 rounded-full text-xs font-semibold border border-chilli-300 text-chilli-700 hover:bg-chilli-50 dark:border-chilli-700 dark:text-chilli-200 dark:hover:bg-chilli-900/30">
                    <XCircle className="h-3.5 w-3.5" /> Cancel immediately
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="rounded-2xl border border-saffron-200/70 dark:border-masala-700 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Invoices ({invoices.length})
            </div>
            <div className="mt-3 space-y-2">
              {invoices.length === 0 && (
                <div className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                  No invoices yet. Extend the cycle with "Record invoice" checked to create one.
                </div>
              )}
              {invoices.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  inv={inv}
                  busy={busy}
                  onMarkPaid={() => markInvoicePaid(inv)}
                  onVoid={() => voidInvoice(inv)}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-saffron-200/70 dark:border-masala-700 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest opacity-70">{label}</div>
      <div className="font-display text-base mt-0.5" style={{ color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

function PlatformBrandDialog({ initial, onClose, onSaved }) {
  const [draft, setDraft] = useState({
    name: initial?.name || '',
    tagline: initial?.tagline || '',
    logoUrl: initial?.logoUrl || '',
    themeColor: initial?.themeColor || '#ea580c',
    contactEmail: initial?.contactEmail || '',
    supportUrl: initial?.supportUrl || '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!draft.name.trim()) {
      setError('Platform name is required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await updatePlatformBranding(draft)
      await onSaved?.()
      toast.success('Platform branding updated')
      onClose()
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-masala-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card !rounded-b-none md:!rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
      >
        <div className="p-6 pb-4 border-b border-saffron-200/70 dark:border-masala-700 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-saffron-600 dark:text-saffron-300">
              Platform
            </div>
            <h2 className="font-display text-2xl" style={{ color: 'var(--text)' }}>
              Brand settings
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              These show up wherever there isn't a specific tenant context yet — admin login, customer landing page, document title, favicon.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 grid sm:grid-cols-2 gap-4">
          <Field label="Platform name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
          <Field label="Tagline" value={draft.tagline} onChange={(v) => setDraft((d) => ({ ...d, tagline: v }))} />
          <div className="sm:col-span-2">
            <Field label="Logo URL" value={draft.logoUrl} onChange={(v) => setDraft((d) => ({ ...d, logoUrl: v }))} help="Public image URL. Leave blank to use the chilli-flame default." />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-masala-700 dark:text-saffron-300">
              <Palette className="inline h-3 w-3 mr-1" /> Brand colour
            </span>
            <div className="mt-1.5 flex gap-2 items-center">
              <input
                type="color"
                value={draft.themeColor}
                onChange={(e) => setDraft((d) => ({ ...d, themeColor: e.target.value }))}
                className="h-10 w-12 rounded-lg border border-saffron-200 dark:border-masala-700 bg-transparent"
              />
              <input
                value={draft.themeColor}
                onChange={(e) => setDraft((d) => ({ ...d, themeColor: e.target.value }))}
                className="flex-1 rounded-2xl border px-3 py-2 text-sm font-mono"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
              />
            </div>
          </div>
          <Field label="Support email" value={draft.contactEmail} onChange={(v) => setDraft((d) => ({ ...d, contactEmail: v }))} help="Optional — for tenant-facing error pages." />
          <div className="sm:col-span-2">
            <Field label="Support URL" value={draft.supportUrl} onChange={(v) => setDraft((d) => ({ ...d, supportUrl: v }))} help="Optional. Help docs / status page link." />
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-4 text-xs bg-chilli-50 dark:bg-chilli-900/20 border border-chilli-200 dark:border-chilli-800 rounded-xl px-3 py-2 text-chilli-700 dark:text-chilli-300">
            <AlertTriangle className="inline mr-1 h-3.5 w-3.5" /> {error}
          </div>
        )}

        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-primary">
            <Save className="h-4 w-4" /> Save brand
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

const WEEK_DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

function BusinessHoursEditor({ value, onChange }) {
  // The org list endpoint may return businessHours as a JSON-encoded string
  // (raw DB column) instead of an array. Parse defensively so this editor
  // never crashes the Edit dialog with `value.map is not a function`.
  let rows = []
  if (Array.isArray(value)) rows = value
  else if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) rows = parsed
    } catch {
      /* malformed JSON → fall through to empty list */
    }
  }
  const byDay = new Map(rows.map((row) => [row.day, row]))
  const update = (day, patch) => {
    const next = WEEK_DAYS.map((d) => {
      const current = byDay.get(d.key) || { day: d.key, open: '', close: '' }
      if (d.key !== day) return current
      return { ...current, ...patch }
    }).filter((row) => row.open || row.close || row.closed)
    onChange(next)
  }
  return (
    <div className="rounded-2xl border border-saffron-200/70 dark:border-masala-700 p-3">
      <div className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-2">
        Business hours
      </div>
      <div className="space-y-1.5">
        {WEEK_DAYS.map((d) => {
          const row = byDay.get(d.key) || { day: d.key, open: '', close: '', closed: false }
          return (
            <div key={d.key} className="grid grid-cols-[60px_1fr_1fr_auto] items-center gap-2 text-sm">
              <span className="font-semibold uppercase tracking-widest opacity-80">{d.label}</span>
              <input
                type="time"
                value={row.open || ''}
                onChange={(e) => update(d.key, { open: e.target.value, closed: false })}
                disabled={row.closed}
                className="rounded-xl border px-2 py-1 text-sm font-mono disabled:opacity-50"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
              />
              <input
                type="time"
                value={row.close || ''}
                onChange={(e) => update(d.key, { close: e.target.value, closed: false })}
                disabled={row.closed}
                className="rounded-xl border px-2 py-1 text-sm font-mono disabled:opacity-50"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
              />
              <label className="text-[11px] inline-flex items-center gap-1 opacity-80">
                <input
                  type="checkbox"
                  checked={!!row.closed}
                  onChange={(e) => update(d.key, { closed: e.target.checked, open: '', close: '' })}
                />
                Closed
              </label>
            </div>
          )
        })}
      </div>
      <div className="text-[10px] mt-2 opacity-70">
        Leave both fields blank to keep a day unset (treated as closed).
      </div>
    </div>
  )
}

function QuotaField({ label, value, onChange, usage }) {
  const placeholder = usage?.limit == null ? 'Unlimited' : `Plan: ${usage.limit}`
  const used = usage?.used ?? 0
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest opacity-70">{label}</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border px-3 py-2.5 text-sm font-mono"
        style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
      />
      <div className="text-[10px] mt-1 opacity-70">
        Currently using {used}{usage?.limit != null ? ` of ${usage.limit}` : ''}
      </div>
    </label>
  )
}

function ChannelToggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border px-3 py-2.5" style={{ borderColor: 'var(--input-border)' }}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</div>
        <div className="text-[10px] opacity-70">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative h-6 w-11 rounded-full transition shrink-0',
          checked ? 'bg-emerald-500' : 'bg-masala-300 dark:bg-masala-600',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}

function InvoiceRow({ inv, busy, onMarkPaid, onVoid }) {
  const overdue = inv.status === 'pending' && new Date(inv.dueAt) < new Date()
  const tone = inv.status === 'paid'
    ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800'
    : inv.status === 'void'
      ? 'border-masala-200 bg-masala-50 dark:bg-masala-800/50 dark:border-masala-700 opacity-70'
      : overdue
        ? 'border-chilli-300 bg-chilli-50 dark:bg-chilli-900/20 dark:border-chilli-700'
        : 'border-saffron-200 bg-saffron-50 dark:bg-saffron-900/20 dark:border-saffron-800'
  return (
    <div className={`rounded-xl border px-3 py-2.5 flex items-center gap-3 ${tone}`}>
      <FileText className="h-4 w-4 opacity-70" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold font-mono" style={{ color: 'var(--text)' }}>
          {inv.number} · ₹{inv.amount.toLocaleString()}
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}
          {inv.paidAt && <> · paid {new Date(inv.paidAt).toLocaleDateString()}</>}
          {inv.paymentMethod && <> · {inv.paymentMethod}</>}
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/70 dark:bg-masala-700/70">
        {inv.status}
        {overdue && inv.status === 'pending' ? ' · overdue' : ''}
      </span>
      {inv.status === 'pending' && (
        <>
          <button
            disabled={busy}
            onClick={onMarkPaid}
            className="text-[10px] font-semibold inline-flex items-center gap-1 rounded-full px-2 py-1 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-200"
          >
            <CheckCircle2 className="h-3 w-3" /> Mark paid
          </button>
          <button
            disabled={busy}
            onClick={onVoid}
            className="text-[10px] font-semibold inline-flex items-center gap-1 rounded-full px-2 py-1 border border-chilli-300 text-chilli-700 hover:bg-chilli-50 dark:border-chilli-700 dark:text-chilli-200"
          >
            Void
          </button>
        </>
      )}
    </div>
  )
}

// ── Plans manager ─────────────────────────────────────────────────────
const numOrNull = (v) => (v === '' || v == null ? null : Number(v))
const nullToStr = (v) => (v == null ? '' : String(v))

const blankPlan = {
  id: '', label: '', monthlyPrice: 0, durationDays: 30, billable: true, isTrial: false,
  contactSales: false, recommended: false, selfServe: true, sortOrder: 0, active: true,
  limits: { tables: '', rooms: '', users: '', dishes: '' },
  channels: { table: true, room: false, takeaway: false },
  ai: false, // premium AI features (waiter chatbot, insights, summaries)
}

function PlansManager({ onError }) {
  const [plans, setPlans] = useState(null)
  const [editing, setEditing] = useState(null)

  const load = () => fetchAdminPlans().then((d) => setPlans(d.plans)).catch((e) => onError(e?.response?.data?.message || e.message))
  useEffect(() => { load() }, [])

  const remove = async (p) => {
    if (!confirm(`Delete plan "${p.label}"?`)) return
    try { await deletePlan(p.id); load() }
    catch (e) { toast.error(e?.response?.data?.message || e.message) }
  }

  if (!plans) return <div className="card p-10 flex items-center justify-center text-masala-600"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading plans…</div>

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="eyebrow"><Package className="h-3.5 w-3.5" /> Catalog</span>
          <h1 className="section-heading mt-1">Subscription plans</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            These power the public pricing page and what each new organization is provisioned with.
          </p>
        </div>
        <button onClick={() => setEditing({ ...blankPlan, _new: true })} className="btn-primary">
          <Plus className="h-4 w-4" /> Add plan
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {plans.map((p) => (
          <div key={p.id} className={clsx('card p-4 flex flex-col gap-2', !p.active && 'opacity-60')}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-lg" style={{ color: 'var(--text)' }}>{p.label}</div>
                <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{p.id}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl" style={{ color: 'var(--text)' }}>
                  {p.contactSales ? 'Custom' : `₹${p.monthlyPrice.toLocaleString()}`}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {p.durationDays ? `${p.durationDays}d cycle` : 'no expiry'}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {p.ai && <Tag>✨ AI</Tag>}
              {p.recommended && <Tag>Popular</Tag>}
              {p.isTrial && <Tag>Trial</Tag>}
              {p.contactSales && <Tag>Contact sales</Tag>}
              {!p.selfServe && <Tag>Hidden on signup</Tag>}
              {!p.active && <Tag>Inactive</Tag>}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {['tables', 'rooms', 'users', 'dishes'].map((k) => `${p.limits[k] == null ? '∞' : p.limits[k]} ${k}`).join(' · ')}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Channels: {['table', 'room', 'takeaway'].filter((c) => p.channels[c]).join(', ') || '—'}
            </div>
            <div className="flex gap-2 mt-auto pt-2">
              <button onClick={() => setEditing({ ...p, _new: false, limits: { ...p.limits }, channels: { ...p.channels } })} className="btn-ghost !py-1.5 !px-3 text-xs">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={() => remove(p)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border border-chilli-200 text-chilli-700 hover:bg-chilli-50">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {editing && <PlanEditor draft={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      </AnimatePresence>
    </div>
  )
}

function PlanEditor({ draft, onClose, onSaved }) {
  const [form, setForm] = useState({ ...draft, limits: { tables: nullToStr(draft.limits.tables), rooms: nullToStr(draft.limits.rooms), users: nullToStr(draft.limits.users), dishes: nullToStr(draft.limits.dishes) } })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const save = async () => {
    setBusy(true); setError('')
    try {
      const payload = {
        label: form.label,
        monthlyPrice: Number(form.monthlyPrice) || 0,
        durationDays: form.durationDays === '' ? null : Number(form.durationDays),
        billable: form.billable, isTrial: form.isTrial,
        contactSales: form.contactSales, recommended: form.recommended,
        selfServe: form.selfServe, active: form.active,
        ai: Boolean(form.ai),
        sortOrder: Number(form.sortOrder) || 0,
        limits: { tables: numOrNull(form.limits.tables), rooms: numOrNull(form.limits.rooms), users: numOrNull(form.limits.users), dishes: numOrNull(form.limits.dishes) },
        channels: form.channels,
      }
      if (draft._new) { payload.id = form.id || form.label; await createPlan(payload) }
      else await updatePlan(draft.id, payload)
      toast.success('Plan saved')
      onSaved()
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    } finally { setBusy(false) }
  }

  return (
    <Modal onClose={onClose} title={draft._new ? 'New plan' : `Edit ${draft.label}`}>
      {error && <div className="text-sm text-chilli-700 bg-chilli-50 border border-chilli-200 rounded-2xl px-3 py-2 mb-3">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        <MiniField label="Name" value={form.label} onChange={(v) => set({ label: v })} />
        <MiniField label="Price (₹ / cycle)" type="number" value={form.monthlyPrice} onChange={(v) => set({ monthlyPrice: v })} />
        <MiniField label="Cycle length (days, blank = no expiry)" type="number" value={form.durationDays} onChange={(v) => set({ durationDays: v })} />
        <MiniField label="Sort order" type="number" value={form.sortOrder} onChange={(v) => set({ sortOrder: v })} />
      </div>
      <div className="mt-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Limits (blank = unlimited)</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
        {['tables', 'rooms', 'users', 'dishes'].map((k) => (
          <MiniField key={k} label={k} type="number" value={form.limits[k]} onChange={(v) => set({ limits: { ...form.limits, [k]: v } })} />
        ))}
      </div>
      <div className="mt-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Allowed channels</div>
      <div className="flex gap-4 mt-2">
        {['table', 'room', 'takeaway'].map((c) => (
          <MiniCheck key={c} label={c} checked={form.channels[c]} onChange={(v) => set({ channels: { ...form.channels, [c]: v } })} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniCheck label="✨ AI features (premium)" checked={Boolean(form.ai)} onChange={(v) => set({ ai: v })} />
        <MiniCheck label="Billable (paid)" checked={form.billable} onChange={(v) => set({ billable: v })} />
        <MiniCheck label="Is the free trial" checked={form.isTrial} onChange={(v) => set({ isTrial: v })} />
        <MiniCheck label="Recommended badge" checked={form.recommended} onChange={(v) => set({ recommended: v })} />
        <MiniCheck label="Contact-sales (no checkout)" checked={form.contactSales} onChange={(v) => set({ contactSales: v })} />
        <MiniCheck label="Show on public signup" checked={form.selfServe} onChange={(v) => set({ selfServe: v })} />
        <MiniCheck label="Active" checked={form.active} onChange={(v) => set({ active: v })} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost" disabled={busy}>Cancel</button>
        <button onClick={save} className="btn-primary" disabled={busy || !form.label}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save plan
        </button>
      </div>
    </Modal>
  )
}

// ── Coupons manager ───────────────────────────────────────────────────
const blankCoupon = { code: '', description: '', discountType: 'percent', discountValue: 10, appliesToPlans: [], maxRedemptions: '', expiresAt: '', active: true }

function CouponsManager({ onError }) {
  const [coupons, setCoupons] = useState(null)
  const [plans, setPlans] = useState([])
  const [editing, setEditing] = useState(null)

  const load = () => fetchCoupons().then((d) => setCoupons(d.coupons)).catch((e) => onError(e?.response?.data?.message || e.message))
  useEffect(() => {
    load()
    fetchAdminPlans().then((d) => setPlans(d.plans.filter((p) => p.billable))).catch(() => {})
  }, [])

  const remove = async (c) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return
    try { await deleteCoupon(c.id); load() } catch (e) { toast.error(e?.response?.data?.message || e.message) }
  }

  if (!coupons) return <div className="card p-10 flex items-center justify-center text-masala-600"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading coupons…</div>

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="eyebrow"><Ticket className="h-3.5 w-3.5" /> Discounts</span>
          <h1 className="section-heading mt-1">Subscription coupons</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Customers enter these at signup for a discount on their first payment.
          </p>
        </div>
        <button onClick={() => setEditing({ ...blankCoupon, _new: true })} className="btn-primary">
          <Plus className="h-4 w-4" /> Create coupon
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-saffron-50/60 dark:bg-masala-700/40">
            <tr className="text-left text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              <th className="px-4 py-3">Code</th><th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Plans</th><th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Expires</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-saffron-100 dark:divide-masala-700">
            {coupons.map((c) => (
              <tr key={c.id} className={clsx(!c.active && 'opacity-50')}>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--text)' }}>{c.code}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text)' }}>
                  {c.discountType === 'flat' ? `₹${c.discountValue}` : `${c.discountValue}%`} off
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{c.appliesToPlans.length ? c.appliesToPlans.join(', ') : 'All paid'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{c.redemptions}{c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ''}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => setEditing({ ...c, _new: false, maxRedemptions: nullToStr(c.maxRedemptions), expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '' })} className="btn-ghost !py-1.5 !px-3 text-xs"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(c)} className="inline-flex items-center rounded-full px-3 py-1.5 text-xs border border-chilli-200 text-chilli-700 hover:bg-chilli-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center" style={{ color: 'var(--text-muted)' }}>No coupons yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {editing && <CouponEditor draft={editing} plans={plans} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      </AnimatePresence>
    </div>
  )
}

function CouponEditor({ draft, plans, onClose, onSaved }) {
  const [form, setForm] = useState({ ...draft })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const togglePlan = (id) => set({ appliesToPlans: form.appliesToPlans.includes(id) ? form.appliesToPlans.filter((x) => x !== id) : [...form.appliesToPlans, id] })

  const save = async () => {
    setBusy(true); setError('')
    try {
      const payload = {
        code: form.code, description: form.description,
        discountType: form.discountType, discountValue: Number(form.discountValue) || 0,
        appliesToPlans: form.appliesToPlans,
        maxRedemptions: form.maxRedemptions === '' ? null : Number(form.maxRedemptions),
        expiresAt: form.expiresAt || null, active: form.active,
      }
      if (draft._new) await createCoupon(payload)
      else await updateCoupon(draft.id, payload)
      toast.success('Coupon saved')
      onSaved()
    } catch (e) { setError(e?.response?.data?.message || e.message) } finally { setBusy(false) }
  }

  return (
    <Modal onClose={onClose} title={draft._new ? 'New coupon' : `Edit ${draft.code}`}>
      {error && <div className="text-sm text-chilli-700 bg-chilli-50 border border-chilli-200 rounded-2xl px-3 py-2 mb-3">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        <MiniField label="Code" value={form.code} onChange={(v) => set({ code: v.toUpperCase() })} disabled={!draft._new} />
        <div>
          <span className="text-[10px] uppercase tracking-widest opacity-70">Discount</span>
          <div className="mt-1 flex gap-2">
            <select value={form.discountType} onChange={(e) => set({ discountType: e.target.value })} className="rounded-2xl border px-2 py-2 text-sm" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}>
              <option value="percent">% off</option>
              <option value="flat">₹ off</option>
            </select>
            <input type="number" value={form.discountValue} onChange={(e) => set({ discountValue: e.target.value })} className="flex-1 rounded-2xl border px-3 py-2 text-sm" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }} />
          </div>
        </div>
      </div>
      <MiniField label="Description (optional)" value={form.description} onChange={(v) => set({ description: v })} className="mt-3" />
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <MiniField label="Max redemptions (blank = ∞)" type="number" value={form.maxRedemptions} onChange={(v) => set({ maxRedemptions: v })} />
        <MiniField label="Expires on (blank = never)" type="date" value={form.expiresAt} onChange={(v) => set({ expiresAt: v })} />
      </div>
      <div className="mt-3">
        <span className="text-[10px] uppercase tracking-widest opacity-70">Applies to plans (none selected = all paid plans)</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {plans.map((p) => (
            <button key={p.id} type="button" onClick={() => togglePlan(p.id)} className={clsx('rounded-full px-3 py-1.5 text-xs font-semibold border', form.appliesToPlans.includes(p.id) ? 'bg-curry-gradient text-white border-transparent' : 'border-saffron-200 text-masala-700 dark:text-saffron-200')}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3"><MiniCheck label="Active" checked={form.active} onChange={(v) => set({ active: v })} /></div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost" disabled={busy}>Cancel</button>
        <button onClick={save} className="btn-primary" disabled={busy || !form.code}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save coupon
        </button>
      </div>
    </Modal>
  )
}

// ── Small shared UI for the managers ──────────────────────────────────
function Tag({ children }) {
  return <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-saffron-100 text-saffron-800 dark:bg-masala-700 dark:text-saffron-200">{children}</span>
}

function MiniField({ label, value, onChange, type = 'text', disabled, className }) {
  return (
    <label className={clsx('block', className)}>
      <span className="text-[10px] uppercase tracking-widest opacity-70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={clsx('mt-1 w-full rounded-2xl border px-3 py-2 text-sm', disabled && 'opacity-60')}
        style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
      />
    </label>
  )
}

function MiniCheck({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text)' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded accent-saffron-500" />
      <span className="capitalize">{label}</span>
    </label>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-masala-900/50 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl" style={{ color: 'var(--text)' }}>{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}
