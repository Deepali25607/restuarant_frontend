import { Outlet, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FormattedMessage } from 'react-intl'
import { ShoppingBag, MapPin, Flame } from 'lucide-react'
import { useSessionStore, selectCartCount } from '../store/useSessionStore'
import { useOrgStore } from '../store/useOrgStore'
import { usePlatformStore } from '../store/usePlatformStore'
import LanguagePicker from './LanguagePicker'
import ThemeToggle from './ThemeToggle'

export default function Layout() {
  const location = useLocation()
  const tableNo = useSessionStore((s) => s.tableNo)
  const cartCount = useSessionStore(selectCartCount)
  const branding = useOrgStore((s) => s.branding)
  const platformName = usePlatformStore((s) => s.platform?.name) || 'Masala Story'
  const onWelcome = location.pathname === '/'

  // Whatever org the customer is on drives the header / footer. We never
  // want to leak the platform brand ("Masala Story") onto a tenant's page.
  const orgName = branding?.name || ''
  const orgThemeColor = branding?.themeColor || '#ea580c'
  const orgLogoUrl = branding?.logoUrl || ''

  return (
    <div className="min-h-screen flex flex-col">
      {!onWelcome && (
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-cream/70 dark:bg-masala-900/60 border-b border-saffron-200/60 dark:border-masala-700/60">
          <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
            <Link to="/menu" className="flex items-center gap-2 min-w-0">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center shadow-warm overflow-hidden shrink-0"
                style={{ background: `linear-gradient(135deg, ${orgThemeColor}, ${orgThemeColor}cc)` }}
              >
                {orgLogoUrl ? (
                  <img src={orgLogoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Flame className="h-5 w-5 text-white" />
                )}
              </div>
              <div className="leading-tight min-w-0">
                <div className="font-display text-lg truncate" title={orgName}>
                  {orgName || <FormattedMessage id="welcome.tagline" />}
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-saffron-500">
                  <FormattedMessage id="welcome.tagline" />
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              {tableNo && (
                <span className="hidden sm:inline-flex items-center gap-1 chip">
                  <MapPin className="h-3.5 w-3.5" />{' '}
                  <FormattedMessage id="common.table" /> {tableNo}
                </span>
              )}
              <LanguagePicker variant="pill" />
              <ThemeToggle size="sm" />
              <Link
                to="/cart"
                className="relative inline-flex items-center justify-center h-11 w-11 rounded-full bg-white dark:bg-masala-800 shadow-warm border border-saffron-200 dark:border-masala-700 hover:bg-saffron-50 dark:hover:bg-masala-700 transition"
                aria-label="Open cart"
              >
                <ShoppingBag className="h-5 w-5 text-masala-800 dark:text-saffron-200" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-chilli-600 text-white text-[11px] font-bold flex items-center justify-center shadow">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {!onWelcome && (
        <footer
          className="py-8 text-center text-xs opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          Crafted with ghee &amp; love · {orgName || platformName} © {new Date().getFullYear()}
        </footer>
      )}
    </div>
  )
}
