import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
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
    <div className="dashboard-shell min-h-screen">
      <header className="app-header">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-2.5 py-1 text-sm font-black tracking-[0.18em] text-red-700 uppercase">
            AYU-LINK
          </span>
          <nav aria-label="Primary navigation" className="order-last flex w-full basis-full flex-none gap-1 overflow-x-auto rounded-full bg-slate-100/60 p-1 sm:order-none sm:w-auto sm:flex-1 sm:basis-auto">
            {NAV.filter((item) => item.roles.includes(user.role)).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-pill shrink-0 rounded-full px-3 py-2 text-sm font-medium ${
                    isActive ? 'active' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto min-w-0 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-right text-xs leading-tight shadow-sm">
            <div className="truncate font-semibold text-slate-800">{user.name}</div>
            <div className="capitalize text-slate-500">{user.role.replaceAll('_', ' ')}</div>
          </div>
          <button
            onClick={signOut}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
