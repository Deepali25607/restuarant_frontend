import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, Loader2, BarChart3, User, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { aiInsights, aiStatus } from '../../lib/api'

// Conversation starters shown before the first question (and as followups the
// model didn't supply). Anything the snapshot covers is fair game.
const STARTERS = [
  'How is revenue trending this week?',
  'What are my best-selling dishes?',
  'When are my busiest hours?',
  'Am I profitable this month?',
  'What do customers complain about?',
  'Which dishes are not selling?',
]

export default function AdminInsights() {
  const [status, setStatus] = useState(null) // null = checking; { enabled, reason }
  const [thread, setThread] = useState([]) // { role, text, table?, followups?, failed? }
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)
  const enabled = status?.enabled === true

  useEffect(() => {
    aiStatus()
      .then((s) => setStatus(s || { enabled: false }))
      .catch(() => setStatus({ enabled: false }))
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [thread, busy])

  const ask = async (question) => {
    const q = String(question || '').trim()
    if (!q || busy) return
    const history = thread.map((m) => ({ role: m.role, text: m.text }))
    setThread((t) => [...t, { role: 'user', text: q }])
    setInput('')
    setBusy(true)
    try {
      const res = await aiInsights({ question: q, history })
      setThread((t) => [
        ...t,
        { role: 'assistant', text: res.answer, table: res.table, followups: res.followups },
      ])
    } catch (e) {
      setThread((t) => [
        ...t,
        {
          role: 'assistant',
          failed: true,
          text: e?.response?.data?.message || e.message || 'Something went wrong — please try again.',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  const lastFollowups = [...thread].reverse().find((m) => m.followups?.length)?.followups

  return (
    <div className="max-w-3xl">
      <span className="eyebrow">
        <Sparkles className="h-3.5 w-3.5" /> AI Insights
      </span>
      <h1 className="section-heading mt-1">Ask your data</h1>
      <p className="mt-2 text-sm text-masala-600 dark:text-saffron-200/70">
        Ask anything about your sales, dishes, expenses, or reviews in plain language —
        answers come straight from your restaurant&apos;s numbers (last 12 months).
      </p>

      {status && !enabled && (
        status.reason === 'not_in_plan' ? (
          <div className="card p-6 mt-6 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-saffron-500" />
            <h2 className="font-display text-xl mt-3" style={{ color: 'var(--text)' }}>
              AI Insights is a premium feature
            </h2>
            <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
              Your current subscription plan doesn&apos;t include the AI assistant.
              Contact your platform provider to upgrade and unlock AI insights, the
              AI waiter chatbot, review summaries, and AI menu descriptions.
            </p>
          </div>
        ) : (
          <div className="card p-4 mt-6 flex items-center gap-3 text-sm text-chilli-700 dark:text-chilli-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            AI is not configured. Add a GEMINI_API_KEY on the server to enable this page.
          </div>
        )
      )}

      {enabled && (
        <div className="card mt-6 flex flex-col min-h-[420px]">
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            {thread.length === 0 && (
              <div className="text-center py-8">
                <BarChart3 className="h-10 w-10 mx-auto text-saffron-400" />
                <p className="mt-3 text-sm text-masala-600 dark:text-saffron-200/70">
                  Try one of these to get started:
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {STARTERS.map((s) => (
                    <Chip key={s} label={s} onClick={() => ask(s)} disabled={busy} />
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {thread.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {m.role === 'user' ? (
                    <div className="flex items-start gap-2.5 justify-end">
                      <div className="bg-curry-gradient text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[85%]">
                        {m.text}
                      </div>
                      <div className="h-8 w-8 rounded-full bg-masala-700 text-white flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-curry-gradient text-white flex items-center justify-center shrink-0 shadow-warm">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div
                        className={clsx(
                          'rounded-2xl rounded-bl-md px-4 py-3 text-sm max-w-[85%] space-y-3',
                          m.failed
                            ? 'bg-chilli-50 dark:bg-chilli-900/20 text-chilli-700 dark:text-chilli-300 border border-chilli-200 dark:border-chilli-800'
                            : 'bg-saffron-50 dark:bg-masala-800 border border-saffron-100 dark:border-masala-700',
                        )}
                        style={!m.failed ? { color: 'var(--text)' } : undefined}
                      >
                        <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                        {m.table && <AnswerTable table={m.table} />}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {busy && (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-curry-gradient text-white flex items-center justify-center shrink-0 shadow-warm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="text-sm inline-flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Crunching your numbers…
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {thread.length > 0 && !busy && (
            <div className="px-5 pb-2 flex gap-2 flex-wrap">
              {(lastFollowups?.length ? lastFollowups : STARTERS.slice(0, 3)).map((f) => (
                <Chip key={f} label={f} onClick={() => ask(f)} disabled={busy} />
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
            className="p-4 border-t border-saffron-200/70 dark:border-masala-700 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Compare this week's revenue to last week"
              className="flex-1 bg-cream dark:bg-masala-800 rounded-full border border-saffron-200 dark:border-masala-700 px-4 py-2.5 text-sm outline-none focus:border-saffron-400"
              style={{ color: 'var(--text)' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="btn-primary !rounded-full !px-4 disabled:opacity-40"
              aria-label="Ask"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function Chip({ label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full px-3 py-1.5 text-xs font-semibold border border-saffron-200 dark:border-masala-700 bg-white dark:bg-masala-800 hover:bg-saffron-50 dark:hover:bg-masala-700 transition disabled:opacity-50"
      style={{ color: 'var(--text)' }}
    >
      {label}
    </button>
  )
}

function AnswerTable({ table }) {
  if (!table?.columns?.length || !table?.rows?.length) return null
  return (
    <div className="rounded-xl border border-saffron-200 dark:border-masala-700 overflow-hidden">
      {table.title && (
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest bg-saffron-100/60 dark:bg-masala-700/60" style={{ color: 'var(--text-muted)' }}>
          {table.title}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {table.columns.map((c) => (
                <th key={c} className="px-3 py-2 font-semibold">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-saffron-100 dark:divide-masala-700">
            {table.rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => (
                  <td key={j} className="px-3 py-2">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
