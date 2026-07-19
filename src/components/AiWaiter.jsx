import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FormattedMessage, useIntl } from 'react-intl'
import { Sparkles, X, Send, Plus, Mic, MicOff, Loader2, ChefHat } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { aiStatus, aiChat } from '../lib/api'
import { useSessionStore } from '../store/useSessionStore'
import { useOrgStore } from '../store/useOrgStore'
import { useLocaleStore } from '../store/useLocaleStore'
import DishImage from './DishImage'

// Web Speech API locales for the app's supported languages.
const SPEECH_LANG = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN' }

// One status check per page load — the widget is mounted in Layout, which
// survives route changes, but avoid re-asking on remounts too.
let statusPromise = null
const getAiStatus = () => {
  if (!statusPromise) statusPromise = aiStatus().catch(() => ({ enabled: false }))
  return statusPromise
}

const QUICK_CHIPS = [
  { id: 'ai.chip.recommend', emoji: '🍕' },
  { id: 'ai.chip.veg', emoji: '🥗' },
  { id: 'ai.chip.jain', emoji: '🙏' },
  { id: 'ai.chip.protein', emoji: '💪' },
  { id: 'ai.chip.combo', emoji: '🍽️' },
]

export default function AiWaiter() {
  const intl = useIntl()
  const locale = useLocaleStore((s) => s.locale)
  const orgKey = useOrgStore((s) => s.orgKey)
  const branding = useOrgStore((s) => s.branding)
  const tableNo = useSessionStore((s) => s.tableNo)
  const serviceType = useSessionStore((s) => s.serviceType)
  const cart = useSessionStore((s) => s.cart)
  const addItem = useSessionStore((s) => s.addItem)

  const [enabled, setEnabled] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const scrollRef = useRef(null)

  const themeColor = branding?.themeColor || '#ea580c'

  useEffect(() => {
    let alive = true
    getAiStatus().then((s) => alive && setEnabled(Boolean(s?.enabled)))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, busy, open])

  const speechSupported = useMemo(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    [],
  )

  if (!enabled || !orgKey) return null

  const send = async (text) => {
    const trimmed = String(text || '').trim()
    if (!trimmed || busy) return
    // Failed bubbles hold our own error strings — keep them on screen but
    // never replay them to the model as assistant turns.
    const history = [...messages.filter((m) => !m.failed), { role: 'user', text: trimmed }]
    setMessages((ms) => [...ms, { role: 'user', text: trimmed }])
    setInput('')
    setBusy(true)
    try {
      const res = await aiChat({
        messages: history.map((m) => ({ role: m.role, text: m.text })),
        locale,
        context: {
          serviceType,
          tableNo,
          cart: cart.map((c) => ({ name: c.name, qty: c.qty, price: c.price })),
        },
      })
      setMessages((ms) => [
        ...ms,
        { role: 'assistant', text: res.reply, suggestions: res.suggestions || [] },
      ])
    } catch (e) {
      const msg =
        e?.response?.data?.message || intl.formatMessage({ id: 'ai.error' })
      setMessages((ms) => [...ms, { role: 'assistant', text: msg, failed: true }])
    } finally {
      setBusy(false)
    }
  }

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = SPEECH_LANG[locale] || 'en-IN'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript
      if (text) send(text)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recognitionRef.current = rec
    setListening(true)
    rec.start()
  }

  const addSuggestion = (dish) => {
    addItem(dish)
    toast.success(intl.formatMessage({ id: 'menu.added' }, { name: dish.name }))
  }

  return (
    <>
      {/* Floating launcher — bottom-right, clear of the centered cart pill. */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            aria-label={intl.formatMessage({ id: 'ai.open' })}
            className="fixed bottom-5 right-4 z-50 h-14 w-14 rounded-full text-white shadow-plate flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` }}
          >
            <Sparkles className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed z-50 inset-x-0 bottom-0 md:inset-x-auto md:right-5 md:bottom-5 md:w-[400px] flex flex-col card !rounded-b-none md:!rounded-3xl overflow-hidden h-[75vh] md:h-[600px] md:max-h-[80vh]"
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center gap-3 text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` }}
            >
              <div className="h-10 w-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
                <ChefHat className="h-5 w-5" />
              </div>
              <div className="flex-1 leading-tight">
                <div className="font-display text-lg">
                  <FormattedMessage id="ai.title" />
                </div>
                <div className="text-[11px] opacity-90">
                  {branding?.name || <FormattedMessage id="ai.subtitle" />}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-white/15"
                aria-label={intl.formatMessage({ id: 'common.close' })}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
              <Bubble role="assistant">
                <FormattedMessage id="ai.greeting" values={{ name: branding?.name || '' }} />
              </Bubble>

              {messages.map((m, i) => (
                <div key={i}>
                  <Bubble role={m.role} failed={m.failed}>
                    {m.text}
                  </Bubble>
                  {m.suggestions?.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {m.suggestions.map((d) => (
                        <SuggestionCard key={d.id} dish={d} onAdd={() => addSuggestion(d)} />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {busy && (
                <Bubble role="assistant">
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <FormattedMessage id="ai.thinking" />
                  </span>
                </Bubble>
              )}
            </div>

            {/* Quick chips */}
            <div className="px-3 pb-2 shrink-0 flex gap-2 overflow-x-auto scrollbar-hide">
              {QUICK_CHIPS.map((c) => (
                <button
                  key={c.id}
                  disabled={busy}
                  onClick={() => send(intl.formatMessage({ id: c.id }))}
                  className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold border border-saffron-200 dark:border-masala-700 bg-white dark:bg-masala-800 hover:bg-saffron-50 dark:hover:bg-masala-700 transition disabled:opacity-50"
                  style={{ color: 'var(--text)' }}
                >
                  {c.emoji} <FormattedMessage id={c.id} />
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
              className="px-3 pb-3 pt-1 shrink-0 flex items-center gap-2"
            >
              <div
                className="flex-1 flex items-center gap-2 rounded-full border px-3 py-2"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={intl.formatMessage({
                    id: listening ? 'ai.listening' : 'ai.placeholder',
                  })}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: 'var(--text)' }}
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={clsx(
                      'p-1.5 rounded-full transition',
                      listening
                        ? 'bg-chilli-600 text-white animate-pulse'
                        : 'hover:bg-saffron-100 dark:hover:bg-masala-700',
                    )}
                    aria-label={intl.formatMessage({ id: 'ai.voice' })}
                  >
                    {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!input.trim() || busy}
                className="h-10 w-10 rounded-full text-white flex items-center justify-center disabled:opacity-40 shrink-0"
                style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` }}
                aria-label={intl.formatMessage({ id: 'ai.send' })}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Bubble({ role, failed, children }) {
  const isUser = role === 'user'
  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed',
          isUser
            ? 'bg-curry-gradient text-white rounded-br-md'
            : failed
              ? 'bg-chilli-50 dark:bg-chilli-900/20 text-chilli-700 dark:text-chilli-300 border border-chilli-200 dark:border-chilli-800 rounded-bl-md'
              : 'bg-saffron-50 dark:bg-masala-800 rounded-bl-md border border-saffron-100 dark:border-masala-700',
        )}
        style={!isUser && !failed ? { color: 'var(--text)' } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

function SuggestionCard({ dish, onAdd }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-saffron-200 dark:border-masala-700 bg-white dark:bg-masala-800 p-2 pr-3">
      <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 relative">
        <DishImage src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
        <span className={clsx('absolute top-1 left-1', dish.isVeg ? 'veg-dot' : 'nonveg-dot')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
          {dish.name}
        </div>
        <div className="text-xs font-display" style={{ color: 'var(--text-muted)' }}>
          ₹{dish.price}
        </div>
      </div>
      <button onClick={onAdd} className="btn-primary !py-1.5 !px-3 text-xs shrink-0">
        <Plus className="h-3.5 w-3.5" /> <FormattedMessage id="menu.add" />
      </button>
    </div>
  )
}
