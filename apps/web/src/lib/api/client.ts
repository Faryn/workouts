const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'
const AUTH_EXPIRED_EVENT = 'workout:auth-expired'
let authExpiryNotified = false

export class ApiError extends Error {
  status: number
  statusText: string
  bodyText: string
  code?: string
  details?: Record<string, unknown>

  constructor(status: number, statusText: string, bodyText: string, code?: string, details?: Record<string, unknown>) {
    super(`${status} ${statusText}: ${bodyText}`)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
    this.bodyText = bodyText
    this.code = code
    this.details = details
  }
}

async function parseApiError(res: Response): Promise<ApiError> {
  const text = await res.text()
  try {
    const parsed = JSON.parse(text) as { error?: { code?: string; details?: Record<string, unknown> } }
    return new ApiError(res.status, res.statusText, text, parsed.error?.code, parsed.error?.details)
  } catch {
    return new ApiError(res.status, res.statusText, text)
  }
}

function notifyAuthExpiredOnce() {
  if (authExpiryNotified) return
  authExpiryNotified = true
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
}

export function resetAuthExpiryNotification() {
  authExpiryNotified = false
}

export function isUnauthorizedError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401
}

export { AUTH_EXPIRED_EVENT }

export async function req<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const extraHeaders = (init.headers ?? {}) as Record<string, string>
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders }
  if (token) headers.Authorization = `Bearer ${token}`
  const method = init.method ?? 'GET'
  const url = method === 'GET'
    ? `${API_BASE}${path}${path.includes('?') ? '&' : '?'}_ts=${Date.now()}`
    : `${API_BASE}${path}`
  const res = await fetch(url, { ...init, headers, credentials: 'same-origin', cache: 'no-store' })
  if (!res.ok) {
    const error = await parseApiError(res)
    if (error.status === 401) notifyAuthExpiredOnce()
    throw error
  }
  return res.json()
}

export async function downloadCsv(path: string, token: string | undefined, filename: string) {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { headers, credentials: 'same-origin' })
  if (!res.ok) {
    const error = await parseApiError(res)
    if (error.status === 401) notifyAuthExpiredOnce()
    throw error
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
