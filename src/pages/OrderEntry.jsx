import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Flame, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react'
import { fetchOrgBranding, fetchTable } from '../lib/api'
import { useOrgStore } from '../store/useOrgStore'
import { useSessionStore } from '../store/useSessionStore'

// `/order/:orgSlug/:tableNo` — the canonical QR-scan landing.
// Three outcomes:
//  1. Org or table missing/inactive → friendly "not found" screen
//  2. Table held by *another* customer's session → "table is busy" screen
//     with a retry input so they can grab a different table
//  3. Otherwise → set org + table on the session and forward to /menu
export default function OrderEntry() {
  const { orgSlug, tableNo } = useParams()
  const navigate = useNavigate()
  const setOrg = useOrgStore((s) => s.setOrg)
  const setTable = useSessionStore((s) => s.setTable)
  const existingSessionId = useSessionStore((s) => s.sessionId)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [retryInput, setRetryInput] = useState('')
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    let alive = true
    let branding = null

    fetchOrgBranding(orgSlug)
      .then((b) => {
        if (!alive) return
        branding = b
        setOrg(b.slug, b)
        if (!tableNo) {
          navigate('/', { replace: true })
          return null
        }
        return fetchTable(tableNo, existingSessionId || undefined)
      })
      .then((table) => {
        if (!alive || !table) return
        if (table.occupiedBy === 'other') {
          setBusy({
            tableNo,
            orgName: branding?.name || orgSlug,
            activeOrderCount: table.activeOrderCount || 1,
          })
          return
        }
        setTable(tableNo)
        navigate('/menu', { replace: true })
      })
      .catch((e) => {
        if (!alive) return
        setError(
          e?.response?.status === 404
            ? `We couldn't find ${tableNo ? `Table ${tableNo} at` : 'restaurant'} "${orgSlug}". Check the QR or ask the staff.`
            : e?.response?.data?.message || e.message,
        )
      })
    return () => {
      alive = false
    }
  }, [orgSlug, tableNo, navigate, setOrg, setTable, existingSessionId])

  const tryAnotherTable = async (e) => {
    e?.preventDefault()
    const next = retryInput.trim()
    if (!next) return
    setRetrying(true)
    setError('')
    try {
      const table = await fetchTable(next, existingSessionId || undefined)
      if (table.occupiedBy === 'other') {
        setBusy({
          tableNo: next,
          orgName: busy?.orgName,
          activeOrderCount: table.activeOrderCount || 1,
        })
        setRetryInput('')
      } else {
        setTable(next)
        navigate('/menu', { replace: true })
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setError(`Table ${next} doesn't exist here. Please ask the staff.`)
      } else {
        setError(err?.response?.data?.message || err.message)
      }
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <div className="max-w-md w-full">
        <div className="h-14 w-14 mx-auto rounded-full bg-curry-gradient flex items-center justify-center shadow-warm mb-4">
          <Flame className="h-7 w-7 text-white" />
        </div>

        {error ? (
          <div>
            <h1 className="font-display text-2xl mb-2" style={{ color: 'var(--text)' }}>
              <AlertCircle className="inline h-5 w-5 mr-1 text-chilli-600" />
              Something's not right
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {error}
            </p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="btn-ghost mt-4"
            >
              Back to landing
            </button>
          </div>
        ) : busy ? (
          <div>
            <div className="mx-auto h-14 w-14 -mt-2 mb-3 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-300" />
            </div>
            <h1 className="font-display text-2xl mb-1" style={{ color: 'var(--text)' }}>
              Table {busy.tableNo} is already taken
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Another customer has an open tab at this table
              {busy.activeOrderCount > 1 ? ` (${busy.activeOrderCount} active orders)` : ''}.
              Please pick a different table.
            </p>

            <form
              onSubmit={tryAnotherTable}
              className="card p-2 flex items-center gap-2 mt-5"
            >
              <span className="pl-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Table
              </span>
              <input
                value={retryInput}
                onChange={(e) => setRetryInput(e.target.value)}
                placeholder="e.g. 7"
                inputMode="numeric"
                className="flex-1 bg-transparent outline-none py-2 text-base font-semibold"
                style={{ color: 'var(--text)' }}
                autoFocus
              />
              <button
                type="submit"
                disabled={!retryInput.trim() || retrying}
                className="btn-primary !py-2 !px-4"
              >
                {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Try this one
              </button>
            </form>

            <button
              onClick={() => navigate('/', { replace: true })}
              className="btn-ghost mt-4"
            >
              Back to landing
            </button>
          </div>
        ) : (
          <div>
            <div className="font-display text-2xl" style={{ color: 'var(--text)' }}>
              Preparing your table…
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Loading the menu for table {tableNo}.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
