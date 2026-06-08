import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FormattedMessage, useIntl } from 'react-intl'
import clsx from 'clsx'
import { QrCode, ArrowRight, Sparkles, Flame, Utensils, AlertTriangle, Loader2, Table2, BedDouble, ShoppingBag } from 'lucide-react'
import { useSessionStore } from '../store/useSessionStore'
import { useOrgStore } from '../store/useOrgStore'
import { fetchLocation } from '../lib/api'
import { locationNoun } from '../lib/location'
import LanguagePicker from '../components/LanguagePicker'
import ThemeToggle from '../components/ThemeToggle'

const heroDishes = [
  {
    name: 'Butter Chicken',
    img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80',
  },
  {
    name: 'Paneer Tikka',
    img: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80',
  },
  {
    name: 'Biryani',
    img: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&q=80',
  },
]

export default function Welcome() {
  const intl = useIntl()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setLocation = useSessionStore((s) => s.setLocation)
  const tableNo = useSessionStore((s) => s.tableNo)
  const sessionId = useSessionStore((s) => s.sessionId)
  const { orgKey, branding } = useOrgStore()
  // Which ordering channels this org offers. Default: tables on, rooms &
  // takeaway off (covers orgs whose branding predates the flags).
  const tableEnabled = branding ? branding.tableOrderingEnabled !== false : true
  const roomEnabled = Boolean(branding?.roomOrderingEnabled)
  const takeawayEnabled = Boolean(branding?.takeawayOrderingEnabled)
  const channels = [
    tableEnabled && { key: 'table', label: 'Dine-in', icon: Table2 },
    roomEnabled && { key: 'room', label: 'Room service', icon: BedDouble },
    takeawayEnabled && { key: 'takeaway', label: 'Takeaway', icon: ShoppingBag },
  ].filter(Boolean)
  const [entryType, setEntryType] = useState(
    params.get('room') ? 'room' : 'table',
  )
  const [tableInput, setTableInput] = useState(params.get('table') || params.get('room') || '')
  const [checking, setChecking] = useState(false)
  const [entryError, setEntryError] = useState('')
  const tableInputRef = useRef(null)
  // Resolve which channel is active: the picked one if it's offered, else the
  // first offered channel (covers single-channel orgs and stale picks).
  const effectiveType = channels.some((c) => c.key === entryType)
    ? entryType
    : channels[0]?.key || 'table'
  const isTakeaway = effectiveType === 'takeaway'
  const noun = locationNoun(effectiveType)

  // Takeaway needs no location — start the session and head to the menu.
  const startTakeaway = () => {
    setLocation('takeaway')
    navigate('/menu')
  }

  // Brand badge click: returning customers (table already set in this
  // session) jump straight to the menu; first-time visitors get nudged
  // toward the table-entry form instead of a dead click.
  const onBrandClick = () => {
    if (!hasOrg) return
    if (tableNo) {
      navigate('/menu')
      return
    }
    if (tableInputRef.current) {
      tableInputRef.current.focus()
      tableInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Validate the table before letting the customer past this page. We refuse
  // entry if the table doesn't exist, or if another customer already has an
  // open tab on it (same-session adds are allowed because they're the same
  // diner returning).
  const enter = async (e) => {
    e?.preventDefault()
    const t = tableInput.trim()
    if (!t) return
    setEntryError('')
    setChecking(true)
    try {
      const table = await fetchLocation(effectiveType, t, sessionId || undefined)
      if (table.occupiedBy === 'other') {
        setEntryError(
          `${noun} ${t} is currently occupied by another customer. Please try a different one.`,
        )
        return
      }
      setLocation(effectiveType, t)
      navigate('/menu')
    } catch (err) {
      if (err?.response?.status === 404) {
        setEntryError(`${noun} ${t} doesn't exist at this restaurant. Please check with the staff.`)
      } else if (err?.response?.status === 400) {
        // Org not selected yet — ask user to pick a restaurant first.
        setEntryError(intl.formatMessage({ id: 'welcome.pickRestaurant' }))
      } else {
        setEntryError(err?.response?.data?.message || err.message)
      }
    } finally {
      setChecking(false)
    }
  }

  const orgName = branding?.name || ''
  const orgThemeColor = branding?.themeColor || '#ea580c'
  const hasOrg = !!orgKey && !!branding

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-spice-radial pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-5 md:px-10 pt-8 pb-20">
        <nav className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBrandClick}
            className="flex items-center gap-2 rounded-2xl px-1 py-1 -mx-1 hover:bg-saffron-50 dark:hover:bg-masala-800/40 transition disabled:cursor-default disabled:hover:bg-transparent"
            disabled={!hasOrg}
            title={
              !hasOrg
                ? undefined
                : tableNo
                  ? `Enter ${orgName || 'the restaurant'}'s menu`
                  : 'Enter your table number to continue'
            }
            aria-label={orgName ? `${orgName} — open menu` : 'Open menu'}
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shadow-warm overflow-hidden shrink-0"
              style={{ background: `linear-gradient(135deg, ${orgThemeColor}, ${orgThemeColor}cc)` }}
            >
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Flame className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="leading-tight text-left">
              <div className="font-display text-xl">
                {orgName || <FormattedMessage id="welcome.eyebrow" />}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-saffron-500">
                <FormattedMessage id="welcome.tagline" />
              </div>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <LanguagePicker variant="pill" />
            <ThemeToggle />
          </div>
        </nav>

        <div className="mt-16 grid md:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />{' '}
              <FormattedMessage id="welcome.eyebrow" />
            </span>
            <h1 className="mt-4 text-5xl md:text-6xl leading-[1.05]">
              <FormattedMessage id="welcome.heroLine1" />
              <br />
              <FormattedMessage id="welcome.heroLine2" />{' '}
              <span className="relative inline-block">
                <span className="bg-curry-gradient bg-clip-text text-transparent">
                  <FormattedMessage id="welcome.heroHighlight" />
                </span>
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                >
                  <path
                    d="M2 9 Q 50 0 100 6 T 198 4"
                    stroke="#ea580c"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>{' '}
              <FormattedMessage id="welcome.heroLine3" />
            </h1>
            <p
              className="mt-5 text-lg max-w-md"
              style={{ color: 'var(--text-muted)' }}
            >
              <FormattedMessage id="welcome.subtitle" />
            </p>

            {hasOrg ? (
              <>
                {channels.length > 1 && (
                  <div className="mt-8 inline-flex rounded-full border border-saffron-200 dark:border-masala-700 bg-white dark:bg-masala-800 p-1">
                    {channels.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setEntryType(opt.key)
                          setEntryError('')
                        }}
                        className={clsx(
                          'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition',
                          effectiveType === opt.key
                            ? 'bg-curry-gradient text-white shadow-warm'
                            : 'text-masala-700 dark:text-saffron-200',
                        )}
                      >
                        <opt.icon className="h-4 w-4" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                {isTakeaway ? (
                  <button
                    type="button"
                    onClick={startTakeaway}
                    className={clsx('btn-primary !py-3 !px-6', channels.length > 1 ? 'mt-3' : 'mt-8')}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <FormattedMessage id="welcome.startTakeaway" defaultMessage="Start takeaway order" />
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <form onSubmit={enter} className={clsx('card p-2 flex items-center gap-2 max-w-md', channels.length > 1 ? 'mt-3' : 'mt-8')}>
                    <div className="pl-4 pr-2 text-saffron-500">
                      {effectiveType === 'room' ? <BedDouble className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}
                    </div>
                    <input
                      ref={tableInputRef}
                      value={tableInput}
                      onChange={(e) => {
                        setTableInput(e.target.value)
                        if (entryError) setEntryError('')
                      }}
                      placeholder={`Enter your ${noun.toLowerCase()} number`}
                      inputMode="numeric"
                      className="flex-1 bg-transparent outline-none py-3 placeholder:opacity-60"
                      style={{ color: 'var(--text)' }}
                    />
                    <button
                      type="submit"
                      className="btn-primary !py-2.5 !px-5"
                      disabled={!tableInput.trim() || checking}
                    >
                      {checking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <FormattedMessage id="welcome.begin" />
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {entryError && (
                  <div className="mt-3 max-w-md flex items-start gap-2 rounded-2xl border border-chilli-200 dark:border-chilli-800 bg-chilli-50 dark:bg-chilli-900/20 text-chilli-700 dark:text-chilli-300 px-3 py-2.5 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{entryError}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-8 max-w-md card p-5 flex items-start gap-3">
                <QrCode className="h-5 w-5 mt-0.5 text-saffron-600 shrink-0" />
                <div>
                  <div className="font-semibold" style={{ color: 'var(--text)' }}>
                    Scan the QR at your table
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Open the camera, scan the QR taped to your table, and you'll land here with your restaurant ready to go.
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-saffron-500" />
                <FormattedMessage id="welcome.liveKitchen" />
              </div>
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-chilli-500" />
                <FormattedMessage id="welcome.tandoor" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative h-[460px]"
          >
            {heroDishes.map((d, i) => (
              <motion.div
                key={d.name}
                className="absolute rounded-3xl overflow-hidden shadow-plate border-4 border-white dark:border-masala-800"
                style={{
                  top: ['10%', '34%', '4%'][i],
                  left: ['8%', '38%', '58%'][i],
                  width: ['58%', '52%', '46%'][i],
                  height: ['58%', '52%', '46%'][i],
                  zIndex: [3, 2, 1][i],
                }}
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 6 + i,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.4,
                }}
              >
                <img src={d.img} alt={d.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                  <div className="text-white font-semibold">{d.name}</div>
                </div>
              </motion.div>
            ))}
            <div className="absolute -bottom-2 left-6 right-6 h-8 rounded-full bg-black/20 blur-2xl" />
          </motion.div>
        </div>

        <div className="mt-20 grid sm:grid-cols-3 gap-4">
          {[
            { k: '120+', v: <FormattedMessage id="welcome.stat.dishes" /> },
            { k: '8 min', v: <FormattedMessage id="welcome.stat.prep" /> },
            { k: '4.9★', v: <FormattedMessage id="welcome.stat.rating" /> },
          ].map((s, i) => (
            <div key={i} className="card p-6 text-center">
              <div className="font-display text-3xl text-saffron-600 dark:text-saffron-400">
                {s.k}
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
