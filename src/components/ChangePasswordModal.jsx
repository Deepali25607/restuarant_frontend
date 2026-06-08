import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, X, Eye, EyeOff, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { changePassword } from '../lib/api'

// Self-service password change. Any signed-in staff member can update their own
// password by re-entering the current one. Shared across the admin console,
// cashier desk, and kitchen screen.
export default function ChangePasswordModal({ open, onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
    setShow(false)
  }

  const close = () => {
    if (busy) return
    reset()
    onClose()
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (next.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }
    if (next !== confirm) {
      setError('New passwords do not match')
      return
    }
    if (next === current) {
      setError('New password must be different from the current one')
      return
    }
    setBusy(true)
    try {
      await changePassword({ currentPassword: current, newPassword: next })
      toast.success('Password updated')
      reset()
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[60] bg-masala-900/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="card p-6 w-full max-w-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-curry-gradient flex items-center justify-center shadow-warm">
                  <KeyRound className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-display text-xl">Change password</h2>
              </div>
              <button onClick={close} className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-3">
              <Field label="Current password" value={current} onChange={setCurrent} show={show} autoFocus />
              <Field label="New password" value={next} onChange={setNext} show={show} />
              <Field label="Confirm new password" value={confirm} onChange={setConfirm} show={show} />

              <label className="flex items-center gap-2 text-xs text-masala-600 dark:text-saffron-200/70 select-none cursor-pointer">
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="inline-flex items-center gap-1.5"
                >
                  {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {show ? 'Hide' : 'Show'} passwords
                </button>
              </label>

              {error && (
                <div className="text-sm text-chilli-700 dark:text-chilli-300 bg-chilli-50 dark:bg-chilli-900/30 border border-chilli-200 dark:border-chilli-900 rounded-2xl px-3 py-2">
                  {error}
                </div>
              )}

              <button type="submit" disabled={busy} className="btn-primary w-full mt-1 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {busy ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Field({ label, value, onChange, show, autoFocus }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-masala-700 dark:text-saffron-200/80">
        {label}
      </span>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className={clsx(
          'mt-1 w-full rounded-2xl px-3 py-2 text-sm outline-none border focus:border-saffron-400',
        )}
        style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
      />
    </label>
  )
}
