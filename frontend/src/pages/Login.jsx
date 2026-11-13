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
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h1 className="display text-4xl text-[var(--text)] tracking-[0.12em] whitespace-nowrap">AYU-LINK</h1>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p className="chrome-label m-0">Emergency coordination</p>
            <span className="st text-[var(--live)]">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--live)]" />
              Secure
            </span>
          </div>
        </div>

        <div className="strip">
          <span aria-hidden="true" className="strip-perf" />
          <div className="strip-body">
            <div className="flex items-baseline justify-between">
              <p className="paper-label">Access slip</p>
              <span className="paper-label">Form 01</span>
            </div>
            <p className="mt-1 text-[12px] text-[var(--paper-muted)]">Sign in to open the board.</p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block">
                <span className="paper-label">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="block">
                <span className="paper-label">Password</span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field mt-1"
                />
              </label>

              {error ? (
                <p role="alert" className="notice notice-alarm">
                  {error}
                </p>
              ) : null}

              <button type="submit" disabled={busy} className="btn-ink w-full">
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="mt-5 border-t border-[var(--paper-line)] pt-4">
              <p className="paper-label">Demo accounts</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {DEMO.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => fill(demo)}
                    className="border border-[var(--paper-line)] bg-[var(--paper)] px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-[var(--ink)] uppercase transition-colors hover:bg-[var(--paper-band)]"
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[var(--paper-muted)]">Password: {DEMO_PASSWORD}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
