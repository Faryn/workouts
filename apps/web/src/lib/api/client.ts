const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

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

export async function req<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const extraHeaders = (init.headers ?? {}) as Record<string, string>
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    throw await parseApiError(res)
  }
  return res.json()
}

export async function downloadCsv(path: string, token: string, filename: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    throw await parseApiError(res)
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
