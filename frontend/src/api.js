export const BASE = import.meta.env.VITE_API_BASE ?? ''
const TOKEN_KEY = 'ayu.token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function api(path, { method = 'GET', body, form, headers } = {}) {
  const h = { ...headers }
  const token = getToken()
  if (token) h.Authorization = `Bearer ${token}`
  let payload
  if (form) {
    payload = form
  } else if (body !== undefined) {
    h['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(BASE + path, { method, headers: h, body: payload })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const json = await res.json()
      if (json.detail) detail = typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail)
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

export async function authenticatedAudio(path) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { headers })
  if (!res.ok) {
    let detail = `Audio request failed (${res.status})`
    try {
      const json = await res.json()
      if (json.detail) detail = json.detail
    } catch {
      /* Keep the explicit status message for non-JSON responses. */
    }
    throw new Error(detail)
  }
  return URL.createObjectURL(await res.blob())
}
