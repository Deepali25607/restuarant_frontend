import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Welcome from './pages/Welcome.jsx'
import Menu from './pages/Menu.jsx'
import Cart from './pages/Cart.jsx'
import Tracking from './pages/Tracking.jsx'
import Rating from './pages/Rating.jsx'
import OrderEntry from './pages/OrderEntry.jsx'
import Layout from './components/Layout.jsx'
import WhitelabelHead from './components/WhitelabelHead.jsx'

// Operations consoles are lazy-loaded so customers don't pay for them.
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'))
const AdminLayout = lazy(() => import('./components/admin/AdminLayout.jsx'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders.jsx'))
const AdminMenu = lazy(() => import('./pages/admin/AdminMenu.jsx'))
const AdminTables = lazy(() => import('./pages/admin/AdminTables.jsx'))
const AdminStaff = lazy(() => import('./pages/admin/AdminStaff.jsx'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports.jsx'))
const AdminExpenses = lazy(() => import('./pages/admin/AdminExpenses.jsx'))
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit.jsx'))
const AdminLoyalty = lazy(() => import('./pages/admin/AdminLoyalty.jsx'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'))
const SuperAdmin = lazy(() => import('./pages/admin/SuperAdmin.jsx'))
const KitchenDashboard = lazy(() => import('./pages/kitchen/KitchenDashboard.jsx'))
const CashierPortal = lazy(() => import('./pages/cashier/CashierPortal.jsx'))

function ConsoleFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-masala-700">
      Loading console…
    </div>
  )
}

export default function App() {
  return (
    <>
      <WhitelabelHead />
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Welcome />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/track/:orderId" element={<Tracking />} />
        <Route path="/rate/:orderId" element={<Rating />} />
      </Route>

      {/* Org-aware QR landing — sets the org + table then jumps into the menu. */}
      <Route path="/order/:orgSlug" element={<OrderEntry />} />
      <Route path="/order/:orgSlug/:tableNo" element={<OrderEntry />} />

      <Route
        path="/admin/login"
        element={
          <Suspense fallback={<ConsoleFallback />}>
            <AdminLogin />
          </Suspense>
        }
      />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<ConsoleFallback />}>
            <AdminLayout />
          </Suspense>
        }
      >
        <Route index element={<Suspense fallback={null}><AdminDashboard /></Suspense>} />
        <Route path="orders" element={<Suspense fallback={null}><AdminOrders /></Suspense>} />
        <Route path="menu" element={<Suspense fallback={null}><AdminMenu /></Suspense>} />
        <Route path="tables" element={<Suspense fallback={null}><AdminTables /></Suspense>} />
        <Route path="staff" element={<Suspense fallback={null}><AdminStaff /></Suspense>} />
        <Route path="expenses" element={<Suspense fallback={null}><AdminExpenses /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={null}><AdminReports /></Suspense>} />
        <Route path="loyalty" element={<Suspense fallback={null}><AdminLoyalty /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={null}><AdminSettings /></Suspense>} />
        <Route path="audit" element={<Suspense fallback={null}><AdminAudit /></Suspense>} />
      </Route>

      <Route
        path="/kitchen"
        element={
          <Suspense fallback={<ConsoleFallback />}>
            <KitchenDashboard />
          </Suspense>
        }
      />
      <Route
        path="/cashier"
        element={
          <Suspense fallback={<ConsoleFallback />}>
            <CashierPortal />
          </Suspense>
        }
      />

      <Route
        path="/super-admin"
        element={
          <Suspense fallback={<ConsoleFallback />}>
            <SuperAdmin />
          </Suspense>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
