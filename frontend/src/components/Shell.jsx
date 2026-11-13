import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import Icon from './Icons'
import { ADMIN_ROLES, AMBULANCE_ROLES, DOCTOR_ROLES, HOSPITAL_ROLES } from '../roleRoutes'

const NAV = [
  { to: '/ambulance', label: 'Ambulance', roles: AMBULANCE_ROLES },
  { to: '/hospital', label: 'Hospital', roles: HOSPITAL_ROLES },
  { to: '/doctor', label: 'Doctor', roles: DOCTOR_ROLES },
  { to: '/admin', label: 'Admin', roles: ADMIN_ROLES },
]

export default function Shell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:flex-nowrap lg:items-stretch lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
            <Icon name="activity" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-black tracking-[0.18em] uppercase">AYU-LINK</div>
            <div className="truncate text-xs text-[var(--muted)]">Emergency coordination</div>
          </div>
        </div>

        <nav
          aria-label="Primary navigation"
          className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 lg:order-none lg:mx-0 lg:mt-8 lg:w-auto lg:flex-col lg:overflow-visible lg:px-0"
        >
          {NAV.filter((item) => item.roles.includes(user.role)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-pill shrink-0 px-3 py-2 text-sm font-medium lg:w-full ${isActive ? 'active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:mt-auto lg:block">
          <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs leading-tight">
            <div className="truncate font-semibold">{user.name}</div>
            <div className="capitalize text-[var(--muted)]">{user.role.replaceAll('_', ' ')}</div>
          </div>
        </div>

        <button
          onClick={signOut}
          className="ml-auto shrink-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)] lg:ml-0 lg:w-full"
        >
          Sign out
        </button>
      </aside>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
