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

  const visible = NAV.filter((item) => item.roles.includes(user.role))

  return (
    <div className="flex min-h-screen flex-col bg-[var(--board)] lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-[var(--board-line)] bg-[var(--paper)] px-4 py-3 lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:flex-nowrap lg:items-stretch lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--paper-line)] bg-[var(--board)] text-[var(--ink)]">
            <Icon name="activity" className="h-5 w-5" />
          </span>
          <div className="min-w-0 leading-none">
            <div className="display text-[21px] tracking-[0.14em] text-[var(--text)]">AYU-LINK</div>
            <div className="mt-1.5 truncate font-mono text-[9px] font-semibold tracking-[0.16em] text-[var(--text-muted)] uppercase">
              Emergency strip board
            </div>
          </div>
        </div>

        <nav
          aria-label="Primary navigation"
          className="order-last -mx-1 flex w-full gap-1 overflow-x-auto border-t border-[var(--paper-line)] px-1 pt-2 lg:order-none lg:mx-0 lg:mt-7 lg:w-auto lg:flex-col lg:gap-0 lg:overflow-visible lg:border-t-0 lg:px-0 lg:pt-0"
        >
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `bay shrink-0 lg:w-full ${isActive ? 'active' : ''}`}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-[var(--paper-line)] pt-4 lg:mt-auto lg:block">
          <div className="chrome-label">Operator</div>
          <div className="mt-1.5 truncate text-[13px] leading-tight text-[var(--text)]">{user.name}</div>
          <div className="mt-1 font-mono text-[9px] tracking-[0.14em] text-[var(--text-muted)] uppercase">
            {user.role.replaceAll('_', ' ')}
          </div>
        </div>

        <button onClick={signOut} className="btn-ghost ml-auto shrink-0 lg:ml-0 lg:mt-4 lg:w-full">
          Sign out
        </button>
      </aside>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
