import { Smartphone } from 'lucide-react'
import clsx from 'clsx'

// The Android APK download page is served by Nginx at "<base>/app" (outside the
// SPA — see deploy/nginx-nexussoftlab.conf), so BASE_URL ("/OrderNow/" in prod,
// "/" in dev) gives us the right absolute path without hardcoding the domain.
const appUrl = `${import.meta.env.BASE_URL}app`

// Don't advertise the download when we're already running inside the Android
// WebView wrapper — its user-agent carries the "OrderNowApp" tag we set there.
const isInApp =
  typeof navigator !== 'undefined' && /OrderNowApp/i.test(navigator.userAgent)

export default function GetAppButton({ className = '', variant = 'pill' }) {
  if (isInApp) return null

  const base =
    'inline-flex items-center gap-1.5 font-semibold transition select-none'
  const styles = {
    pill:
      'rounded-full border border-saffron-200 dark:border-masala-700 bg-white/70 dark:bg-masala-800/60 px-3 py-1.5 text-sm text-masala-700 dark:text-saffron-200 hover:bg-saffron-50 dark:hover:bg-masala-700 shadow-warm',
    link: 'text-sm underline decoration-dotted underline-offset-2 hover:opacity-80',
  }

  return (
    <a
      href={appUrl}
      className={clsx(base, styles[variant] || styles.pill, className)}
      title="Download the Android app"
    >
      <Smartphone className="h-4 w-4" />
      {/* In the crowded top nav (pill) the label collapses on phones; the
          footer link always shows it. */}
      <span className={variant === 'pill' ? 'hidden sm:inline' : ''}>Get the app</span>
    </a>
  )
}
