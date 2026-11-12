import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { HOME } from '../roleRoutes'

const DEMO = [
  { label: 'Driver', email: 'driver@ayu.test' },
  { label: 'Hospital', email: 'hospital@ayu.test' },
  { label: 'Doctor', email: 'doctor@ayu.test' },
  { label: 'Admin', email: 'admin@ayu.test' },
]
const DEMO_PASSWORD = 'ayu12345'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={HOME[user.role] ?? '/'} replace />

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const me = await login(email.trim(), password)
      navigate(HOME[me.role] ?? '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function fill(demo) {
    setEmail(demo.email)
    setPassword(DEMO_PASSWORD)
    setError('')
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-red-600">AYU-LINK</h1>
        <p className="mt-1 text-sm text-slate-500">Emergency ambulance coordination</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Demo accounts</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DEMO.map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => fill(demo)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {demo.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Password: {DEMO_PASSWORD}</p>
        </div>
      </div>
    </div>
  )
}
