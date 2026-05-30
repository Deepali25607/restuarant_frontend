import { useState, useRef, useEffect } from 'react'
import { Globe, Check } from 'lucide-react'
import clsx from 'clsx'
import { LANGUAGES, useLocaleStore } from '../store/useLocaleStore'

export default function LanguagePicker({ variant = 'chip' }) {
  const { locale, setLocale } = useLocaleStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    const handle = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          variant === 'pill'
            ? 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border bg-white/80 dark:bg-masala-800/60 text-masala-800 dark:text-saffron-200 border-saffron-200 dark:border-masala-700 hover:bg-saffron-50 dark:hover:bg-masala-700/60'
            : 'inline-flex items-center gap-1.5 chip hover:shadow-warm transition',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{current.native}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-masala-800 border border-saffron-200 dark:border-masala-700 shadow-plate overflow-hidden z-50"
        >
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                role="option"
                aria-selected={l.code === locale}
                onClick={() => {
                  setLocale(l.code)
                  setOpen(false)
                }}
                className={clsx(
                  'w-full flex items-center justify-between px-4 py-2.5 text-sm transition',
                  l.code === locale
                    ? 'bg-saffron-50 dark:bg-masala-700 text-saffron-800 dark:text-saffron-200 font-semibold'
                    : 'text-masala-800 dark:text-cream hover:bg-saffron-50 dark:hover:bg-masala-700',
                )}
              >
                <div className="flex flex-col items-start">
                  <span>{l.native}</span>
                  <span className="text-[10px] uppercase tracking-widest opacity-70">{l.label}</span>
                </div>
                {l.code === locale && <Check className="h-4 w-4 text-saffron-600" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
