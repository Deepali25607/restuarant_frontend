import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FormattedMessage, useIntl } from 'react-intl'
import { Star, Sparkles, Heart } from 'lucide-react'
import clsx from 'clsx'
import { getOrder, submitRating } from '../lib/api'
import { useSessionStore } from '../store/useSessionStore'

export default function Rating() {
  const intl = useIntl()
  const { orderId } = useParams()
  const navigate = useNavigate()
  const clearTable = useSessionStore((s) => s.clearTable)

  const [order, setOrder] = useState(null)
  const [food, setFood] = useState(0)
  const [service, setService] = useState(0)
  const [overall, setOverall] = useState(0)
  const [comments, setComments] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getOrder(orderId).then(setOrder).catch((e) => setError(e.message))
  }, [orderId])

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await submitRating(orderId, { food, service, overall, comments })
      setDone(true)
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card p-10"
        >
          <div className="mx-auto h-16 w-16 rounded-full bg-curry-gradient flex items-center justify-center shadow-warm">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-display text-3xl mt-5">
            <FormattedMessage id="rating.done.title" />
          </h2>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
            <FormattedMessage id="rating.done.subtitle" />
          </p>
          <button
            onClick={() => {
              clearTable()
              navigate('/')
            }}
            className="btn-primary mt-6"
          >
            <FormattedMessage id="rating.done.cta" />
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 pt-6 pb-24">
      <span className="eyebrow">
        <Sparkles className="h-3.5 w-3.5" /> <FormattedMessage id="rating.eyebrow" />
      </span>
      <h1 className="section-heading mt-2"><FormattedMessage id="rating.title" /></h1>
      <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
        <FormattedMessage id="rating.subtitle" />
      </p>

      <div className="card p-6 mt-6 space-y-6">
        <StarRow labelId="rating.food" value={food} onChange={setFood} />
        <StarRow labelId="rating.service" value={service} onChange={setService} />
        <StarRow labelId="rating.overall" value={overall} onChange={setOverall} />

        <div>
          <label className="text-sm font-semibold">
            <FormattedMessage id="rating.comments" />
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            placeholder={intl.formatMessage({ id: 'rating.commentsPlaceholder' })}
            className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none border focus:border-saffron-400 resize-none"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
          />
        </div>

        {error && (
          <div className="text-sm text-chilli-700 dark:text-chilli-300 bg-chilli-50 dark:bg-chilli-900/30 border border-chilli-200 dark:border-chilli-900 rounded-2xl px-3 py-2">
            {error}
          </div>
        )}

        <button
          disabled={submitting || !overall}
          onClick={submit}
          className="btn-primary w-full"
        >
          {submitting ? (
            <FormattedMessage id="rating.sending" />
          ) : (
            <FormattedMessage id="rating.submit" />
          )}
        </button>
      </div>
    </div>
  )
}

function StarRow({ labelId, value, onChange }) {
  const [hover, setHover] = useState(0)
  const display = hover || value
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          <FormattedMessage id={labelId} />
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {display ? (
            <FormattedMessage id="rating.outOf" values={{ n: display }} />
          ) : (
            <FormattedMessage id="rating.tapStar" />
          )}
        </div>
      </div>
      <div className="mt-2 flex gap-1.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="p-1"
            aria-label={`${n} star`}
          >
            <Star
              className={clsx(
                'h-8 w-8 transition',
                n <= display ? 'text-turmeric-400 fill-turmeric-400' : 'text-saffron-200 dark:text-masala-700',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
