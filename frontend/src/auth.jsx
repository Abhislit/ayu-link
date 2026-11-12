import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken())
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!token) {
      setUser(null)
      setReady(true)
      return
    }
    let cancelled = false
    api('/api/auth/me')
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        if (cancelled) return
        setToken(null)
        setTokenState(null)
        setUser(null)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const login = useCallback(async (email, password) => {
    const res = await api('/api/auth/login', { method: 'POST', body: { email, password } })
    setToken(res.token)
    setTokenState(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setTokenState(null)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, token, ready, login, logout }), [user, token, ready, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
