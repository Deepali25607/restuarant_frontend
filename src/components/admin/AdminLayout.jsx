import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, UtensilsCrossed, Table2, BedDouble, ClipboardList, Users, LogOut, Flame, BarChart3, Wallet, ScrollText, Sparkles, Settings, Coins, KeyRound } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/useAuthStore'
import { usePlatformStore } from '../../store/usePlatformStore'
import ThemeToggle from '../ThemeToggle'
import { getSocket } from '../../lib/socket'
import SubscriptionBanner from './SubscriptionBanner'
import NotificationBell from './NotificationBell'
import ChangePasswordModal from '../ChangePasswordModal'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, perm: 'dashboard.view' },
  { to: '/admin/orders', label: 'Live orders', icon: ClipboardList, perm: 'orders.view' },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed, perm: 'menu.manage' },
  { to: '/admin/tables', label: 'Tables', icon: Table2, perm: 'tables.view' },
  { to: '/admin/rooms', label: 'Rooms', icon: BedDouble, perm: 'rooms.view' },
  { to: '/cashier', label: 'Cashier desk', icon: Coins, perm: 'billing.collect' },
  { to: '/admin/staff', label: 'Staff', icon: Users, perm: 'staff.view' },
  { to: '/admin/expenses', label: 'Expenses', icon: Wallet, perm: 'expenses.view' },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3, perm: 'reports.view' },
  { to: '/admin/loyalty', label: 'Loyalty', icon: Sparkles, perm: 'loyalty.view' },
  { to: '/admin/audit', label: 'Audit log', icon: ScrollText, perm: 'audit.view' },
  { to: '/admin/settings', label: 'Settings', icon: Settings, perm: 'settings.manage' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token, logout } = useAuthStore()
  const platformName = usePlatformStore((s) => s.platform?.name) || 'Masala Story'
  const [pwOpen, setPwOpen] = useState(false)
  const visibleNav = navItems.filter(
    (item) => !item.perm || (user?.permissions || []).includes(item.perm),
  )

  useEffect(() => {
    if (!token) return
    const socket = getSocket()
    socket.emit('join:admin')
    const onLow = (d) =>
      toast.warning(`"${d.name}" is running low`, {
        description: `Only ${d.stock} portions left (alert ≤ ${d.lowStockAt})`,
      })
    const onOut = (d) =>
      toast.error(`"${d.name}" is out of stock`, {
        description: 'Hidden from the customer menu until you restock.',
      })
    socket.on('dish:lowStock', onLow)
    socket.on('dish:outOfStock', onOut)
    return () => {
      socket.off('dish:lowStock', onLow)
      socket.off('dish:outOfStock', onOut)
    }
  }, [token])

  if (!token || !user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  // Super-admin lands here only by typing the URL — push them to their console.
  if (user.role === 'super_admin') {
    return <Navigate to="/super-admin" replace />
  }

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 flex-col bg-white/70 dark:bg-masala-800/40 backdrop-blur-xl border-r border-saffron-200/70 dark:border-masala-700/60">
        <div className="px-6 py-6 flex items-center gap-2 border-b border-saffron-200/60">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shadow-warm overflow-hidden"
            style={{
              background: user.organization?.themeColor
                ? `linear-gradient(135deg, ${user.organization.themeColor}, ${user.organization.themeColor}cc)`
                : undefined,
            }}
          >
            {user.organization?.logoUrl ? (
              <img src={user.organization.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Flame className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg text-masala-900 truncate max-w-[170px]" title={user.organization?.name || platformName}>
              {user.organization?.name || platformName}
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-saffron-700">
              Console
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition',
                  isActive
                    ? 'bg-curry-gradient text-white shadow-warm'
                    : 'text-masala-700 hover:bg-saffron-100 hover:text-masala-900',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-saffron-200/60">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-9 w-9 rounded-full bg-masala-700 text-white flex items-center justify-center text-sm font-bold">
              {user.name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-masala-900 truncate">
                {user.name}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-saffron-700">
                {user.role}
              </div>
            </div>
            <button
              onClick={() => {
                logout()
                navigate('/admin/login', { replace: true })
              }}
              className="p-2 rounded-full hover:bg-chilli-50 text-chilli-600"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setPwOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium text-masala-700 hover:bg-saffron-100 hover:text-masala-900"
          >
            <KeyRound className="h-4 w-4" /> Change password
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-cream/70 dark:bg-masala-900/60 border-b border-saffron-200/60 dark:border-masala-700/60">
          <div className="h-16 px-4 md:px-8 flex items-center justify-between">
            <div className="lg:hidden flex items-center gap-2 min-w-0">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center overflow-hidden"
                style={{
                  background: user.organization?.themeColor
                    ? `linear-gradient(135deg, ${user.organization.themeColor}, ${user.organization.themeColor}cc)`
                    : undefined,
                }}
              >
                {user.organization?.logoUrl ? (
                  <img src={user.organization.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Flame className="h-4 w-4 text-white" />
                )}
              </div>
              <span className="font-display text-lg text-masala-900 truncate">{user.organization?.name || platformName}</span>
            </div>
            <div className="hidden lg:block text-sm text-masala-700">
              Welcome back, <span className="font-semibold text-masala-900">{user.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell perms={user.permissions || []} />
            </div>
          </div>

          <nav className="lg:hidden -mx-1 px-3 pb-3 flex gap-1 overflow-x-auto scrollbar-hide">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'whitespace-nowrap inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition border',
                    isActive
                      ? 'bg-curry-gradient text-white border-transparent shadow-warm'
                      : 'bg-white text-masala-800 border-saffron-200',
                  )
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <SubscriptionBanner />

        <main className="flex-1 px-4 md:px-8 py-6">
          <Outlet />
        </main>
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}
