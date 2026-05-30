import { useMemo } from 'react'
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'

// Surfaces the tenant's subscription state at the top of the admin console.
// Hard-blocked statuses (past_due/expired/cancelled) shouldn't normally
// reach this banner because login refuses them, but we still render in case
// a session is open when the cycle flips.
const STATUS_COPY = {
  trial: {
    tone: 'saffron',
    title: 'You are on a free trial',
    icon: Clock,
  },
  expiring: {
    tone: 'chilli',
    title: 'Renewal due soon',
    icon: AlertTriangle,
  },
  past_due: {
    tone: 'chilli-strong',
    title: 'Subscription is past due',
    icon: ShieldAlert,
  },
  expired: {
    tone: 'chilli-strong',
    title: 'Subscription has expired',
    icon: ShieldAlert,
  },
  cancelled: {
    tone: 'chilli-strong',
    title: 'Subscription has been cancelled',
    icon: ShieldAlert,
  },
}

const TONE_CLASS = {
  saffron:
    'border-saffron-300 dark:border-saffron-700 bg-saffron-50 dark:bg-saffron-900/30 text-saffron-900 dark:text-saffron-200',
  chilli:
    'border-chilli-300 dark:border-chilli-700 bg-chilli-50 dark:bg-chilli-900/20 text-chilli-800 dark:text-chilli-200',
  'chilli-strong':
    'border-chilli-500 bg-chilli-100 dark:bg-chilli-900/40 text-chilli-900 dark:text-chilli-100 font-semibold',
}

export default function SubscriptionBanner() {
  const subscription = useAuthStore(
    (s) => s.user?.organization?.subscription,
  )

  const detail = useMemo(() => {
    if (!subscription) return null
    const copy = STATUS_COPY[subscription.status]
    if (!copy) return null
    const { daysUntilRenewal: days, planLabel, cancelAtPeriodEnd } = subscription
    let line = ''
    if (subscription.status === 'trial') {
      line = days != null
        ? `${days} day${days === 1 ? '' : 's'} left on the ${planLabel.toLowerCase()}. Switch to a paid plan before it ends to avoid losing access.`
        : `You're on the ${planLabel.toLowerCase()}.`
    } else if (subscription.status === 'expiring') {
      line = days != null
        ? `${planLabel} renews in ${days} day${days === 1 ? '' : 's'}. Please clear any pending invoice to stay active.`
        : `${planLabel} subscription is due to renew soon.`
    } else if (subscription.status === 'past_due') {
      line = 'Your last invoice is unpaid. Settle it with the platform team to restore full access.'
    } else if (subscription.status === 'expired') {
      line = 'Your billing cycle ended. Reach out to the platform team to renew.'
    } else if (subscription.status === 'cancelled') {
      line = cancelAtPeriodEnd
        ? 'Cancellation is scheduled at the end of the current cycle.'
        : 'Subscription has been cancelled. Contact the platform team to reactivate.'
    }
    return { ...copy, line }
  }, [subscription])

  if (!detail) return null

  const Icon = detail.icon
  return (
    <div className={`mx-4 md:mx-8 mt-3 rounded-2xl border px-4 py-3 flex items-start gap-3 text-sm ${TONE_CLASS[detail.tone]}`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold leading-tight">{detail.title}</div>
        <div className="text-[12px] mt-0.5 opacity-90">{detail.line}</div>
      </div>
    </div>
  )
}
