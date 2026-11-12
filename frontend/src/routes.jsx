import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import Shell from './components/Shell'
import Admin from './pages/Admin'
import Ambulance from './pages/Ambulance'
import Doctor from './pages/Doctor'
import Hospital from './pages/Hospital'
import Login from './pages/Login'
import { ADMIN_ROLES, AMBULANCE_ROLES, DOCTOR_ROLES, HOSPITAL_ROLES, HOME } from './roleRoutes'

function Loading({ label = 'Loading…' }) {
  return <div className="grid min-h-screen place-items-center text-slate-500">{label}</div>
}

function RequireAuth() {
  const { user, ready } = useAuth()
  if (!ready) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function Gated({ roles, children }) {
  const { user } = useAuth()
  if (!roles.includes(user.role)) return <Navigate to={HOME[user.role] ?? '/login'} replace />
  return children
}

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={HOME[user.role] ?? '/login'} replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route index element={<HomeRedirect />} />
          <Route
            path="/ambulance"
            element={
              <Gated roles={AMBULANCE_ROLES}>
                <Ambulance />
              </Gated>
            }
          />
          <Route
            path="/hospital"
            element={
              <Gated roles={HOSPITAL_ROLES}>
                <Hospital />
              </Gated>
            }
          />
          <Route
            path="/doctor"
            element={
              <Gated roles={DOCTOR_ROLES}>
                <Doctor />
              </Gated>
            }
          />
          <Route
            path="/admin"
            element={
              <Gated roles={ADMIN_ROLES}>
                <Admin />
              </Gated>
            }
          />
          <Route path="*" element={<HomeRedirect />} />
        </Route>
      </Route>
    </Routes>
  )
}
