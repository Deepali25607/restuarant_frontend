import { useEffect, useState } from 'react'
import { Gauge } from 'lucide-react'
import clsx from 'clsx'
import { fetchUsage } from '../../lib/api'

// Tiny shared store so all three gauges (tables/users/dishes) share a single
// GET /usage and refresh together. Without this, each list page would fire
// its own request on mount.
let cache = null
let cacheTs = 0
let inflight = null
const subscribers = new Set()
const STALE_MS = 8000

function notify() {
  for (const fn of subscribers) fn(cache)
}

async function loadFresh() {
  if (inflight) return inflight
  inflight = fetchUsage()
    .then((data) => {
      cache = data
      cacheTs = Date.now()
      notify()
      return data
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function refreshUsage() {
  cacheTs = 0
  return loadFresh().catch(() => {})
}

export function useUsage() {
  const [snapshot, setSnapshot] = useState(cache)
  useEffect(() => {
    subscribers.add(setSnapshot)
    if (!cache || Date.now() - cacheTs > STALE_MS) {
      loadFresh().catch(() => {})
    }
    return () => {
      subscribers.delete(setSnapshot)
    }
  }, [])
  return snapshot
}

const RESOURCE_LABEL = {
  tables: 'tables',
  users: 'staff seats',
  dishes: 'dishes',
}

export default function UsageGauge({ resource, className }) {
  const usage = useUsage()
  const r = usage?.resources?.[resource]
  if (!r) return null

  const label = RESOURCE_LABEL[resource] || resource
  const tone = r.isAtLimit
    ? 'border-chilli-300 bg-chilli-50 text-chilli-800 dark:border-chilli-700 dark:bg-chilli-900/20 dark:text-chilli-200'
    : r.isNearLimit
      ? 'border-saffron-300 bg-saffron-50 text-saffron-800 dark:border-saffron-700 dark:bg-saffron-900/20 dark:text-saffron-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200'
  return (
    <div className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold', tone, className)}>
      <Gauge className="h-3.5 w-3.5" />
      {r.isUnlimited ? (
        <span>{r.used} {label} · <span className="opacity-70">unlimited</span></span>
      ) : (
        <>
          <span className="font-mono">{r.used} / {r.limit}</span>
          <span className="opacity-70">{label}</span>
          {r.isAtLimit && <span className="ml-1 uppercase tracking-widest opacity-90">· at limit</span>}
        </>
      )}
    </div>
  )
}
