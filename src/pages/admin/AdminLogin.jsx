import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Flame } from 'lucide-react'
import { loginRequest } from '../../lib/api'
import { useAuthStore } from '../../store/useAuthStore'

export default function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const requestedFrom = location.state?.from

  const [email, setEmail] = useState('admin@org-masala.com')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await loginRequest(email, password)
      setAuth({ token, user })
      const portal =
        user.role === 'super_admin'
          ? '/super-admin'
          : user.role === 'kitchen'
            ? '/kitchen'
            : user.role === 'cashier'
              ? '/cashier'
              : '/admin'
      navigate(requestedFrom || portal, { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-cream dark:bg-masala-900">
      <div className="hidden md:flex relative overflow-hidden bg-curry-gradient text-white">
        <div className="absolute inset-0 bg-spice-radial opacity-60" />
        <img
          src="https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1200&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
              <Flame className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-xl">Masala Story</div>
              <div className="text-[10px] uppercase tracking-[0.3em] opacity-80">
                Operations Console
              </div>
            </div>
          </Link>

          <div>
            <h1 className="font-display text-5xl leading-tight">
              Where every plate
              <br />
              begins with{' '}
              <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                control.
              </span>
            </h1>
            <p className="mt-5 max-w-md opacity-90">
              Live orders, table occupancy, kitchen flow, billing & reports — all from
              one warm, vibrant dashboard.
            </p>
            <div className="mt-10 flex items-center gap-3 text-sm opacity-90">
              <ShieldCheck className="h-5 w-5" />
              Encrypted access · Role-based permissions
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card p-8 w-full max-w-md"
        >
          <div className="md:hidden flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-full bg-curry-gradient flex items-center justify-center shadow-warm">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div className="font-display text-xl text-masala-900">Masala Story</div>
          </div>

          <span className="eyebrow">Operations Console</span>
          <h2 className="font-display text-3xl text-masala-900 mt-2">
            Welcome back, Chef.
          </h2>
          <p className="text-masala-700 mt-1 text-sm">
            Sign in with your staff credentials.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@masalastory.com"
              autoComplete="email"
            />
            <Field
              icon={<Lock className="h-4 w-4" />}
              label="Password"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete="current-password"
              right={
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="text-masala-500 hover:text-masala-800"
                  aria-label="Toggle password visibility"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            {error && (
              <div className="text-sm text-chilli-700 bg-chilli-50 border border-chilli-200 rounded-2xl px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Enter dashboard'}
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-saffron-50 border border-saffron-200 px-4 py-3 text-xs text-masala-800">
            <div className="font-semibold mb-1">Demo credentials</div>
            <div>admin@org-masala.com · <span className="font-mono">admin@123</span></div>
            <div>manager@org-masala.com · <span className="font-mono">manager@123</span></div>
            <div>cashier@org-masala.com · <span className="font-mono">cashier@123</span></div>
          </div>

          <Link
            to="/"
            className="block text-center text-xs text-masala-600 mt-5 hover:text-masala-900"
          >
            ← Back to customer experience
          </Link>
        </motion.div>
      </div>
    </div>
  )
}

function Field({ icon, label, type, value, onChange, placeholder, right, autoComplete }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-masala-700">
        {label}
      </span>
      <div className="mt-1.5 flex items-center gap-2 bg-cream rounded-2xl border border-saffron-200 px-3 py-2.5 focus-within:border-saffron-400">
        <span className="text-masala-500">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="flex-1 bg-transparent outline-none text-sm"
        />
        {right}
      </div>
    </label>
  )
}
