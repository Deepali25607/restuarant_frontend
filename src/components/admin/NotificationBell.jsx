import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, QrCode, ClipboardList, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { getSocket } from '../../lib/socket'

const MAX = 30

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(ts).toLocaleDateString()
}

// Live notification centre for the admin console. Listens on the shared admin
// socket room and keeps a short rolling history so alerts (a customer's QR
// payment, a new order, a stock-out) aren't missed when the originating toast
// has already faded — and surface on whichever admin page the user is on.
export default function NotificationBell({ perms = [] }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const seq = useRef(0)
  const canBill = perms.includes('billing.collect')

  useEffect(() => {
    const socket = getSocket()
    socket.emit('join:admin')
    const add = (n) =>
      setItems((prev) =>
        [{ id: `${Date.now()}_${seq.current++}`, at: Date.now(), read: false, ...n }, ...prev].slice(0, MAX),
      )
    const onNew = (o) =>
      add({
        type: 'order',
        title: `New order · T${o.tableNo}`,
        desc: `${(o.items || []).reduce((s, it) => s + it.qty, 0)} items · ₹${o.amounts?.total ?? ''}`,
        link: '/admin/orders',
      })
    const onClaim = (o) => {
      if (!canBill) return
      add({
        type: 'qr',
        title: `QR payment · T${o.tableNo}`,
        desc: `₹${o.amounts?.total ?? ''} — verify & confirm to settle`,
        link: '/cashier',
      })
    }
    const onLow = (d) => add({ type: 'stock', title: `${d.name} running low`, desc: `${d.stock} portions left`, link: '/admin/menu' })
    const onOut = (d) => add({ type: 'stock', title: `${d.name} out of stock`, desc: 'Hidden from the customer menu', link: '/admin/menu' })

    socket.on('order:new', onNew)
    socket.on('order:paymentClaimed', onClaim)
    socket.on('dish:lowStock', onLow)
    socket.on('dish:outOfStock', onOut)
    return () => {
      socket.off('order:new', onNew)
      socket.off('order:paymentClaimed', onClaim)
      socket.off('dish:lowStock', onLow)
      socket.off('dish:outOfStock', onOut)
    }
  }, [canBill])

  const unread = items.filter((i) => !i.read).length

  const toggle = () =>
    setOpen((v) => {
      if (!v) setItems((prev) => prev.map((i) => ({ ...i, read: true })))
      return !v
    })

  const go = (n) => {
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  const iconFor = (t) => (t === 'qr' ? QrCode : t === 'stock' ? AlertTriangle : ClipboardList)

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative h-10 w-10 rounded-full bg-white dark:bg-masala-800 border border-saffron-200 dark:border-masala-700 hover:bg-saffron-50 dark:hover:bg-masala-700 flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-masala-800 dark:text-saffron-200" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-chilli-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-masala-800">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto z-50 rounded-2xl border border-saffron-200 dark:border-masala-700 bg-white dark:bg-masala-800 shadow-xl">
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-saffron-100 dark:border-masala-700 bg-white dark:bg-masala-800">
              <span className="font-semibold text-sm text-masala-900 dark:text-saffron-100">Notifications</span>
              {items.length > 0 && (
                <button onClick={() => setItems([])} className="text-xs text-saffron-700 hover:text-saffron-900 dark:text-saffron-300">
                  Clear all
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-masala-500">You're all caught up 🌿</div>
            ) : (
              <ul className="divide-y divide-saffron-100 dark:divide-masala-700">
                {items.map((n) => {
                  const Icon = iconFor(n.type)
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => go(n)}
                        className="w-full text-left px-4 py-3 flex gap-3 hover:bg-saffron-50 dark:hover:bg-masala-700/50"
                      >
                        <span
                          className={clsx(
                            'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                            n.type === 'qr'
                              ? 'bg-indigo-100 text-indigo-700'
                              : n.type === 'stock'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-saffron-100 text-saffron-700',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-masala-900 dark:text-saffron-100 truncate">{n.title}</span>
                          <span className="block text-xs text-masala-600 dark:text-saffron-200/70 truncate">{n.desc}</span>
                          <span className="block text-[10px] text-masala-400 mt-0.5">{timeAgo(n.at)}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
